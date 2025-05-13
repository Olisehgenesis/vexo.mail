// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const authRoutes = require('./routes/auth');
const emailService = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 5000;

// Load environment variables
const MONGODB_URI = process.env.MONGODB_URI ;
const JWT_SECRET = process.env.JWT_SECRET;
// Replace with:
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'vexo.social';


const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'https://vexo.social', '*'];

// Check required environment variables
if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

// And update the API key check:
if (!MAILGUN_API_KEY) {
    console.error('MAILGUN_API_KEY environment variable is required');
    process.exit(1);
  }
// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect to MongoDB and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await client.connect();
    // Confirm connection with a ping
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB Atlas successfully!");
    
    // Store db connection for use in routes
    app.locals.db = client.db('vexo');
    
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
    
    // Health check
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });
    
    // Initialize Mailgun domain (only needed once)
if (process.env.VERIFY_MAILGUN_DOMAIN === 'true') {
    emailService.verifyMailgunDomain(MAILGUN_DOMAIN)
      .then(success => {
        if (success) {
          console.log('Mailgun domain verification initiated');
        } else {
          console.error('Mailgun domain verification failed');
        }
      })
      .catch(err => console.error('Mailgun domain verification error:', err));
  }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing MongoDB connection');
  await client.close();
  process.exit(0);
});// Add at the top with other requires
const jwt = require('jsonwebtoken');

// Add these routes before the server start
// WARNING: These routes are for testing/development only!
if (process.env.NODE_ENV !== 'production') {
  // Generate a test token (FOR DEVELOPMENT ONLY)
  app.post('/api/auth/test-token', (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
      }
      
      // Create a test user if one doesn't exist
      const db = req.app.locals.db;
      db.collection('users').findOne({ walletAddress: walletAddress.toLowerCase() })
        .then(async (user) => {
          let userId;
          
          if (!user) {
            // Create a test user
            const result = await db.collection('users').insertOne({
              walletAddress: walletAddress.toLowerCase(),
              emailAddress: 'test@vexo.social',
              domainName: null,
              domainType: 'none',
              publicKey: 'test-public-key',
              encryptedDataKey: 'test-encrypted-key',
              dataKeyIv: 'test-iv',
              dataKeyAuthTag: 'test-auth-tag',
              createdAt: new Date(),
              lastLogin: new Date()
            });
            userId = result.insertedId;
          } else {
            userId = user._id;
          }
          
          // Generate JWT token
          const token = jwt.sign(
            { 
              userId, 
              walletAddress: walletAddress.toLowerCase() 
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
          );
          
          res.status(200).json({ token });
        })
        .catch(err => {
          console.error('Test token error:', err);
          res.status(500).json({ error: 'Failed to generate test token' });
        });
    } catch (error) {
      console.error('Test token error:', error);
      res.status(500).json({ error: 'Failed to generate test token' });
    }
  });
}

// Add email sending endpoint
app.post('/api/email/send', async (req, res) => {
  try {
    // Check if user is authenticated
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Validate email data
    const { to, subject, text, html } = req.body;
    
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'To, subject, and text/html are required' });
    }
    
    // Send email
    const result = await emailService.sendEmail(decoded.userId, { to, subject, text, html });
    
    res.status(200).json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ error: 'Failed to send email: ' + error.message });
  }
});

// Start the server
startServer().catch(console.dir);