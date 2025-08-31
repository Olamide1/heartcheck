-- Fix subscriptions table schema
-- Run this in your Supabase SQL Editor

-- First, check if subscriptions table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        -- Create subscriptions table if it doesn't exist
        CREATE TABLE subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            stripe_customer_id TEXT UNIQUE,
            status subscription_status DEFAULT 'trial',
            plan subscription_plan,
            current_period_start TIMESTAMP WITH TIME ZONE,
            current_period_end TIMESTAMP WITH TIME ZONE,
            trial_end TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create index
        CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
        
        RAISE NOTICE 'Created subscriptions table';
    ELSE
        RAISE NOTICE 'Subscriptions table already exists';
    END IF;
END $$;

-- Add missing columns if they don't exist
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure subscription_status enum exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'canceled', 'past_due', 'expired');
        RAISE NOTICE 'Created subscription_status enum';
    END IF;
END $$;

-- Ensure subscription_plan enum exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
        CREATE TYPE subscription_plan AS ENUM ('monthly', 'annual');
        RAISE NOTICE 'Created subscription_plan enum';
    END IF;
END $$;

-- Update existing subscriptions to have proper status if needed
UPDATE subscriptions 
SET status = 'trial' 
WHERE status IS NULL;

-- Set trial_end for existing subscriptions that don't have it
UPDATE subscriptions 
SET trial_end = (created_at + INTERVAL '7 days')
WHERE trial_end IS NULL AND status = 'trial';

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
ORDER BY ordinal_position;
