import React, { useState, useEffect, useRef } from 'react';
import messagingService from '../../services/messagingService';
import './Messaging.css';
import { useMessaging } from '../../context/MessagingContext';

const ChatWindow = () => {
  const messaging = useMessaging() || {};
  const { conversations, fetchUnreadStatus, wsMessages, sendMessage } = messaging;
  
  const [contacts, setContacts] = useState([]);
  const [filterRole, setFilterRole] = useState('SECRETAIRE');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeContact, setActiveContact] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const lastProcessedMsgRef = useRef(wsMessages?.length || 0);

  useEffect(() => {
    // Au montage, on ignore les messages déjà présents dans le tampon global
    lastProcessedMsgRef.current = wsMessages?.length || 0;
  }, []);

  const filteredContacts = contacts.filter(contact => {
    const roles = (contact.groups || []).map(g => (typeof g === 'string' ? g : g.name).toUpperCase());
    const roleMatches = roles.includes(filterRole);
    
    const fullName = `${contact.first_name || ''} ${contact.last_name || ''} ${contact.username || ''}`.toLowerCase();
    const searchMatches = fullName.includes(searchTerm.toLowerCase());
    
    return roleMatches && searchMatches;
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeContact) {
      const conv = conversations.find(c => c.other_participant.id === activeContact.id);
      if (conv) {
        messagingService.markAsRead(conv.id).then(() => {
          fetchUnreadStatus();
        });
      }
    }
  }, [activeContact]);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const data = await messagingService.getContacts();
        setContacts(data);
      } catch (err) {
        console.error("Failed to fetch contacts", err);
      }
    };
    fetchContacts();
  }, []);

  useEffect(() => {
    if (activeContact) {
      const fetchMessages = async () => {
        try {
          const allConvs = await messagingService.getConversations();
          const conv = (allConvs || []).find(c => 
            c.participants && c.participants.some(p => p.id === activeContact.id)
          );
          
          if (conv) {
            const data = await messagingService.getMessages(conv.id);
            setConversationMessages(Array.isArray(data) ? data : []);
          } else {
            setConversationMessages([]);
          }
        } catch (err) {
          console.error("Failed to fetch messages", err);
          setConversationMessages([]);
        }
      };
      fetchMessages();
    }
  }, [activeContact]);

  // Fusionner les messages du WebSocket avec les messages chargés
  useEffect(() => {
    if (wsMessages && wsMessages.length > lastProcessedMsgRef.current) {
      const lastMsg = wsMessages[wsMessages.length - 1];
      lastProcessedMsgRef.current = wsMessages.length;

      // Si le message appartient à la conversation active
      if (activeContact && (lastMsg.sender_id === activeContact.id || lastMsg.receiver_id === activeContact.id)) {
        // Ignorer si on est l'expéditeur, car on a déjà fait un affichage optimiste
        if (lastMsg.sender_id !== currentUser?.id) {
          setConversationMessages(prev => [...prev, {
            id: Date.now() + Math.random(),
            sender: lastMsg.sender_id,
            content: lastMsg.message,
            timestamp: lastMsg.timestamp
          }]);
        }
        
        // Marquer comme lu immédiatement si on est déjà dans la conversation
        if (lastMsg.sender_id === activeContact.id) {
           const conv = (conversations || []).find(c => c.other_participant && c.other_participant.id === activeContact.id);
           if (conv) {
             messagingService.markAsRead(conv.id).then(() => fetchUnreadStatus());
           }
        }
      }
    }
  }, [wsMessages, activeContact, conversations, fetchUnreadStatus]);

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages]);

  const handleSend = () => {
    if (!inputValue.trim() || !activeContact) return;
    
    // Affichage optimiste du message immédiatement
    const tempMsg = {
      id: Date.now() + Math.random(),
      sender: currentUser?.id || null, // Ensure we use current user ID for sent styling
      content: inputValue,
      timestamp: new Date().toISOString()
    };
    setConversationMessages(prev => [...prev, tempMsg]);
    
    sendMessage(inputValue, activeContact.id);
    setInputValue('');
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const currentUser = JSON.parse(localStorage.getItem('user')) || {};
  const isMedecin = (currentUser.groups || []).some(g => (typeof g === 'string' ? g : g.name).toUpperCase() === 'MEDECIN');
  const isActiveContactSecretaire = (activeContact?.groups || []).some(g => (typeof g === 'string' ? g : g.name).toUpperCase() === 'SECRETAIRE');

  const unreadSec = (conversations || []).some(c => {
    if (c.unread_count <= 0) return false;
    const groups = (c.other_participant?.groups || []).map(g => (typeof g === 'string' ? g : g.name).toUpperCase());
    return groups.includes('SECRETAIRE');
  });

  const unreadMed = (conversations || []).some(c => {
    if (c.unread_count <= 0) return false;
    const groups = (c.other_participant?.groups || []).map(g => (typeof g === 'string' ? g : g.name).toUpperCase());
    return groups.includes('MEDECIN');
  });

  return (
    <div className="messaging-container">
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">Messages</div>
        <div className="chat-search-container">
          <div className="chat-search-wrapper">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input 
              type="text" 
              className="chat-search-input" 
              placeholder="" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="chat-tabs">
          <div 
            className={`chat-tab ${filterRole === 'SECRETAIRE' ? 'active' : ''}`}
            onClick={() => {
              setFilterRole('SECRETAIRE');
              setActiveContact(null);
            }}
            style={{ position: 'relative' }}
          >
            Secrétaires
            {unreadSec && filterRole !== 'SECRETAIRE' && <div className="tab-unread-dot"></div>}
          </div>
          <div 
            className={`chat-tab ${filterRole === 'MEDECIN' ? 'active' : ''}`}
            onClick={() => {
              setFilterRole('MEDECIN');
              setActiveContact(null);
            }}
            style={{ position: 'relative' }}
          >
            Médecins
            {unreadMed && filterRole !== 'MEDECIN' && <div className="tab-unread-dot"></div>}
          </div>
        </div>
        <div className="contacts-list">
          {(filteredContacts || []).map(contact => (
            <div 
              key={contact.id} 
              className={`contact-item ${activeContact?.id === contact.id ? 'active' : ''}`}
              onClick={() => setActiveContact(contact)}
            >
              <div className="contact-avatar">
                {contact.first_name ? contact.first_name[0] : (contact.username ? contact.username[0].toUpperCase() : '?')}
                {activeContact?.id !== contact.id && (conversations || []).find(c => c.other_participant && c.other_participant.id === contact.id)?.unread_count > 0 && (
                  <div className="unread-dot"></div>
                )}
              </div>
              <div className="contact-info">
                <div className="contact-name">
                  {contact.first_name ? `${contact.first_name} ${contact.last_name}` : contact.username}
                </div>
                <div className="contact-role" style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
                   {contact.groups?.[0]?.name || 'Membre'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-main">
        {activeContact ? (
          <>
            <div className="chat-header">
              <div className="contact-avatar">
                {activeContact.first_name?.[0] || activeContact.username[0]}
              </div>
              <div>
                <div className="contact-name">{activeContact.first_name} {activeContact.last_name}</div>
                <div style={{fontSize: '0.8rem', color: '#10b981'}}>En ligne</div>
              </div>
            </div>

            <div className="messages-container">
              {conversationMessages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`message-bubble ${msg.sender === activeContact.id ? 'message-received' : 'message-sent'}`}
                >
                  {msg.content}
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              {isMedecin && isActiveContactSecretaire && (
                <button 
                  className="assistance-btn" 
                  onClick={() => sendMessage("J'ai besoin d'assistance", activeContact.id)}
                >
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  Besoin d'assistance
                </button>
              )}
              <input 
                type="text" 
                className="chat-input" 
                placeholder="Écrivez votre message..." 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <button className="send-button" onClick={handleSend}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="empty-chat">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
            </svg>
            <p>Sélectionnez un contact pour commencer à discuter</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
