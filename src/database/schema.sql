-- CareVerse Database Schema
-- PostgreSQL 12+
-- This file is for reference only. Use migrations to create tables.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(50) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')) DEFAULT 'prefer_not_to_say',
    phone VARCHAR(50),
    location JSONB,
    medical_history JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'New Conversation',
    summary TEXT,
    symptoms JSONB DEFAULT '[]'::jsonb,
    condition VARCHAR(255),
    status VARCHAR(50) CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active',
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Assessments Table
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    possible_condition VARCHAR(255) NOT NULL,
    description TEXT,
    symptoms JSONB DEFAULT '[]'::jsonb,
    common_triggers JSONB DEFAULT '[]'::jsonb,
    self_care_recommendations JSONB DEFAULT '[]'::jsonb,
    next_steps JSONB DEFAULT '[]'::jsonb,
    severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'emergency')) DEFAULT 'medium',
    disclaimer TEXT DEFAULT 'This is not a medical diagnosis. Please consult with a healthcare professional for an accurate diagnosis.',
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assessments_user_id ON assessments(user_id);
CREATE INDEX idx_assessments_conversation_id ON assessments(conversation_id);
CREATE INDEX idx_assessments_severity ON assessments(severity);
CREATE INDEX idx_assessments_created_at ON assessments(created_at);

-- Providers Table
CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    latitude FLOAT,
    longitude FLOAT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    rating FLOAT DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER DEFAULT 0,
    is_accepting_new_patients BOOLEAN DEFAULT true,
    insurance_accepted JSONB DEFAULT '[]'::jsonb,
    languages JSONB DEFAULT '["English"]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_providers_specialty ON providers(specialty);
CREATE INDEX idx_providers_city_state ON providers(city, state);
CREATE INDEX idx_providers_location ON providers(latitude, longitude);
CREATE INDEX idx_providers_accepting_patients ON providers(is_accepting_new_patients);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Useful queries for reference

-- Get user's recent conversations with message count
-- SELECT c.*, COUNT(m.id) as message_count
-- FROM conversations c
-- LEFT JOIN messages m ON c.id = m.conversation_id
-- WHERE c.user_id = 'user-uuid-here'
-- GROUP BY c.id
-- ORDER BY c.last_message_at DESC;

-- Find providers near a location (requires PostGIS for accurate distance)
-- SELECT *, 
--   (3959 * acos(cos(radians(37.7749)) * cos(radians(latitude)) * 
--   cos(radians(longitude) - radians(-122.4194)) + 
--   sin(radians(37.7749)) * sin(radians(latitude)))) AS distance_miles
-- FROM providers
-- WHERE is_accepting_new_patients = true
-- ORDER BY distance_miles
-- LIMIT 10;

-- Get assessment history for a user
-- SELECT a.*, c.title as conversation_title
-- FROM assessments a
-- JOIN conversations c ON a.conversation_id = c.id
-- WHERE a.user_id = 'user-uuid-here'
-- ORDER BY a.created_at DESC;
