// server/models/Email.js
const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  messageId: {
    type: String,
    required: true,
    unique: true,
  },
  folder: {
    type: String,
    required: true,
    default: 'inbox',
    enum: ['inbox', 'sent', 'drafts', 'trash', 'archive'],
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  isStarred: {
    type: Boolean,
    default: false,
  },
  encryptedContent: {
    type: String,
    required: true,
  },
  contentIv: {
    type: String,
    required: true,
  },
  contentAuthTag: {
    type: String,
    required: true,
  },
  // These metadata fields are encrypted but stored separately for quick access
  encryptedMetadata: {
    type: String,
    required: true,
  },
  metadataIv: {
    type: String,
    required: true,
  },
  metadataAuthTag: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for performance
emailSchema.index({ userId: 1, folder: 1, createdAt: -1 });
emailSchema.index({ userId: 1, messageId: 1 });

const Email = mongoose.model('Email', emailSchema);

module.exports = Email;