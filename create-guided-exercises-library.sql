-- Create Guided Exercises Library Database Schema
-- Run this in your Supabase SQL Editor

-- First, drop and recreate the exercise_category enum to ensure consistency
DROP TYPE IF EXISTS exercise_category CASCADE;
CREATE TYPE exercise_category AS ENUM (
    'connection', 
    'stress_relief', 
    'gratitude', 
    'communication',
    'intimacy',
    'conflict_resolution',
    'quality_time',
    'emotional_support'
);

-- Drop existing tables if they exist with wrong schema (safety measure)
DROP TABLE IF EXISTS guided_exercises CASCADE;
DROP TABLE IF EXISTS exercise_sessions CASCADE;
DROP TABLE IF EXISTS exercise_recommendations CASCADE;

-- Create guided_exercises table if it doesn't exist
CREATE TABLE IF NOT EXISTS guided_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    duration TEXT NOT NULL, -- e.g., "5 minutes", "15 minutes", "30 minutes"
    category exercise_category NOT NULL,
    difficulty TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    instructions TEXT[] NOT NULL, -- Array of step-by-step instructions
    materials_needed TEXT[], -- Array of required materials
    benefits TEXT[], -- Array of benefits this exercise provides
    when_to_use TEXT, -- Description of when this exercise is most helpful
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);



-- Create exercise_sessions table to track when users complete exercises
CREATE TABLE IF NOT EXISTS exercise_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES guided_exercises(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_minutes INTEGER, -- Actual time spent on exercise
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- User rating of exercise
    notes TEXT, -- User's notes about the experience
    completed_with_partner BOOLEAN DEFAULT false, -- Whether partner participated
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exercise_recommendations table for personalized suggestions
CREATE TABLE IF NOT EXISTS exercise_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES guided_exercises(id) ON DELETE CASCADE,
    reason TEXT NOT NULL, -- Why this exercise was recommended
    priority INTEGER DEFAULT 1, -- Higher priority = more important
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default guided exercises
INSERT INTO guided_exercises (title, description, duration, category, difficulty, instructions, materials_needed, benefits, when_to_use) VALUES
(
    '3-Minute Eye Contact Exercise',
    'A simple but powerful exercise to deepen emotional connection through sustained eye contact.',
    '3 minutes',
    'connection',
    'beginner',
    ARRAY[
        'Find a comfortable place to sit facing each other',
        'Set a timer for 3 minutes',
        'Look into each other''s eyes without speaking',
        'Breathe deeply and stay present',
        'Notice any emotions that arise'
    ],
    ARRAY['Timer (phone or watch)'],
    ARRAY['Deepens emotional connection', 'Increases intimacy', 'Improves communication'],
    'When you feel disconnected or want to strengthen your bond'
),
(
    'Gratitude Sharing',
    'Share three things you appreciate about your partner and your relationship.',
    '10 minutes',
    'gratitude',
    'beginner',
    ARRAY[
        'Sit together in a quiet space',
        'Take turns sharing three things you appreciate',
        'Be specific and genuine in your appreciation',
        'Listen actively without interrupting',
        'Thank your partner for sharing'
    ],
    ARRAY['None required'],
    ARRAY['Increases positive feelings', 'Strengthens appreciation', 'Improves mood'],
    'Daily or when you want to focus on the positive aspects of your relationship'
),
(
    'Active Listening Practice',
    'Practice truly hearing and understanding your partner without planning your response.',
    '15 minutes',
    'communication',
    'intermediate',
    ARRAY[
        'Choose a topic to discuss',
        'One person speaks for 5 minutes while the other listens',
        'Listener summarizes what they heard',
        'Speaker confirms or clarifies',
        'Switch roles and repeat'
    ],
    ARRAY['Timer (phone or watch)'],
    ARRAY['Improves communication', 'Reduces misunderstandings', 'Builds empathy'],
    'When you have important topics to discuss or want to improve communication'
),
(
    'Stress Relief Breathing Together',
    'A calming breathing exercise you can do together to reduce stress and anxiety.',
    '5 minutes',
    'stress_relief',
    'beginner',
    ARRAY[
        'Sit or lie down comfortably together',
        'Place your hands on your chest and belly',
        'Breathe in for 4 counts, hold for 4, exhale for 6',
        'Synchronize your breathing with your partner',
        'Continue for 5 minutes'
    ],
    ARRAY['None required'],
    ARRAY['Reduces stress', 'Increases calmness', 'Strengthens connection'],
    'When either of you feels stressed, anxious, or overwhelmed'
),
(
    'Quality Time Planning',
    'Plan and schedule dedicated time together to strengthen your relationship.',
    '20 minutes',
    'quality_time',
    'beginner',
    ARRAY[
        'Discuss what activities you both enjoy',
        'Brainstorm new experiences to try together',
        'Set aside specific times in your calendar',
        'Make commitments to protect this time',
        'Plan your next quality time activity'
    ],
    ARRAY['Calendar or planner'],
    ARRAY['Increases bonding', 'Creates shared memories', 'Improves relationship satisfaction'],
    'Weekly or when you feel like you haven''t had enough quality time together'
),
(
    'Conflict Resolution Framework',
    'A structured approach to resolving disagreements constructively.',
    '30 minutes',
    'conflict_resolution',
    'advanced',
    ARRAY[
        'Agree to take a break if emotions get too high',
        'Each person shares their perspective using "I feel..." statements',
        'Identify the underlying needs and concerns',
        'Brainstorm solutions together',
        'Agree on next steps and follow up'
    ],
    ARRAY['Paper and pen for notes'],
    ARRAY['Resolves conflicts constructively', 'Builds problem-solving skills', 'Strengthens trust'],
    'When you have disagreements or conflicts to resolve'
),
(
    'Emotional Support Check-in',
    'Regular check-ins to understand and support each other emotionally.',
    '15 minutes',
    'emotional_support',
    'intermediate',
    ARRAY[
        'Ask "How are you feeling today?"',
        'Listen without trying to fix or solve',
        'Validate their feelings and experiences',
        'Ask "What do you need from me right now?"',
        'Offer support based on their response'
    ],
    ARRAY['None required'],
    ARRAY['Increases emotional intimacy', 'Provides support', 'Strengthens trust'],
    'Daily or when you notice your partner seems stressed or emotional'
),
(
    'Intimacy Building Questions',
    'Deep questions to explore your relationship and build emotional intimacy.',
    '20 minutes',
    'intimacy',
    'intermediate',
    ARRAY[
        'Choose 3-5 questions from a prepared list',
        'Take turns answering each question',
        'Share openly and honestly',
        'Listen with curiosity and care',
        'Discuss any insights or new understandings'
    ],
    ARRAY['List of intimacy questions'],
    ARRAY['Builds emotional intimacy', 'Increases understanding', 'Deepens connection'],
    'When you want to deepen your emotional connection or have meaningful conversations'
)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guided_exercises_category ON guided_exercises(category);
CREATE INDEX IF NOT EXISTS idx_guided_exercises_active ON guided_exercises(is_active);
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_user ON exercise_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_couple ON exercise_sessions(couple_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_exercise ON exercise_sessions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_recommendations_user ON exercise_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_recommendations_couple ON exercise_recommendations(couple_id);

-- Enable RLS on all tables
ALTER TABLE guided_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_recommendations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for guided_exercises (read-only for all authenticated users)
CREATE POLICY "Users can view guided exercises" ON guided_exercises
    FOR SELECT USING (true);

-- Create RLS policies for exercise_sessions
CREATE POLICY "Users can view own exercise sessions" ON exercise_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own exercise sessions" ON exercise_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own exercise sessions" ON exercise_sessions
    FOR UPDATE USING (user_id = auth.uid());

-- Create RLS policies for exercise_recommendations
CREATE POLICY "Users can view own exercise recommendations" ON exercise_recommendations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own exercise recommendations" ON exercise_recommendations
    FOR UPDATE USING (user_id = auth.uid());

-- Verify the tables were created
SELECT 
    table_name,
    column_count,
    row_count
FROM (
    SELECT 'guided_exercises' as table_name, COUNT(*) as column_count, COUNT(*) as row_count
    FROM guided_exercises
    UNION ALL
    SELECT 'exercise_sessions' as table_name, COUNT(*) as column_count, 0 as row_count
    FROM information_schema.columns 
    WHERE table_name = 'exercise_sessions'
    UNION ALL
    SELECT 'exercise_recommendations' as table_name, COUNT(*) as column_count, 0 as row_count
    FROM information_schema.columns 
    WHERE table_name = 'exercise_recommendations'
) t
ORDER BY table_name;
