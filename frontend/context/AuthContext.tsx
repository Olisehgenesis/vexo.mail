// context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { authAPI } from '../utils/api';
import { useAccount, useDisconnect, useSignMessage } from 'wagmi';

// Create the authentication context
const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  const router = useRouter();
  const { address, isConnected} = useAccount();
  const { signMessage } = useSignMessage();
  const { disconnect } = useDisconnect();

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('vexo_token');
        
        if (!token) {
          setLoading(false);
          return;
        }
        
        if (!isConnected) {
          setLoading(false);
          return;
        }
        
        // Get current user
        const { user } = await authAPI.getMe();
        setUser(user);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('vexo_token');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [isConnected]);

  // Handle wallet authentication
 // context/AuthContext.js (update the signInWithWallet method)
const signInWithWallet = async (baseName = null, emailAddress = null) => {
  try {
    setAuthError(null);
    setLoading(true);
    
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }
    
    // 1. Get nonce from server
    const { nonce } = await authAPI.getNonce(address);
    
    // 2. Sign message with wallet
    const message = `Sign this message to access your vexo.social email account.\n\nNonce: ${nonce}`;
    const signature = await signMessage(message);
    
    // 3. Generate a public key from the wallet
    const publicKey = ethers.keccak256(ethers.toUtf8Bytes(signature)).slice(0, 42);
    
    // 4. Verify signature on server and get token
    const { token, user: userData } = await authAPI.verifySignature(
      address,
      signature,
      nonce,
      publicKey,
      baseName,
      emailAddress
    );
    
    // 5. Save auth data
    localStorage.setItem('vexo_token', token);
    setUser(userData);
    
    // 6. Redirect to dashboard
    router.push('/dashboard');
    
    toast.success('Successfully signed in!');
    return userData;
  } catch (error) {
    console.error('Authentication error:', error);
    toast.error(error.response?.data?.error || error.message || 'Authentication failed');
    setAuthError(error.response?.data?.error || error.message || 'Authentication failed');
    return null;
  } finally {
    setLoading(false);
  }
};

  // Handle logout
  const logout = async () => {
    try {
      // Clear local storage
      localStorage.removeItem('vexo_token');
      
      // Disconnect wallet
      disconnect();
      
      // Reset state
      setUser(null);
      
      // Redirect to homepage
      router.push('/');
      
      toast.success('Successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  // Context value
  const value = {
    user,
    loading,
    authError,
    isLoggedIn: !!user,
    signInWithWallet,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);