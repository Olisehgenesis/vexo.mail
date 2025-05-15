'use client';

import React, { useState, useCallback } from 'react';
import { 
  Transaction, 
  TransactionButton,
  TransactionStatus,
  TransactionStatusAction,
  TransactionStatusLabel,
} from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { keccak256, toUtf8Bytes } from 'ethers';
import { 
  Database, 
  Shield, 
  Info, 
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi';
import api from './api';

// Contract address from environment
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

// Verify the contract address is valid
if (!CONTRACT_ADDRESS) {
  console.error('Contract address is not defined in environment variables');
}

// Properly formatted ABI for OnchainKit
const CONTRACT_ABI = [
  {
    type: 'function',
    name: 'storeEmail',
    inputs: [
      { type: 'string', name: 'ipfsHash' },
      { type: 'bytes32', name: 'contentHash' },
      { type: 'address[]', name: 'recipients' },
      { type: 'bytes[]', name: 'encryptedKeys' }
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'nonpayable'
  }
];

interface EmailAPIResponse {
  ipfsCid: {
    id: string;
    cid: string;
    name: string;
    user_id: string;
    // Other properties from the IPFS response
  };
  success: boolean;
  messageId: string;
  error?: string;
}

interface Email {
  id: string;
  minted?: boolean;
  subject?: string;
  // Add other email properties as needed
}

interface EmailStorageProps {
  email: Email;
  onStorageSuccess?: (txHash: string, ipfsHash: string) => void;
}

const EmailStorageButton: React.FC<EmailStorageProps> = ({ email, onStorageSuccess }) => {
  const [processing, setProcessing] = useState(false);
  const [storeSuccess, setStoreSuccess] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);
  const { address } = useAccount();

  // Prepare transaction calls
  const prepareStoreTransaction = useCallback(async () => {
    try {
      // 1. Call API to store on IPFS
      const response = await api.post('/emails-ipfs/store', {
        emailId: email.id
      });
      
      // Extract data from API response
      const data: EmailAPIResponse = response.data;
      console.log("IPFS response data:", data);
      
      // Extract the CID from the ipfsCid object
      if (!data.ipfsCid || !data.ipfsCid.cid) {
        throw new Error('Invalid IPFS response: Missing CID');
      }
      
      const emailIpfsCid = data.ipfsCid.cid;
      setIpfsHash(emailIpfsCid);
      
      // For debugging - check the exact type of emailId
      console.log("Email ID type:", typeof email.id);
      console.log("Email ID value:", email.id);
      
      // 2. Generate content hash - using only string values
      const contentHashData = {
        id: email.id,
        ipfsCid: emailIpfsCid,
        messageId: data.messageId || "",
        timestamp: Math.floor(Date.now() / 1000) // Convert to seconds and ensure integer
      };
      
      console.log("Content hash data:", contentHashData);
      
      const contentHash = keccak256(
        toUtf8Bytes(JSON.stringify(contentHashData))
      );

      // 3. Use current user address as recipient
      if (!address) {
        throw new Error('Wallet not connected');
      }
      
      const recipients = [address];
      
      // 4. Generate fixed encryption key for testing
      // In a real app, you'd use proper encryption
      const encryptedKeys = ["0x0000000000000000000000000000000000000000000000000000000000000000"];

      // 5. Setup the contract call parameters using the format OnchainKit expects
      if (!CONTRACT_ADDRESS) {
        throw new Error('Contract address is not defined');
      }

      // Log parameters for debugging
      console.log("Transaction parameters:", {
        address: CONTRACT_ADDRESS,
        functionName: 'storeEmail',
        args: [emailIpfsCid, contentHash, recipients, encryptedKeys]
      });
      
      // Return the call in the format OnchainKit expects
      return [{
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'storeEmail',
        args: [
          emailIpfsCid,
          contentHash,
          recipients,
          encryptedKeys
        ]
      }];
    } catch (error) {
      console.error('Error preparing store transaction:', error);
      
      // Extract more detailed error information
      const errorMessage = error || 'Failed to prepare transaction';
      toast.error(errorMessage as string);
      
      throw error;
    }
  }, [email, address]);

  // Handle transaction status updates
  const handleTransactionStatus = useCallback((status: LifecycleStatus) => {
    console.log('Transaction status:', status);

    if (status.statusName === 'transactionPending') {
      setProcessing(true);
      setStoreSuccess(false);
      toast.loading('Storing email on blockchain...');
    }

    if (status.statusName === 'success') {
      setProcessing(false);
      setStoreSuccess(true);
      
      // Store tx hash
      if (status.statusData?.transactionReceipts?.length > 0) {
        const hash = status.statusData.transactionReceipts[0].transactionHash;
        setTxHash(hash);
        
        if (onStorageSuccess && ipfsHash) {
          onStorageSuccess(hash, ipfsHash);
        }
        
        // Update email status in database
        updateEmailStorageStatus(email.id, hash, ipfsHash);
      }
      
      toast.success('Email successfully stored on blockchain!');
    }

    if (status.statusName === 'error') {
      setProcessing(false);
      setStoreSuccess(false);
      
      // Extract detailed error information
      let errorMsg = 'Transaction failed';
      
      if (status.statusData) {
        if (typeof status.statusData.error === 'string') {
          try {
            // Try to parse the error if it's a JSON string
            const parsedError = JSON.parse(status.statusData.error);
            errorMsg = parsedError.details || parsedError.message || status.statusData.message || 'Unknown error';
          } catch (e) {
            // If not JSON, use the error string directly
            errorMsg = status.statusData.error || status.statusData.message || 'Unknown error';
          }
        } else {
          errorMsg = status.statusData.message || 'Unknown error';
        }
      }
      
      console.error('Transaction error details:', errorMsg);
      toast.error(`Transaction failed: ${errorMsg}`);
    }
  }, [onStorageSuccess, ipfsHash, email.id]);

  // Update email storage status in your backend
  const updateEmailStorageStatus = async (emailId: string, transactionHash: string, ipfsCid: string | null) => {
    try {
      await api.post('/emails/update-storage-status', {
        emailId,
        transactionHash,
        ipfsCid,
        status: 'stored'
      });
    } catch (error) {
      console.error('Error updating email status:', error);
      // Don't show toast here as it's not critical to the user experience
    }
  };

  // Check if email is already stored on-chain
  const isStored = email.minted || false;

  if (isStored) {
    return (
      <div className="flex items-center px-2 py-1 rounded-md bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">
        <Database className="h-3 w-3 mr-1" />
        <span>On-chain</span>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <div className="relative group">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
          title="Storage information"
        >
          <Info className="h-4 w-4" />
        </button>
        
        {/* Tooltip for info */}
        {showInfo && (
          <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 z-20">
            <div className="text-xs text-gray-600 dark:text-gray-300">
              <p className="font-medium mb-1">Email Storage</p>
              <p className="mb-2">Storing your email on-chain encrypts the data on IPFS and saves the reference to a blockchain contract, making it permanently available and secure.</p>
              <p className="italic">Currently free during beta period.</p>
            </div>
          </div>
        )}
      </div>

      {storeSuccess ? (
        <div className="ml-2 flex items-center px-2 py-1 rounded-md bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">
          <Shield className="h-3 w-3 mr-1" />
          <span>Stored On-chain</span>
        </div>
      ) : processing ? (
        <div className="ml-2 flex items-center px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          <span>Storing...</span>
        </div>
      ) : (
        <Transaction
          calls={prepareStoreTransaction}
          onStatus={handleTransactionStatus}
       
        >
          <TransactionButton
            text="Store On-chain"
            icon={<Database className="h-3 w-3 mr-1" />}
            className="ml-2 flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
          />
        
          <TransactionStatus>
            <TransactionStatusLabel />
            <TransactionStatusAction />
          </TransactionStatus>
        </Transaction>
      )}
    </div>
  );
};

export default EmailStorageButton;