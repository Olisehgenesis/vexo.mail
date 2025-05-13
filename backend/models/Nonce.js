// server/models/Nonce.js
const mongoose = require('mongoose');

const nonceSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
  },
  nonce: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      // Nonce expires after 10 minutes
      return new Date(Date.now() + 10 * 60 * 1000);
    },
  },
});

// Automatically remove expired nonces
nonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Nonce = mongoose.model('Nonce', nonceSchema);

module.exports = Nonce;