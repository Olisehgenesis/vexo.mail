// server/services/ipfsService.js
const { PinataSDK } = require("pinata");
const { Blob } = require("buffer");
const fs = require("fs");
require("dotenv").config();

// Initialize Pinata SDK
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY_URL
});

/**
 * Upload content to IPFS via Pinata
 * @param {Object} content - Content to upload (will be stringified)
 * @param {String} name - Name for the file
 * @param {Object} metadata - Optional metadata for the upload
 * @returns {Promise<Object>} - Upload response with CID and other details
 */
async function uploadToIPFS(content, name, metadata = {}) {
  try {
    console.log(`Uploading to IPFS: ${name}`);
    
    // Convert content to JSON string
    const contentString = JSON.stringify(content);
    
    // Create a blob and file from the content
    const blob = new Blob([contentString]);
    const file = new File([blob], name || "content.json", { type: "application/json" });
    
    // Upload to Pinata
    const result = await pinata.upload.public.file(file, {
      pinataMetadata: metadata
    });
    
    console.log(`Uploaded to IPFS with CID: ${result.cid}`);
    return result;
  } catch (error) {
    console.error("Error uploading to IPFS:", error);
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
}

/**
 * Upload a file to IPFS via Pinata
 * @param {String} filePath - Path to the file
 * @param {String} name - Optional name for the file (default is taken from filePath)
 * @param {Object} metadata - Optional metadata for the upload
 * @returns {Promise<Object>} - Upload response with CID and other details
 */
async function uploadFileToIPFS(filePath, name, metadata = {}) {
  try {
    const fileName = name || filePath.split('/').pop();
    console.log(`Uploading file to IPFS: ${fileName}`);
    
    // Read the file and create blob
    const fileContent = fs.readFileSync(filePath);
    const blob = new Blob([fileContent]);
    
    // Determine MIME type based on file extension
    const extension = fileName.split('.').pop().toLowerCase();
    let mimeType = "application/octet-stream";
    if (extension === "txt") mimeType = "text/plain";
    if (extension === "json") mimeType = "application/json";
    // Add more MIME types as needed
    
    const file = new File([blob], fileName, { type: mimeType });
    
    // Upload to Pinata
    const result = await pinata.upload.public.file(file, {
      pinataMetadata: metadata
    });
    
    console.log(`Uploaded file to IPFS with CID: ${result.cid}`);
    return result;
  } catch (error) {
    console.error("Error uploading file to IPFS:", error);
    throw new Error(`IPFS file upload failed: ${error.message}`);
  }
}

/**
 * Retrieve content from IPFS via Pinata gateway
 * @param {String} cid - IPFS Content ID (hash)
 * @returns {Promise<any>} - Retrieved content
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
    
    // The correct method is unpin, not removePinByHash
    const result = await pinata.pins.unpin(cid);
    
    return true;
  } catch (error) {
    console.error("Error unpinning from IPFS:", error);
    throw new Error(`IPFS unpin failed: ${error.message}`);
  }
}

module.exports = {
  uploadToIPFS,
  uploadFileToIPFS,
  retrieveFromIPFS,
  deleteFromIPFS
};