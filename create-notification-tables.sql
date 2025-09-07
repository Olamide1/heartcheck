-- Create Notification System Database Tables
-- Run this in your Supabase SQL Editor

-- Create notification_schedules table
CREATE TABLE IF NOT EXISTS notification_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'daily-reminder',
    reminder_time TEXT NOT NULL,
    timezone TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS daily_reminder_time TEXT DEFAULT '21:00';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_schedules_user ON notification_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_schedules_type ON notification_schedules(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_date ON notification_logs(sent_at);

-- Enable RLS (Row Level Security)
ALTER TABLE notification_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification_schedules
CREATE POLICY "Users can manage their own notification schedules" ON notification_schedules
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for notification_logs
CREATE POLICY "Users can view their own notification logs" ON notification_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification logs" ON notification_logs
    FOR INSERT WITH CHECK (true);
