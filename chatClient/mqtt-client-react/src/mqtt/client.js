// src/mqtt/client.js
import mqtt from 'mqtt';

let client;
export function connectClient({ host, port, username, password, onConnect, onError }) {
  if (!client) {
    client = mqtt.connect(`wss://${host}:${port}/mqtt`, {
      username,
      password,
      reconnectPeriod: 5000,
      connectTimeout: 4000,
      clean: true,
    });

    client.on('connect', () => {
      console.log('[MQTT] Connected to HiveMQ');
      onConnect && onConnect();
    });

    client.on('error', (err) => {
      console.error('MQTT] Connection error:', err);
      onError && onError(err);
    });
  }

  return client;
}
