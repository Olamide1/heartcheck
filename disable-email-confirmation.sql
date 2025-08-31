-- Disable email confirmation requirement for development
-- Run this in your Supabase SQL Editor

-- Check current auth settings
SELECT * FROM auth.config;

-- Disable email confirmation requirement
UPDATE auth.config 
SET confirm_email_change = false,
    enable_signup = true,
    enable_confirmations = false;

-- Alternative: Update the specific setting
-- UPDATE auth.config SET enable_confirmations = false;

-- Verify the change
SELECT * FROM auth.config;
