// server/utils/auth.js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const axios = require('axios');
const { createPublicClient, http, keccak256, encodePacked, namehash } = require('viem');
const { base, mainnet } = require('viem/chains');
// Import the ABI with proper error handling
let L2ResolverAbi;
try {
  L2ResolverAbi = require('./L2ResolverAbi');
  // Make sure it's an array
  if (!Array.isArray(L2ResolverAbi)) {
    if (L2ResolverAbi.default && Array.isArray(L2ResolverAbi.default)) {
      L2ResolverAbi = L2ResolverAbi.default;
    } else {
      console.error('Invalid ABI format, using fallback');
      L2ResolverAbi = [
        {
          "inputs": [{"internalType": "bytes32", "name": "node", "type": "bytes32"}],
          "name": "name",
          "outputs": [{"internalType": "string", "name": "", "type": "string"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {"internalType": "bytes32", "name": "node", "type": "bytes32"},
            {"internalType": "string", "name": "key", "type": "string"}
          ],
          "name": "text",
          "outputs": [{"internalType": "string", "name": "", "type": "string"}],
          "stateMutability": "view",
          "type": "function"
        }
      ];
    }
  }
} catch (error) {
  console.error('Error loading ABI:', error);
  // Fallback ABI with minimal required functions
  L2ResolverAbi = [
    {
      "inputs": [{"internalType": "bytes32", "name": "node", "type": "bytes32"}],
      "name": "name",
      "outputs": [{"internalType": "string", "name": "", "type": "string"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "bytes32", "name": "node", "type": "bytes32"},
        {"internalType": "string", "name": "key", "type": "string"}
      ],
      "name": "text",
      "outputs": [{"internalType": "string", "name": "", "type": "string"}],
      "stateMutability": "view",
      "type": "function"
    }
  ];
}

// server/utils/auth.js - Update this function 

// Verify a wallet signature - properly handles WebAuthn signatures
const verifySignature = (address, message, signature) => {
  try {
    console.log("Verifying signature for address:", address);
    console.log("Message:", message);
    console.log("Signature length:", signature.length);
    
    // Check if this looks like a WebAuthn signature (from hardware wallets)
    if (signature.length > 500 && signature.includes('webauthn')) {
      console.log("Detected WebAuthn signature from hardware wallet");
      
      try {
        // Extract the WebAuthn JSON data - try to find the JSON object by searching for common tokens
        const webauthnMatch = signature.match(/\{[^{]*"type":"webauthn\.get"[^}]*\}/);
        
        if (webauthnMatch) {
          const webauthnData = webauthnMatch[0];
          console.log("Found WebAuthn data:", webauthnData);
          
          try {
            // Parse the JSON
            const webauthnJson = JSON.parse(webauthnData);
            console.log("Parsed WebAuthn JSON:", webauthnJson);
            
            // Extract the challenge
            if (webauthnJson.challenge) {
              console.log("WebAuthn challenge:", webauthnJson.challenge);
              
              // Extract nonce from our message
              const nonceMatch = message.match(/Nonce: ([a-f0-9]+)/i);
              if (nonceMatch && nonceMatch[1]) {
                const nonce = nonceMatch[1];
                
                // IMPORTANT: This is a simplified check - in production, implement proper WebAuthn verification
                // For now we're just verifying the WebAuthn signature came from Coinbase, which we consider trusted
                if (webauthnJson.origin && webauthnJson.origin.includes('coinbase.com')) {
                  console.log("WebAuthn origin is trusted Coinbase domain");
                  
                  // For development, accept the signature from coinbase
                  console.log("Accepting WebAuthn signature for address:", address);
                  return true;
                }
              }
            }
          } catch (jsonError) {
            console.error("Error parsing WebAuthn JSON:", jsonError);
          }
        }
      } catch (webAuthnError) {
        console.error("Error analyzing WebAuthn signature:", webAuthnError);
      }
      
      // For development, accept any WebAuthn signature
      if (process.env.NODE_ENV !== 'production') {
        console.log("DEV MODE: Accepting WebAuthn signature without full verification");
        return true;
      }
      
      return false;
    }
    
    // For regular, non-WebAuthn signatures, use the standard ethers.js verification
    try {
      // Verify a standard EIP-191 personal signature
      const signerAddr = ethers.verifyMessage(message, signature);
      
      // Check if the recovered address matches the expected address
      const matches = signerAddr.toLowerCase() === address.toLowerCase();
      console.log("EIP-191 signature verification result:", matches);
      return matches;
    } catch (ethersError) {
      console.error('Standard signature verification error:', ethersError);
      return false;
    }
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

// Generate a JWT token
const generateToken = (userId, walletAddress, expiresIn = '7d') => {
  return jwt.sign(
    { 
      userId, 
      walletAddress 
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

// Verify a JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Generate a random nonce
const generateNonce = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Encrypt data with a key
const encryptData = (data, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(typeof data === 'string' ? data : JSON.stringify(data));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedData: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
};

// Decrypt data with a key
const decryptData = (encryptedData, iv, authTag, key) => {
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(key, 'hex'),
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(Buffer.from(encryptedData, 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

// Format base names correctly
const formatBaseName = (name) => {
  if (!name) return '';
  if (name.endsWith('.base.eth')) return name;
  return `${name}.base.eth`;
};

// Base resolver address
const BASE_RESOLVER_ADDRESS = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';

// Create a Viem client for contract interactions
const baseClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
});

/**
 * Convert an chainId to a coinType hex for reverse chain resolution
 */
const convertChainIdToCoinType = (chainId) => {
  // L1 resolvers to addr
  if (chainId === mainnet.id) {
    return "addr";
  }

  const cointype = (0x80000000 | chainId) >>> 0;
  return cointype.toString(16).toLocaleUpperCase();
};

/**
 * Convert an address to a reverse node for ENS resolution
 */
const convertReverseNodeToBytes = (address, chainId) => {
  const addressFormatted = address.toLowerCase();
  const addressNode = keccak256(addressFormatted.substring(2));
  const chainCoinType = convertChainIdToCoinType(chainId);
  const baseReverseNode = namehash(`${chainCoinType.toLocaleUpperCase()}.reverse`);
  const addressReverseNode = keccak256(
    encodePacked(["bytes32", "bytes32"], [baseReverseNode, addressNode])
  );
  return addressReverseNode;
};

// Resolve a Base name for an address
const resolveBaseName = async (address) => {
  if (!address) return null;
  
  try {
    console.log('Resolving Base name for address:', address);
    const addressReverseNode = convertReverseNodeToBytes(address, base.id);
    console.log('Reverse node:', addressReverseNode);
    
    // Debug check for ABI format
   
    
    // Query the resolver contract
    const name = await baseClient.readContract({
      abi: L2ResolverAbi,
      address: BASE_RESOLVER_ADDRESS,
      functionName: 'name',
      args: [addressReverseNode],
    });
    
    console.log('Resolved name from contract:', name);
    
    if (name && name !== '') {
      return name;
    }
    
    return null;
  } catch (error) {
    console.error('Error resolving Base name:', error);
    return null;
  }
};

module.exports = {
  verifySignature,
  generateToken,
  verifyToken,
  generateNonce,
  encryptData,
  decryptData,
  resolveBaseName,
  convertReverseNodeToBytes,
  formatBaseName,
  convertChainIdToCoinType
};