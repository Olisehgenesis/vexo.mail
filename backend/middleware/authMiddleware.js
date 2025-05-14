// server/middleware/authMiddleware.js
const { verifyToken } = require('../utils/auth');
const User = require('../models/User'); // Add this if you want to fetch user data

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
    
    // Optionally fetch additional user data if needed (with fallback)
    try {
      if (req.path.startsWith('/auth/me') || req.path.includes('/profile') || req.query.includeUserData === 'true') {
        const user = await User.findById(decoded.userId);
        if (user) {
          req.userDetails = {
            emailAddress: user.emailAddress,
            baseName: user.baseName,
            lastLogin: user.lastLogin,
            // Add any other fields you might need
          };
        }
      }
    } catch (dbError) {
      // Log error but don't fail the request
      console.error('Error fetching user data in middleware:', dbError);
      // Continue without the additional user data
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // Provide more detailed error messages
    let errorMessage = 'Authentication failed';
    
    if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token format';
    } else if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token has expired';
    }
    
    res.status(401).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Optional middleware for routes that prefer authentication but don't require it
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token
      const decoded = verifyToken(token);
      
      if (decoded) {
        // Token is valid - attach user info to request
        req.user = {
          userId: decoded.userId,
          walletAddress: decoded.walletAddress,
        };
        
        // Set isAuthenticated flag
        req.isAuthenticated = true;
      } else {
        // Invalid token - user is not authenticated
        req.isAuthenticated = false;
      }
    } else {
      // No token - user is not authenticated
      req.isAuthenticated = false;
    }
    
    // Always continue to the next middleware/route handler
    next();
  } catch (error) {
    // Log error but continue (not authenticated)
    console.error('Optional auth middleware error:', error);
    req.isAuthenticated = false;
    next();
  }
};

// Middleware to check if user is an admin (example of role-based middleware)
const adminOnly = async (req, res, next) => {
  try {
    // First ensure the user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated'
      });
    }
    
    // Check if the user is an admin (you'll need to implement this logic)
    let isAdmin = false;
    
    try {
      const user = await User.findById(req.user.userId);
      isAdmin = user && user.role === 'admin';
    } catch (dbError) {
      console.error('Database error checking admin status:', dbError);
      // Default to not admin if database error
      isAdmin = false;
    }
    
    if (!isAdmin) {
      return res.status(403).json({
        error: 'Access denied - admin privileges required'
      });
    }
    
    // User is an admin, proceed
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      error: 'Server error checking permissions'
    });
  }
};

// A rate limiting middleware to prevent abuse (very basic implementation)
const rateLimiter = (requestsPerMinute = 60) => {
  const clients = new Map();
  
  return (req, res, next) => {
    // Get client identifier (IP or user ID if authenticated)
    const clientId = req.user?.userId || req.ip || 'unknown';
    
    // Get current timestamp
    const now = Date.now();
    
    // Get client's request history or create new empty one
    const clientHistory = clients.get(clientId) || {
      count: 0,
      resetTime: now + 60000 // 1 minute from now
    };
    
    // Check if we need to reset the counter
    if (now > clientHistory.resetTime) {
      clientHistory.count = 0;
      clientHistory.resetTime = now + 60000;
    }
    
    // Increment request count
    clientHistory.count++;
    
    // Update map
    clients.set(clientId, clientHistory);
    
    // Check if rate limit exceeded
    if (clientHistory.count > requestsPerMinute) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((clientHistory.resetTime - now) / 1000)
      });
    }
    
    // Cleanup old entries occasionally
    if (Math.random() < 0.01) { // ~1% chance to cleanup on each request
      const tooOld = now - 120000; // 2 minutes ago
      for (const [id, data] of clients.entries()) {
        if (data.resetTime < tooOld) {
          clients.delete(id);
        }
      }
    }
    
    next();
  };
};

// Export all middleware
module.exports = { 
  protect,
  optionalAuth,
  adminOnly,
  rateLimiter
};