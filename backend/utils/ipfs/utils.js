// server/services/ipfsService.js
const { PinataSDK } = require("pinata");
require("dotenv").config();

// Initialize Pinata SDK
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud"
});

/**
 * Upload content to IPFS via Pinata
 * @param {Object} content - Content to upload (will be stringified)
 * @param {String} name - Name for the file
 * @param {Object} metadata - Optional metadata for the upload
 * @returns {Promise<String>} - IPFS hash (CID)
 */
async function uploadToIPFS(content, name, metadata = {}) {
  try {
    console.log(`Uploading to IPFS: ${name}`);
    
    // Convert content to JSON string
    const contentString = JSON.stringify(content);
    
    // Create a blob from the content
    const blob = Buffer.from(contentString);
    
    // Create options object
    const options = {
      pinataMetadata: {
        name: name || "email-content",
        ...metadata
      }
    };
    
    // Upload to Pinata
    const result = await pinata.upload.public.buffer(blob, options);
    
    console.log(`Uploaded to IPFS with CID: ${result.IpfsHash}`);
    return result.IpfsHash;
  } catch (error) {
    console.error("Error uploading to IPFS:", error);
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
}

/**
 * Retrieve content from IPFS via Pinata
 * @param {String} cid - IPFS Content ID (hash)
 * @returns {Promise<Object>} - Retrieved content
 */
async function retrieveFromIPFS(cid) {
  try {
    console.log(`Retrieving from IPFS: ${cid}`);
    
    // Get the file from Pinata gateway
    const response = await pinata.gateways.get(cid);
    
    // Parse the response if it's JSON
    let content;
    try {
      if (typeof response.data === 'string') {
        content = JSON.parse(response.data);
      } else {
        content = response.data;
      }
    } catch (e) {
      console.warn("Retrieved non-JSON content from IPFS");
      content = response.data;
    }
    
    return content;
  } catch (error) {
    console.error("Error retrieving from IPFS:", error);
    throw new Error(`IPFS retrieval failed: ${error.message}`);
  }
}

/**
 * Delete content from IPFS via Pinata
 * @param {String} cid - IPFS Content ID (hash)
 * @returns {Promise<Boolean>} - Success status
 */
async function deleteFromIPFS(cid) {
  try {
    console.log(`Unpinning from IPFS: ${cid}`);
    
    // Unpin the content
    await pinata.pins.removePinByHash(cid);
    
    return true;
  } catch (error) {
    console.error("Error unpinning from IPFS:", error);
    throw new Error(`IPFS unpin failed: ${error.message}`);
  }
}

module.exports = {
  uploadToIPFS,
  retrieveFromIPFS,
  deleteFromIPFS
};