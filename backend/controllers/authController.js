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
    
    try {
      // First, try to find an existing nonce to avoid Mongoose timeout issues
      const existingNonce = await Nonce.findOne({ walletAddress: address.toLowerCase() });
      
      if (existingNonce) {
        // Update the existing nonce
        existingNonce.nonce = nonce;
        existingNonce.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
        await existingNonce.save();
      } else {
        // Create a new nonce document
        const newNonce = new Nonce({
          walletAddress: address.toLowerCase(),
          nonce,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
        });
        await newNonce.save();
      }
    } catch (dbError) {
      console.error('Database error saving nonce:', dbError);
      // Even if DB save fails, we can still return the nonce
      // This allows the auth flow to continue even with DB issues
      console.log('Continuing with in-memory nonce due to DB error');
      
      // Store nonce in memory (temporary fallback)
      global.tempNonces = global.tempNonces || {};
      global.tempNonces[address.toLowerCase()] = {
        nonce,
        timestamp: Date.now()
      };
    }
    
    res.status(200).json({ nonce });
  } catch (error) {
    console.error('Nonce generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate nonce',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// server/controllers/authController.js - Fix the verifySignature function

exports.verifySignature = async (req, res) => {
  try {
    const { address, signature, nonce, publicKey, baseName: providedBaseName, emailAddress: providedEmailAddress } = req.body;
    
    console.log("Verify signature request received:", { address, nonce, publicKey });
    console.log("Signature type:", typeof signature);
    console.log("Signature length:", signature ? signature.length : 0);
    
    if (!address || !signature || !nonce) {
      return res.status(400).json({ error: 'Address, signature, and nonce are required' });
    }
    
    // Add development mode bypass option
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const bypassVerification = isDevelopment && process.env.BYPASS_SIGNATURE_VERIFICATION === 'true';
    
    let nonceDoc = null;
    
    if (!bypassVerification) {
      // Check if nonce exists and is valid
      nonceDoc = await Nonce.findOne({ 
        walletAddress: address.toLowerCase(),
        nonce
      });
      
      if (!nonceDoc) {
        return res.status(401).json({ error: 'Invalid or expired nonce' });
      }
      
      // Verify signature
      const message = `Sign this message to access your vexo.social email account.\n\nNonce: ${nonce}`;
      
      console.log("Verifying signature with message:", message);
      
      // Call the verifySignature function
      const isValid = verifySignature(address, message, signature);
      
      if (!isValid) {
        // Log detailed diagnostics
        console.error('Signature verification failed:', {
          address,
          messageLength: message.length,
          signatureLength: signature.length,
          signaturePrefix: signature.substring(0, 50) + '...',
        });
        
        if (!bypassVerification) {
          return res.status(401).json({ 
            error: 'Invalid signature',
            details: isDevelopment ? 'Signature could not be verified with the provided address' : undefined
          });
        }
      }
    } else {
      console.log("DEV MODE: Bypassing signature verification with BYPASS_SIGNATURE_VERIFICATION=true");
    }
    
    // Get Base name for this address if not provided
    let baseName = providedBaseName;
    if (!baseName) {
      try {
        baseName = await resolveBaseName(address);
      } catch (baseNameError) {
        console.error('Base name resolution error:', baseNameError);
        // Continue without Base name if resolution fails
      }
    }
    
    let user;
    let isNewUser = false;
    
    try {
      // Check if user exists
      user = await User.findOne({ walletAddress: address.toLowerCase() });
      
      // If user doesn't exist, create a new user
      if (!user) {
        isNewUser = true;
        
        // Create email address based on Base name or wallet address
        const emailAddress = providedEmailAddress || (baseName
          ? `${baseName}@vexo.social`
          : `${address.slice(0, 8).toLowerCase()}@vexo.social`);
        
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
    } catch (userError) {
      console.error('User database error:', userError);
      // Create a temporary user object if database operations fail
      // This allows authentication to still succeed even with DB issues
      user = {
        _id: address.toLowerCase(), // Use address as ID for temporary user
        walletAddress: address.toLowerCase(),
        emailAddress: providedEmailAddress || (baseName
          ? `${baseName}@vexo.social`
          : `${address.slice(0, 8).toLowerCase()}@vexo.social`),
        baseName,
        isTemporary: true
      };
    }
    
    // Delete used nonce if it exists in DB
    if (nonceDoc) {
      try {
        await Nonce.deleteOne({ _id: nonceDoc._id });
      } catch (deleteError) {
        console.error('Error deleting nonce:', deleteError);
      }
    }
    
    // Generate JWT token
    const token = generateToken(user._id, address.toLowerCase());
    console.log("Generated token:", token);
    
    // Return user data and token
    res.status(200).json({
      token,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        emailAddress: user.emailAddress,
        baseName: user.baseName,
        isNewUser,
        isTemporary: user.isTemporary || false
      }
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Check domain name for a wallet address
exports.checkDomain = async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    let ensName = null;
    let baseName = null;
    
    // Check for ENS name
    try {
      ensName = await resolveEnsName(address);
    } catch (ensError) {
      console.error('ENS resolution error:', ensError);
    }
    
    if (ensName) {
      return res.status(200).json({
        name: ensName,
        type: 'ens',
        emailAddress: `${ensName}@vexo.social`
      });
    }
    
    // Check for Base name
    try {
      baseName = await resolveBaseName(address);
    } catch (baseError) {
      console.error('Base name resolution error:', baseError);
    }
    
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
    res.status(500).json({ 
      error: 'Failed to check domain name',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// server/controllers/authController.js - Add this method
exports.validateToken = async (req, res) => {
  try {
    // The user object should be attached by the auth middleware
    if (!req.user) {
      return res.status(401).json({ 
        valid: false, 
        error: 'Invalid or expired token'
      });
    }
    
    // Return basic user info to confirm the token is valid
    res.status(200).json({
      valid: true,
      userId: req.user.userId,
      walletAddress: req.user.walletAddress
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ 
      valid: false,
      error: 'Server error during token validation'
    });
  }
};
// Get current user info
exports.getMe = async (req, res) => {
  try {
    // User is attached to req by auth middleware
    let user;
    
    try {
      user = await User.findById(req.user.userId);
    } catch (dbError) {
      console.error('Database error retrieving user:', dbError);
      // If database lookup fails, try to reconstruct minimal user info
      // from JWT claims (which were attached by auth middleware)
      if (req.user && req.user.walletAddress) {
        user = {
          _id: req.user.userId,
          walletAddress: req.user.walletAddress,
          isTemporary: true
        };
      }
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json({
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        emailAddress: user.emailAddress,
        baseName: user.baseName,
        isTemporary: user.isTemporary || false
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Failed to get user information',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get Base Name for an address
exports.getBaseName = async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    let baseName = null;
    try {
      // First, check if we have this user in the database
      const user = await User.findOne({ walletAddress: address.toLowerCase() });
      
      if (user && user.baseName) {
        baseName = user.baseName;
      } else {
        // If not in database or no baseName, try to resolve it
        baseName = await resolveBaseName(address);
      }
    } catch (error) {
      console.error('Base name lookup error:', error);
      // Continue without a baseName if lookup fails
    }
    
    res.status(200).json({
      baseName,
      emailAddress: baseName ? `${baseName}@vexo.social` : `${address.slice(0, 8).toLowerCase()}@vexo.social`
    });
  } catch (error) {
    console.error('Base name resolution error:', error);
    res.status(500).json({ 
      error: 'Failed to resolve Base name',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};