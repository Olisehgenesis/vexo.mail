'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Trash, 
  Archive, 
  Reply, 
  Forward,
  MoreHorizontal,
  Share2,
  Copy,
  CheckCircle,
  Database,
  Loader2,
  Info
} from 'lucide-react';
import { useEmails } from '@/context/EmailContext';
import { motion } from 'framer-motion';
import MintButton from '@/utils/mint';

interface EmailViewProps {
  emailId: string;
  onBack: () => void;
}

const EmailView: React.FC<EmailViewProps> = ({ emailId, onBack }) => {
  const { currentEmail, loading, error, fetchEmail, deleteEmail, moveToFolder } = useEmails();
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [minting, setMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [showMintInfo, setShowMintInfo] = useState(false);
  
  // Fetch email if not already loaded
  useEffect(() => {
    if (emailId && (!currentEmail || currentEmail.id !== emailId)) {
      fetchEmail(emailId);
    }
  }, [emailId, currentEmail, fetchEmail]);
  
  // Reset copied state
  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [copied]);
  
  // Auto-hide mint success message
  useEffect(() => {
    if (mintSuccess) {
      const timeout = setTimeout(() => {
        setMintSuccess(false);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [mintSuccess]);
  
  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy \'at\' h:mm a');
    } catch (e) {
      return dateString;
    }
  };
  
  // Handle actions
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this email?')) {
      deleteEmail(emailId);
      onBack();
    }
  };
  
  const handleArchive = () => {
    moveToFolder(emailId, 'archive');
    onBack();
  };
  
  const handleReply = () => {
    if (!currentEmail) return;
    
    // Open compose modal with reply details
    alert(`Reply to: ${currentEmail.from}\nSubject: Re: ${currentEmail.subject}`);
  };
  
  const handleForward = () => {
    if (!currentEmail) return;
    
    // Open compose modal with forwarded email
    alert(`Forward email: ${currentEmail.subject}`);
  };
  
  const copyEmailText = () => {
    if (!currentEmail) return;
    
    const text = `
From: ${currentEmail.from}
To: ${currentEmail.to}
Subject: ${currentEmail.subject}
Date: ${formatDate(currentEmail.sentAt || currentEmail.receivedAt || '')}

${currentEmail.text}
    `;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setShowMenu(false);
  };
  
  // Handle mint email
  const handleMintEmail = async () => {
    if (!currentEmail) return;
    
    try {
      setMinting(true);
      
      // Simulate API call for minting the email on blockchain
      // In a real implementation, you would call your API here
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setMintSuccess(true);
    } catch (error) {
      console.error('Failed to mint email:', error);
      alert('Failed to mint email. Please try again.');
    } finally {
      setMinting(false);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading email...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Back to Inbox
          </button>
        </div>
      </div>
    );
  }
  
  // Not found state
  if (!currentEmail) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 text-yellow-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-4">Email not found</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Back to Inbox
          </button>
        </div>
      </div>
    );
  }
  
  const { from, to, subject, text, html, sentAt, receivedAt } = currentEmail;
  const timestamp = sentAt || receivedAt || '';
  
  // Check if email is minted (default to false)
  const isMinted = currentEmail.minted || false;
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col bg-white dark:bg-gray-800"
    >
      {/* Email header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="mr-4 p-1.5 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={handleReply}
              className="p-1.5 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Reply"
            >
              <Reply className="h-5 w-5" />
            </button>
            
            <button
              onClick={handleForward}
              className="p-1.5 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Forward"
            >
              <Forward className="h-5 w-5" />
            </button>
            
            <button
              onClick={handleArchive}
              className="p-1.5 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Archive"
            >
              <Archive className="h-5 w-5" />
            </button>
            
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-full text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Delete"
            >
              <Trash className="h-5 w-5" />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="More actions"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                    <button
                      onClick={copyEmailText}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                      role="menuitem"
                    >
                      {copied ? <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                      {copied ? 'Copied!' : 'Copy to clipboard'}
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                      role="menuitem"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Forward as attachment
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{subject}</h1>
        
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold mr-3">
              {from.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{from}</p>
                {timestamp && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(timestamp)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                To: {to}
              </p>
            </div>
          </div>
          
          {/* Mint status and button - small and subtle */}
          <div className="flex items-center">
            <div className="relative group">
              <button
                onClick={() => setShowMintInfo(!showMintInfo)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                title="Mint information"
              >
                <Info className="h-4 w-4" />
              </button>
              
              {/* Tooltip for mint info */}
              {showMintInfo && (
                <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 z-20">
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    <p className="font-medium mb-1">Email Minting</p>
                    <p className="mb-2">Minting encrypts your email on IPFS and saves metadata to a base contract, making it available forever and secure on-chain.</p>
                    <p className="italic">Currently free during beta period.</p>
                  </div>
                </div>
              )}
            </div>
            <MintButton email={currentEmail} />
            
            {/* {isMinted ? (
              <div className="flex items-center px-2 py-1 rounded-md bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">
                <Database className="h-3 w-3 mr-1" />
                <span>Minted</span>
              </div>
            ) : (
              <button
                onClick={handleMintEmail}
                disabled={minting}
                className={`ml-2 flex items-center px-2 py-1 rounded-md text-xs font-medium
                  ${minting ? 'bg-blue-100 text-blue-400 cursor-wait dark:bg-blue-900 dark:text-blue-300' : 
                    mintSuccess ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 
                    'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800'}
                `}
              >
                {minting ? (
                  <>
                    <Loader2 className="animate-spin h-3 w-3 mr-1" />
                    <span>Minting</span>
                  </>
                ) : mintSuccess ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    <span>Minted!</span>
                  </>
                ) : (
                  <>
                    <Database className="h-3 w-3 mr-1" />
                    <span>Mint Email</span>
                  </>
                )}
              </button>
            )} */}
          </div>
        </div>
      </div>
      
      {/* Email content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Render HTML content if available, otherwise plain text */}
        {html ? (
          <div 
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
            {text}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default EmailView;