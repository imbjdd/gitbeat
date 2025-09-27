-- GitBeat Database Schema
-- This file contains the SQL schema for the three main tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Repositories table
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Songs table (simplified)
CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    audio_url VARCHAR(500), -- Link to audio file in Supabase storage
    lyrics_url VARCHAR(500), -- Link to lyrics file in Supabase storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Upvotes table
CREATE TABLE upvotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_songs_repository_id ON songs(repository_id);
CREATE INDEX idx_upvotes_song_id ON upvotes(song_id);
CREATE INDEX idx_repositories_url ON repositories(url);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_repositories_updated_at BEFORE UPDATE ON repositories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE upvotes ENABLE ROW LEVEL SECURITY;

-- Allow read access to all tables for anonymous users
CREATE POLICY "Allow read access for all users" ON repositories FOR SELECT USING (true);
CREATE POLICY "Allow read access for all users" ON songs FOR SELECT USING (true);
CREATE POLICY "Allow read access for all users" ON upvotes FOR SELECT USING (true);

-- Allow insert and update access for repositories and songs
CREATE POLICY "Allow insert for all users" ON repositories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for all users" ON songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for all users" ON upvotes FOR INSERT WITH CHECK (true);

-- Allow update access for songs (needed for file URL updates)
CREATE POLICY "Allow update for all users" ON songs FOR UPDATE USING (true) WITH CHECK (true);

-- Storage buckets for audio files and lyrics
INSERT INTO storage.buckets (id, name, public) VALUES 
    ('audio-files', 'audio-files', true),
    ('lyrics-files', 'lyrics-files', true);

-- Storage policies for audio files bucket
CREATE POLICY "Allow public read access on audio files" ON storage.objects FOR SELECT USING (bucket_id = 'audio-files');
CREATE POLICY "Allow authenticated upload to audio files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio-files');

-- Storage policies for lyrics files bucket  
CREATE POLICY "Allow public read access on lyrics files" ON storage.objects FOR SELECT USING (bucket_id = 'lyrics-files');
CREATE POLICY "Allow authenticated upload to lyrics files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lyrics-files');

-- View for songs with upvote counts
CREATE VIEW songs_with_upvote_counts AS
SELECT 
    s.*,
    COALESCE(u.upvote_count, 0) as upvote_count
FROM songs s
LEFT JOIN (
    SELECT 
        song_id,
        COUNT(*) as upvote_count
    FROM upvotes
    GROUP BY song_id
) u ON s.id = u.song_id;
