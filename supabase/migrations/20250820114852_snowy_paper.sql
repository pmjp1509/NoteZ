/*
  # Music Dashboard Schema

  1. New Tables
    - `profiles` - User profile information
    - `playlists` - User playlists
    - `playlist_songs` - Songs in playlists
    - `friendships` - Friend relationships
    - `listening_activity` - Track listening history

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Profiles table for user information
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_url text,
  bio text,
  total_listening_hours integer DEFAULT 0,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cover_url text,
  is_public boolean DEFAULT false,
  song_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Playlist songs junction table
CREATE TABLE IF NOT EXISTS playlist_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE,
  song_name text NOT NULL,
  song_movie text,
  song_path text,
  cover_url text,
  audio_url text,
  added_at timestamptz DEFAULT now()
);

-- Friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Listening activity table
CREATE TABLE IF NOT EXISTS listening_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  song_name text NOT NULL,
  song_movie text,
  listened_at timestamptz DEFAULT now(),
  duration_seconds integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_activity ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read public profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Playlists policies
CREATE POLICY "Users can read public playlists"
  ON playlists
  FOR SELECT
  TO authenticated
  USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can manage own playlists"
  ON playlists
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Playlist songs policies
CREATE POLICY "Users can read playlist songs"
  ON playlist_songs
  FOR SELECT
  TO authenticated
  USING (
    playlist_id IN (
      SELECT id FROM playlists 
      WHERE is_public = true OR user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own playlist songs"
  ON playlist_songs
  FOR ALL
  TO authenticated
  USING (
    playlist_id IN (
      SELECT id FROM playlists 
      WHERE user_id = auth.uid()
    )
  );

-- Friendships policies
CREATE POLICY "Users can read own friendships"
  ON friendships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can manage own friendships"
  ON friendships
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Listening activity policies
CREATE POLICY "Users can read own activity"
  ON listening_activity
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activity"
  ON listening_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Insert sample data
INSERT INTO profiles (user_id, name, avatar_url, bio, total_listening_hours, is_public) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alex Johnson', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=150', 'Music lover and playlist curator', 245, true),
  ('00000000-0000-0000-0000-000000000002', 'Sarah Chen', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=150', 'Indie rock enthusiast', 189, true),
  ('00000000-0000-0000-0000-000000000003', 'Mike Rodriguez', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=150', 'Electronic music producer', 312, true);

-- Insert sample playlists
INSERT INTO playlists (user_id, name, description, is_public, song_count) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Chill Vibes', 'Perfect for relaxing afternoons', true, 12),
  ('00000000-0000-0000-0000-000000000001', 'Workout Beats', 'High energy songs for the gym', true, 8),
  ('00000000-0000-0000-0000-000000000002', 'Indie Discoveries', 'Hidden gems from indie artists', true, 15),
  ('00000000-0000-0000-0000-000000000003', 'Electronic Dreams', 'Ambient and electronic soundscapes', true, 10);

-- Insert sample listening activity
INSERT INTO listening_activity (user_id, song_name, song_movie, listened_at, duration_seconds) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Midnight Dreams', 'Lo-Fi Collection', now() - interval '5 minutes', 180),
  ('00000000-0000-0000-0000-000000000002', 'Summer Breeze', 'Indie Hits', now() - interval '12 minutes', 210),
  ('00000000-0000-0000-0000-000000000003', 'Digital Waves', 'Electronic Vibes', now() - interval '8 minutes', 195);