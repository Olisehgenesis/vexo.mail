// server/db.js
const mongoose = require('mongoose');

// MongoDB connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000, // 15 seconds
  socketTimeoutMS: 45000, // 45 seconds
  autoIndex: process.env.NODE_ENV !== 'production', // Don't build indexes in production
  maxPoolSize: 10, // Maintain up to 10 socket connections
  family: 4 // Use IPv4, skip trying IPv6
};

// Connect to MongoDB
const connectDB = async (app) => {
  try {
    // Get MongoDB URI from environment variable
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.error('MONGODB_URI environment variable is required');
      return false;
    }
    
    console.log("Connecting to MongoDB...");
    
    const conn = await mongoose.connect(MONGODB_URI, options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Make database connections available to routes
    if (app) {
      app.locals.db = conn.connection.db; // This is the MongoDB driver db instance
      app.locals.mongoose = mongoose; // This is the Mongoose instance
    }
    
    // Handle connection errors after initial connection
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    // Attempt to reconnect if connection is lost
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
      setTimeout(() => {
        mongoose.connect(MONGODB_URI, options)
          .then(() => {
            console.log('MongoDB reconnected');
            if (app) {
              app.locals.db = mongoose.connection.db;
            }
          })
          .catch(err => console.error('Reconnection error:', err));
      }, 5000); // Try to reconnect after 5 seconds
    });
    
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    
    // Set up a fallback mechanism when MongoDB is unavailable
    setupFallbackMechanism(app);
    
    // Return false to indicate connection failure
    return false;
  }
};

// Setup fallback mechanism when MongoDB is unavailable
const setupFallbackMechanism = (app) => {
  console.log('Setting up in-memory fallback mechanism for critical functionality');
  
  // Create global storage for temporary data
  const tempStorage = {
    users: new Map(),
    nonces: new Map(),
    emails: new Map()
  };
  
  // Create an in-memory MongoDB-like interface
  const inMemoryDb = {
    collection: (collectionName) => {
      const getCollection = () => {
        if (!tempStorage[collectionName]) {
          tempStorage[collectionName] = new Map();
        }
        return tempStorage[collectionName];
      };
      
      return {
        // Find one document
        findOne: async (query) => {
          const collection = getCollection();
          // Simple query matching - only works for exact matches
          for (const [id, doc] of collection.entries()) {
            let match = true;
            for (const [key, value] of Object.entries(query)) {
              if (key === 'userId' || key === '_id') {
                // Handle ObjectId comparison
                if (doc[key].toString() !== value.toString()) {
                  match = false;
                  break;
                }
              } else if (doc[key] !== value) {
                match = false;
                break;
              }
            }
            if (match) return doc;
          }
          return null;
        },
        
        // Find multiple documents
        find: (query) => {
          const collection = getCollection();
          const results = [];
          
          // Simple query matching
          for (const [id, doc] of collection.entries()) {
            let match = true;
            for (const [key, value] of Object.entries(query)) {
              if (key === 'userId' || key === '_id') {
                // Handle ObjectId comparison
                if (doc[key].toString() !== value.toString()) {
                  match = false;
                  break;
                }
              } else if (doc[key] !== value) {
                match = false;
                break;
              }
            }
            if (match) results.push(doc);
          }
          
          return {
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  toArray: async () => results
                })
              })
            })
          };
        },
        
        // Insert a document
        insertOne: async (doc) => {
          const collection = getCollection();
          const id = doc._id || doc.id || Date.now().toString();
          const newDoc = { ...doc, _id: id };
          collection.set(id.toString(), newDoc);
          return { insertedId: id };
        },
        
        // Update a document
        updateOne: async (query, update) => {
          const collection = getCollection();
          let matchedCount = 0;
          
          for (const [id, doc] of collection.entries()) {
            let match = true;
            for (const [key, value] of Object.entries(query)) {
              if (key === 'userId' || key === '_id') {
                // Handle ObjectId comparison
                if (doc[key].toString() !== value.toString()) {
                  match = false;
                  break;
                }
              } else if (doc[key] !== value) {
                match = false;
                break;
              }
            }
            
            if (match) {
              matchedCount++;
              if (update.$set) {
                for (const [key, value] of Object.entries(update.$set)) {
                  doc[key] = value;
                }
                collection.set(id, doc);
              }
              break;
            }
          }
          
          return { matchedCount };
        },
        
        // Delete a document
        deleteOne: async (query) => {
          const collection = getCollection();
          let deletedCount = 0;
          
          for (const [id, doc] of collection.entries()) {
            let match = true;
            for (const [key, value] of Object.entries(query)) {
              if (key === 'userId' || key === '_id') {
                // Handle ObjectId comparison
                if (doc[key].toString() !== value.toString()) {
                  match = false;
                  break;
                }
              } else if (doc[key] !== value) {
                match = false;
                break;
              }
            }
            
            if (match) {
              collection.delete(id);
              deletedCount++;
              break;
            }
          }
          
          return { deletedCount };
        },
        
        // Count documents
        countDocuments: async (query) => {
          const collection = getCollection();
          let count = 0;
          
          for (const [id, doc] of collection.entries()) {
            let match = true;
            for (const [key, value] of Object.entries(query)) {
              if (key === 'userId' || key === '_id') {
                // Handle ObjectId comparison
                if (doc[key].toString() !== value.toString()) {
                  match = false;
                  break;
                }
              } else if (doc[key] !== value) {
                match = false;
                break;
              }
            }
            
            if (match) count++;
          }
          
          return count;
        }
      };
    }
  };
  
  // Attach to app.locals if available
  if (app) {
    app.locals.db = inMemoryDb;
    console.log('In-memory database attached to app.locals.db');
  }
  
  // Retry connection periodically
  setTimeout(() => connectDB(app), 10000); // Try again in 10 seconds
};

module.exports = connectDB;