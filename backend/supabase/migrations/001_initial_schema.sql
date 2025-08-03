-- Legacy.AI Database Schema
-- Complete schema for video interviews, AI processing, and conversational avatars

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium')),
  total_recording_minutes INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}'::jsonb
);

-- Personality profiles (Big Five traits from Mini-IPIP)
CREATE TABLE personality_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  extraversion DECIMAL(3,2) CHECK (extraversion >= 0 AND extraversion <= 1),
  agreeableness DECIMAL(3,2) CHECK (agreeableness >= 0 AND agreeableness <= 1),
  conscientiousness DECIMAL(3,2) CHECK (conscientiousness >= 0 AND conscientiousness <= 1),
  neuroticism DECIMAL(3,2) CHECK (neuroticism >= 0 AND neuroticism <= 1),
  openness DECIMAL(3,2) CHECK (openness >= 0 AND openness <= 1),
  raw_responses JSONB, -- Store original 1-5 responses
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Interview questions organized by modules
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module TEXT NOT NULL, -- 'origins', 'family', 'work', etc.
  text TEXT NOT NULL,
  position INTEGER NOT NULL, -- Order within module
  language TEXT DEFAULT 'en',
  tags TEXT[], -- ['childhood', 'relationships', 'career']
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  estimated_duration INTEGER DEFAULT 120, -- seconds
  follow_up_questions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(module, position)
);

-- Recording sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  package_type TEXT DEFAULT 'basic' CHECK (package_type IN ('basic', 'standard', 'premium')),
  total_questions INTEGER DEFAULT 100,
  completed_questions INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Video recordings
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id),
  file_path TEXT NOT NULL, -- Supabase Storage path
  thumbnail_url TEXT,
  duration INTEGER, -- seconds
  file_size BIGINT, -- bytes
  resolution TEXT, -- '1080p', '720p', etc.
  format TEXT DEFAULT 'mp4',
  approved_at TIMESTAMP WITH TIME ZONE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Transcriptions from videos
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  word_timestamps JSONB, -- [{word: "hello", start: 1.2, end: 1.8}]
  processing_engine TEXT DEFAULT 'whisper', -- 'whisper', 'deepgram'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id)
);

-- AI Memory records with vector embeddings
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id),
  transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
  embedding vector(1536), -- OpenAI embedding dimension
  qdrant_id TEXT, -- External vector DB reference
  content_summary TEXT,
  tags TEXT[],
  sentiment DECIMAL(3,2), -- -1.00 to 1.00
  emotion_scores JSONB, -- {joy: 0.8, sadness: 0.1, anger: 0.05}
  topics TEXT[], -- Extracted topics/themes
  importance_score DECIMAL(3,2) DEFAULT 0.5, -- 0.00 to 1.00
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voice models for AI cloning
CREATE TABLE ai_voice_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  model_url TEXT,
  model_id TEXT, -- External service model ID
  engine_name TEXT DEFAULT 'elevenlabs' CHECK (engine_name IN ('elevenlabs', 'respeecher', 'coqui')),
  status TEXT DEFAULT 'training' CHECK (status IN ('pending', 'training', 'ready', 'failed')),
  minutes_collected INTEGER DEFAULT 0,
  quality_score DECIMAL(3,2), -- Voice quality assessment
  is_ready BOOLEAN DEFAULT false,
  training_started_at TIMESTAMP WITH TIME ZONE,
  training_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, engine_name)
);

-- Voice samples for training
CREATE TABLE voice_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  duration INTEGER NOT NULL, -- seconds
  quality_score DECIMAL(3,2), -- Audio quality assessment
  noise_level DECIMAL(3,2), -- Background noise level
  is_suitable_for_training BOOLEAN DEFAULT true,
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation logs for AI interactions
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT, -- Frontend session identifier
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  voice_response_url TEXT, -- Generated voice response
  memories_used UUID[], -- Array of memory IDs used
  personality_influence JSONB, -- How personality affected response
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Background job queue
CREATE TABLE job_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL, -- 'transcribe', 'extract_voice', 'generate_embedding'
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_processing_status ON videos(processing_status);
CREATE INDEX idx_transcripts_user_id ON transcripts(user_id);
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_job_queue_status ON job_queue(status);
CREATE INDEX idx_job_queue_scheduled_at ON job_queue(scheduled_at);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_voice_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own personality" ON personality_profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" ON sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own videos" ON videos FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transcripts" ON transcripts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own memories" ON memories FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own voice models" ON ai_voice_models FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own voice samples" ON voice_samples FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own conversations" ON conversations FOR ALL USING (auth.uid() = user_id);

-- Questions are public (read-only for authenticated users)
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view questions" ON questions FOR SELECT TO authenticated USING (true);

-- Functions for common operations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate personality influence on responses
CREATE OR REPLACE FUNCTION calculate_personality_influence(
    extraversion DECIMAL,
    agreeableness DECIMAL,
    conscientiousness DECIMAL,
    neuroticism DECIMAL,
    openness DECIMAL,
    query_type TEXT DEFAULT 'general'
)
RETURNS JSONB AS $$
DECLARE
    influence JSONB;
BEGIN
    influence := jsonb_build_object(
        'tone', CASE 
            WHEN extraversion > 0.7 THEN 'enthusiastic'
            WHEN extraversion < 0.3 THEN 'reserved'
            ELSE 'balanced'
        END,
        'detail_level', CASE
            WHEN conscientiousness > 0.7 THEN 'detailed'
            WHEN conscientiousness < 0.3 THEN 'brief'
            ELSE 'moderate'
        END,
        'emotional_expression', CASE
            WHEN neuroticism > 0.7 THEN 'cautious'
            WHEN neuroticism < 0.3 THEN 'confident'
            ELSE 'balanced'
        END,
        'creativity', CASE
            WHEN openness > 0.7 THEN 'creative'
            WHEN openness < 0.3 THEN 'practical'
            ELSE 'balanced'
        END,
        'empathy', CASE
            WHEN agreeableness > 0.7 THEN 'highly_empathetic'
            WHEN agreeableness < 0.3 THEN 'direct'
            ELSE 'understanding'
        END
    );
    
    RETURN influence;
END;
$$ LANGUAGE plpgsql;

-- Function to queue background jobs
CREATE OR REPLACE FUNCTION queue_job(
    job_type TEXT,
    payload JSONB,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
    job_id UUID;
BEGIN
    INSERT INTO job_queue (job_type, payload, scheduled_at)
    VALUES (job_type, payload, scheduled_at)
    RETURNING id INTO job_id;
    
    -- Notify job processor
    PERFORM pg_notify('new_job', job_id::text);
    
    RETURN job_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default questions (sample data)
INSERT INTO questions (module, text, position, tags, difficulty_level) VALUES
-- Origins Module
('origins', 'Tell me about the place where you were born and what it was like growing up there.', 1, ARRAY['childhood', 'geography', 'family'], 1),
('origins', 'What are your earliest childhood memories?', 2, ARRAY['childhood', 'memory', 'family'], 1),
('origins', 'Describe your parents and what they were like when you were young.', 3, ARRAY['family', 'parents', 'childhood'], 2),
('origins', 'What traditions or customs were important in your family?', 4, ARRAY['family', 'culture', 'traditions'], 2),
('origins', 'How did your family celebrate holidays and special occasions?', 5, ARRAY['family', 'celebrations', 'traditions'], 1),

-- Family Module  
('family', 'Tell me about your siblings and your relationship with them.', 1, ARRAY['family', 'siblings', 'relationships'], 2),
('family', 'What role did extended family play in your life?', 2, ARRAY['family', 'extended_family', 'relationships'], 2),
('family', 'Describe your relationship with your grandparents.', 3, ARRAY['family', 'grandparents', 'wisdom'], 2),
('family', 'What family stories or legends were passed down to you?', 4, ARRAY['family', 'stories', 'heritage'], 3),
('family', 'How did your family handle difficult times or challenges?', 5, ARRAY['family', 'resilience', 'challenges'], 3),

-- Education Module
('education', 'What was school like for you? Describe your favorite and least favorite subjects.', 1, ARRAY['education', 'school', 'learning'], 1),
('education', 'Tell me about a teacher who made a significant impact on your life.', 2, ARRAY['education', 'teachers', 'influence'], 2),
('education', 'What did you want to be when you grew up, and how did that change over time?', 3, ARRAY['education', 'dreams', 'career'], 2),
('education', 'Describe any challenges you faced in your education and how you overcame them.', 4, ARRAY['education', 'challenges', 'perseverance'], 3),
('education', 'What life lessons did you learn outside of formal education?', 5, ARRAY['education', 'life_lessons', 'wisdom'], 3),

-- Work Module
('work', 'Tell me about your first job and what you learned from it.', 1, ARRAY['work', 'career', 'first_job'], 1),
('work', 'What has been the most fulfilling work you''ve done in your life?', 2, ARRAY['work', 'fulfillment', 'purpose'], 2),
('work', 'Describe a significant challenge you faced in your career and how you handled it.', 3, ARRAY['work', 'challenges', 'problem_solving'], 3),
('work', 'What advice would you give to someone starting in your field?', 4, ARRAY['work', 'advice', 'mentorship'], 3),
('work', 'How did you balance work and family life?', 5, ARRAY['work', 'family', 'balance'], 3);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
('videos', 'videos', false),
('voice-samples', 'voice-samples', false),
('thumbnails', 'thumbnails', false),
('voice-responses', 'voice-responses', false);

-- Storage policies
CREATE POLICY "Users can upload their own videos" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'videos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own videos" ON storage.objects
FOR SELECT USING (
    bucket_id = 'videos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own voice samples" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'voice-samples' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own voice samples" ON storage.objects
FOR SELECT USING (
    bucket_id = 'voice-samples' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own thumbnails" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'thumbnails' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own thumbnails" ON storage.objects
FOR SELECT USING (
    bucket_id = 'thumbnails' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own voice responses" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'voice-responses' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own voice responses" ON storage.objects
FOR SELECT USING (
    bucket_id = 'voice-responses' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);