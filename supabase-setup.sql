-- HeartCheck Database Setup Script
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security (RLS)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Create custom types
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'canceled', 'past_due');
CREATE TYPE subscription_plan AS ENUM ('monthly', 'annual');
CREATE TYPE pattern_alert_type AS ENUM ('low_connection', 'low_mood', 'streak_achieved');
CREATE TYPE exercise_category AS ENUM ('connection', 'stress_relief', 'gratitude', 'communication');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    nickname TEXT,
    relationship_start_date DATE,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create couples table
CREATE TABLE IF NOT EXISTS couples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    partner2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(partner1_id, partner2_id)
);

-- Create check_ins table
CREATE TABLE IF NOT EXISTS check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 10),
    connection_rating INTEGER CHECK (connection_rating >= 1 AND connection_rating <= 10),
    reflection TEXT NOT NULL,
    is_shared BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
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

-- Create pattern_alerts table
CREATE TABLE IF NOT EXISTS pattern_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
    type pattern_alert_type NOT NULL,
    message TEXT NOT NULL,
    suggested_action TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create guided_exercises table
CREATE TABLE IF NOT EXISTS guided_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    duration TEXT NOT NULL,
    category exercise_category NOT NULL,
    instructions TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invite_codes table for partner pairing
CREATE TABLE IF NOT EXISTS invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_check_ins_user_date ON check_ins(user_id, date);
CREATE INDEX IF NOT EXISTS idx_check_ins_couple_date ON check_ins(couple_id, date);
CREATE INDEX IF NOT EXISTS idx_couples_partner1 ON couples(partner1_id);
CREATE INDEX IF NOT EXISTS idx_couples_partner2 ON couples(partner2_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_user ON invite_codes(user_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Couples can access their couple data
CREATE POLICY "Partners can view couple data" ON couples
    FOR SELECT USING (
        auth.uid() = partner1_id OR 
        auth.uid() = partner2_id
    );

CREATE POLICY "Partners can insert couple data" ON couples
    FOR INSERT WITH CHECK (
        auth.uid() = partner1_id OR 
        auth.uid() = partner2_id
    );

-- Check-ins: users can see their own, shared ones from partner
CREATE POLICY "Users can view own check-ins" ON check_ins
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared partner check-ins" ON check_ins
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM couples 
            WHERE (couples.partner1_id = auth.uid() OR couples.partner2_id = auth.uid())
            AND couples.id = check_ins.couple_id
            AND check_ins.is_shared = true
        )
    );

CREATE POLICY "Users can insert own check-ins" ON check_ins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own check-ins" ON check_ins
    FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions: users can only access their own
CREATE POLICY "Users can view own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Pattern alerts: couples can see their alerts
CREATE POLICY "Partners can view couple alerts" ON pattern_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM couples 
            WHERE (couples.partner1_id = auth.uid() OR couples.partner2_id = auth.uid())
            AND couples.id = pattern_alerts.couple_id
        )
    );

-- Invite codes: users can manage their own codes
CREATE POLICY "Users can view own invite codes" ON invite_codes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invite codes" ON invite_codes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invite codes" ON invite_codes
    FOR UPDATE USING (auth.uid() = user_id);

-- Create functions for common operations

-- Function to create a couple when both partners are ready
CREATE OR REPLACE FUNCTION create_couple_from_invite(
    invite_code TEXT,
    partner2_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    partner1_user_id UUID;
    couple_id UUID;
BEGIN
    -- Get the user who created the invite
    SELECT user_id INTO partner1_user_id
    FROM invite_codes
    WHERE code = invite_code 
    AND is_used = false 
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invite code';
    END IF;
    
    -- Create the couple
    INSERT INTO couples (partner1_id, partner2_id)
    VALUES (partner1_user_id, partner2_user_id)
    RETURNING id INTO couple_id;
    
    -- Mark invite as used
    UPDATE invite_codes 
    SET is_used = true 
    WHERE code = invite_code;
    
    RETURN couple_id;
END;
$$;

-- Function to get monthly report data
CREATE OR REPLACE FUNCTION get_monthly_report(
    user_id UUID,
    month_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    month TEXT,
    avg_mood NUMERIC,
    avg_connection NUMERIC,
    total_check_ins INTEGER,
    streak_days INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH month_data AS (
        SELECT 
            c.mood_rating,
            c.connection_rating,
            c.date
        FROM check_ins c
        JOIN couples cp ON c.couple_id = cp.id
        WHERE (cp.partner1_id = user_id OR cp.partner2_id = user_id)
        AND DATE_TRUNC('month', c.date) = DATE_TRUNC('month', month_date)
    )
    SELECT 
        TO_CHAR(month_date, 'Month YYYY')::TEXT,
        AVG(mood_rating)::NUMERIC,
        AVG(connection_rating)::NUMERIC,
        COUNT(*)::INTEGER,
        0::INTEGER -- TODO: Implement streak calculation
    FROM month_data;
END;
$$;

-- Insert some sample guided exercises
INSERT INTO guided_exercises (title, description, duration, category, instructions) VALUES
('3-Minute Eye Contact', 'Deepen your connection through sustained eye contact', '3 minutes', 'connection', ARRAY['Sit facing each other', 'Look into each other''s eyes', 'Stay silent and present', 'Notice what you feel']),
('Daily Gratitude Share', 'Share three things you appreciate about your partner', '5 minutes', 'gratitude', ARRAY['Take turns sharing', 'Be specific and genuine', 'Listen without interrupting', 'Express your feelings']),
('Stress Relief Breathing', 'Synchronize your breathing to reduce stress together', '10 minutes', 'stress_relief', ARRAY['Sit back to back', 'Match your breathing rhythm', 'Take deep, slow breaths', 'Feel the connection']);

-- Create a trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_couples_updated_at BEFORE UPDATE ON couples FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_check_ins_updated_at BEFORE UPDATE ON check_ins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
