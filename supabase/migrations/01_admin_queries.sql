-- ============================================
-- Soul FM Hub - Admin Queries & Utilities
-- ============================================
-- Version: 1.0.0
-- Date: 2026-02-06
-- Description: Useful SQL queries for administration
-- ============================================

-- ============================================
-- DIAGNOSTIC QUERIES
-- ============================================

-- 1. Check database health
-- SELECT * FROM get_kv_store_size();

-- 2. View all statistics
-- SELECT * FROM kv_stats;

-- 3. View recent activity
-- SELECT * FROM kv_recent_activity LIMIT 20;

-- 4. Count keys by type
-- SELECT
--     SPLIT_PART(key, ':', 1) as entity_type,
--     COUNT(*) as count
-- FROM kv_store_06086aa3
-- GROUP BY entity_type
-- ORDER BY count DESC;

-- 5. Find all super admins
-- SELECT
--     key,
--     value->>'email' as email,
--     value->>'name' as name,
--     value->>'role' as role
-- FROM kv_store_06086aa3
-- WHERE key LIKE 'user:%'
-- AND value->>'role' = 'super_admin';

-- ============================================
-- DATA EXPLORATION
-- ============================================

-- 6. Get all tracks
-- SELECT
--     key,
--     value->>'title' as title,
--     value->>'artist' as artist,
--     value->>'genre' as genre
-- FROM kv_store_06086aa3
-- WHERE key LIKE 'track:%'
-- ORDER BY value->>'title';

-- 7. Get all playlists
-- SELECT
--     key,
--     value->>'name' as name,
--     value->>'genre' as genre,
--     (value->>'trackCount')::int as track_count
-- FROM kv_store_06086aa3
-- WHERE key LIKE 'playlist:%'
-- ORDER BY value->>'name';

-- 8. Get all shows
-- SELECT
--     key,
--     value->>'title' as title,
--     value->>'host' as host,
--     value->>'status' as status
-- FROM kv_store_06086aa3
-- WHERE key LIKE 'show:%'
-- ORDER BY value->>'title';

-- 9. Get all DJ/Host profiles
-- SELECT
--     key,
--     value->>'name' as name,
--     value->>'role' as role,
--     value->>'slug' as slug,
--     (value->>'isFeatured')::boolean as featured
-- FROM kv_store_06086aa3
-- WHERE key LIKE 'profile:%'
-- ORDER BY value->>'name';

-- 10. Get stream history (last 24 hours)
-- SELECT
--     key,
--     value->>'title' as title,
--     value->>'artist' as artist,
--     created_at
-- FROM kv_store_06086aa3
-- WHERE key LIKE 'history:%'
-- AND created_at > NOW() - INTERVAL '24 hours'
-- ORDER BY created_at DESC;

-- ============================================
-- MAINTENANCE QUERIES
-- ============================================

-- 11. Cleanup old history (older than 30 days)
-- SELECT cleanup_old_history();

-- 12. Vacuum and analyze
-- VACUUM ANALYZE kv_store_06086aa3;

-- 13. Reindex
-- REINDEX TABLE kv_store_06086aa3;

-- ============================================
-- USER MANAGEMENT
-- ============================================

-- 14. Create a super admin user
-- INSERT INTO kv_store_06086aa3 (key, value)
-- VALUES (
--     'user:YOUR_USER_UUID_HERE',
--     jsonb_build_object(
--         'id', 'YOUR_USER_UUID_HERE',
--         'email', 'admin@soulfm.radio',
--         'name', 'Admin',
--         'role', 'super_admin',
--         'avatar', '',
--         'createdAt', NOW()
--     )
-- )
-- ON CONFLICT (key) DO UPDATE
-- SET value = jsonb_build_object(
--     'id', EXCLUDED.value->>'id',
--     'email', EXCLUDED.value->>'email',
--     'name', EXCLUDED.value->>'name',
--     'role', 'super_admin',
--     'avatar', EXCLUDED.value->>'avatar',
--     'createdAt', kv_store_06086aa3.value->>'createdAt'
-- );

-- 15. List all users with roles
-- SELECT
--     key,
--     value->>'email' as email,
--     value->>'name' as name,
--     value->>'role' as role,
--     (value->>'createdAt')::timestamp as created_at
-- FROM kv_store_06086aa3
-- WHERE key LIKE 'user:%'
-- ORDER BY (value->>'createdAt')::timestamp DESC;

-- 16. Change user role
-- UPDATE kv_store_06086aa3
-- SET value = jsonb_set(value, '{role}', '"super_admin"'::jsonb)
-- WHERE key = 'user:YOUR_USER_UUID_HERE';

-- ============================================
-- CONTENT MANAGEMENT
-- ============================================

-- 17. Delete a track
-- DELETE FROM kv_store_06086aa3 WHERE key = 'track:TRACK_ID';

-- 18. Delete a playlist
-- DELETE FROM kv_store_06086aa3 WHERE key = 'playlist:PLAYLIST_ID';

-- 19. Delete a show
-- DELETE FROM kv_store_06086aa3 WHERE key = 'show:SHOW_ID';

-- 20. Update stream status
-- UPDATE kv_store_06086aa3
-- SET value = jsonb_build_object(
--     'status', 'online',
--     'bitrate', 128,
--     'listeners', 0
-- )
-- WHERE key = 'stream:status';

-- ============================================
-- BACKUP & RESTORE
-- ============================================

-- 21. Export all data as JSON
-- COPY (
--     SELECT json_agg(row_to_json(t))
--     FROM (
--         SELECT key, value, created_at, updated_at
--         FROM kv_store_06086aa3
--         ORDER BY key
--     ) t
-- ) TO '/tmp/soul_fm_backup.json';

-- 22. Import data from JSON
-- Note: This requires uploading file to server first
-- CREATE TEMP TABLE temp_import (data jsonb);
-- COPY temp_import FROM '/tmp/soul_fm_backup.json';
-- INSERT INTO kv_store_06086aa3 (key, value, created_at, updated_at)
-- SELECT
--     d->>'key',
--     (d->>'value')::jsonb,
--     (d->>'created_at')::timestamp,
--     (d->>'updated_at')::timestamp
-- FROM temp_import, jsonb_array_elements(data) d
-- ON CONFLICT (key) DO NOTHING;

-- ============================================
-- ANALYTICS QUERIES
-- ============================================

-- 23. Most popular tracks (by history count)
-- SELECT
--     value->>'title' as title,
--     value->>'artist' as artist,
--     COUNT(*) as play_count
-- FROM kv_store_06086aa3
-- WHERE key LIKE 'history:%'
-- GROUP BY value->>'title', value->>'artist'
-- ORDER BY play_count DESC
-- LIMIT 10;

-- 24. Tracks by genre
-- SELECT
--     value->>'genre' as genre,
--     COUNT(*) as track_count
-- FROM kv_store_06086aa3
-- WHERE key LIKE 'track:%'
-- GROUP BY value->>'genre'
-- ORDER BY track_count DESC;

-- 25. Activity by hour (last 7 days)
-- SELECT
--     DATE_TRUNC('hour', created_at) as hour,
--     COUNT(*) as events
-- FROM kv_store_06086aa3
-- WHERE created_at > NOW() - INTERVAL '7 days'
-- GROUP BY hour
-- ORDER BY hour DESC;

-- ============================================
-- SEARCH QUERIES
-- ============================================

-- 26. Search tracks by title
-- SELECT
--     key,
--     value->>'title' as title,
--     value->>'artist' as artist
-- FROM kv_store_06086aa3
-- WHERE key LIKE 'track:%'
-- AND LOWER(value->>'title') LIKE LOWER('%search_term%')
-- ORDER BY value->>'title';

-- 27. Search profiles by name
-- SELECT
--     key,
--     value->>'name' as name,
--     value->>'role' as role,
--     value->>'slug' as slug
-- FROM kv_store_06086aa3
-- WHERE key LIKE 'profile:%'
-- AND LOWER(value->>'name') LIKE LOWER('%search_term%')
-- ORDER BY value->>'name';

-- ============================================
-- PERFORMANCE MONITORING
-- ============================================

-- 28. Check slow queries
-- SELECT * FROM pg_stat_statements
-- WHERE query LIKE '%kv_store_06086aa3%'
-- ORDER BY mean_exec_time DESC
-- LIMIT 10;

-- 29. Index usage statistics
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     idx_scan,
--     idx_tup_read,
--     idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE tablename = 'kv_store_06086aa3'
-- ORDER BY idx_scan DESC;

-- 30. Table bloat check
-- SELECT
--     current_database() AS db,
--     schemaname,
--     tablename,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS external_size
-- FROM pg_tables
-- WHERE tablename = 'kv_store_06086aa3';

-- ============================================
-- END OF ADMIN QUERIES
-- ============================================

-- Note: Uncomment queries to use them
-- Some queries require replacing placeholders like:
-- - YOUR_USER_UUID_HERE
-- - TRACK_ID
-- - PLAYLIST_ID
-- - search_term
