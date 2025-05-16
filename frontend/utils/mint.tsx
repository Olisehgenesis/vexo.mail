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
import { base } from 'viem/chains';

// Contract address from environment
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xdBA1E0b65c5e14cC5B3500a53f1B555C58B90780';

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
      // Set processing state early to prevent multiple clicks
      setProcessing(true);
      
      // 1. Call API to store on IPFS
      console.log(`Calling API to store email ID: ${email.id}`);
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
      
      // 4. Create properly formatted bytes array for encrypted keys - simplified approach
      const encryptedKeys = ["0x0101010101010101010101010101010101010101010101010101010101010101"];

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
      
      // Return the call in the format OnchainKit expects - keeping it minimal
      return [{
        address: CONTRACT_ADDRESS as `0x${string}`, // Ensure proper type as a hex string
        abi: CONTRACT_ABI,
        functionName: 'storeEmail',
        args: [
          emailIpfsCid,
          contentHash,
          recipients,
          encryptedKeys
        ],
        gas: BigInt(500000)
      }];
    } catch (error) {
      console.error('Error preparing store transaction:', error);
      
      // Extract more detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Failed to prepare transaction';
      toast.error(errorMessage);
      
      // Reset processing state on error
      setProcessing(false);
      
      throw error;
    }
  }, [email, address]);

  // Handle transaction status updates - simplified version
  const handleTransactionStatus = useCallback((status: LifecycleStatus) => {
    console.log('Transaction status:', status);

    // Handle main states with minimal code
    if (status.statusName === 'buildingTransaction') {
      setProcessing(true);
      toast.loading('Preparing...', { id: 'tx-toast' });
    }
    else if (status.statusName === 'transactionPending') {
      setProcessing(true);
      toast.loading('Storing...', { id: 'tx-toast' });
      
      // Store transaction hash if available
      if (status.statusData?.hash) {
        setTxHash(status.statusData.hash);
      }
    }
    else if (status.statusName === 'success') {
      setProcessing(false);
      setStoreSuccess(true);
      
      // Handle successful transaction
      if (status.statusData?.transactionReceipts?.length > 0) {
        const hash = status.statusData.transactionReceipts[0].transactionHash;
        setTxHash(hash);
        
        if (onStorageSuccess && ipfsHash) {
          onStorageSuccess(hash, ipfsHash);
        }
        
        // Update email status in database
        updateEmailStorageStatus(email.id, hash, ipfsHash);
      }
      
      toast.success('Stored successfully!', { id: 'tx-toast' });
    }
    else if (status.statusName === 'error') {
      setProcessing(false);
      
      // Extract error message
      let errorMsg = 'Transaction failed';
      if (status.statusData?.error) {
        errorMsg = typeof status.statusData.error === 'string' 
          ? status.statusData.error 
          : status.statusData.error.message || errorMsg;
      }
      
      toast.error(`Failed: ${errorMsg}`, { id: 'tx-toast' });
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
      console.log('Email storage status updated successfully');
    } catch (error) {
      console.error('Error updating email status:', error);
      // Don't show toast here as it's not critical to the user experience
    }
  };

  // Check if email is already stored on-chain
  const isStored = email.minted || storeSuccess || false;

  if (isStored) {
    return (
      <div className="flex items-center px-2 py-1 rounded-md bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">
        <Database className="h-3 w-3 mr-1" />
        <span>On-chain</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Info button */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        title="Storage information"
      >
        <Info className="h-3 w-3 mr-1" />
        <span>Info</span>
      </button>
      
      {/* Info tooltip */}
      {showInfo && (
        <div className="absolute right-0 mt-12 w-64 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 z-20">
          <div className="text-xs text-gray-600 dark:text-gray-300">
            <p className="font-medium mb-1">Email Storage</p>
            <p className="mb-2">Storing your email on-chain encrypts the data on IPFS and saves the reference to a blockchain contract, making it permanently available and secure.</p>
            <p className="italic">Currently free during beta period.</p>
          </div>
        </div>
      )}

      {/* Status display or transaction button */}
      {storeSuccess ? (
        <div className="flex items-center px-2 py-1 rounded-md bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">
          <Shield className="h-3 w-3 mr-1" />
          <span>Stored On-chain</span>
        </div>
      ) : processing ? (
        <div className="flex items-center px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          <span>Storing...</span>
        </div>
      ) : (
        // Simplified Transaction component
        <Transaction
          chainId={base.id}
          calls={prepareStoreTransaction}
          onStatus={handleTransactionStatus}
        >
          {/* Using the most minimal approach possible */}
          <TransactionButton
            text="Store On-chain"
            icon={<Database className="h-3 w-3 mr-1" />}
            className="flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
          />
        </Transaction>
      )}
    </div>
  );
};

export default EmailStorageButton;