// server/utils/auth.js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const axios = require('axios');

// Verify a wallet signature
const verifySignature = (address, message, signature) => {
  try {
    // Recover the address that signed the message
    const signerAddr = ethers.verifyMessage(message, signature);
    
    // Check if the recovered address matches the expected address
    return signerAddr.toLowerCase() === address.toLowerCase();
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

// Check if an address has an ENS name
const resolveEnsName = async (address) => {
  try {
    // Use Ethereum mainnet provider to resolve ENS
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_KEY
    );
    
    const name = await provider.lookupAddress(address);
    return name;
  } catch (error) {
    console.error('ENS resolution error:', error);
    return null;
  }
};

// Check if an address has a Base name
const resolveBaseName = async (address) => {
  try {
    // Use Base API to check for names
    // This is a placeholder - you would need to implement this based on Base's naming service
    const response = await axios.get(
      `https://api.base.org/v1/names?address=${address}`,
      { headers: { 'x-api-key': process.env.BASE_API_KEY } }
    );
    
    if (response.data && response.data.names && response.data.names.length > 0) {
      return response.data.names[0];
    }
    
    return null;
  } catch (error) {
    console.error('Base name resolution error:', error);
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
  resolveEnsName,
  resolveBaseName
};