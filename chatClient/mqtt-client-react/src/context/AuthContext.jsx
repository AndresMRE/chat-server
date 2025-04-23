import React, { createContext, useContext, useEffect, useState } from 'react';
import { connectClient } from '../mqtt/client';
import { AUTH_REGISTER, AUTH_LOGIN, responseFor } from '../mqtt/topics';
import { v4 as uuidv4 } from 'uuid';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [client, setClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  useEffect(() => {
    const mqttClient = connectClient({
      host: import.meta.env.VITE_MQTT_HOST,
      port: Number(import.meta.env.VITE_MQTT_PORT),
      username: import.meta.env.VITE_MQTT_USERNAME,
      password: import.meta.env.VITE_MQTT_PASSWORD,
      onConnect: () => {
        console.log('[MQTT] Established connection');
        setIsConnected(true);
      },
      onError: (err) => {
        console.error('[MQTT] Connection error', err);
      }
    });
    setClient(mqttClient);
  }, []);

  const register = (username, password) => {
    return new Promise((resolve, reject) => {
      const corrId = uuidv4();
      const topicResp = responseFor(username);
      client.subscribe(topicResp, err => {
        if (err) return reject(err);
        client.on('message', (topic, payload) => {
          if (topic === topicResp) {
            const msg = JSON.parse(payload.toString());
            if (msg.type === 'register' && msg.correlationId === corrId) {
              client.unsubscribe(topicResp);
              if (msg.status === 'success') return resolve(msg);
              return reject(new Error(msg.message));
            }
          }
        });
      });
      client.publish(
        AUTH_REGISTER,
        JSON.stringify({ username, password, correlationId: corrId }),
        { qos: 1 }
      );
    });
  };

  const login = (username, password) => {
    return new Promise((resolve, reject) => {
      const corrId = uuidv4();
      const topicResp = responseFor(username);
      client.subscribe(topicResp, err => {
        if (err) return reject(err);
        client.on('message', (topic, payload) => {
          if (topic === topicResp) {
            const msg = JSON.parse(payload.toString());
            if (msg.type === 'login' && msg.correlationId === corrId) {
              client.unsubscribe(topicResp);
              if (msg.status === 'success') {
                localStorage.setItem('token', msg.token);
                setToken(msg.token);
                return resolve(msg);
              }
              return reject(new Error(msg.message));
            }
          }
        });
      });
      client.publish(
        AUTH_LOGIN,
        JSON.stringify({ username, password, correlationId: corrId }),
        { qos: 1 }
      );
    });
  };

  const logout = () => {
    const user = token ? parseJwt(token).username : null;
    localStorage.removeItem('token');
    if (user) {
      localStorage.removeItem(`chatHistory_${user}`);
      localStorage.removeItem(`unreadCounts_${user}`);
    }
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ isConnected, register, login, logout, token, client }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}