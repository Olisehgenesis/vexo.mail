// server/controllers/authController.js
const User = require('../models/User');
const Nonce = require('../models/Nonce');
const { 
  verifySignature, 
  generateToken, 
  generateNonce,
  encryptData,
  resolveBaseName
} = require('../utils/auth');
const crypto = require('crypto');

// Generate a nonce for wallet authentication
exports.getNonce = async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Generate a random nonce
    const nonce = generateNonce();
    
    // Save nonce to database with expiration
    await Nonce.findOneAndUpdate(
      { walletAddress: address.toLowerCase() },
      { 
        walletAddress: address.toLowerCase(),
        nonce,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
      },
      { upsert: true, new: true }
    );
    
    res.status(200).json({ nonce });
  } catch (error) {
    console.error('Nonce generation error:', error);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
};

// Verify a wallet signature and authenticate user
// Verify a wallet signature and authenticate user
exports.verifySignature = async (req, res) => {
  try {
    const { address, signature, nonce, publicKey } = req.body;
    
    if (!address || !signature || !nonce || !publicKey) {
      return res.status(400).json({ error: 'Address, signature, nonce, and public key are required' });
    }
    
    // Check if nonce exists and is valid
    const nonceDoc = await Nonce.findOne({ 
      walletAddress: address.toLowerCase(),
      nonce
    });
    
    if (!nonceDoc) {
      return res.status(401).json({ error: 'Invalid or expired nonce' });
    }
    
    // Verify signature
    const message = `Sign this message to access your vexo.social email account.\n\nNonce: ${nonce}`;
    const isValid = verifySignature(address, message, signature);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Get Base name for this address
    let baseName = await resolveBaseName(address);
    
    // Check if user exists
    let user = await User.findOne({ walletAddress: address.toLowerCase() });
    
    // If user doesn't exist, create a new user
    if (!user) {
      // Create email address based on Base name or wallet address
      const emailAddress = baseName
        ? `${baseName}@vexo.social`
        : `${address.slice(0, 8).toLowerCase()}@vexo.social`;
      
      // Generate a data encryption key
      const dataKey = crypto.randomBytes(32).toString('hex');
      
      // Encrypt the data key (in a real implementation, you'd encrypt with public key)
      const encryptionKey = crypto.createHash('sha256').update(nonce).digest('hex');
      const { encryptedData, iv, authTag } = encryptData(dataKey, encryptionKey);
      
      // Create the user
      user = await User.create({
        walletAddress: address.toLowerCase(),
        emailAddress,
        baseName,
        publicKey,
        encryptedDataKey: encryptedData,
        dataKeyIv: iv,
        dataKeyAuthTag: authTag,
        accessKeys: [{
          keyId: `key-${Date.now()}`,
          encryptedDataKey: encryptedData,
          iv,
          authTag,
          timestamp: Date.now()
        }]
      });
    } else {
      // Update Base name and email address if changed
      if (baseName && baseName !== user.baseName) {
        user.baseName = baseName;
        user.emailAddress = `${baseName}@vexo.social`;
      }
      
      // Update last login and public key
      user.lastLogin = new Date();
      user.publicKey = publicKey;
      await user.save();
    }
    
    // Delete used nonce
    await Nonce.deleteOne({ _id: nonceDoc._id });
    
    // Generate JWT token
    const token = generateToken(user._id, address.toLowerCase());
    
    // Return user data and token
    res.status(200).json({
      token,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        emailAddress: user.emailAddress,
        baseName: user.baseName,
      }
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Check domain name for a wallet address
exports.checkDomain = async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Check for ENS name
    const ensName = await resolveEnsName(address);
    if (ensName) {
      return res.status(200).json({
        name: ensName,
        type: 'ens',
        emailAddress: `${ensName}@vexo.social`
      });
    }
    
    // Check for Base name
    const baseName = await resolveBaseName(address);
    if (baseName) {
      return res.status(200).json({
        name: baseName,
        type: 'base',
        emailAddress: `${baseName}@vexo.social`
      });
    }
    
    // No domain name found
    return res.status(200).json({
      name: null,
      type: null,
      emailAddress: `${address.slice(0, 8).toLowerCase()}@vexo.social`
    });
  } catch (error) {
    console.error('Domain check error:', error);
    res.status(500).json({ error: 'Failed to check domain name' });
  }
};

// Get current user info
exports.getMe = async (req, res) => {
  try {
    // User is attached to req by auth middleware
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json({
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        emailAddress: user.emailAddress,
        domainName: user.domainName,
        domainType: user.domainType,
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
};

// server/controllers/authController.js (add this method)
exports.getBaseName = async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Use the Base name resolution function from auth.js
    const baseName = await resolveBaseName(address);
    
    res.status(200).json({
      baseName,
      emailAddress: baseName ? `${baseName}@vexo.social` : `${address.slice(0, 8).toLowerCase()}@vexo.social`
    });
  } catch (error) {
    console.error('Base name resolution error:', error);
    res.status(500).json({ error: 'Failed to resolve Base name' });
  }
};