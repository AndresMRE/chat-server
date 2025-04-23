import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';

export default function Dashboard() {
  const { token, logout } = useAuth();
  const userDataLocal = token ? JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) : {};
  const username = userDataLocal.username || userDataLocal.sub || '';
  const [selectedChat, setSelectedChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [unreadCount, setUnreadCount] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!username) return;
    const savedHistory = localStorage.getItem(`chatHistory_${username}`);
    if (savedHistory) {
      const history = JSON.parse(savedHistory);
      setChats(Object.keys(history).map(id => ({ id, name: id })));
    }
    const savedUnread = localStorage.getItem(`unreadCounts_${username}`);
    if (savedUnread) setUnreadCount(JSON.parse(savedUnread));
  }, [username]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    setUnreadCount((prev) => ({ ...prev, [chat.id]: 0 }));
  };

  const handleAddChat = (chat) => {
    setChats((prev) => {
      const exists = prev.some((c) => c.id === chat.id);
      return exists ? prev : [...prev, chat];
    });
  };

  useEffect(() => {
    if (username) localStorage.setItem(`unreadCounts_${username}`, JSON.stringify(unreadCount));
  }, [unreadCount, username]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#1E1E2F', color: '#fff' }}>
      {/* Sidebar */}
      <div style={{ width: '25%', borderRight: '1px solid #444' }}>
        <ChatSidebar
          chats={chats}
          onSelect={handleChatSelect}
          unreadCount={unreadCount}
          selectedChatId={selectedChat?.id}
          onAddChat={handleAddChat}
        />
      </div>

      {/* Chat Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
          borderBottom: '1px solid #444',
          background: '#2A2A3B'
        }}>
          <span>👤 {username}</span>
          <button
            onClick={handleLogout}
            style={{ background: '#EF4444', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', color: '#fff' }}
          >
            Cerrar sesión
          </button>
        </div>

        {/* Chat */}
        <ChatWindow
          selectedChat={selectedChat}
          addChat={handleAddChat}
          unreadCount={unreadCount}
          setUnreadCount={setUnreadCount}
        />
      </div>
    </div>
  );
}