-- ============================================
-- Soul FM Hub - Initial Database Schema
-- ============================================
-- Version: 1.0.0
-- Date: 2026-02-06
-- Description: KV Store based radio station database
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. KEY-VALUE STORE TABLE
-- ============================================
-- Main data storage table for flexible schema
CREATE TABLE IF NOT EXISTS kv_store_06086aa3 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_kv_value_gin ON kv_store_06086aa3 USING GIN (value);
CREATE INDEX IF NOT EXISTS idx_kv_created_at ON kv_store_06086aa3(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kv_updated_at ON kv_store_06086aa3(updated_at DESC);

-- Prefix search optimization
CREATE INDEX IF NOT EXISTS idx_kv_key_prefix ON kv_store_06086aa3(key text_pattern_ops);

-- ============================================
-- 2. TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kv_store_updated_at
    BEFORE UPDATE ON kv_store_06086aa3
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS
ALTER TABLE kv_store_06086aa3 ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY "Service role has full access" ON kv_store_06086aa3
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Authenticated users can read public data
CREATE POLICY "Authenticated users can read public data" ON kv_store_06086aa3
    FOR SELECT
    TO authenticated
    USING (
        key LIKE 'profile:%' OR
        key LIKE 'show:%' OR
        key LIKE 'podcast:%' OR
        key LIKE 'article:%' OR
        key LIKE 'schedule:%' OR
        key = 'stream:nowplaying' OR
        key = 'stream:status'
    );

-- Policy: Anonymous users can read public streaming data
CREATE POLICY "Anonymous can read stream data" ON kv_store_06086aa3
    FOR SELECT
    TO anon
    USING (
        key = 'stream:nowplaying' OR
        key = 'stream:status' OR
        key LIKE 'history:%' OR
        key LIKE 'profile:%' OR
        key LIKE 'show:%' OR
        key LIKE 'podcast:%' OR
        key LIKE 'article:%'
    );

-- Policy: Super admins can do everything
CREATE POLICY "Super admins have full access" ON kv_store_06086aa3
    FOR ALL
    TO authenticated
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

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Function to get user role
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

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role(user_id) = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search by key prefix (optimized)
CREATE OR REPLACE FUNCTION search_kv_by_prefix(prefix_text TEXT)
RETURNS TABLE(key TEXT, value JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT kv.key, kv.value
    FROM kv_store_06086aa3 kv
    WHERE kv.key LIKE prefix_text || '%'
    ORDER BY kv.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. INITIAL DATA / SEED
-- ============================================

-- Insert default stream status
INSERT INTO kv_store_06086aa3 (key, value)
VALUES 
    ('stream:status', '{"status": "offline", "bitrate": 128, "listeners": 0}'::jsonb),
    ('stream:nowplaying', '{"title": "Soul FM Hub", "artist": "Starting Soon", "album": "", "duration": 0}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 6. ANALYTICS & STATS VIEWS
-- ============================================

-- View for quick stats
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

-- View for recent activity
CREATE OR REPLACE VIEW kv_recent_activity AS
SELECT
    key,
    value,
    created_at,
    updated_at,
    CASE
        WHEN key LIKE 'track:%' THEN 'track'
        WHEN key LIKE 'playlist:%' THEN 'playlist'
        WHEN key LIKE 'show:%' THEN 'show'
        WHEN key LIKE 'podcast:%' THEN 'podcast'
        WHEN key LIKE 'profile:%' THEN 'profile'
        WHEN key LIKE 'article:%' THEN 'article'
        WHEN key LIKE 'user:%' THEN 'user'
        ELSE 'other'
    END as entity_type
FROM kv_store_06086aa3
ORDER BY updated_at DESC
LIMIT 100;

-- ============================================
-- 7. PERFORMANCE MONITORING
-- ============================================

-- Function to get database size
CREATE OR REPLACE FUNCTION get_kv_store_size()
RETURNS TABLE(
    table_size TEXT,
    indexes_size TEXT,
    total_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pg_size_pretty(pg_total_relation_size('kv_store_06086aa3') - pg_indexes_size('kv_store_06086aa3')) as table_size,
        pg_size_pretty(pg_indexes_size('kv_store_06086aa3')) as indexes_size,
        pg_size_pretty(pg_total_relation_size('kv_store_06086aa3')) as total_size;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. CLEANUP & MAINTENANCE
-- ============================================

-- Function to cleanup old history entries (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM kv_store_06086aa3
        WHERE key LIKE 'history:%'
        AND created_at < NOW() - INTERVAL '30 days'
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. COMMENTS & DOCUMENTATION
-- ============================================

COMMENT ON TABLE kv_store_06086aa3 IS 'Main KV store for Soul FM Hub - flexible schema storage';
COMMENT ON COLUMN kv_store_06086aa3.key IS 'Unique key in format: entity_type:identifier (e.g., track:123, user:uuid)';
COMMENT ON COLUMN kv_store_06086aa3.value IS 'JSONB value containing entity data';
COMMENT ON FUNCTION get_user_role IS 'Returns user role or "listener" as default';
COMMENT ON FUNCTION is_super_admin IS 'Checks if user has super_admin role';
COMMENT ON FUNCTION search_kv_by_prefix IS 'Optimized prefix search for KV entries';
COMMENT ON VIEW kv_stats IS 'Quick statistics about stored entities';
COMMENT ON VIEW kv_recent_activity IS 'Last 100 updated entities';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Grant permissions
GRANT SELECT ON kv_stats TO authenticated, anon;
GRANT SELECT ON kv_recent_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION search_kv_by_prefix TO service_role;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Soul FM Hub database schema initialized successfully!';
    RAISE NOTICE '📊 KV Store table: kv_store_06086aa3';
    RAISE NOTICE '🔒 RLS policies enabled';
    RAISE NOTICE '📈 Indexes created for performance';
    RAISE NOTICE '🎵 Ready for deployment!';
END
$$;
