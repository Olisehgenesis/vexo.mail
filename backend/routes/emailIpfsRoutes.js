// server/routes/emailIpfsRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { storeEmailOnIPFS, retrieveEmailFromIPFS, grantEmailAccess } = require('../services/emailIpfsService');
const { ObjectId } = mongoose.Types;

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    let decoded;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Server error during authentication' });
  }
};

// Store an email on IPFS
router.post('/store', authenticate, async (req, res) => {
  try {
    const { emailId } = req.body;
    const userId = req.user.userId;
    
    if (!emailId) {
      return res.status(400).json({ error: 'Email ID is required' });
    }
    
    // Connect to MongoDB
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    // Find the email
    
    const email = await db.collection('emails').findOne({
      messageId: emailId,
      userId: new ObjectId(userId)
    });
    
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Determine who should have access
    let accessList = [userId];
    
    // Add recipients if it's an outgoing email
    if (email.folder === 'sent' && email.metadata && email.metadata.recipients) {
      // Add recipients' user IDs if available
      accessList = [...accessList, ...email.metadata.recipients];
    }
    
    // Store on IPFS
    const ipfsResult = await storeEmailOnIPFS(email, userId, accessList);
    
    // Update the email record with IPFS info
    await db.collection('emails').updateOne(
      { messageId: emailId },
      { 
        $set: { 
          ipfsCid: ipfsResult.ipfsCid,
          ipfsStored: true,
          ipfsStoredAt: new Date()
        } 
      }
    );
    
    // Store email-ipfs reference
    await db.collection('emailIpfs').insertOne({
      messageId: email.messageId,
      userId: new ObjectId(userId),
      ipfsCid: ipfsResult.ipfsCid,
      encryptionMetadata: {
        algorithm: ipfsResult.encryptionKey.algorithm,
        iv: ipfsResult.encryptionKey.iv
      },
      accessControls: Object.keys(ipfsResult.accessControls),
      storedAt: new Date()
    });
    
    res.json({
      success: true,
      messageId: email.messageId,
      ipfsCid: ipfsResult.ipfsCid,
      ipfsUrl: `${process.env.PINATA_GATEWAY_URL}/ipfs/${ipfsResult.ipfsCid}`
    });
  } catch (error) {
    console.error('Error storing email on IPFS:', error);
    res.status(500).json({ error: `Failed to store email: ${error.message}` });
  }
});

// Retrieve an email from IPFS
router.get('/retrieve/:ipfsCid', authenticate, async (req, res) => {
  try {
    const { ipfsCid } = req.params;
    const userId = req.user.userId;
    
    if (!ipfsCid) {
      return res.status(400).json({ error: 'IPFS CID is required' });
    }
    
    // Connect to MongoDB to verify access rights
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    // Verify user has access to this CID
    const emailIpfsRecord = await db.collection('emailIpfs').findOne({
      ipfsCid,
      accessControls: userId
    });
    
    if (!emailIpfsRecord) {
      return res.status(403).json({ error: 'You do not have access to this email' });
    }
    
    // Retrieve from IPFS
    const email = await retrieveEmailFromIPFS(ipfsCid, userId);
    
    res.json({
      success: true,
      email
    });
  } catch (error) {
    console.error('Error retrieving email from IPFS:', error);
    res.status(500).json({ error: `Failed to retrieve email: ${error.message}` });
  }
});

// Grant access to an email stored on IPFS
router.post('/grant-access', authenticate, async (req, res) => {
  try {
    const { ipfsCid, targetUserId } = req.body;
    const userId = req.user.userId;
    
    if (!ipfsCid || !targetUserId) {
      return res.status(400).json({ error: 'IPFS CID and target user ID are required' });
    }
    
    // Connect to MongoDB
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    // Verify user owns this CID
    const emailIpfsRecord = await db.collection('emailIpfs').findOne({
      ipfsCid,
      userId: ObjectId(userId)
    });
    
    if (!emailIpfsRecord) {
      return res.status(403).json({ error: 'You do not own this email' });
    }
    
    // Grant access
    const result = await grantEmailAccess(ipfsCid, userId, targetUserId);
    
    // Update the database with the new CID
    await db.collection('emailIpfs').updateOne(
      { ipfsCid },
      { $set: { ipfsCid: result.newCid, updatedAt: new Date() } }
    );
    
    // Also update the accessControls array
    await db.collection('emailIpfs').updateOne(
      { ipfsCid: result.newCid },
      { $addToSet: { accessControls: targetUserId } }
    );
    
    res.json({
      success: true,
      previousCid: result.previousCid,
      newCid: result.newCid,
      targetUserId
    });
  } catch (error) {
    console.error('Error granting email access:', error);
    res.status(500).json({ error: `Failed to grant access: ${error.message}` });
  }
});

// List all IPFS stored emails for current user
router.get('/my-emails', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Connect to MongoDB
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    // Find all records where this user has access
    const emailIpfsRecords = await db.collection('emailIpfs')
      .find({ accessControls: userId })
      .sort({ storedAt: -1 })
      .toArray();
    
    // Format for response
    const emails = await Promise.all(emailIpfsRecords.map(async (record) => {
      try {
        // For each record, get the basic metadata without full content
        const emailMetadata = await retrieveEmailFromIPFS(record.ipfsCid, userId);
        
        return {
          messageId: record.messageId,
          ipfsCid: record.ipfsCid,
          ipfsUrl: `${process.env.PINATA_GATEWAY_URL}/ipfs/${record.ipfsCid}`,
          subject: emailMetadata.subject,
          from: emailMetadata.from,
          to: emailMetadata.to,
          createdAt: emailMetadata.createdAt,
          storedAt: record.storedAt,
          isOwner: record.userId.toString() === userId
        };
      } catch (error) {
        console.error(`Error retrieving metadata for CID ${record.ipfsCid}:`, error);
        return {
          messageId: record.messageId,
          ipfsCid: record.ipfsCid,
          ipfsUrl: `${process.env.PINATA_GATEWAY_URL}/ipfs/${record.ipfsCid}`,
          subject: 'Error retrieving email metadata',
          storedAt: record.storedAt,
          isOwner: record.userId.toString() === userId,
          error: error.message
        };
      }
    }));
    
    res.json({
      success: true,
      emails
    });
  } catch (error) {
    console.error('Error fetching IPFS emails:', error);
    res.status(500).json({ error: `Failed to fetch emails: ${error.message}` });
  }
});

module.exports = router;