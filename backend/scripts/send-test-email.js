// scripts/send-test-email.js
require('dotenv').config();
const { Resend } = require('resend');

async function sendTestEmail() {
  try {
    console.log('Sending test email to mwijusyaoliseh1@gmail.com using verified domain...');
    
    // Initialize Resend with your API key
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Send email using your verified domain
    const response = await resend.emails.send({
      from: 'test@vexo.social', // Now you can use your verified domain
      to: 'mwijusyaoliseh1@gmail.com',
      subject: 'Hello from Vexo.Social - Verified Domain',
      text: 'This is a test email from your wallet-based email system using a verified domain.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h1 style="color: #6366f1;">Welcome to Vexo.Social!</h1>
          <p>This is a test email sent from your verified domain vexo.social.</p>
          <p>Your email system is now fully configured and ready to send emails.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Sent from Vexo.Social - Blockchain-based email</p>
        </div>
      `
    });
    
    console.log('Email sent successfully!');
    console.log('Response:', response);
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.response) {
      console.error('Resend API Error Details:', error.response);
    }
  }
}

// Run the function
sendTestEmail();