// utils/emailAPI.js
import api from './api';

// Email API utilities
export const emailAPI = {
  // Get emails for a folder
  getEmails: async (folder = 'inbox', page = 1, limit = 20) => {
    try {
      console.log(`Fetching emails for ${folder}, page ${page}`);
      const response = await api.get(`/emails/${folder}?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  },
  
  // Get a single email
  getEmail: async (emailId) => {
    try {
      const response = await api.get(`/emails/view/${emailId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching email:', error);
      throw error;
    }
  },
  
  // Send an email
  sendEmail: async (emailData) => {
    try {
      const response = await api.post('/emails/send', emailData);
      return response.data;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  },
  
  // Mark email as read
  markAsRead: async (emailId) => {
    try {
      const response = await api.put(`/emails/${emailId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking email as read:', error);
      throw error;
    }
  },
  
  // Mark email as unread
  markAsUnread: async (emailId) => {
    try {
      const response = await api.put(`/emails/${emailId}/unread`);
      return response.data;
    } catch (error) {
      console.error('Error marking email as unread:', error);
      throw error;
    }
  },
  
  // Move email to folder
  moveToFolder: async (emailId, folder) => {
    try {
      const response = await api.put(`/emails/${emailId}/move`, { folder });
      return response.data;
    } catch (error) {
      console.error('Error moving email:', error);
      throw error;
    }
  },
  
  // Delete email (move to trash)
  deleteEmail: async (emailId) => {
    try {
      const response = await api.delete(`/emails/${emailId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting email:', error);
      throw error;
    }
  }
};

export default emailAPI;