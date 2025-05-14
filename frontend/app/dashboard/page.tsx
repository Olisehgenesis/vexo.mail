'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import EmailList from '@/components/email/EmailList';
import ComposeFab from '@/components/email/ComposeFab';
import { useAuth } from '@/context/AuthContext';
import { useEmails } from '@/context/EmailContext';
import { authAPI } from '@/utils/api';
import authState from '@/utils/authState';
import DiagnosticPanel from './panel';

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoggedIn, loading: authLoading, checkToken, debugInfo } = useAuth();
  
  // Use the email context
  const emailContext = useEmails();
  const { fetchEmails, currentFolder, loading: emailsLoading, lastRefreshTime } = emailContext || {};
  
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [forcedLoginAttempted, setForcedLoginAttempted] = useState(false);
  
  // Get folder from query
  const searchParams = useSearchParams();
  const folder = searchParams?.get('folder') || 'inbox';
  
  // Function to force login using the API response
  const forceLogin = async () => {
    try {
      console.log("Attempting to force login via API...");
      setForcedLoginAttempted(true);
      
      // Check if we have a valid token first
      if (!authState.hasValidToken()) {
        console.log("No valid token found for force login");
        return false;
      }
      
      const response = await authAPI.getMe();
      
      if (response && response.user) {
        // Set the user in our global auth state
        const result = authState.setUser(response.user);
        
        if (result) {
          console.log('Force login successful:', response.user);
          return true;
        } else {
          console.error('Failed to update auth state');
          return false;
        }
      } else {
        console.error('No user data available from API');
        return false;
      }
    } catch (error) {
      console.error('Force login failed:', error);
      return false;
    }
  };
  
  // Primary authentication check sequence
  const authenticateUser = async () => {
    try {
      // Step 1: Try normal authentication via context
      console.log("Starting auth verification...");
      const isAuthenticated = await checkToken();
      console.log("Auth verification completed:", isAuthenticated);
      
      // Step 2: If Step 1 fails, try force login
      if (!isAuthenticated && !forcedLoginAttempted) {
        console.log("Normal authentication failed, attempting force login...");
        await forceLogin();
      }
      
      setAuthChecked(true);
    } catch (error) {
      console.error('Auth verification error:', error);
      
      // If normal auth fails with error, try force login
      if (!forcedLoginAttempted) {
        console.log("Auth verification failed with error, attempting force login...");
        await forceLogin();
      }
      
      setAuthChecked(true);
      setAuthError('Error checking authentication: ' + (error.message || 'Unknown error'));
    }
  };
  
  // Check authentication on mount
  React.useEffect(() => {
    authenticateUser();
  }, []);
  
  // Fetch emails when authenticated and folder changes
  React.useEffect(() => {
    // Check both the React context and global auth state
    const authenticated = isLoggedIn || (typeof window !== 'undefined' && authState.isLoggedIn);
    
    // Add null check for fetchEmails
    if (authenticated && folder && authChecked && typeof fetchEmails === 'function') {
      fetchEmails(folder);
    }
  }, [isLoggedIn, folder, fetchEmails, authChecked]);
  
  // Manual retry function
  const retryAuthentication = async () => {
    try {
      setAuthChecked(false);
      setAuthError(null);
      setForcedLoginAttempted(false);
      
      // Run the authentication sequence again
      await authenticateUser();
      
      // Force a page reload to ensure everything is fresh
      window.location.reload();
    } catch (error) {
      console.error('Retry authentication error:', error);
      setAuthChecked(true);
      setAuthError('Error during retry: ' + (error.message || 'Unknown error'));
    }
  };
  
  // Check token manually and display details
  const inspectToken = () => {
    // Make sure we're in the browser
    if (typeof window === 'undefined') {
      return { valid: false, message: 'Running on server' };
    }
    
    const token = localStorage.getItem('vexo_token');
    
    if (!token) {
      return { valid: false, message: 'No token found in localStorage' };
    }
    
    try {
      const parts = token.split('.');
      
      if (parts.length !== 3) {
        return { valid: false, message: 'Token is not in valid JWT format' };
      }
      
      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp ? new Date(payload.exp * 1000) : 'No expiration';
      const isExpired = payload.exp && payload.exp * 1000 < Date.now();
      
      return {
        valid: !isExpired,
        message: isExpired ? 'Token is expired' : 'Token is valid',
        payload,
        expiration: exp.toString(),
        isExpired
      };
    } catch (e) {
      return { valid: false, message: 'Error parsing token: ' + e.message };
    }
  };
  
  // Format title based on folder
  const formatTitle = (folder) => {
    return folder.charAt(0).toUpperCase() + folder.slice(1);
  };
  
  // Determine if user is authenticated by combining both auth states
  const isAuthenticated = isLoggedIn || (typeof window !== 'undefined' && authState.isLoggedIn);
  
  // Show loading screen while checking auth
  if (authLoading || !authChecked) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
        <p className="text-gray-500">Checking authentication...</p>
      </div>
    );
  }
  
  // If not logged in, show access denied screen with debug info
  if (!isAuthenticated && authChecked) {
    // Inspect token for debugging - only in browser
    const tokenInfo = typeof window !== 'undefined' ? inspectToken() : { valid: false, message: 'Running on server' };
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Authentication Failed</h2>
            <p className="text-gray-600 mb-6">{authError || 'You are not authenticated to view this page'}</p>
            
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Return to Login
              </button>
              
              <button
                onClick={retryAuthentication}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Retry Authentication
              </button>
            </div>
          </div>
          
          {/* Debug Information (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-100 p-4 rounded-lg text-sm">
              <h3 className="font-semibold text-gray-700 mb-2">Debug Information:</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Authentication State:</h4>
                  <ul className="list-disc pl-5 text-xs space-y-1">
                    <li><strong>Context IsLoggedIn:</strong> {isLoggedIn ? 'true' : 'false'}</li>
                    <li><strong>Global IsLoggedIn:</strong> {typeof window !== 'undefined' && authState.isLoggedIn ? 'true' : 'false'}</li>
                    <li><strong>User:</strong> {user ? JSON.stringify(user).substring(0, 100) + '...' : 'null'}</li>
                    <li><strong>Global User:</strong> {typeof window !== 'undefined' && authState.user ? JSON.stringify(authState.user).substring(0, 100) + '...' : 'null'}</li>
                    <li><strong>Auth Error:</strong> {authError || 'None'}</li>
                    <li><strong>Auth Checked:</strong> {authChecked ? 'true' : 'false'}</li>
                    <li><strong>Forced Login Attempted:</strong> {forcedLoginAttempted ? 'true' : 'false'}</li>
                    <li><strong>Email Context:</strong> {emailContext ? 'Available' : 'Missing'}</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Token Information:</h4>
                  <ul className="list-disc pl-5 text-xs space-y-1">
                    <li><strong>Status:</strong> {tokenInfo.valid ? 'Valid' : 'Invalid'}</li>
                    <li><strong>Message:</strong> {tokenInfo.message}</li>
                    {tokenInfo.expiration && (
                      <li><strong>Expiration:</strong> {tokenInfo.expiration}</li>
                    )}
                    {tokenInfo.isExpired !== undefined && (
                      <li><strong>Is Expired:</strong> {tokenInfo.isExpired ? 'Yes' : 'No'}</li>
                    )}
                  </ul>
                </div>
                
                <div className="col-span-2">
                  <button
                    onClick={forceLogin}
                    className="mt-2 px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium"
                  >
                    Manual Force Login
                  </button>
                </div>
              </div>
              
              {debugInfo && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-1">API Debug Info:</h4>
                  <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}
              
              {tokenInfo.payload && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-1">Token Payload:</h4>
                  <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(tokenInfo.payload, null, 2)}
                  </pre>
                </div>
              )}
              
              {typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && (
                <div className="mt-4">
                  <DiagnosticPanel />
                </div>
              )}
              
              <div className="mt-4 flex space-x-2 flex-wrap">
                <button
                  onClick={() => {
                    localStorage.removeItem('vexo_token');
                    alert('Token cleared from localStorage');
                  }}
                  className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs"
                >
                  Clear Token
                </button>
                <button
                  onClick={() => {
                    const token = localStorage.getItem('vexo_token');
                    if (token) {
                      alert('Current token: ' + token);
                    } else {
                      alert('No token found in localStorage');
                    }
                  }}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                >
                  Show Token
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                >
                  Refresh Page
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                >
                  Go to Login Page
                </button>
                <button
                  onClick={() => {
                    // Reset all storage and reload
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '/';
                  }}
                  className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs"
                >
                  Reset All & Reload
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <MainLayout title={`${formatTitle(folder)} - Vexo.social`}>
      <div className="h-full flex flex-col">
        <div className="bg-white shadow">
          <div className="px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-lg font-medium text-gray-900">{formatTitle(folder)}</h1>
            
            <div className="flex items-center space-x-4">
              {/* Last refresh time */}
              {lastRefreshTime && (
                <span className="text-xs text-gray-500">
                  Last updated: {lastRefreshTime.toLocaleTimeString()}
                </span>
              )}
              
              {/* Debug options in dev mode */}
              {process.env.NODE_ENV === 'development' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={retryAuthentication}
                    className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    Refresh Auth
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                  >
                    Refresh Page
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {typeof fetchEmails === 'function' ? (
              <EmailList />
            ) : (
              <div className="p-4 text-center text-gray-500">
                Email service not available. Try refreshing the page.
              </div>
            )}
          </div>
        </div>
        
        {/* Compose Button */}
        <ComposeFab />
      </div>
    </MainLayout>
  );
}