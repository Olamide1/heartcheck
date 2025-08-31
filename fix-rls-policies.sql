-- Fix RLS policies for users table - Simplified for post-confirmation profile creation
-- Run this in your Supabase SQL Editor

-- First, let's see what we're working with
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Check existing RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- Remove any existing conflicting policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON users;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON users;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON users;
DROP POLICY IF EXISTS "Allow users to view own profile" ON users;
DROP POLICY IF EXISTS "Allow users to update own profile" ON users;

-- Create simple policies for authenticated users
-- Since we create profiles after email confirmation, users will be authenticated
CREATE POLICY "Allow authenticated users to create profile" ON users
    FOR INSERT 
    WITH CHECK (auth.uid()::text = id::text);

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
