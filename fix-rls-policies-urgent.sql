-- URGENT: Fix RLS Policies for HeartCheck
-- This will resolve the "Permission denied" error immediately

-- Run this in your Supabase SQL Editor NOW

-- 1. Remove ALL existing policies for the users table (including the one that might already exist)
DROP POLICY IF EXISTS "Allow authenticated users to create profile" ON users;
DROP POLICY IF EXISTS "Allow users to view own profile" ON users;
DROP POLICY IF EXISTS "Allow users to update own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON users;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON users;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON users;
DROP POLICY IF EXISTS "TEMP_ALLOW_ALL_INSERTS" ON users;

-- 2. Create a TEMPORARY policy that allows ALL inserts (for testing)
-- WARNING: This is less secure but will get your app working immediately
CREATE POLICY "TEMP_ALLOW_ALL_INSERTS" ON users
    FOR INSERT 
    WITH CHECK (true);

-- 3. Create a policy that allows users to view their own profile
CREATE POLICY "Allow users to view own profile" ON users
    FOR SELECT 
    USING (auth.uid()::text = id::text);

-- 4. Create a policy that allows users to update their own profile
CREATE POLICY "Allow users to update own profile" ON users
    FOR UPDATE 
    USING (auth.uid()::text = id::text);

-- 5. Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- After your app is working, you can make this more secure by:
-- 1. Replacing the TEMP_ALLOW_ALL_INSERTS with a proper auth.role() = 'authenticated' policy
-- 2. Adding additional security checks
