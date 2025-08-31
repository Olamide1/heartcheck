-- Test Email Confirmation Flow
-- Run this in your Supabase SQL Editor to diagnose issues

-- Check if email confirmation is enabled
SELECT * FROM auth.config;

-- Check your user's confirmation status
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at
FROM auth.users 
WHERE email = 'theolaakomolafe@gmail.com';

-- Check if there are any RLS policies on users table
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'users';

-- Check if users table has RLS enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Test: Try to manually confirm the user if needed
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW() 
-- WHERE email = 'theolaakomolafe@gmail.com';
