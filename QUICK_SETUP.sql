-- ================================================
-- SOUL FM - QUICK SETUP FOR TESTING
-- Выполни этот файл в Supabase SQL Editor
-- ================================================

-- ==================== STEP 1: NEWS INJECTION TABLES ====================

CREATE TABLE IF NOT EXISTS news_voice_overs_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id TEXT NOT NULL,
  news_title TEXT NOT NULL,
  news_content TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  voice_name TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  play_count INTEGER DEFAULT 0,
  last_played TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS news_injection_rules_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('hourly', 'every2h', 'every3h', 'custom')),
  custom_times TEXT[],
  days_of_week INTEGER[],
  news_categories TEXT[],
  max_news_per_slot INTEGER DEFAULT 1,
  priority_order TEXT DEFAULT 'latest' CHECK (priority_order IN ('latest', 'random', 'priority')),
  intro_jingle_id UUID,
  outro_jingle_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS news_queue_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_voice_over_id UUID NOT NULL REFERENCES news_voice_overs_06086aa3(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'completed', 'skipped')),
  played_at TIMESTAMP WITH TIME ZONE,
  rule_id UUID REFERENCES news_injection_rules_06086aa3(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== STEP 2: CONTENT ANNOUNCEMENTS TABLE ====================

CREATE TABLE IF NOT EXISTS content_announcements_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('weather', 'traffic', 'time', 'station_id', 'promo')),
  content TEXT NOT NULL,
  audio_url TEXT,
  voice_id TEXT NOT NULL,
  voice_name TEXT NOT NULL,
  duration INTEGER,
  is_active BOOLEAN DEFAULT true,
  schedule_pattern TEXT,
  last_played TIMESTAMP WITH TIME ZONE,
  play_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_news_voice_overs_news_id ON news_voice_overs_06086aa3(news_id);
CREATE INDEX IF NOT EXISTS idx_news_voice_overs_is_active ON news_voice_overs_06086aa3(is_active);
CREATE INDEX IF NOT EXISTS idx_news_injection_rules_is_active ON news_injection_rules_06086aa3(is_active);
CREATE INDEX IF NOT EXISTS idx_news_queue_status ON news_queue_06086aa3(status);
CREATE INDEX IF NOT EXISTS idx_news_queue_scheduled_time ON news_queue_06086aa3(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON content_announcements_06086aa3(type);
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON content_announcements_06086aa3(is_active);

-- ==================== FUNCTIONS ====================

CREATE OR REPLACE FUNCTION increment_news_play_count(voice_over_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE news_voice_overs_06086aa3
  SET play_count = play_count + 1, last_played = NOW(), updated_at = NOW()
  WHERE id = voice_over_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_announcement_play_count(announcement_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE content_announcements_06086aa3
  SET play_count = play_count + 1, last_played = NOW(), updated_at = NOW()
  WHERE id = announcement_id;
END;
$$ LANGUAGE plpgsql;

-- ==================== RLS POLICIES ====================

ALTER TABLE news_voice_overs_06086aa3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_injection_rules_06086aa3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_queue_06086aa3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_announcements_06086aa3 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read news voice-overs" ON news_voice_overs_06086aa3;
DROP POLICY IF EXISTS "Service role news voice-overs" ON news_voice_overs_06086aa3;
DROP POLICY IF EXISTS "Public read injection rules" ON news_injection_rules_06086aa3;
DROP POLICY IF EXISTS "Service role injection rules" ON news_injection_rules_06086aa3;
DROP POLICY IF EXISTS "Public read news queue" ON news_queue_06086aa3;
DROP POLICY IF EXISTS "Service role news queue" ON news_queue_06086aa3;
DROP POLICY IF EXISTS "Public read announcements" ON content_announcements_06086aa3;
DROP POLICY IF EXISTS "Service role announcements" ON content_announcements_06086aa3;

CREATE POLICY "Public read news voice-overs" ON news_voice_overs_06086aa3 FOR SELECT USING (true);
CREATE POLICY "Service role news voice-overs" ON news_voice_overs_06086aa3 FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read injection rules" ON news_injection_rules_06086aa3 FOR SELECT USING (true);
CREATE POLICY "Service role injection rules" ON news_injection_rules_06086aa3 FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read news queue" ON news_queue_06086aa3 FOR SELECT USING (true);
CREATE POLICY "Service role news queue" ON news_queue_06086aa3 FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read announcements" ON content_announcements_06086aa3 FOR SELECT USING (true);
CREATE POLICY "Service role announcements" ON content_announcements_06086aa3 FOR ALL USING (true) WITH CHECK (true);

-- ==================== SUCCESS! ====================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅✅✅ SETUP COMPLETE! ✅✅✅';
  RAISE NOTICE '';
  RAISE NOTICE '📰 News Injection Tables: CREATED';
  RAISE NOTICE '🌤️  Content Announcements Table: CREATED';
  RAISE NOTICE '🔒 RLS Policies: ENABLED';
  RAISE NOTICE '📊 Indexes: CREATED';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready for testing!';
  RAISE NOTICE '   Next: Open http://localhost:5173/admin/system-test';
  RAISE NOTICE '';
END $$;
