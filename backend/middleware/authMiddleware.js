// server/middleware/authMiddleware.js
const { verifyToken } = require('../utils/auth');

// Middleware to protect routes - requires authentication
const protect = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // If no token, not authenticated
    if (!token) {
      return res.status(401).json({
        error: 'Not authenticated - no token provided',
      });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        error: 'Not authenticated - invalid token',
      });
    }
    
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      walletAddress: decoded.walletAddress,
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      error: 'Not authenticated',
    });
  }
};

module.exports = { protect };