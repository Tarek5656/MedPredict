import api from './api';

const messagingService = {
  getConversations: async () => {
    const response = await api.get('/messaging/conversations/');
    return response.data;
  },
  
  getMessages: async (conversationId) => {
    const response = await api.get(`/messaging/${conversationId}/messages/`);
    return response.data;
  },
  
  getContacts: async () => {
    const response = await api.get('/messaging/contacts/');
    return response.data;
  },
  
  markAsRead: async (conversationId) => {
    const response = await api.post(`/messaging/${conversationId}/mark_as_read/`);
    return response.data;
  }
};

export default messagingService;
