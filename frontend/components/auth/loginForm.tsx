// components/auth/LoginForm.js
import React from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '../../contexts/AuthContext';
import ConnectWallet from './ConnectWallet';

const LoginForm = () => {
  const { isConnected, address } = useAccount();
  const { signInWithWallet, loading, authError, domainInfo, checkingDomain } = useAuth();

  return (
    <div className="space-y-6">
      {!isConnected ? (
        <ConnectWallet />
      ) : (
        <>
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-md font-medium text-gray-900">Wallet Connected</h3>
            <p className="mt-1 text-sm text-gray-500">
              {address.slice(0, 10)}...{address.slice(-8)}
            </p>
            
            {checkingDomain ? (
              <p className="mt-2 text-sm text-gray-500">Checking for domain names...</p>
            ) : domainInfo?.name ? (
              <div className="mt-2">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Domain:</span> {domainInfo.name}
                </p>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Email:</span> {domainInfo.emailAddress}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-yellow-600">
                No ENS or Base name found for this wallet.
                You'll get a wallet-based address.
              </p>
            )}
          </div>

          <button
            onClick={signInWithWallet}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400"
          >
            {loading ? 'Signing in...' : 'Sign in with wallet'}
          </button>

          {authError && (
            <div className="text-red-500 text-sm mt-2">{authError}</div>
          )}
        </>
      )}
    </div>
  );
};

export default LoginForm;