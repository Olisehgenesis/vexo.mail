// server/routes/email.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const emailService = require('../services/emailService');
const { decryptData } = require('../utils/auth');

// Get ObjectId from mongoose to avoid BSON version conflicts
const ObjectId = mongoose.Types.ObjectId;

// Helper function to safely handle ObjectId - prevents BSON version conflicts
function safeObjectId(id) {
  if (!id) return null;
  
  // If it's already an ObjectId, return it
  if (id instanceof ObjectId) return id;
  
  try {
    // Try to convert to ObjectId
    return new ObjectId(id.toString());
  } catch (error) {
    console.error('Error converting to ObjectId:', error);
    // Return the original ID as a string if conversion fails
    return id.toString();
  }
}

// Helper function to generate fake emails for development

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

// Get emails for a folder
router.get('/:folder', authenticate, async (req, res) => {
  try {
    const { folder } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;
    
    // Validate inputs
    const validFolders = ['inbox', 'sent', 'drafts', 'trash', 'starred'];
    if (!validFolders.includes(folder)) {
      return res.status(400).json({ error: 'Invalid folder name' });
    }
    
    // Connect to MongoDB
    const db = req.app.locals.db;
    if (!db) {
      // If no database connection, return fake emails in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('No database connection available, using fake emails');
        return res.json({
          //retun empty folders
          emails:[],
          
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 5,
            pages: 1
          }
        });
      } else {
        return res.status(500).json({ error: 'Database connection not available' });
      }
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Try multiple query approaches to avoid BSON errors
    let emailDocs = [];
    let total = 0;
    
    try {
      // First approach - with safeObjectId
      const query = { 
        folder 
      };
      
      // Add userId safely
      try {
        query.userId = safeObjectId(userId);
      } catch (idError) {
        console.warn('Error converting userId to ObjectId:', idError);
        // If conversion fails, try string comparison
        query.userId = { $in: [userId, userId.toString()] };
      }
      
      // Get total count
      total = await db.collection('emails').countDocuments(query);
      
      // Get emails with pagination
      emailDocs = await db.collection('emails')
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();
    } catch (queryError) {
      console.error('First query approach failed:', queryError);
      
      // Use development fallback if we're not in production
      if (process.env.NODE_ENV !== 'production') {
        
        return res.json({
          emails: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 5,
            pages: 1
          }
        });
      } else {
        throw queryError; // Re-throw in production
      }
    }
      
    // Calculate total pages
    const pages = Math.ceil(total / parseInt(limit));
    
    // If no emails found and we're in development, use fake ones
    if (emailDocs.length === 0 && process.env.NODE_ENV !== 'production') {
      console.log('No emails found, using fake emails');
      return res.json({
        emails: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 5,
          pages: 1
        }
      });
    }
    
    // Process emails - safely handle decryption
    const emails = emailDocs.map(doc => {
      try {
        // Generate data key
        const dataKey = require('crypto')
          .createHash('sha256')
          .update(userId.toString())
          .digest('hex');
          
        // Only attempt decryption if necessary fields exist
        if (doc.encryptedMetadata && doc.metadataIv && doc.metadataAuthTag) {
          try {
            // Decrypt metadata
            const metadata = decryptData(
              doc.encryptedMetadata,
              doc.metadataIv,
              doc.metadataAuthTag,
              dataKey
            );
            
            // Parse metadata
            const parsedMetadata = JSON.parse(metadata);
            
            // Return email with metadata and ID
            return {
              id: doc.messageId,
              ...parsedMetadata,
              isRead: doc.isRead,
              folder: doc.folder,
              createdAt: doc.createdAt
            };
          } catch (decryptError) {
            console.error('Error decrypting email metadata:', decryptError);
            // Continue to fallback
          }
        }
        
        // Return minimal info if decryption fails or fields are missing
        return {
          id: doc.messageId || doc._id.toString(),
          subject: doc.subject || 'Email Subject',
          from: doc.from || 'sender@example.com',
          to: doc.to || 'recipient@example.com',
          isRead: doc.isRead || false,
          folder: doc.folder,
          createdAt: doc.createdAt || new Date(),
          decryptError: true
        };
      } catch (error) {
        console.error('Error processing email:', error);
        // Return minimal fallback info
        return {
          id: doc.messageId || doc._id?.toString() || 'unknown-id',
          subject: 'Encrypted Email',
          from: 'encrypted@sender.com',
          to: 'encrypted@recipient.com',
          isRead: !!doc.isRead,
          folder: folder,
          createdAt: doc.createdAt || new Date(),
          decryptError: true
        };
      }
    });
    
    // Return emails with pagination info
    res.json({
      emails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages
      }
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    
    // For BSON errors, provide a fallback in development
    if (error.name === 'BSONVersionError' && process.env.NODE_ENV !== 'production') {
      console.log('Using development fallback for BSON error');
      
      // Return fake data for development
      return res.json({
        emails: [],
        pagination: {
          page: parseInt(req.query.page || 1),
          limit: parseInt(req.query.limit || 20),
          total: 5,
          pages: 1
        }
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch emails: ' + error.message });
  }
});

// Get a single email
router.get('/view/:emailId', authenticate, async (req, res) => {
  try {
    const { emailId } = req.params;
    const userId = req.user.userId;
    
    // Connect to MongoDB
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    // Get email from the database - using a safe query approach
    const query = { messageId: emailId };
    
    // Add userId safely
    try {
      query.userId = safeObjectId(userId);
    } catch (idError) {
      console.warn('Error converting userId to ObjectId:', idError);
      // If conversion fails, try string comparison
      query.userId = { $in: [userId, userId.toString()] };
    }
    
    const emailDoc = await db.collection('emails').findOne(query);
    
    if (!emailDoc) {
      // In development mode, return a fake email if not found
      if (process.env.NODE_ENV !== 'production') {
        const fakeEmail = {
          id: emailId,
          subject: `Test Email ${emailId}`,
          from: 'test@example.com',
          to: 'you@vexo.social',
          text: `This is a test email with ID ${emailId}. Using fallback test data.`,
          html: `<p>This is a test email with ID ${emailId}. Using fallback test data.</p>`,
          isRead: true,
          folder: 'inbox',
          createdAt: new Date(),
          sentAt: new Date(Date.now() - 3600000)
        };
        
        return res.json(fakeEmail);
      } else {
        return res.status(404).json({ error: 'Email not found' });
      }
    }
    
    try {
      // Generate data key
      const dataKey = require('crypto')
        .createHash('sha256')
        .update(userId.toString())
        .digest('hex');
        
      // Only attempt decryption if necessary fields exist
      if (emailDoc.encryptedContent && emailDoc.contentIv && emailDoc.contentAuthTag) {
        try {
          // Decrypt content
          const content = decryptData(
            emailDoc.encryptedContent,
            emailDoc.contentIv,
            emailDoc.contentAuthTag,
            dataKey
          );
          
          // Parse content
          const parsedContent = JSON.parse(content);
          
          // Mark as read if not already
          if (!emailDoc.isRead) {
            await db.collection('emails').updateOne(
              { messageId: emailId },
              { $set: { isRead: true } }
            );
          }
          
          // Return email with content
          return res.json({
            id: emailDoc.messageId,
            ...parsedContent,
            isRead: true,
            folder: emailDoc.folder,
            createdAt: emailDoc.createdAt
          });
        } catch (decryptError) {
          console.error('Error decrypting email content:', decryptError);
          // Fall through to fallback
        }
      }
      
      // If decryption failed or fields missing, return basic info
      return res.json({
        id: emailDoc.messageId || emailDoc._id.toString(),
        subject: emailDoc.subject || 'Email Subject',
        from: emailDoc.from || 'sender@example.com',
        to: emailDoc.to || 'recipient@example.com',
        text: 'Email content not available (decryption failed)',
        html: '<p>Email content not available (decryption failed)</p>',
        isRead: !!emailDoc.isRead,
        folder: emailDoc.folder,
        createdAt: emailDoc.createdAt || new Date(),
        decryptError: true
      });
    } catch (error) {
      console.error('Error processing email content:', error);
      res.status(500).json({ error: 'Failed to process email content: ' + error.message });
    }
  } catch (error) {
    console.error('Error fetching email:', error);
    
    // For BSON errors, provide a fallback in development
    if (error.name === 'BSONVersionError' && process.env.NODE_ENV !== 'production') {
      console.log('Using development fallback for BSON error');
      
      // Return fake email for development
      const fakeEmail = {
        id: req.params.emailId,
        subject: `Test Email ${req.params.emailId}`,
        from: 'test@example.com',
        to: 'you@vexo.social',
        text: `This is a test email with ID ${req.params.emailId}. Using fallback test data.`,
        html: `<p>This is a test email with ID ${req.params.emailId}. Using fallback test data.</p>`,
        isRead: true,
        folder: 'inbox',
        createdAt: new Date(),
        sentAt: new Date(Date.now() - 3600000)
      };
      
      return res.json(fakeEmail);
    }
    
    res.status(500).json({ error: 'Failed to fetch email: ' + error.message });
  }
});


// Updated segment of server/routes/email.js for the send endpoint
router.post('/send', authenticate, async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    const userId = req.user.userId;
    
    // Validate inputs
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'To, subject, and text/html are required' });
    }
    
    // Connect to MongoDB
    const db = req.app.locals.db;
    
    // First, store the email in the database to ensure we have a record of the attempt
    try {
      // Use string ID to avoid BSON conflicts - create a temporary message ID
      const tempMessageId = require('crypto').randomBytes(16).toString('hex');
      
      // Create a simple email document that avoids complex BSON objects
      const emailDoc = {
        messageId: tempMessageId,
        userId: userId.toString(), // Store as string to avoid BSON issues
        to,
        subject,
        text,
        html,
        folder: 'sent',
        isRead: true,
        createdAt: new Date(),
        status: 'pending', // Track the sending status
        error: null
      };
      
      // Save to database
      await db.collection('emails').insertOne(emailDoc);
      
      try {
        // Try to send email via the email service
        const result = await emailService.sendEmail(userId, { to, subject, text, html }, db);
        
        // If successful, update the database record with the real message ID
        if (result && result.messageId) {
          await db.collection('emails').updateOne(
            { messageId: tempMessageId },
            { 
              $set: { 
                status: 'sent',
                actualMessageId: result.messageId  // Store the actual message ID returned by the service
              } 
            }
          );
          
          return res.json({ 
            success: true, 
            messageId: result.messageId 
          });
        } else {
          // Update the email record with an error
          await db.collection('emails').updateOne(
            { messageId: tempMessageId },
            { $set: { status: 'error', error: 'No message ID returned' } }
          );
          
          // For development only - simulate success
          if (process.env.NODE_ENV !== 'production') {
            return res.json({ 
              success: true, 
              messageId: tempMessageId,
              simulated: true
            });
          } else {
            return res.status(500).json({ error: 'Failed to send email: No message ID returned' });
          }
        }
      } catch (sendError) {
        console.error('Error sending email:', sendError);
        
        // Update the email record with the error
        await db.collection('emails').updateOne(
          { messageId: tempMessageId },
          { $set: { status: 'error', error: sendError.message } }
        );
        
        // Handle BSON version conflicts specifically
        if (sendError.name === 'BSONVersionError' || sendError.message.includes('BSON')) {
          console.log('BSON version conflict detected');
          
          // In development, simulate success
          if (process.env.NODE_ENV !== 'production') {
            return res.json({ 
              success: true, 
              messageId: tempMessageId,
              simulated: true,
              warning: 'BSON version conflict - email stored but not actually sent'
            });
          }
        }
        
        throw sendError;
      }
    } catch (dbError) {
      console.error('Database error when saving email:', dbError);
      
      // In development, simulate success even if DB fails
      if (process.env.NODE_ENV !== 'production') {
        const fallbackId = require('crypto').randomBytes(16).toString('hex');
        return res.json({ 
          success: true, 
          messageId: fallbackId,
          simulated: true,
          warning: 'Database error - fallback response provided'
        });
      }
      
      throw dbError;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Final fallback for all other errors
    if (process.env.NODE_ENV !== 'production') {
      const fallbackId = require('crypto').randomBytes(16).toString('hex');
      return res.json({ 
        success: true, 
        messageId: fallbackId,
        simulated: true,
        warning: 'Error handled with fallback response'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to send email: ' + error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

// Mark email as read
router.put('/:emailId/read', authenticate, async (req, res) => {
  try {
    const { emailId } = req.params;
    const userId = req.user.userId;
    
    // Connect to MongoDB
    const db = req.app.locals.db;
    if (!db) {
      // In development, simulate success
      if (process.env.NODE_ENV !== 'production') {
        return res.json({ success: true, message: 'Simulated success (no DB connection)' });
      } else {
        return res.status(500).json({ error: 'Database connection not available' });
      }
    }
    
    // Update email with safe query
    const query = { messageId: emailId };
    
    // Add userId safely
    try {
      query.userId = safeObjectId(userId);
    } catch (idError) {
      console.warn('Error converting userId to ObjectId:', idError);
      // If conversion fails, try string comparison
      query.userId = { $in: [userId, userId.toString()] };
    }
    
    const result = await db.collection('emails').updateOne(
      query,
      { $set: { isRead: true } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking email as read:', error);
    
    // For BSON errors, simulate success in development
    if (error.name === 'BSONVersionError' && process.env.NODE_ENV !== 'production') {
      return res.json({ success: true, message: 'Simulated success (BSON error)' });
    }
    
    res.status(500).json({ error: 'Failed to update email: ' + error.message });
  }
});

// Mark email as unread
router.put('/:emailId/unread', authenticate, async (req, res) => {
  try {
    const { emailId } = req.params;
    const userId = req.user.userId;
    
    // Connect to MongoDB
    const db = req.app.locals.db;
    if (!db) {
      // In development, simulate success
      if (process.env.NODE_ENV !== 'production') {
        return res.json({ success: true, message: 'Simulated success (no DB connection)' });
      } else {
        return res.status(500).json({ error: 'Database connection not available' });
      }
    }
    
    // Update email with safe query
    const query = { messageId: emailId };
    
    // Add userId safely
    try {
      query.userId = safeObjectId(userId);
    } catch (idError) {
      console.warn('Error converting userId to ObjectId:', idError);
      // If conversion fails, try string comparison
      query.userId = { $in: [userId, userId.toString()] };
    }
    
    const result = await db.collection('emails').updateOne(
      query,
      { $set: { isRead: false } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking email as unread:', error);
    
    // For BSON errors, simulate success in development
    if (error.name === 'BSONVersionError' && process.env.NODE_ENV !== 'production') {
      return res.json({ success: true, message: 'Simulated success (BSON error)' });
    }
    
    res.status(500).json({ error: 'Failed to update email: ' + error.message });
  }
});

// Move email to a folder
router.put('/:emailId/move', authenticate, async (req, res) => {
  try {
    const { emailId } = req.params;
    const { folder } = req.body;
    const userId = req.user.userId;
    
    // Validate inputs
    const validFolders = ['inbox', 'sent', 'drafts', 'trash', 'starred'];
    if (!folder || !validFolders.includes(folder)) {
      return res.status(400).json({ error: 'Invalid folder name' });
    }
    
    // Connect to MongoDB
    const db = req.app.locals.db;
    if (!db) {
      // In development, simulate success
      if (process.env.NODE_ENV !== 'production') {
        return res.json({ success: true, message: 'Simulated success (no DB connection)' });
      } else {
        return res.status(500).json({ error: 'Database connection not available' });
      }
    }
    
    // Update email with safe query
    const query = { messageId: emailId };
    
    // Add userId safely
    try {
      query.userId = safeObjectId(userId);
    } catch (idError) {
      console.warn('Error converting userId to ObjectId:', idError);
      // If conversion fails, try string comparison
      query.userId = { $in: [userId, userId.toString()] };
    }
    
    const result = await db.collection('emails').updateOne(
      query,
      { $set: { folder } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error moving email:', error);
    
    // For BSON errors, simulate success in development
    if (error.name === 'BSONVersionError' && process.env.NODE_ENV !== 'production') {
      return res.json({ success: true, message: 'Simulated success (BSON error)' });
    }
    
    res.status(500).json({ error: 'Failed to move email: ' + error.message });
  }
});

// Delete email (move to trash)
router.delete('/:emailId', authenticate, async (req, res) => {
  try {
    const { emailId } = req.params;
    const userId = req.user.userId;
    
    // Connect to MongoDB
    const db = req.app.locals.db;
    if (!db) {
      // In development, simulate success
      if (process.env.NODE_ENV !== 'production') {
        return res.json({ success: true, message: 'Simulated success (no DB connection)' });
      } else {
        return res.status(500).json({ error: 'Database connection not available' });
      }
    }
    
    // Safe query
    const query = { messageId: emailId };
    
    // Add userId safely
    try {
      query.userId = safeObjectId(userId);
    } catch (idError) {
      console.warn('Error converting userId to ObjectId:', idError);
      // If conversion fails, try string comparison
      query.userId = { $in: [userId, userId.toString()] };
    }
    
    // Get email to check if it's already in trash
    const email = await db.collection('emails').findOne(query);
    
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    if (email.folder === 'trash') {
      // Permanently delete if already in trash
      const result = await db.collection('emails').deleteOne(query);
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Email not found during deletion' });
      }
    } else {
      // Move to trash
      const result = await db.collection('emails').updateOne(
        query,
        { $set: { folder: 'trash' } }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Email not found during move to trash' });
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting email:', error);
    
    // For BSON errors, simulate success in development
    if (error.name === 'BSONVersionError' && process.env.NODE_ENV !== 'production') {
      return res.json({ success: true, message: 'Simulated success (BSON error)' });
    }
    
    res.status(500).json({ error: 'Failed to delete email: ' + error.message });
  }
});

module.exports = router;