// server/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/nonce', authController.getNonce);
// server/routes/auth.js (add this route)
router.get('/basename', authController.getBaseName);
router.post('/verify', authController.verifySignature);
router.get('/domain', authController.checkDomain);

// Protected routes
router.get('/me', protect, authController.getMe);

module.exports = router;