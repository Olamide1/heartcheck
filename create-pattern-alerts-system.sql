-- Create Pattern Alerts System Database Schema
-- Run this in your Supabase SQL Editor

-- First, drop and recreate the pattern_alert_type enum to ensure consistency
DROP TYPE IF EXISTS pattern_alert_type CASCADE;
CREATE TYPE pattern_alert_type AS ENUM (
    'low_connection', 
    'low_mood', 
    'streak_achieved',
    'pattern_detected',
    'relationship_insight'
);

-- Drop existing tables if they exist with wrong schema (safety measure)
DROP TABLE IF EXISTS pattern_alerts CASCADE;
DROP TABLE IF EXISTS pattern_detection_rules CASCADE;
DROP TABLE IF EXISTS pattern_alert_preferences CASCADE;

-- Create pattern_alerts table if it doesn't exist
CREATE TABLE IF NOT EXISTS pattern_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Who triggered the alert
    type pattern_alert_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    suggested_action TEXT NOT NULL,
    pattern_data JSONB, -- Store the actual pattern data that triggered this
    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);



-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_couple ON pattern_alerts(couple_id);
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_user ON pattern_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_type ON pattern_alerts(type);
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_unread ON pattern_alerts(couple_id, is_read) WHERE is_read = false;
-- Remove the problematic index that uses NOW() function
-- CREATE INDEX IF NOT EXISTS idx_pattern_alerts_active ON pattern_alerts(couple_id, expires_at) WHERE expires_at > NOW();

-- Enable RLS on pattern_alerts table
ALTER TABLE pattern_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pattern_alerts
DROP POLICY IF EXISTS "Users can view couple pattern alerts" ON pattern_alerts;
DROP POLICY IF EXISTS "Users can update own pattern alerts" ON pattern_alerts;

-- Users can view pattern alerts for their couple
CREATE POLICY "Users can view couple pattern alerts" ON pattern_alerts
    FOR SELECT USING (
        couple_id IN (
            SELECT id FROM couples 
            WHERE partner1_id = auth.uid() OR partner2_id = auth.uid()
        )
    );

-- Users can update pattern alerts they triggered
CREATE POLICY "Users can update own pattern alerts" ON pattern_alerts
    FOR UPDATE USING (user_id = auth.uid());

-- Create pattern_detection_rules table for configurable alert triggers
CREATE TABLE IF NOT EXISTS pattern_detection_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT UNIQUE NOT NULL,
    rule_type pattern_alert_type NOT NULL,
    description TEXT NOT NULL,
    conditions JSONB NOT NULL, -- Store the conditions that trigger this rule
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1, -- Higher priority rules run first
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default pattern detection rules
INSERT INTO pattern_detection_rules (rule_name, rule_type, description, conditions, priority) VALUES
(
    'low_connection_streak',
    'low_connection',
    'Detects 3+ consecutive days of low connection (≤5/10)',
    '{"metric": "connection_rating", "threshold": 5, "consecutive_days": 3, "operator": "<="}',
    1
),
(
    'low_mood_streak',
    'low_mood',
    'Detects 3+ consecutive days of low mood (≤4/10)',
    '{"metric": "mood_rating", "threshold": 4, "consecutive_days": 3, "operator": "<="}',
    2
),
(
    'connection_improvement',
    'streak_achieved',
    'Celebrates 7+ consecutive days of high connection (≥8/10)',
    '{"metric": "connection_rating", "threshold": 8, "consecutive_days": 7, "operator": ">="}',
    3
),
(
    'mood_improvement',
    'streak_achieved',
    'Celebrates 5+ consecutive days of good mood (≥7/10)',
    '{"metric": "mood_rating", "threshold": 7, "consecutive_days": 5, "operator": ">="}',
    4
),
(
    'weekly_check_in_streak',
    'streak_achieved',
    'Celebrates completing check-ins for 7 consecutive days',
    '{"metric": "check_in_streak", "threshold": 7, "consecutive_days": 7, "operator": ">="}',
    5
)
ON CONFLICT (rule_name) DO NOTHING;

-- Enable RLS on pattern_detection_rules table
ALTER TABLE pattern_detection_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for pattern_detection_rules (read-only for all authenticated users)
CREATE POLICY "Users can view pattern detection rules" ON pattern_detection_rules
    FOR SELECT USING (true);

-- Create pattern_alert_preferences table for user customization
CREATE TABLE IF NOT EXISTS pattern_alert_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    alert_type pattern_alert_type NOT NULL,
    enabled BOOLEAN DEFAULT true,
    notification_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, alert_type)
);

-- Insert default preferences for all users
INSERT INTO pattern_alert_preferences (user_id, alert_type, enabled, notification_enabled, email_enabled)
SELECT 
    u.id,
    pat.type,
    true,
    true,
    false
FROM users u
CROSS JOIN (
    SELECT unnest(enum_range(NULL::pattern_alert_type)) as type
) pat
ON CONFLICT (user_id, alert_type) DO NOTHING;

-- Enable RLS on pattern_alert_preferences table
ALTER TABLE pattern_alert_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for pattern_alert_preferences
CREATE POLICY "Users can manage own alert preferences" ON pattern_alert_preferences
    FOR ALL USING (user_id = auth.uid());

-- Verify the tables were created
SELECT 
    table_name,
    column_count,
    row_count
FROM (
    SELECT 'pattern_alerts' as table_name, COUNT(*) as column_count, 0 as row_count
    FROM information_schema.columns 
    WHERE table_name = 'pattern_alerts'
    UNION ALL
    SELECT 'pattern_detection_rules' as table_name, COUNT(*) as column_count, COUNT(*) as row_count
    FROM pattern_detection_rules
    UNION ALL
    SELECT 'pattern_alert_preferences' as table_name, COUNT(*) as column_count, COUNT(*) as row_count
    FROM pattern_alert_preferences
) t
ORDER BY table_name;
