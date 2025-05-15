// utils/api.js - Add improved error handling and diagnostics
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5067/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout to prevent hanging requests
  timeout: 10000,
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vexo_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log outgoing requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: config.data,
        withCredentials: config.withCredentials,
      });
    }
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`, {
        data: response.data,
        headers: response.headers,
      });
    }
    
    return response;
  },
  (error) => {
    // Enhance error object with more details
    const enhancedError = {
      ...error,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      requestUrl: error.config?.url,
      requestMethod: error.config?.method,
    };
    
    // Log detailed error info
    console.error('❌ API Error:', {
      status: enhancedError.status,
      message: enhancedError.message,
      data: enhancedError.data,
      url: enhancedError.requestUrl,
      method: enhancedError.requestMethod,
    });
    
    // Special handling for authentication errors
    if (enhancedError.status === 401) {
      console.warn('Authentication error - token may be invalid or expired');
      // Don't automatically clear token here, let the auth context handle it
    }
    
    return Promise.reject(enhancedError);
  }
);

// Authentication API
export const authAPI = {
  // Get nonce for wallet signature
  getNonce: async (address: string) => {
    try {
      const response = await api.get(`/auth/nonce?address=${address}`);
      return response.data;
    } catch (error) {
      console.error('getNonce error:', error);
      throw error;
    }
  },
  
  // Verify signature
  verifySignature: async (address, signature, nonce, publicKey, baseName = null, emailAddress = null) => {
    try {
      const response = await api.post('/auth/verify', {
        address,
        signature,
        nonce,
        publicKey,
        baseName,
        emailAddress
      });
      return response.data;
    } catch (error) {
      console.error('verifySignature error:', error);
      throw error;
    }
  },

  // Check basename 
  checkBasename: async (address: string) => {
    try {
      const response = await api.get(`/auth/basename?address=${address}`);
      return response.data;
    } catch (error) {
      console.error('checkBasename error:', error);
      throw error;
    }
  },
  
  // Check domain name for wallet
  checkDomain: async (address: string) => {
    try {
      const response = await api.get(`/auth/domain?address=${address}`);
      return response.data;
    } catch (error) {
      console.error('checkDomain error:', error);
      throw error;
    }
  },
  
  // Get current user info
  getMe: async () => {
    try {
      console.log('Making getMe API call with token in header');
      const token = localStorage.getItem('vexo_token');
      console.log('Token for getMe request:', token ? `${token.substring(0, 15)}...` : 'none');
      
      const response = await api.get('/auth/me');
      
      console.log('getMe successful response:', response.data);
      return response.data;
    } catch (error) {
      console.error('getMe error:', error);
      // Check if it's a CORS error
      if (error.message?.includes('Network Error') || !error.status) {
        console.error('Possible CORS or network issue with getMe request');
      }
      
      // Get detailed error info
      const details = {
        status: error.status,
        data: error.data,
        message: error.message,
      };
      console.error('Detailed getMe error:', details);
      
      throw error;
    }
  },
  
  // Manual token validation (for debugging)
  validateToken: async (token) => {
    try {
      // Make a direct request with the token to validate it
      const response = await axios.get(`${API_URL}/auth/validate-token`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return {
        valid: true,
        data: response.data
      };
    } catch (error) {
      return {
        valid: false,
        error: error.response?.data || error.message
      };
    }
  }
};

// Add these exports for better debugging
export const apiDebug = {
  getBaseUrl: () => API_URL,
  testConnection: async () => {
    try {
      const response = await axios.get(`${API_URL}/health`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  inspectToken: () => {
    const token = localStorage.getItem('vexo_token');
    if (!token) return { valid: false, message: 'No token found' };
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return { valid: false, message: 'Invalid token format' };
      
      const payload = JSON.parse(atob(parts[1]));
      return {
        valid: true,
        payload,
        expiration: new Date(payload.exp * 1000).toISOString(),
        isExpired: payload.exp * 1000 < Date.now()
      };
    } catch (e) {
      return { valid: false, message: e.message };
    }
  }
};

export default api;