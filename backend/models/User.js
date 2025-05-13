// server/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  emailAddress: {
    type: String,
    required: true,
    unique: true,
  },
  baseName: {
    type: String,
    default: null,
  },
  publicKey: {
    type: String,
    required: true,
  },
  encryptedDataKey: {
    type: String,
    required: true,
  },
  dataKeyIv: {
    type: String,
    required: true,
  },
  dataKeyAuthTag: {
    type: String,
    required: true,
  },
  accessKeys: [{
    keyId: String,
    encryptedDataKey: String,
    iv: String,
    authTag: String,
    timestamp: Number,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: null,
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;