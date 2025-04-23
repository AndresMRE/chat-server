import React, { useEffect, useState, useRef } from 'react';
import MD5 from 'crypto-js/md5';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../context/AuthContext';

export default function ChatWindow({ selectedChat, addChat, unreadCount, setUnreadCount }) {
  const { client, token } = useAuth();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = token ? parseJwt(token)?.sub : '';
    if (!user) return;
    const saved = localStorage.getItem(`chatHistory_${user}`);
    if (saved) setChatHistory(JSON.parse(saved));
  }, [token]);

  useEffect(() => {
    const user = token ? parseJwt(token)?.sub : '';
    if (user) {
      localStorage.setItem(`chatHistory_${user}`, JSON.stringify(chatHistory));
    }
  }, [chatHistory, token]);

  const username = token ? parseJwt(token)?.sub : '';

  const selectedChatRef = useRef(selectedChat);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
  const addChatRef = useRef(addChat);
  useEffect(() => { addChatRef.current = addChat; }, [addChat]);


  const seenCorrIdsRef = useRef(new Set());

  useEffect(() => {
    if (!client || !username) return;
    const topics = [`/message/p2p/${username}`, `/message/group/+`];
    const handler = (receivedTopic, payload) => {
      const raw = payload.toString();
      try {
        const msg = JSON.parse(raw);
        const corrId = msg.correlationId;
        if (corrId) {
          if (seenCorrIdsRef.current.has(corrId)) return;
          seenCorrIdsRef.current.add(corrId);
        }
        if (msg.status === 'error') {
          setError(msg.message);
          return;
        }
    
        let chatId, sender, chatName;
    
        if (msg.type === 'p2p' && msg.from && msg.content) {
          chatId = msg.from;
          sender = msg.from;
          chatName = chatId;
    
          if (msg.hash) {
            const localHash = MD5(msg.content).toString();
            if (localHash !== msg.hash) {
              console.warn('[ HASH INVALIDO]', {
                expected: msg.hash,
                actual: localHash,
                content: msg.content
              });
              return;
            }
          }
    
        } else if (msg.type === 'group' && msg.groupId && msg.content) {
          chatId = msg.groupId;
          sender = msg.sender || msg.from;
          chatName = msg.groupName || chatId;
        } else {
          return;
        }
    
        addChatRef.current?.({ id: chatId, name: chatName });
    
        setChatHistory(prev => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), { from: sender, content: msg.content }]
        }));
    
        const currentChat = selectedChatRef.current;
        if (!currentChat || chatId !== currentChat.id) {
          setUnreadCount(prev => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
        }
    
      } catch (e) {
        console.error('[CLIENT] JSON parse error:', e);
      }
    };
    
    client.subscribe(topics, { qos: 1 }, err => {
      if (!err) client.on('message', handler);
    });
    return () => {
      client.unsubscribe(topics);
      client.off('message', handler);
    };
  }, [client, username]);

  const handleSend = (e) => {
    e.preventDefault();
    setError(null);
    if (!client || !selectedChat || message.trim() === '') return;
  
    const hash = MD5(message).toString();
  
    const payload = {
      token: token,
      toUsername: selectedChat.id,
      content: message,
      hash: hash,
      correlationId: uuidv4()
    };
  
    client.publish('/message/p2p', JSON.stringify(payload), { qos: 1 });
  
    setChatHistory(prev => ({
      ...prev,
      [selectedChat.id]: [...(prev[selectedChat.id] || []), { from: username, content: message }]
    }));
    setMessage('');
  };
  
  if (!selectedChat) {
    return <div style={{ padding: '2rem' }}>Selecciona un chat para comenzar</div>;
  }

  const messages = chatHistory[selectedChat.id] || [];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        <h2>Chat con {selectedChat.name || selectedChat.id}</h2>
        {error && <div style={{ color: 'red' }}>⚠️ {error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: msg.from === username ? 'flex-end' : 'flex-start',
                background: msg.from === username ? '#0078FF' : '#444',
                padding: '0.5rem 1rem',
                borderRadius: '12px',
                maxWidth: '70%',
              }}
            >
              {msg.content}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSend} style={{ padding: '1rem', display: 'flex', gap: '0.5rem', borderTop: '1px solid #444' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #666', background: '#2A2A3B', color: '#fff' }}
        />
        <button type="submit" style={{ background: '#0078FF', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', color: '#fff' }}>
          Enviar
        </button>
      </form>
    </div>
  );
}

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}