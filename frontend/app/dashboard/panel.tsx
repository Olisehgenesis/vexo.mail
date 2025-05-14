'use client';
import { useState, useEffect } from 'react';
import authState from '@/utils/authState';

// Import API utilities only in useEffect to prevent server-side execution
let authAPI, apiDebug;

const DiagnosticPanel = () => {
  const [results, setResults] = useState({ loading: true, data: null, error: null });
  const [isClient, setIsClient] = useState(false);
  
  // Check if we're in the browser
  useEffect(() => {
    setIsClient(true);
    // Only import these on the client side
    try {
      const apiUtils = require('@/utils/api');
      authAPI = apiUtils.authAPI;
      apiDebug = apiUtils.apiDebug;
    } catch (err) {
      console.error("Failed to load API utils:", err);
    }
  }, []);
  
  const runDiagnostics = async () => {
    // Don't run diagnostics on the server
    if (typeof window === 'undefined') return;
    
    try {
      setResults({ loading: true, data: null, error: null });
      
      // Make sure we've loaded our API utilities
      if (!authAPI || !apiDebug) {
        try {
          const apiUtils = require('@/utils/api');
          authAPI = apiUtils.authAPI;
          apiDebug = apiUtils.apiDebug;
        } catch (err) {
          throw new Error("Could not load API utilities: " + (err.message || "Unknown error"));
        }
      }
      
      // Step 1: Retrieve and inspect the token
      const tokenInfo = apiDebug.inspectToken();
      
      // Step 2: Test basic API connectivity
      const connectionTest = await apiDebug.testConnection();
      
      // Step 3: Test the token validation endpoint
      let tokenValidation = { success: false, error: 'Not attempted' };
      if (tokenInfo.valid) {
        try {
          tokenValidation = await authAPI.validateToken(localStorage.getItem('vexo_token'));
        } catch (e) {
          tokenValidation = { success: false, error: e.message || String(e) };
        }
      }
      
      // Step 4: Test the getMe endpoint directly
      let getMeTest = { success: false, error: 'Not attempted' };
      if (tokenInfo.valid) {
        try {
          const response = await authAPI.getMe();
          getMeTest = { success: true, data: response };
        } catch (e) {
          getMeTest = { 
            success: false, 
            error: e.message || String(e),
            details: typeof e === 'object' ? 
              JSON.parse(JSON.stringify(e, Object.getOwnPropertyNames(e))) : 
              String(e)
          };
        }
      }
      
      setResults({
        loading: false,
        data: {
          timestamp: new Date().toISOString(),
          tokenInfo,
          connectionTest,
          tokenValidation,
          getMeTest,
          apiBaseUrl: apiDebug.getBaseUrl()
        },
        error: null
      });
    } catch (error) {
      setResults({
        loading: false,
        data: null,
        error: error.message || String(error)
      });
    }
  };
  
  // Force login using the global authState utility
  const forceLogin = async () => {
    try {
      // Try to get user data directly
      const response = await authAPI.getMe();
      
      if (response && response.user) {
        // Set the user in our global auth state
        const result = authState.setUser(response.user);
        
        if (result) {
          alert('Auth state updated successfully! Reloading page...');
          window.location.reload();
          return true;
        } else {
          alert('Failed to update auth state');
          return false;
        }
      } else {
        alert('No user data available from API tests');
        return false;
      }
    } catch (error) {
      alert('Failed to force login: ' + (error.message || 'Unknown error'));
      return false;
    }
  };
  
  // Only run diagnostics once we're on the client side
  useEffect(() => {
    if (isClient) {
      runDiagnostics();
    }
  }, [isClient]);
  
  // If still on server or loading, show loading state
  if (!isClient || results.loading) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
          <p className="text-sm text-gray-600">
            {!isClient ? 'Initializing...' : 'Running diagnostics...'}
          </p>
        </div>
      </div>
    );
  }
  
  if (results.error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <h3 className="text-red-700 font-medium">Diagnostic Error</h3>
        <p className="text-red-600 text-sm">{results.error}</p>
        <button 
          onClick={runDiagnostics}
          className="mt-2 text-xs bg-red-100 px-2 py-1 rounded text-red-700"
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (!results.data) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg">
        <h3 className="text-yellow-700 font-medium">No Data Available</h3>
        <p className="text-yellow-600 text-sm">Failed to collect diagnostic data.</p>
        <button 
          onClick={runDiagnostics}
          className="mt-2 text-xs bg-yellow-100 px-2 py-1 rounded text-yellow-700"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  const data = results.data;
  
  return (
    <div className="p-4 bg-gray-100 rounded-lg text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-gray-700 font-medium">API Diagnostics</h3>
        <button 
          onClick={runDiagnostics}
          className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-700"
        >
          Run Again
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-gray-700">API Configuration:</h4>
          <p className="text-gray-600">Base URL: {data.apiBaseUrl}</p>
          <p className="text-gray-600">Time: {data.timestamp}</p>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700">API Connection:</h4>
          {data.connectionTest.success ? (
            <p className="text-green-600">✅ Connection successful</p>
          ) : (
            <p className="text-red-600">❌ Connection failed: {String(data.connectionTest.error)}</p>
          )}
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700">Token Status:</h4>
          {data.tokenInfo.valid && (
            <button
              onClick={() => {
                // Extract user data from token
                const { userId, walletAddress } = data.tokenInfo.payload;
                
                // Set basic user data
                const basicUser = {
                  id: userId,
                  walletAddress: walletAddress,
                  emailAddress: data.getMeTest.success ? 
                    data.getMeTest.data.user.emailAddress : 
                    `${walletAddress.slice(0, 8)}@vexo.social`,
                  baseName: data.getMeTest.success ? 
                    data.getMeTest.data.user.baseName : 
                    null
                };
                
                // Set the user in our global auth state
                const result = authState.setUser(basicUser);
                
                if (result) {
                  alert('Login with token data successful! Reloading page...');
                  window.location.reload();
                } else {
                  alert('Failed to login with token data');
                }
              }}
              className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs ml-2"
            >
              Login with Token Data
            </button>
          )}
          {data.tokenInfo.valid ? (
            <div>
              <p className="text-green-600">✅ Token is valid</p>
              <p className="text-gray-600">Expires: {data.tokenInfo.expiration}</p>
              <p className="text-gray-600">User ID: {data.tokenInfo.payload.userId}</p>
              <p className="text-gray-600">Wallet: {data.tokenInfo.payload.walletAddress}</p>
            </div>
          ) : (
            <p className="text-red-600">❌ Token invalid: {String(data.tokenInfo.message)}</p>
          )}
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700">Token Validation:</h4>
          {data.tokenValidation.success ? (
            <p className="text-green-600">✅ Token validated by server</p>
          ) : (
            <p className="text-red-600">❌ Token validation failed: {String(data.tokenValidation.error)}</p>
          )}
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700">Get User Test:</h4>
          {data.getMeTest.success ? (
            <div>
              <p className="text-green-600">✅ Got user data successfully</p>
              <pre className="mt-1 p-2 bg-gray-800 text-green-400 rounded text-xs overflow-auto max-h-24">
                {JSON.stringify(data.getMeTest.data, null, 2)}
              </pre>
            </div>
          ) : (
            <div>
              <p className="text-red-600">❌ Get user failed: {String(data.getMeTest.error)}</p>
              {data.getMeTest.details && (
                <pre className="mt-1 p-2 bg-gray-800 text-red-400 rounded text-xs overflow-auto max-h-24">
                  {typeof data.getMeTest.details === 'string' 
                    ? data.getMeTest.details 
                    : JSON.stringify(data.getMeTest.details, null, 2)}
                </pre>
              )}
            </div>
          )}
          
          <div className="mt-2 flex space-x-2">
            <button
              onClick={forceLogin}
              className="text-xs bg-green-100 px-2 py-1 rounded text-green-700"
            >
              Force Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticPanel;