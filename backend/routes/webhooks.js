// routes/webhooks.js
const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { Webhook } = require('svix');
const router = express.Router();

// Get raw body for signature verification
const getRawBody = (req) => {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
};

// Supported events from Resend
const SUPPORTED_EVENTS = [
  'email.bounced',
  'email.clicked',
  'email.complained',
  'email.delivered',
  'email.delivery_delayed',
  'email.opened',
  'email.sent'
];

// Mongoose schema and model for webhook events
const webhookEventSchema = new mongoose.Schema({
  type: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  receivedAt: { type: Date, default: Date.now }
});
const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);

// Configure webhook handler
const webhook = process.env.WEBHOOK_SECRET 
  ? new Webhook(process.env.WEBHOOK_SECRET)
  : null;

// Webhook endpoint that parses raw body first
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Get raw body content
    const payload = req.body.toString();
    
    // Verify webhook signature if secret is configured
    let event;
    if (webhook) {
      const headers = {
        'svix-id': req.headers['svix-id'],
        'svix-timestamp': req.headers['svix-timestamp'],
        'svix-signature': req.headers['svix-signature']
      };
      
      // Verify the signature
      event = webhook.verify(payload, headers);
    } else {
      // Fallback to parse JSON if no webhook secret
      event = JSON.parse(payload);
    }
    //log the data
    console.log('Webhook payload:', event);

    // Check if this is a supported event type
    if (!SUPPORTED_EVENTS.includes(event.type)) {
      console.warn(`Unsupported event type: ${event.type}`);
      return res.status(400).json({ error: 'Unsupported event type' });
    }

    console.log(`Received webhook event: ${event.type}`);

    // Save the event to the database
    try {
      await WebhookEvent.create({
        type: event.type,
        data: event.data,
      });
      
      // Additional processing based on event type
      if (event.type === 'email.bounced') {
        // Handle bounced emails (you could implement something similar to sendSlackMessage)
        console.log('Email bounced:', event.data.email);
        // TODO: Add your business logic for bounced emails
      }
      
      return res.status(200).json({ received: true });
    } catch (err) {
      console.error('Failed to save webhook event:', err);
      return res.status(500).json({ error: 'Failed to save event' });
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }
});

module.exports = router;