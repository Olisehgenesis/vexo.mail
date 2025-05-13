// server/services/emailService.js
const { Resend } = require('resend');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { encryptData, decryptData } = require('../utils/auth');

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);
const DOMAIN = process.env.EMAIL_DOMAIN || 'vexo.social';

/**
 * Send an email through Resend
 * @param {string} userId - User ID sending the email
 * @param {Object} emailData - Email data including to, subject, text, html
 * @param {object} db - MongoDB database instance
 * @returns {Promise<Object>} - Response with messageId
 */
const sendEmail = async (userId, { to, subject, text, html }, db) => {
  try {
    // Get user info using MongoDB native driver
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Create the email message for Resend
    const emailOptions = {
      from: `${user.emailAddress}`, // Using verified domain 
      to,
      subject,
      text,
      html: html || text
    };
    
    // Send email via Resend
    const response = await resend.emails.send(emailOptions);
    
    if (!response.data || !response.data.id) {
      throw new Error('Failed to send email: ' + (response.error?.message || 'Unknown error'));
    }
    
    // Generate a unique message ID
    const messageId = crypto.randomBytes(16).toString('hex');
    
    // Encrypt email content
    const dataKey = crypto.createHash('sha256').update(userId.toString()).digest('hex');
    
    // Encrypt email content
    const contentEncryption = encryptData(
      JSON.stringify({
        to,
        from: user.emailAddress,
        subject,
        text,
        html: html || text,
        sentAt: new Date(),
        resendId: response.data.id
      }), 
      dataKey
    );
    
    // Encrypt metadata
    const metadataEncryption = encryptData(
      JSON.stringify({
        to,
        from: user.emailAddress,
        subject,
        sentAt: new Date()
      }),
      dataKey
    );
    
    // Save sent email in database
    await db.collection('emails').insertOne({
      userId: new ObjectId(userId),
      messageId,
      folder: 'sent',
      isRead: true,
      encryptedContent: contentEncryption.encryptedData,
      contentIv: contentEncryption.iv,
      contentAuthTag: contentEncryption.authTag,
      encryptedMetadata: metadataEncryption.encryptedData,
      metadataIv: metadataEncryption.iv,
      metadataAuthTag: metadataEncryption.authTag,
      createdAt: new Date()
    });
    
    return { messageId, resendId: response.data.id };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email: ' + error.message);
  }
};

/**
 * Process an incoming email from Resend webhook
 * @param {Object} inboundEmail - Email data from Resend webhook
 * @param {object} db - MongoDB database instance
 * @returns {Promise<boolean>} - Success status
 */
const processIncomingEmail = async (inboundEmail, db) => {
  try {
    // Resend webhook format for inbound emails
    const { to, from, subject, text, html } = inboundEmail;
    
    // In Resend, 'to' might be an array - find the recipient on our domain
    const recipient = Array.isArray(to) 
      ? to.find(addr => addr.endsWith(`@${DOMAIN}`))
      : to;
    
    if (!recipient) {
      console.error('No valid recipient found in inbound email');
      return false;
    }
    
    // Find the recipient user
    const user = await db.collection('users').findOne({ emailAddress: recipient.toLowerCase() });
    
    if (!user) {
      console.error(`User not found for email ${recipient}`);
      return false;
    }
    
    // Generate a unique message ID
    const messageId = crypto.randomBytes(16).toString('hex');
    
    // Encrypt email content
    const dataKey = crypto.createHash('sha256').update(user._id.toString()).digest('hex');
    
    // Encrypt email content
    const contentEncryption = encryptData(
      JSON.stringify({
        to: recipient,
        from,
        subject,
        text,
        html: html || text,
        receivedAt: new Date()
      }), 
      dataKey
    );
    
    // Encrypt metadata (for quick access)
    const metadataEncryption = encryptData(
      JSON.stringify({
        to: recipient,
        from,
        subject,
        receivedAt: new Date()
      }),
      dataKey
    );
    
    // Save incoming email in database
    await db.collection('emails').insertOne({
      userId: user._id,
      messageId,
      folder: 'inbox',
      isRead: false,
      encryptedContent: contentEncryption.encryptedData,
      contentIv: contentEncryption.iv,
      contentAuthTag: contentEncryption.authTag,
      encryptedMetadata: metadataEncryption.encryptedData,
      metadataIv: metadataEncryption.iv,
      metadataAuthTag: metadataEncryption.authTag,
      createdAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error processing incoming email:', error);
    return false;
  }
};

module.exports = {
  sendEmail,
  processIncomingEmail,
  configureEmailDomain: async () => true, // Domain is already verified
  createEmailRoutingRule: async () => true // Placeholder
};