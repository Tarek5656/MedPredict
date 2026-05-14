import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import messagingService from '../services/messagingService';

const MessagingContext = createContext();
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/chat/';

export const MessagingProvider = ({ children }) => {
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [wsMessages, setWsMessages] = useState([]);
  const socketRef = useRef(null);

  const fetchUnreadStatus = async () => {
    if (!localStorage.getItem('access_token')) return;
    try {
      const convs = await messagingService.getConversations();
      if (Array.isArray(convs)) {
        setConversations(convs);
        const total = convs.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);
        setUnreadTotal(total);
      }
    } catch (error) {
      console.error("Erreur fetch unread:", error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat_message' || data.type === 'message_sent') {
        setWsMessages((prev) => [...prev, data]);
        fetchUnreadStatus();
      }
    };

    const interval = setInterval(fetchUnreadStatus, 30000);
    fetchUnreadStatus();

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);

  const sendMessage = useCallback((message, receiverId, conversationId = null) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        message,
        receiver_id: receiverId,
        conversation_id: conversationId
      }));
    }
  }, []);

  return (
    <MessagingContext.Provider value={{ 
      unreadTotal: unreadTotal || 0, 
      conversations: conversations || [], 
      wsMessages,
      sendMessage,
      fetchUnreadStatus 
    }}>
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = () => useContext(MessagingContext);
