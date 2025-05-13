import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vexo_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Authentication API
export const authAPI = {
  // Get nonce for wallet signature
  getNonce: async (address) => {
    const response = await api.get(`/auth/nonce?address=${address}`);
    return response.data;
  },
  
  // Verify wallet signature
  verifySignature: async (address, signature, nonce, publicKey) => {
    const response = await api.post('/auth/verify', {
      address,
      signature,
      nonce,
      publicKey,
    });
    return response.data;
  },
  
  // Check domain name for wallet
  checkDomain: async (address) => {
    const response = await api.get(`/auth/domain?address=${address}`);
    return response.data;
  },
  
  // Get current user info
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Email API
export const emailAPI = {
  // Send an email
  sendEmail: async (emailData) => {
    const response = await api.post('/email/send', emailData);
    return response.data;
  },
  
  // Get emails for a folder
  getEmails: async (folder = 'inbox', page = 1, limit = 20) => {
    const response = await api.get(`/email/${folder}`, {
      params: { page, limit },
    });
    return response.data;
  },
  
  // Get a single email
  getEmail: async (emailId) => {
    const response = await api.get(`/email/message/${emailId}`);
    return response.data;
  },
  
  // Mark email as read
  markAsRead: async (emailId) => {
    const response = await api.put(`/email/read/${emailId}`);
    return response.data;
  },
  
  // Mark email as unread
  markAsUnread: async (emailId) => {
    const response = await api.put(`/email/unread/${emailId}`);
    return response.data;
  },
  
  // Move email to a folder
  moveToFolder: async (emailId, folder) => {
    const response = await api.put(`/email/move/${emailId}`, { folder });
    return response.data;
  },
  
  // Delete email (moves to trash)
  deleteEmail: async (emailId) => {
    const response = await api.put(`/email/move/${emailId}`, { folder: 'trash' });
    return response.data;
  },
};

export default api;