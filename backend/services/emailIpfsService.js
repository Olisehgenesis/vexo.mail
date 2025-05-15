// server/services/emailIpfsService.js
const { uploadToIPFS, retrieveFromIPFS, deleteFromIPFS } = require('./ipfsService');
const { generateEncryptionKey, encryptData, decryptData } = require('./encryptionService');
const crypto = require('crypto');

/**
 * Store an email on IPFS with encryption
 * @param {Object} email - Email data to store
 * @param {String} userId - User ID who owns this email
 * @param {Array} accessList - Array of user IDs who can access this email
 * @returns {Object} - IPFS info and encryption keys
 */
async function storeEmailOnIPFS(email, userId, accessList = []) {
  try {
    // Generate a unique message ID if not present
    const messageId = email.messageId || crypto.randomBytes(16).toString('hex');
    
    // Add metadata to the email
    const emailWithMetadata = {
      ...email,
      messageId,
      storedAt: new Date().toISOString(),
      storedBy: userId
    };
    
    // Generate encryption key for this email
    const encryptionKey = generateEncryptionKey();
    
    // Encrypt the email content
    const encryptedEmail = encryptData(emailWithMetadata, encryptionKey);
    
    // Create access control records (who can decrypt this email)
    const accessControls = {};
    
    // Add the owner
    accessControls[userId] = {
      role: 'owner',
      key: encryptionKey.key,
      grantedAt: new Date().toISOString()
    };
    
    // Add others who can access
    for (const accessUserId of accessList) {
      if (accessUserId !== userId) {
        accessControls[accessUserId] = {
          role: 'recipient',
          key: encryptionKey.key,
          grantedAt: new Date().toISOString()
        };
      }
    }
    
    // Create the storage package
    const storagePackage = {
      metadata: {
        messageId,
        subject: email.subject || '',
        from: email.from || '',
        to: email.to || '',
        createdAt: email.createdAt || email.sentAt || email.receivedAt || new Date().toISOString(),
        storedAt: new Date().toISOString(),
        hasAttachments: !!email.attachments
      },
      encryptedContent: encryptedEmail,
      // Encrypt access controls individually for better security in a real app
      accessControls
    };
    
    // Upload to IPFS
    const ipfsCid = await uploadToIPFS(
      storagePackage, 
      `email-${messageId}`,
      { userId, messageId, encrypted: true }
    );
    
    // Return the necessary information
    return {
      ipfsCid,
      messageId,
      encryptionKey,
      accessControls
    };
  } catch (error) {
    console.error('Error storing email on IPFS:', error);
    throw new Error(`Failed to store email: ${error.message}`);
  }
}

/**
 * Retrieve an email from IPFS and decrypt it if possible
 * @param {String} ipfsCid - IPFS Content ID
 * @param {String} userId - User ID trying to access this email
 * @returns {Object} - Decrypted email or null if not accessible
 */
async function retrieveEmailFromIPFS(ipfsCid, userId) {
  try {
    // Retrieve from IPFS
    const storagePackage = await retrieveFromIPFS(ipfsCid);
    
    // Check if user has access
    if (!storagePackage.accessControls || !storagePackage.accessControls[userId]) {
      throw new Error('User does not have access to this email');
    }
    
    // Get encryption key for this user
    const encryptionKey = storagePackage.accessControls[userId].key;
    
    // Decrypt the email content
    const decryptedEmail = decryptData(storagePackage.encryptedContent, encryptionKey);
    
    // Return both the metadata and the decrypted content
    return {
      ...storagePackage.metadata,
      ...decryptedEmail,
      ipfsCid
    };
  } catch (error) {
    console.error('Error retrieving email from IPFS:', error);
    throw new Error(`Failed to retrieve email: ${error.message}`);
  }
}

/**
 * Grant a user access to an email
 * @param {String} ipfsCid - IPFS Content ID
 * @param {String} ownerUserId - User ID who owns the email
 * @param {String} targetUserId - User ID to grant access to
 * @returns {Boolean} - Success status
 */
async function grantEmailAccess(ipfsCid, ownerUserId, targetUserId) {
  try {
    // Retrieve from IPFS
    const storagePackage = await retrieveFromIPFS(ipfsCid);
    
    // Check if owner has access
    if (!storagePackage.accessControls || !storagePackage.accessControls[ownerUserId] || 
        storagePackage.accessControls[ownerUserId].role !== 'owner') {
      throw new Error('Only the owner can grant access to an email');
    }
    
    // Get encryption key from owner's access
    const encryptionKey = storagePackage.accessControls[ownerUserId].key;
    
    // Add access for target user
    storagePackage.accessControls[targetUserId] = {
      role: 'recipient',
      key: encryptionKey,
      grantedAt: new Date().toISOString(),
      grantedBy: ownerUserId
    };
    
    // Upload updated package to IPFS (creates a new CID)
    const newIpfsCid = await uploadToIPFS(
      storagePackage, 
      `email-${storagePackage.metadata.messageId}-updated`,
      { userId: ownerUserId, messageId: storagePackage.metadata.messageId, encrypted: true }
    );
    
    // Return the new CID and success status
    return {
      success: true,
      previousCid: ipfsCid,
      newCid: newIpfsCid
    };
  } catch (error) {
    console.error('Error granting email access:', error);
    throw new Error(`Failed to grant access: ${error.message}`);
  }
}

module.exports = {
  storeEmailOnIPFS,
  retrieveEmailFromIPFS,
  grantEmailAccess
};