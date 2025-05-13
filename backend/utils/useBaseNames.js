// utils/useBaseNames.js
import { useState, useCallback } from 'react';
import { createPublicClient, http, encodePacked, keccak256 } from 'viem';
import { base } from 'viem/chains';
import { useAccount } from 'wagmi';
import L2ResolverAbi from './L2ResolverAbi';

// Base resolver address
const BASE_RESOLVER_ADDRESS = '0x79EA96012eEa67A83431F1701B3dFf7e37F9E282';

// Create a Viem client for contract interactions
const baseClient = createPublicClient({
  chain: base,
  transport: http()
});



// Helper to convert address to reverse node
const convertReverseNodeToBytes = (address, chainId) => {
  // Convert the address to lowercase and remove the '0x' prefix
  const normalizedAddress = address.toLowerCase().substring(2);
  
  // Create the reverse lookup string with chain ID
  const reverseLookup = `${normalizedAddress}.addr.reverse`;
  
  // Calculate the bytes32 node
  return keccak256(encodePacked(['string'], [reverseLookup]));
};

export function useBaseNames() {
  const [baseName, setBaseName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { address, isConnected } = useAccount();
  
  // Fetch Base name for the connected wallet
  const fetchBaseName = useCallback(async (addressToResolve = address) => {
    if (!addressToResolve) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      // Convert address to reverse node
      const reverseLookupNode = convertReverseNodeToBytes(addressToResolve, base.id);
      
      // Query the resolver contract
      const name = await baseClient.readContract({
        abi: L2ResolverAbi,
        address: BASE_RESOLVER_ADDRESS,
        functionName: 'name',
        args: [reverseLookupNode],
      });
      
      if (name && name !== '') {
        setBaseName(name);
        return name;
      } else {
        setBaseName(null);
        return null;
      }
    } catch (error) {
      console.error('Error resolving Base name:', error);
      setError('Failed to resolve Base name');
      setBaseName(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [address]);
  
  // Format the basename with .base.eth suffix if needed
  const formatBaseName = useCallback((name) => {
    if (!name) return '';
    if (name.endsWith('.base.eth')) return name;
    return `${name}.base.eth`;
  }, []);
  
  // Check if address has a basename
  const hasBaseName = !!baseName;
  
  // Get email address from basename
  const getEmailAddress = useCallback(() => {
    if (!baseName) return null;
    
    // Remove .base.eth if present
    const formattedName = baseName.endsWith('.base.eth') 
      ? baseName.replace('.base.eth', '') 
      : baseName;
      
    return `${formattedName}@vexo.social`;
  }, [baseName]);
  
  return {
    baseName,
    formattedBaseName: baseName ? formatBaseName(baseName) : null,
    emailAddress: getEmailAddress(),
    hasBaseName,
    loading,
    error,
    fetchBaseName,
  };
}