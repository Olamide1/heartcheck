-- Check what tables exist in your database
-- Run this in your Supabase SQL Editor

-- List all tables
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check if there are multiple users tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%user%'
AND table_schema = 'public';

-- Check the structure of the main users table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there's a custom users table with different name
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name NOT LIKE 'auth.%'
AND table_name NOT LIKE 'storage.%'
ORDER BY table_name;
