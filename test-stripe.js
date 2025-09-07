#!/usr/bin/env node

/**
 * Simple test script to verify Stripe integration
 * Run with: node test-stripe.js
 * 
 * Make sure to set your STRIPE_SECRET_KEY in your .env file first
 */

// Load environment variables
require('dotenv').config();

async function testStripeConnection() {
  try {
    console.log('🔍 Testing Stripe connection...');
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('❌ STRIPE_SECRET_KEY not found in .env file');
      console.log('💡 Add this to your .env file:');
      console.log('   STRIPE_SECRET_KEY=sk_test_your_key_here');
      return;
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Test API key
    const balance = await stripe.balance.retrieve();
    console.log('✅ Stripe connection successful');
    console.log(`💰 Available balance: ${balance.available[0].amount / 100} ${balance.available[0].currency.toUpperCase()}`);
    
    console.log('\n🎉 Stripe is ready! You can now add real payment processing.');
    
  } catch (error) {
    console.error('❌ Stripe test failed:', error.message);
    
    if (error.code === 'api_key_invalid') {
      console.log('\n💡 Make sure your STRIPE_SECRET_KEY is correct in your .env file');
    }
    
    process.exit(1);
  }
}

// Run the test
testStripeConnection();