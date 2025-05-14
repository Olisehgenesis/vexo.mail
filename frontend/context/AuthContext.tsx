// context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { authAPI } from '../utils/api';
import { useAccount, useDisconnect } from 'wagmi';
import authState from '@/utils/authState';

// Create the auth context with default values
const AuthContext = createContext({
  user: null,
  loading: false,
  authError: null,
  isLoggedIn: false,
  debugInfo: null,
  checkToken: async () => false,
  logout: async () => false,
});

export const AuthProvider = ({ children }) => {
  // Initialize state from global auth state
  const [user, setUser] = useState(null); // Start with null and initialize in useEffect
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Initialize with global auth state once on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize from global state
      authState.init();
      setUser(authState.user);
    }
  }, []);

  // Listen for auth state changes from outside components
  useEffect(() => {
    const handleAuthChange = (event) => {
      console.log('Auth state change event received:', event.detail);
      setUser(event.detail.user);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('auth-state-change', handleAuthChange);
      
      return () => {
        window.removeEventListener('auth-state-change', handleAuthChange);
      };
    }
  }, []);

  // Check if token is valid
  const checkToken = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      
      // Check if we already have a user in global state
      if (authState.isLoggedIn && authState.user) {
        setUser(authState.user);
        console.log('User already set in global state:', authState.user);
        return true;
      }
      
      // Check if token exists and is valid
      if (!authState.hasValidToken()) {
        console.log('No valid token found');
        setUser(null);
        return false;
      }
      
      // Fetch user data from API
      try {
        console.log('Fetching user data from API');
        const response = await authAPI.getMe();

        // Store debug info
        setDebugInfo({
          apiResponse: response,
          timestamp: new Date().toISOString()
        });
        
        if (response && response.user) {
          // Update both local state and global state
          setUser(response.user);
          authState.setUser(response.user);
          console.log('User data fetched successfully:', response.user);
          return true;
        }
        
        throw new Error('Invalid response from API');
      } catch (apiError) {
        console.error('API error:', apiError);
        setDebugInfo({
          apiError: apiError.message || String(apiError),
          timestamp: new Date().toISOString()
        });
        throw apiError;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthError(error.message || 'Authentication failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Check authentication on mount
  useEffect(() => {
    if (!initialized && typeof window !== 'undefined') {
      // First check our global state
      if (authState.isLoggedIn && authState.user) {
        setUser(authState.user);
        setLoading(false);
        setInitialized(true);
        console.log('Auth initialized from global state:', authState.user);
      } else {
        // Try API check
        checkToken()
          .then(isAuthenticated => {
            console.log('Auth check result:', isAuthenticated);
            setInitialized(true);
          })
          .catch(error => {
            console.error('Auth check error:', error);
            setInitialized(true);
          });
      }
    }
  }, [initialized]);

  // Handle logout
  const logout = async () => {
    try {
      // Clear auth state
      authState.clearUser();
      setUser(null);
      
      // Clear token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vexo_token');
      }
      
      // Disconnect wallet
      disconnect();
      
      // Show success message
      toast.success('Successfully logged out');
      
      // Redirect to homepage
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
      return false;
    }
  };

  // Context value
  const value = {
    user,
    loading,
    authError,
    isLoggedIn: !!user,
    debugInfo,
    checkToken,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context - avoiding invalid hook calls
export const useAuth = () => {
  // The useContext hook must be called directly
  return useContext(AuthContext);
};

export default AuthContext;