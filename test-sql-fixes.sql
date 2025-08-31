-- Test script to verify SQL fixes work
-- Run this first to test the basic setup

-- Test 1: Create enum
DROP TYPE IF EXISTS test_exercise_category CASCADE;
CREATE TYPE test_exercise_category AS ENUM (
    'connection', 
    'stress_relief', 
    'gratitude', 
    'communication',
    'intimacy',
    'conflict_resolution',
    'quality_time',
    'emotional_support'
);

-- Test 2: Create simple table
CREATE TABLE IF NOT EXISTS test_exercises (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    category test_exercise_category NOT NULL
);

-- Test 3: Insert test data
INSERT INTO test_exercises (title, category) VALUES
('Test Exercise 1', 'connection'),
('Test Exercise 2', 'quality_time'),
('Test Exercise 3', 'stress_relief');

-- Test 4: Verify data
SELECT * FROM test_exercises;

-- Test 5: Clean up
DROP TABLE test_exercises;
DROP TYPE test_exercise_category;

-- If this runs without errors, the main scripts should work!
