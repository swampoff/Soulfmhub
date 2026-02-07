-- ================================================
-- SOUL FM - NEWS INJECTION SYSTEM
-- Tables for automatic news voice-over generation and injection
-- ================================================

-- ==================== NEWS VOICE-OVERS TABLE ====================

CREATE TABLE IF NOT EXISTS news_voice_overs_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id TEXT NOT NULL,
  news_title TEXT NOT NULL,
  news_content TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  voice_name TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0, -- in seconds
  is_active BOOLEAN DEFAULT true,
  play_count INTEGER DEFAULT 0,
  last_played TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== NEWS INJECTION RULES TABLE ====================

CREATE TABLE IF NOT EXISTS news_injection_rules_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('hourly', 'every2h', 'every3h', 'custom')),
  custom_times TEXT[], -- Array of times like ['08:00', '12:00', '18:00']
  days_of_week INTEGER[], -- Array of day numbers (0=Sunday, 1=Monday, etc.)
  news_categories TEXT[], -- Array of news categories to include
  max_news_per_slot INTEGER DEFAULT 1,
  priority_order TEXT DEFAULT 'latest' CHECK (priority_order IN ('latest', 'random', 'priority')),
  intro_jingle_id UUID,
  outro_jingle_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== NEWS QUEUE TABLE ====================

CREATE TABLE IF NOT EXISTS news_queue_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_voice_over_id UUID NOT NULL REFERENCES news_voice_overs_06086aa3(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'completed', 'skipped')),
  played_at TIMESTAMP WITH TIME ZONE,
  rule_id UUID REFERENCES news_injection_rules_06086aa3(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== INDEXES ====================

-- Voice-overs indexes
CREATE INDEX IF NOT EXISTS idx_news_voice_overs_news_id ON news_voice_overs_06086aa3(news_id);
CREATE INDEX IF NOT EXISTS idx_news_voice_overs_is_active ON news_voice_overs_06086aa3(is_active);
CREATE INDEX IF NOT EXISTS idx_news_voice_overs_created_at ON news_voice_overs_06086aa3(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_voice_overs_play_count ON news_voice_overs_06086aa3(play_count);

-- Injection rules indexes
CREATE INDEX IF NOT EXISTS idx_news_injection_rules_is_active ON news_injection_rules_06086aa3(is_active);
CREATE INDEX IF NOT EXISTS idx_news_injection_rules_frequency ON news_injection_rules_06086aa3(frequency);

-- Queue indexes
CREATE INDEX IF NOT EXISTS idx_news_queue_status ON news_queue_06086aa3(status);
CREATE INDEX IF NOT EXISTS idx_news_queue_scheduled_time ON news_queue_06086aa3(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_news_queue_voice_over_id ON news_queue_06086aa3(news_voice_over_id);
CREATE INDEX IF NOT EXISTS idx_news_queue_rule_id ON news_queue_06086aa3(rule_id);

-- ==================== FUNCTIONS ====================

-- Function to increment play count
CREATE OR REPLACE FUNCTION increment_news_play_count(voice_over_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE news_voice_overs_06086aa3
  SET 
    play_count = play_count + 1,
    last_played = NOW(),
    updated_at = NOW()
  WHERE id = voice_over_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_news_injection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_news_voice_overs_updated_at
  BEFORE UPDATE ON news_voice_overs_06086aa3
  FOR EACH ROW
  EXECUTE FUNCTION update_news_injection_updated_at();

CREATE TRIGGER update_news_injection_rules_updated_at
  BEFORE UPDATE ON news_injection_rules_06086aa3
  FOR EACH ROW
  EXECUTE FUNCTION update_news_injection_updated_at();

-- ==================== RLS POLICIES ====================

-- Enable RLS
ALTER TABLE news_voice_overs_06086aa3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_injection_rules_06086aa3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_queue_06086aa3 ENABLE ROW LEVEL SECURITY;

-- Public read access (for radio player to fetch news)
CREATE POLICY "Public read access for news voice-overs"
  ON news_voice_overs_06086aa3
  FOR SELECT
  USING (true);

CREATE POLICY "Public read access for injection rules"
  ON news_injection_rules_06086aa3
  FOR SELECT
  USING (true);

CREATE POLICY "Public read access for news queue"
  ON news_queue_06086aa3
  FOR SELECT
  USING (true);

-- Service role full access (for backend operations)
CREATE POLICY "Service role full access to news voice-overs"
  ON news_voice_overs_06086aa3
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to injection rules"
  ON news_injection_rules_06086aa3
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to news queue"
  ON news_queue_06086aa3
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==================== SAMPLE DATA ====================

-- Insert sample injection rule (disabled by default)
INSERT INTO news_injection_rules_06086aa3 (
  name,
  frequency,
  days_of_week,
  max_news_per_slot,
  priority_order,
  is_active
) VALUES (
  'Hourly News Updates (Mon-Fri)',
  'hourly',
  ARRAY[1,2,3,4,5], -- Monday to Friday
  1,
  'latest',
  false -- Disabled by default - activate in admin panel
) ON CONFLICT DO NOTHING;

INSERT INTO news_injection_rules_06086aa3 (
  name,
  frequency,
  custom_times,
  days_of_week,
  max_news_per_slot,
  priority_order,
  is_active
) VALUES (
  'Morning & Evening News',
  'custom',
  ARRAY['08:00', '12:00', '18:00', '22:00'],
  ARRAY[1,2,3,4,5,6,0], -- All days
  2, -- 2 news items per slot
  'latest',
  false -- Disabled by default
) ON CONFLICT DO NOTHING;

-- ==================== COMMENTS ====================

COMMENT ON TABLE news_voice_overs_06086aa3 IS 'Stores generated TTS audio for news articles';
COMMENT ON TABLE news_injection_rules_06086aa3 IS 'Rules for when and how to inject news into the stream';
COMMENT ON TABLE news_queue_06086aa3 IS 'Queue of news items scheduled for playback';
COMMENT ON FUNCTION increment_news_play_count IS 'Increments play count for a news voice-over';

-- ==================== SUCCESS MESSAGE ====================

DO $$
BEGIN
  RAISE NOTICE '✅ News Injection System tables created successfully!';
  RAISE NOTICE '📰 Tables: news_voice_overs_06086aa3, news_injection_rules_06086aa3, news_queue_06086aa3';
  RAISE NOTICE '🎙️ Ready to generate voice-overs and schedule news injections';
END $$;
