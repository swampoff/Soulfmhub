-- ============================================================================
-- SOUL FM DATABASE SETUP
-- Complete schema and configuration for Supabase
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE (User Roles & Info)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'dj')),
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create admin user (CHANGE USER_ID to actual UUID from auth.users)
INSERT INTO profiles (id, email, role, display_name)
VALUES (
  'USER_ID_HERE', -- Replace with actual user ID from Supabase Auth
  'niqbello@gmail.com',
  'admin',
  'Admin User'
)
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', email = 'niqbello@gmail.com';

-- ============================================================================
-- 2. TRACKS TABLE (Music Library)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT,
  album TEXT,
  genre TEXT,
  duration INTEGER, -- in seconds
  file_url TEXT NOT NULL,
  cover_url TEXT,
  short_id TEXT UNIQUE,
  stream_url TEXT,
  year INTEGER,
  bpm INTEGER,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tracks_uploaded_by ON tracks(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_tracks_short_id ON tracks(short_id);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
CREATE INDEX IF NOT EXISTS idx_tracks_tags ON tracks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at DESC);

-- Enable RLS
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view tracks"
  ON tracks FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert tracks"
  ON tracks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own tracks"
  ON tracks FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own tracks or admins can delete all"
  ON tracks FOR DELETE
  TO authenticated
  USING (
    auth.uid() = uploaded_by 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 3. SHOWS TABLE (Shows & Podcasts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  host TEXT,
  description TEXT,
  genre TEXT,
  type TEXT CHECK (type IN ('live', 'podcast', 'radio')),
  cover TEXT,
  schedule TEXT,
  episodes JSONB DEFAULT '[]',
  average_listeners INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shows_type ON shows(type);
CREATE INDEX IF NOT EXISTS idx_shows_genre ON shows(genre);
CREATE INDEX IF NOT EXISTS idx_shows_is_active ON shows(is_active);

-- Enable RLS
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view active shows"
  ON shows FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage shows"
  ON shows FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'dj')
    )
  );

-- ============================================================================
-- 4. PLAYLISTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  track_ids UUID[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_playlists_created_by ON playlists(created_by);
CREATE INDEX IF NOT EXISTS idx_playlists_is_public ON playlists(is_public);

-- Enable RLS
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view public playlists"
  ON playlists FOR SELECT
  TO public
  USING (is_public = true);

CREATE POLICY "Users can view own playlists"
  ON playlists FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create playlists"
  ON playlists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own playlists"
  ON playlists FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own playlists"
  ON playlists FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- ============================================================================
-- 5. SCHEDULE TABLE (Schedule Slots)
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL,
  show_id UUID REFERENCES shows(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT schedule_time_check CHECK (end_time > start_time)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schedule_day_time ON schedule(day_of_week, start_time);
CREATE INDEX IF NOT EXISTS idx_schedule_playlist ON schedule(playlist_id);
CREATE INDEX IF NOT EXISTS idx_schedule_show ON schedule(show_id);
CREATE INDEX IF NOT EXISTS idx_schedule_is_active ON schedule(is_active);

-- Enable RLS
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view active schedule"
  ON schedule FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage schedule"
  ON schedule FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'dj')
    )
  );

-- ============================================================================
-- 6. ANALYTICS TABLE (Optional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);

-- Enable RLS
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Policies (admins only)
CREATE POLICY "Admins can view analytics"
  ON analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 7. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON tracks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shows_updated_at BEFORE UPDATE ON shows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_updated_at BEFORE UPDATE ON schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. SEED DATA (Optional)
-- ============================================================================

-- Create default "Live Stream" playlist
INSERT INTO playlists (name, description, is_public, created_by)
VALUES (
  'Live Stream',
  'Main live stream playlist',
  true,
  (SELECT id FROM auth.users WHERE email = 'niqbello@gmail.com' LIMIT 1)
)
ON CONFLICT DO NOTHING;

-- Sample show
INSERT INTO shows (name, host, description, genre, type, schedule, is_active)
VALUES (
  'Morning Soul',
  'DJ Soul',
  'Your morning dose of soul and funk',
  'Soul',
  'live',
  'Mon-Fri 8:00 AM - 12:00 PM',
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. STORAGE BUCKETS (For file uploads)
-- ============================================================================

-- Create storage bucket for tracks
INSERT INTO storage.buckets (id, name, public)
VALUES ('tracks', 'tracks', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can view tracks"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'tracks');

CREATE POLICY "Authenticated users can upload tracks"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tracks');

CREATE POLICY "Public can view covers"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'covers');

CREATE POLICY "Authenticated users can upload covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'covers');

-- ============================================================================
-- 10. VERIFICATION QUERIES
-- ============================================================================

-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check admin user
SELECT id, email, role 
FROM profiles 
WHERE email = 'niqbello@gmail.com';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

-- Next steps:
-- 1. Create admin user in Supabase Authentication (if not exists)
-- 2. Copy user ID and update profiles INSERT above
-- 3. Re-run the profiles INSERT query with correct user ID
-- 4. Test login with niqbello@gmail.com / SoulFM2024!
-- 5. Upload a test track
-- 6. Verify everything works!
