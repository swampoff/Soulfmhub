-- ============================================
-- Soul FM Hub - Quick Setup (One-Command Deploy)
-- ============================================
-- Run this single file to set up everything!
-- ============================================

\echo '🚀 Starting Soul FM Hub database setup...'

-- 1. Create KV Store table
\echo '📊 Creating kv_store table...'
CREATE TABLE IF NOT EXISTS kv_store_06086aa3 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes
\echo '📈 Creating indexes...'
CREATE INDEX IF NOT EXISTS idx_kv_value_gin ON kv_store_06086aa3 USING GIN (value);
CREATE INDEX IF NOT EXISTS idx_kv_created_at ON kv_store_06086aa3(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kv_updated_at ON kv_store_06086aa3(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_kv_key_prefix ON kv_store_06086aa3(key text_pattern_ops);

-- 3. Create trigger
\echo '⚡ Creating triggers...'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_kv_store_updated_at ON kv_store_06086aa3;
CREATE TRIGGER update_kv_store_updated_at
    BEFORE UPDATE ON kv_store_06086aa3
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Enable RLS
\echo '🔒 Enabling Row Level Security...'
ALTER TABLE kv_store_06086aa3 ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role has full access" ON kv_store_06086aa3;
DROP POLICY IF EXISTS "Authenticated users can read public data" ON kv_store_06086aa3;
DROP POLICY IF EXISTS "Anonymous can read stream data" ON kv_store_06086aa3;
DROP POLICY IF EXISTS "Super admins have full access" ON kv_store_06086aa3;

-- Create policies
CREATE POLICY "Service role has full access" ON kv_store_06086aa3
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read public data" ON kv_store_06086aa3
    FOR SELECT TO authenticated
    USING (
        key LIKE 'profile:%' OR key LIKE 'show:%' OR
        key LIKE 'podcast:%' OR key LIKE 'article:%' OR
        key LIKE 'schedule:%' OR key = 'stream:nowplaying' OR
        key = 'stream:status'
    );

CREATE POLICY "Anonymous can read stream data" ON kv_store_06086aa3
    FOR SELECT TO anon
    USING (
        key = 'stream:nowplaying' OR key = 'stream:status' OR
        key LIKE 'history:%' OR key LIKE 'profile:%' OR
        key LIKE 'show:%' OR key LIKE 'podcast:%' OR
        key LIKE 'article:%'
    );

CREATE POLICY "Super admins have full access" ON kv_store_06086aa3
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM kv_store_06086aa3
            WHERE key = 'user:' || auth.uid()::text
            AND value->>'role' = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM kv_store_06086aa3
            WHERE key = 'user:' || auth.uid()::text
            AND value->>'role' = 'super_admin'
        )
    );

-- 5. Create helper functions
\echo '🛠️ Creating helper functions...'
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT value->>'role' INTO user_role
    FROM kv_store_06086aa3
    WHERE key = 'user:' || user_id::text;
    RETURN COALESCE(user_role, 'listener');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role(user_id) = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create views
\echo '👁️ Creating views...'
CREATE OR REPLACE VIEW kv_stats AS
SELECT
    COUNT(*) as total_keys,
    COUNT(*) FILTER (WHERE key LIKE 'track:%') as total_tracks,
    COUNT(*) FILTER (WHERE key LIKE 'playlist:%') as total_playlists,
    COUNT(*) FILTER (WHERE key LIKE 'show:%') as total_shows,
    COUNT(*) FILTER (WHERE key LIKE 'podcast:%') as total_podcasts,
    COUNT(*) FILTER (WHERE key LIKE 'profile:%') as total_profiles,
    COUNT(*) FILTER (WHERE key LIKE 'user:%') as total_users,
    COUNT(*) FILTER (WHERE key LIKE 'article:%') as total_articles
FROM kv_store_06086aa3;

-- 7. Insert initial data
\echo '🎵 Inserting initial data...'
INSERT INTO kv_store_06086aa3 (key, value)
VALUES 
    ('stream:status', '{"status": "offline", "bitrate": 128, "listeners": 0}'::jsonb),
    ('stream:nowplaying', '{"title": "Soul FM Hub", "artist": "Starting Soon", "album": "", "duration": 0}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 8. Grant permissions
\echo '🔑 Granting permissions...'
GRANT SELECT ON kv_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;

-- Final check
\echo '✅ Checking installation...'
DO $$
DECLARE
    table_exists BOOLEAN;
    stats_count INT;
BEGIN
    -- Check table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'kv_store_06086aa3'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE EXCEPTION '❌ Table kv_store_06086aa3 was not created!';
    END IF;
    
    -- Check initial data
    SELECT total_keys FROM kv_stats INTO stats_count;
    
    RAISE NOTICE '✅ Setup complete!';
    RAISE NOTICE '📊 Table: kv_store_06086aa3 ✓';
    RAISE NOTICE '📈 Indexes: 4 ✓';
    RAISE NOTICE '🔒 RLS Policies: 4 ✓';
    RAISE NOTICE '🎵 Initial keys: %', stats_count;
    RAISE NOTICE '🚀 Soul FM Hub is ready to rock! 🎸';
END
$$;

-- Show stats
SELECT * FROM kv_stats;
