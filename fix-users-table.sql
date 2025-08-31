-- Fix users table - Add missing relationship_start_date column
-- Run this in your Supabase SQL Editor if you get the "relationshipStartDate column not found" error

-- Check if the column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'relationship_start_date'
    ) THEN
        ALTER TABLE users ADD COLUMN relationship_start_date DATE;
        RAISE NOTICE 'Added relationship_start_date column to users table';
    ELSE
        RAISE NOTICE 'relationship_start_date column already exists in users table';
    END IF;
END $$;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
