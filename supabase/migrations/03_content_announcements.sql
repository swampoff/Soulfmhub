-- ================================================
-- SOUL FM - CONTENT ANNOUNCEMENTS SYSTEM
-- Weather, Traffic, Time announcements, Station IDs, Promos
-- ================================================

-- ==================== CONTENT ANNOUNCEMENTS TABLE ====================

CREATE TABLE IF NOT EXISTS content_announcements_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('weather', 'traffic', 'time', 'station_id', 'promo')),
  content TEXT NOT NULL,
  audio_url TEXT,
  voice_id TEXT NOT NULL,
  voice_name TEXT NOT NULL,
  duration INTEGER, -- in seconds
  is_active BOOLEAN DEFAULT true,
  schedule_pattern TEXT, -- cron-like pattern: "0 * * * *" = every hour
  last_played TIMESTAMP WITH TIME ZONE,
  play_count INTEGER DEFAULT 0,
  metadata JSONB, -- Extra data: location, temperature, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_announcements_type ON content_announcements_06086aa3(type);
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON content_announcements_06086aa3(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON content_announcements_06086aa3(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_last_played ON content_announcements_06086aa3(last_played);
CREATE INDEX IF NOT EXISTS idx_announcements_type_active ON content_announcements_06086aa3(type, is_active);

-- ==================== FUNCTIONS ====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_content_announcements_updated_at
  BEFORE UPDATE ON content_announcements_06086aa3
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();

-- Function to increment play count
CREATE OR REPLACE FUNCTION increment_announcement_play_count(announcement_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE content_announcements_06086aa3
  SET 
    play_count = play_count + 1,
    last_played = NOW(),
    updated_at = NOW()
  WHERE id = announcement_id;
END;
$$ LANGUAGE plpgsql;

-- ==================== RLS POLICIES ====================

-- Enable RLS
ALTER TABLE content_announcements_06086aa3 ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for announcements"
  ON content_announcements_06086aa3
  FOR SELECT
  USING (true);

-- Service role full access
CREATE POLICY "Service role full access to announcements"
  ON content_announcements_06086aa3
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==================== SAMPLE DATA ====================

-- Sample Station IDs
INSERT INTO content_announcements_06086aa3 (type, content, voice_id, voice_name, is_active, schedule_pattern)
VALUES
  (
    'station_id',
    'This is Soul FM, bringing you the finest in soul, jazz, and R&B music.',
    '21m00Tcm4TlvDq8ikWAM',
    'Professional Voice',
    false,
    '0 */2 * * *'
  ),
  (
    'station_id',
    'You''re listening to Soul FM, your station for smooth sounds and great vibes.',
    '21m00Tcm4TlvDq8ikWAM',
    'Professional Voice',
    false,
    '0 */2 * * *'
  ),
  (
    'station_id',
    'Soul FM - where the music never stops and the groove keeps going.',
    '21m00Tcm4TlvDq8ikWAM',
    'Professional Voice',
    false,
    '0 */2 * * *'
  )
ON CONFLICT DO NOTHING;

-- ==================== COMMENTS ====================

COMMENT ON TABLE content_announcements_06086aa3 IS 'Automated content announcements: weather, traffic, time, station IDs, promos';
COMMENT ON COLUMN content_announcements_06086aa3.type IS 'Type of announcement: weather, traffic, time, station_id, promo';
COMMENT ON COLUMN content_announcements_06086aa3.schedule_pattern IS 'Cron-like pattern for scheduling (e.g., "0 * * * *" = every hour)';
COMMENT ON COLUMN content_announcements_06086aa3.metadata IS 'Additional data in JSON format (location, temperature, etc.)';

-- ==================== SUCCESS MESSAGE ====================

DO $$
BEGIN
  RAISE NOTICE '✅ Content Announcements System created successfully!';
  RAISE NOTICE '🌤️  Weather, Traffic, Time, Station IDs, Promos ready!';
  RAISE NOTICE '📻 Table: content_announcements_06086aa3';
END $$;
