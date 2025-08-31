-- COMPLETE Deep Linking Fix for HeartCheck
-- This will fix email confirmation redirects

-- Run this in your Supabase SQL Editor AFTER disabling RLS

-- 1. Update the Site URL to use the correct Expo Go format
-- Go to: Authentication → URL Configuration → Site URL
-- Change to: exp://192.168.1.135:8081

-- 2. Update Redirect URLs to include ALL possible formats
-- Add these URLs in Authentication → URL Configuration → Redirect URLs:

/*
exp://192.168.1.135:8081
exp://192.168.1.135:8081/*
exp://localhost:8081
exp://localhost:8081/*
exp://127.0.0.1:8081
exp://127.0.0.1:8081/*
heartcheck://
heartcheck://*
*/

-- 3. Check if there are any conflicting email templates
-- Go to: Authentication → Emails → Confirm signup
-- Make sure the template uses the correct redirect URL

-- 4. Test the deep linking
-- After updating URLs, try signing up again
-- The email confirmation should now redirect to your app

-- 5. If still not working, try these alternative Site URLs:
/*
exp://192.168.1.135:8081
exp://localhost:8081
exp://127.0.0.1:8081
*/
