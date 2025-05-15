// server/services/encryptionService.js
const crypto = require('crypto');

/**
 * Generate a random encryption key
 * @returns {Object} - Contains key, iv, and algorithm
 */
function generateEncryptionKey() {
  return {
    key: crypto.randomBytes(32).toString('hex'), // 256-bit key
    iv: crypto.randomBytes(16).toString('hex'),  // Initialization vector
    algorithm: 'aes-256-gcm' // Algorithm to use
  };
}

/**
 * Encrypt data using the provided key
 * @param {Object|String} data - Data to encrypt
 * @param {Object} encryptionKey - Key object with key, iv, and algorithm
 * @returns {Object} - Encrypted data with iv and authTag
 */
function encryptData(data, encryptionKey) {
  try {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Convert hex strings to buffers
    const key = Buffer.from(encryptionKey.key, 'hex');
    const iv = Buffer.from(encryptionKey.iv, 'hex');
    
    // Create cipher
    const cipher = crypto.createCipheriv(encryptionKey.algorithm, key, iv);
    
    // Encrypt data
    let encryptedData = cipher.update(dataString, 'utf8', 'base64');
    encryptedData += cipher.final('base64');
    
    // Get auth tag (for GCM mode)
    const authTag = cipher.getAuthTag().toString('base64');
    
    return {
      encryptedData,
      iv: encryptionKey.iv,
      authTag,
      algorithm: encryptionKey.algorithm
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error(`Failed to encrypt data: ${error.message}`);
  }
}

/**
 * Decrypt encrypted data using the provided key
 * @param {Object} encryptedData - Object with encryptedData, iv, authTag, and algorithm
 * @param {String} key - Encryption key in hex format
 * @returns {Object|String} - Decrypted data
 */
function decryptData(encryptedData, key) {
  try {
    // Convert hex strings to buffers
    const keyBuffer = Buffer.from(key, 'hex');
    const ivBuffer = Buffer.from(encryptedData.iv, 'hex');
    const authTagBuffer = Buffer.from(encryptedData.authTag, 'base64');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(
      encryptedData.algorithm, 
      keyBuffer, 
      ivBuffer
    );
    
    // Set auth tag (for GCM mode)
    decipher.setAuthTag(authTagBuffer);
    
    // Decrypt data
    let decryptedData = decipher.update(encryptedData.encryptedData, 'base64', 'utf8');
    decryptedData += decipher.final('utf8');
    
    // Parse as JSON if possible
    try {
      return JSON.parse(decryptedData);
    } catch (e) {
      // Return as string if not valid JSON
      return decryptedData;
    }
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error(`Failed to decrypt data: ${error.message}`);
  }
}

module.exports = {
  generateEncryptionKey,
  encryptData,
  decryptData
};