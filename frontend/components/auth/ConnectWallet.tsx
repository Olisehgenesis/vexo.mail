// components/auth/ConnectWallet.js
import React from 'react';
import { useConnect } from 'wagmi';

const ConnectWallet = ({ onConnect }) => {
  const { connectors, connect, error, isLoading } = useConnect();

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium text-gray-900">Connect your wallet</h3>
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => {
            connect({ connector });
            if (onConnect) onConnect();
          }}
          disabled={!connector.ready || isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400"
        >
          {connector.name}
          {isLoading && connector.id === pendingConnector?.id && ' (connecting)'}
        </button>
      ))}

      {error && <div className="text-red-500 text-sm">{error.message}</div>}
    </div>
  );
};

export default ConnectWallet;