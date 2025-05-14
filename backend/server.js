// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connectDB = require('./db/db'); // New db connection module
const authRoutes = require('./routes/auth');
const emailService = require('./services/emailService');
const mongoose = require('mongoose');
const emailRoutes = require('./routes/email');



const app = express();
const PORT = process.env.PORT || 5000;

// Load environment variables
const JWT_SECRET = process.env.JWT_SECRET;


const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'https://vexo.social', '*'];

// Check required environment variables
if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}


// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.indexOf(origin) === -1 && ALLOWED_ORIGINS.indexOf('*') === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Then add this line where you set up the routes (after the app.use('/api/auth', authRoutes); line)
app.use('/api/emails', emailRoutes);


// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ 
    error: 'Server error', 
    details: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Connect to MongoDB and start server
async function startServer() {
  try {
    // Connect to MongoDB using the new module
    const isConnected = await connectDB(app); // Pass app here
    
    if (!isConnected) {
      console.warn('Starting server with fallback mechanisms due to MongoDB connection issues');
    }
    
    // Routes
    app.use('/api/auth', authRoutes);
    
    // SendGrid webhook for incoming emails
    app.post('/api/email/incoming', express.raw({ type: 'application/json' }), async (req, res) => {
      try {
        const inboundEmail = JSON.parse(req.body.toString());
        await emailService.processIncomingEmail(inboundEmail);
        res.status(200).send('OK');
      } catch (error) {
        console.error('Error processing incoming email webhook:', error);
        res.status(500).send('Error processing email');
      }
    });
    
    // Health check with DB status
    app.get('/health', (req, res) => {
      const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
      res.status(200).json({ 
        status: 'ok', 
        db: dbStatus,
        environment: process.env.NODE_ENV || 'development',
        serverTime: new Date().toISOString()
      });
    });
    
    // Add test route for development
    if (process.env.NODE_ENV !== 'production') {
      setupDevRoutes(app);
    }
    
    
    // Handle 404 errors
    app.use((req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`
          Server URLs:
          - API: http://localhost:${PORT}/api
          - Health: http://localhost:${PORT}/health
          - Test token (dev): http://localhost:${PORT}/api/auth/test-token
        `);
      }
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Dev routes for testing - only in development
function setupDevRoutes(app) {
  const mongoose = require('mongoose');
  const User = require('./models/User');
  
  // Generate a test token (FOR DEVELOPMENT ONLY)
  app.post('/api/auth/test-token', async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
      }
      
      let userId;
      
      try {
        // Try to find or create a user
        let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        if (!user) {
          // Create a test user
          user = new User({
            walletAddress: walletAddress.toLowerCase(),
            emailAddress: `${walletAddress.slice(0, 8).toLowerCase()}@vexo.social`,
            baseName: null,
            publicKey: 'test-public-key',
            encryptedDataKey: 'test-encrypted-key',
            dataKeyIv: 'test-iv',
            dataKeyAuthTag: 'test-auth-tag',
            createdAt: new Date(),
            lastLogin: new Date()
          });
          
          await user.save();
        }
        
        userId = user._id;
      } catch (dbError) {
        console.error('Database error in test-token:', dbError);
        // Use the wallet address as a fallback ID if DB fails
        userId = walletAddress.toLowerCase();
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId, 
          walletAddress: walletAddress.toLowerCase() 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' } // Longer expiry for testing
      );
      
      res.status(200).json({ 
        token,
        message: 'Test token generated - valid for 24 hours',
        userId
      });
    } catch (error) {
      console.error('Test token error:', error);
      res.status(500).json({ error: 'Failed to generate test token' });
    }
  });
  
  // Add API documentation route
  app.get('/api/docs', (req, res) => {
    res.json({
      api: 'Vexo.social API',
      version: '1.0.0',
      endpoints: {
        auth: {
          '/api/auth/nonce': 'GET - Generate a nonce for wallet signature',
          '/api/auth/verify': 'POST - Verify signature and authenticate',
          '/api/auth/me': 'GET - Get current user info',
          '/api/auth/basename': 'GET - Resolve Base name for wallet address',
          '/api/auth/domain': 'GET - Check domain name for wallet address',
          '/api/auth/test-token': 'POST - Generate test token (dev only)'
        },
        email: {
          '/api/email/send': 'POST - Send an email',
          '/api/email/incoming': 'POST - Webhook for incoming emails'
        },
        system: {
          '/health': 'GET - System health check'
        }
      }
    });
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  
  // Close any other connections or resources
  if (mongoose.connection.readyState === 1) {
    console.log('Closing MongoDB connection');
    await mongoose.connection.close();
  }
  
  console.log('Shutdown complete');
  process.exit(0);
});

// Start the server
startServer().catch(console.dir);