'use client';

import React, { useState, useEffect } from 'react';
import { Copy, ExternalLink, CheckCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  
  // Close modal when escape key is pressed
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);
  
  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [copied]);
  
  // Format address for display (e.g., 0x1234...5678)
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Copy address to clipboard
  const copyAddress = () => {
    if (user?.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress);
      setCopied(true);
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to disconnect your wallet?')) {
      logout();
      onClose();
    }
  };
  
  // View on blockchain explorer
  const viewOnExplorer = () => {
    if (user?.walletAddress) {
      window.open(`https://etherscan.io/address/${user.walletAddress}`, '_blank');
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden transform transition-all animate-scale-in">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Your Wallet</h3>
        </div>
        
        {/* Modal Body */}
        <div className="px-6 py-4">
          {user ? (
            <div className="space-y-4">
              {/* Wallet Address */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {user.walletAddress?.substring(2, 4).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatAddress(user.walletAddress || '')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.emailAddress}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      onClick={copyAddress}
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                      title="Copy Address"
                    >
                      {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <button 
                      onClick={viewOnExplorer}
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                      title="View on Explorer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* User details */}
              {user.baseName && (
                <div className="px-3 py-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center justify-between mb-1">
                      <span>Base Name:</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{user.baseName}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Disconnect Wallet
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-gray-500 dark:text-gray-400">
              <p>No wallet connected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletModal;