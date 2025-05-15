// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title EncryptedEmailStorage
 * @dev Contract for storing encrypted email references on the blockchain with access control
 */
contract EncryptedEmailStorage {
    // Contract owner
    address private owner;
    
    // Email message counter
    uint256 private messageCounter;
    
    // Structures
    struct EmailData {
        uint256 id;                // Unique email ID
        address sender;            // Address of the sender
        string ipfsHash;           // Reference to encrypted content on IPFS
        bytes32 contentHash;       // Hash of content for integrity verification
        uint256 timestamp;         // When the email was registered
        bool isDeleted;            // Soft deletion flag
    }
    
    struct AccessControl {
        bool hasAccess;            // Whether the address has access
        bytes encryptedKey;        // Encryption key encrypted with recipient's public key
    }
    
    // Mappings
    mapping(uint256 => EmailData) private emails;
    mapping(uint256 => mapping(address => AccessControl)) private accessControls;
    mapping(uint256 => address[]) private emailRecipients;
    
    mapping(address => uint256[]) private userSentEmails;
    mapping(address => uint256[]) private userAccessibleEmails;
    
    // Events
    event EmailStored(uint256 indexed id, address indexed sender, string ipfsHash);
    event AccessGranted(uint256 indexed emailId, address indexed to, address indexed by);
    event AccessRevoked(uint256 indexed emailId, address indexed from, address indexed by);
    event EmailDeleted(uint256 indexed emailId, address indexed by);
    
    // Constructor
    constructor() {
        owner = msg.sender;
        messageCounter = 0;
    }
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlySender(uint256 emailId) {
        require(emails[emailId].sender == msg.sender, "Only sender can perform this action");
        _;
    }
    
    modifier emailExists(uint256 emailId) {
        require(emailId > 0 && emailId <= messageCounter, "Email ID does not exist");
        require(!emails[emailId].isDeleted, "Email has been deleted");
        _;
    }
    
    modifier hasAccess(uint256 emailId) {
        require(
            emails[emailId].sender == msg.sender || 
            accessControls[emailId][msg.sender].hasAccess,
            "You don't have access to this email"
        );
        _;
    }
    
    /**
     * @dev Store an encrypted email reference on the blockchain
     * @param ipfsHash The IPFS hash pointing to the encrypted email content
     * @param contentHash The hash of the email content for verification
     * @param recipients Array of recipient addresses
     * @param encryptedKeys Array of encryption keys for each recipient (encrypted with their public keys)
     * @return The ID of the stored email
     */
    function storeEmail(
        string memory ipfsHash,
        bytes32 contentHash,
        address[] memory recipients,
        bytes[] memory encryptedKeys
    ) external returns (uint256) {
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(recipients.length > 0, "At least one recipient is required");
        require(recipients.length == encryptedKeys.length, "Recipients and keys count mismatch");
        
        // Increment message counter
        messageCounter++;
        uint256 emailId = messageCounter;
        
        // Create email data
        emails[emailId] = EmailData({
            id: emailId,
            sender: msg.sender,
            ipfsHash: ipfsHash,
            contentHash: contentHash,
            timestamp: block.timestamp,
            isDeleted: false
        });
        
        // Add to sender's emails
        userSentEmails[msg.sender].push(emailId);
        
        // Set sender's access (they can always access their own emails)
        accessControls[emailId][msg.sender] = AccessControl({
            hasAccess: true,
            encryptedKey: encryptedKeys[0] // Assume first key is for sender
        });
        
        // Add to sender's accessible emails
        userAccessibleEmails[msg.sender].push(emailId);
        
        // Process recipients
        for (uint i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];
            
            // Skip if recipient is address(0) or the sender
            if (recipient != address(0) && recipient != msg.sender) {
                // Set recipient's access
                accessControls[emailId][recipient] = AccessControl({
                    hasAccess: true,
                    encryptedKey: encryptedKeys[i]
                });
                
                // Add to recipients list
                emailRecipients[emailId].push(recipient);
                
                // Add to recipient's accessible emails
                userAccessibleEmails[recipient].push(emailId);
                
                emit AccessGranted(emailId, recipient, msg.sender);
            }
        }
        
        emit EmailStored(emailId, msg.sender, ipfsHash);
        
        return emailId;
    }
    
    /**
     * @dev Grant access to an email to a new recipient
     * @param emailId ID of the email
     * @param recipient Address of the recipient
     * @param encryptedKey Encryption key encrypted with recipient's public key
     */
    function grantAccess(
        uint256 emailId,
        address recipient,
        bytes memory encryptedKey
    ) external emailExists(emailId) onlySender(emailId) {
        require(recipient != address(0), "Invalid recipient address");
        require(!accessControls[emailId][recipient].hasAccess, "Recipient already has access");
        
        // Grant access
        accessControls[emailId][recipient] = AccessControl({
            hasAccess: true,
            encryptedKey: encryptedKey
        });
        
        // Add to recipients list if not already there
        bool alreadyInList = false;
        for (uint i = 0; i < emailRecipients[emailId].length; i++) {
            if (emailRecipients[emailId][i] == recipient) {
                alreadyInList = true;
                break;
            }
        }
        
        if (!alreadyInList) {
            emailRecipients[emailId].push(recipient);
        }
        
        // Add to recipient's accessible emails
        userAccessibleEmails[recipient].push(emailId);
        
        emit AccessGranted(emailId, recipient, msg.sender);
    }
    
    /**
     * @dev Revoke access to an email from a recipient
     * @param emailId ID of the email
     * @param recipient Address to revoke access from
     */
    function revokeAccess(
        uint256 emailId,
        address recipient
    ) external emailExists(emailId) onlySender(emailId) {
        require(recipient != address(0), "Invalid recipient address");
        require(recipient != msg.sender, "Cannot revoke own access");
        require(accessControls[emailId][recipient].hasAccess, "Recipient doesn't have access");
        
        // Revoke access
        accessControls[emailId][recipient].hasAccess = false;
        
        emit AccessRevoked(emailId, recipient, msg.sender);
    }
    
    /**
     * @dev Delete an email (soft delete)
     * @param emailId ID of the email to delete
     */
    function deleteEmail(
        uint256 emailId
    ) external emailExists(emailId) onlySender(emailId) {
        emails[emailId].isDeleted = true;
        emit EmailDeleted(emailId, msg.sender);
    }
    
    /**
     * @dev Update IPFS reference for an email (useful if content needs to be updated)
     * @param emailId ID of the email
     * @param newIpfsHash New IPFS hash
     * @param newContentHash New content hash
     */
    function updateEmailReference(
        uint256 emailId,
        string memory newIpfsHash,
        bytes32 newContentHash
    ) external emailExists(emailId) onlySender(emailId) {
        require(bytes(newIpfsHash).length > 0, "IPFS hash cannot be empty");
        
        emails[emailId].ipfsHash = newIpfsHash;
        emails[emailId].contentHash = newContentHash;
        emails[emailId].timestamp = block.timestamp;
        
        emit EmailStored(emailId, msg.sender, newIpfsHash);
    }
    
    /**
     * @dev Get email details if caller has access
     * @param emailId ID of the email
     * @return id The unique identifier of the email
     * @return sender The address of the email sender
     * @return ipfsHash The IPFS hash of the encrypted content
     * @return contentHash The hash of the email content
     * @return timestamp The time when the email was registered
     */
    function getEmailDetails(
        uint256 emailId
    ) external view emailExists(emailId) hasAccess(emailId) returns (
        uint256 id,
        address sender,
        string memory ipfsHash,
        bytes32 contentHash,
        uint256 timestamp
    ) {
        EmailData storage email = emails[emailId];
        return (
            email.id,
            email.sender,
            email.ipfsHash,
            email.contentHash,
            email.timestamp
        );
    }
    
    /**
     * @dev Get the encrypted key for an email
     * @param emailId ID of the email
     * @return The encrypted key for the caller
     */
    function getEncryptedKey(
        uint256 emailId
    ) external view emailExists(emailId) hasAccess(emailId) returns (bytes memory) {
        return accessControls[emailId][msg.sender].encryptedKey;
    }
    
    /**
     * @dev Check if a user has access to an email
     * @param emailId ID of the email
     * @param user Address to check
     * @return Whether the user has access
     */
    function checkAccess(
        uint256 emailId,
        address user
    ) external view emailExists(emailId) returns (bool) {
        return emails[emailId].sender == user || accessControls[emailId][user].hasAccess;
    }
    
    /**
     * @dev Get all recipients of an email
     * @param emailId ID of the email
     * @return Array of recipient addresses
     */
    function getRecipients(
        uint256 emailId
    ) external view emailExists(emailId) hasAccess(emailId) returns (address[] memory) {
        return emailRecipients[emailId];
    }
    
    /**
     * @dev Get all emails sent by the caller
     * @return Array of email IDs
     */
    function getSentEmails() external view returns (uint256[] memory) {
        return userSentEmails[msg.sender];
    }
    
    /**
     * @dev Get all emails accessible to the caller
     * @return Array of email IDs
     */
    function getAccessibleEmails() external view returns (uint256[] memory) {
        return userAccessibleEmails[msg.sender];
    }
    
    /**
     * @dev Get the total number of emails in the contract
     * @return Total email count
     */
    function getTotalEmailCount() external view returns (uint256) {
        return messageCounter;
    }
    
    /**
     * @dev Transfer ownership of the contract
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be the zero address");
        owner = newOwner;
    }
}