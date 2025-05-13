// components/auth/ConnectWallet.js
import React, { useEffect } from 'react';
import { useConnect, useAccount } from 'wagmi';
import { useBaseNames } from '../../utils/useBaseNames';

const ConnectWallet = ({ onConnect }) => {
  const { connectors, connect, error: connectError, isLoading, pendingConnector } = useConnect();
  const { address, isConnected } = useAccount();
  const { 
    baseName, 
    emailAddress,
    loading: loadingBaseName, 
    error: baseNameError,
    fetchBaseName 
  } = useBaseNames();

  // Fetch Base name when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      fetchBaseName();
    }
  }, [isConnected, address, fetchBaseName]);

  // Handle successful connection
  useEffect(() => {
    if (isConnected && onConnect) {
      onConnect({ 
        address, 
        baseName, 
        emailAddress 
      });
    }
  }, [isConnected, onConnect, baseName, emailAddress, address]);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium text-gray-900">Connect your wallet</h3>
      
      {!isConnected ? (
        // Show connectors if not connected
        <>
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => connect({ connector })}
              disabled={!connector.ready || isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400"
            >
              {connector.name}
              {isLoading && connector.id === pendingConnector?.id && ' (connecting)'}
            </button>
          ))}
          
          {connectError && <div className="text-red-500 text-sm">{connectError.message}</div>}
        </>
      ) : (
        // Show connected state with basename info
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-700">
            Connected: <span className="font-medium">{address.substring(0, 6)}...{address.substring(address.length - 4)}</span>
          </p>
          
          {loadingBaseName ? (
            <p className="text-xs text-gray-500 mt-1">Loading Base name...</p>
          ) : baseName ? (
            <div className="mt-2">
              <p className="text-sm text-gray-900">
                <span className="font-medium">Base Name:</span> {baseName}
              </p>
              <p className="text-sm text-gray-900">
                <span className="font-medium">Email:</span> {emailAddress}
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-500 mt-1">No Base name found for this wallet</p>
          )}
          
          {baseNameError && <p className="text-xs text-red-500 mt-1">{baseNameError}</p>}
        </div>
      )}
    </div>
  );
};

export default ConnectWallet;