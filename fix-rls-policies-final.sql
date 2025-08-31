-- Final RLS Policy Fix for HeartCheck
-- This will resolve the "Permission denied" error

-- First, let's see what we're working with
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- Remove ALL existing policies for the users table
DROP POLICY IF EXISTS "Allow authenticated users to create profile" ON users;
DROP POLICY IF EXISTS "Allow users to view own profile" ON users;
DROP POLICY IF EXISTS "Allow users to update own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON users;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON users;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON users;

-- Create a comprehensive policy that allows authenticated users to create profiles
-- This policy checks if the user is authenticated (has a valid JWT)
CREATE POLICY "Allow authenticated users to create profile" ON users
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Allow users to view their own profile
CREATE POLICY "Allow users to view own profile" ON users
    FOR SELECT 
    USING (auth.uid()::text = id::text);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update own profile" ON users
    FOR UPDATE 
    USING (auth.uid()::text = id::text);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- Test the policy by checking if it's working
-- This should show the new policies
