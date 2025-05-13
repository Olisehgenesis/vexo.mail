// components/auth/LoginForm.js
'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { useAccount, useDisconnect } from 'wagmi';
import { authAPI } from '@/utils/api'; // Use your api utility instead of axios directly

const LoginForm = () => {
  const { signInWithWallet, loading, authError } = useAuth();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [baseName, setBaseName] = useState(null);
  const [loadingBaseName, setLoadingBaseName] = useState(false);
  const [emailAddress, setEmailAddress] = useState(null);
  const [baseNameError, setBaseNameError] = useState(null);

  // Fetch Base name from API
  const fetchBaseName = async (walletAddress) => {
    if (!walletAddress) return;
    
    try {
      setLoadingBaseName(true);
      setBaseNameError(null);
      
      // Use the authAPI utility to call the backend
      const data = await authAPI.checkBasename(walletAddress);
      
      if (data && data.baseName) {
        setBaseName(data.baseName);
        setEmailAddress(data.emailAddress);
      } else {
        // No Base name found, use wallet address as fallback
        setBaseName(null);
        setEmailAddress(data.emailAddress || `${walletAddress.slice(0, 8).toLowerCase()}@vexo.social`);
      }
    } catch (error) {
      console.error('Error fetching Base name:', error);
      // Use wallet address as fallback
      setBaseName(null);
      setEmailAddress(`${walletAddress.slice(0, 8).toLowerCase()}@vexo.social`);
      setBaseNameError('Failed to load Base name');
    } finally {
      setLoadingBaseName(false);
    }
  };

  // Handle wallet connection
  const handleConnect = (data) => {
    console.log('Wallet connected:', data);
    if (data?.address) {
      fetchBaseName(data.address);
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    setBaseName(null);
    setEmailAddress(null);
  };

  // Fetch Base name when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      console.log('Connected wallet address:', address);
      fetchBaseName(address);
    }
  }, [isConnected, address]);

  return (
    <div className="space-y-6">
      {!isConnected ? (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Connect your wallet</h3>
          <Wallet onConnect={handleConnect}>
            <ConnectWallet 
              buttonClassName="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400"
            />
          </Wallet>
        </div>
      ) : (
        <>
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-md font-medium text-gray-900">Wallet Connected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {address.slice(0, 10)}...{address.slice(-8)}
                </p>
              </div>
              
              {/* Disconnect button */}
              <button
                onClick={handleDisconnect}
                className="text-sm text-gray-500 hover:text-red-500"
              >
                Disconnect
              </button>
            </div>
            
            {loadingBaseName ? (
              <p className="mt-2 text-sm text-gray-500">Loading Base name...</p>
            ) : (
              <div className="mt-2">
                {baseName ? (
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Base Name:</span> {baseName}
                  </p>
                ) : (
                  <p className="text-sm text-yellow-600">
                    No Base name found for this wallet
                  </p>
                )}
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Email:</span> {emailAddress}
                </p>
                
                {baseNameError && (
                  <p className="text-xs text-red-500 mt-1">{baseNameError}</p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => signInWithWallet(baseName, emailAddress)}
            disabled={loading || loadingBaseName}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400"
          >
            {loading ? 'Signing in...' : 'Sign in with wallet'}
          </button>

          {authError && (
            <div className="text-red-500 text-sm mt-2">{authError}</div>
          )}
        </>
      )}
      
      {/* Debug information in development */}
      {process.env.NODE_ENV === 'development' && isConnected && (
        <div className="mt-4 p-4 bg-gray-100 rounded-md text-xs">
          <h4 className="font-medium">Debug Info:</h4>
          <pre className="mt-2 overflow-auto">
            {JSON.stringify({
              address,
              connected: isConnected,
              baseName,
              emailAddress,
              loading: { auth: loading, baseName: loadingBaseName },
              error: { auth: authError, baseName: baseNameError }
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default LoginForm;