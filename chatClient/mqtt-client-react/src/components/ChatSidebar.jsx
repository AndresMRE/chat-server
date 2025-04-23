import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';

export default function ChatSidebar({ chats, onSelect, unreadCount, selectedChatId, onAddChat }) {
  const { client, token } = useAuth();
  const [newChatId, setNewChatId] = useState('');

  const getUsernameFromToken = () => {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64)).username;
    } catch {
      return '';
    }
  };

  const handleAddChat = () => {
    if (!newChatId.trim()) return;
    const id = newChatId.trim();
    onAddChat({ id, name: id });
    onSelect({ id, name: id });
    setNewChatId('');

    const username = getUsernameFromToken();
    if (client && username) {
      const payload = {
        sender: username,
        receiver: id,
        content: '[Inicio de conversación]',
        correlationId: uuidv4()
      };
      client.publish('/message/p2p', JSON.stringify(payload), { qos: 1 });
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h3 style={{ marginBottom: '1rem' }}>Chats</h3>

      <div style={{ marginBottom: '1rem' }}>
        <input
          value={newChatId}
          onChange={e => setNewChatId(e.target.value)}
          placeholder="Nuevo contacto..."
          style={{
            width: '100%',
            padding: '0.4rem',
            borderRadius: '6px',
            border: '1px solid #555',
            background: '#2A2A3B',
            color: '#fff'
          }}
        />
        <button
          onClick={handleAddChat}
          style={{
            marginTop: '0.5rem',
            width: '100%',
            padding: '0.4rem',
            background: '#0078FF',
            color: '#fff',
            border: 'none',
            borderRadius: '6px'
          }}
        >
          Añadir chat
        </button>
      </div>

      {chats.length === 0 && (
        <p style={{ color: '#888', fontSize: '0.9rem' }}>No hay conversaciones aún</p>
      )}
      {chats.map(chat => (
        <div
          key={chat.id}
          onClick={() => onSelect(chat)}
          style={{
            padding: '0.5rem',
            cursor: 'pointer',
            borderBottom: '1px solid #333',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: chat.id === selectedChatId ? '#333' : 'transparent'
          }}
        >
          <span>{chat.name}</span>
          {unreadCount[chat.id] > 0 && (
            <span style={{
              background: '#EF4444',
              color: '#fff',
              borderRadius: '12px',
              padding: '0.1rem 0.5rem',
              fontSize: '0.8rem'
            }}>{unreadCount[chat.id]}</span>
          )}
        </div>
      ))}
    </div>
  );
}