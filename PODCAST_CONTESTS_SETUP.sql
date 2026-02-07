-- =====================================================
-- SOUL FM - PODCAST AUTO-SCHEDULING & CONTEST SYSTEM
-- =====================================================

-- ==================== PODCAST SCHEDULING ====================

-- Podcast Schedule Table
CREATE TABLE IF NOT EXISTS podcast_schedule_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id TEXT NOT NULL,
  episode_id TEXT,
  
  -- Scheduling
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('one_time', 'weekly', 'daily', 'custom')),
  day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc. (for weekly)
  time_of_day TIME NOT NULL, -- e.g., '19:00:00'
  date DATE, -- For one-time schedules
  
  -- Metadata
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL, -- seconds
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_played_at TIMESTAMPTZ,
  play_count INTEGER DEFAULT 0,
  
  -- Smart rotation
  min_days_between_plays INTEGER DEFAULT 7, -- Don't repeat too often
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Podcast Play History
CREATE TABLE IF NOT EXISTS podcast_play_history_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES podcast_schedule_06086aa3(id) ON DELETE CASCADE,
  podcast_id TEXT NOT NULL,
  episode_id TEXT,
  
  -- Play details
  played_at TIMESTAMPTZ DEFAULT now(),
  duration INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  
  -- Context
  scheduled_time TIMESTAMPTZ,
  actual_play_time TIMESTAMPTZ,
  delay_seconds INTEGER, -- Difference from scheduled time
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for podcast scheduling
CREATE INDEX IF NOT EXISTS idx_podcast_schedule_active 
  ON podcast_schedule_06086aa3(is_active, schedule_type);
CREATE INDEX IF NOT EXISTS idx_podcast_schedule_day_time 
  ON podcast_schedule_06086aa3(day_of_week, time_of_day);
CREATE INDEX IF NOT EXISTS idx_podcast_play_history_played_at 
  ON podcast_play_history_06086aa3(played_at DESC);

-- ==================== CONTESTS SYSTEM ====================

-- Contests Table
CREATE TABLE IF NOT EXISTS contests_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contest details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  prize TEXT NOT NULL,
  
  -- Entry method
  entry_method TEXT NOT NULL CHECK (entry_method IN ('phone', 'text', 'email', 'online', 'social')),
  entry_details JSONB, -- { phone: "305-555-SOUL", text: "SOUL to 12345", etc. }
  
  -- Dates
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  winner_announced_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended', 'cancelled')),
  is_featured BOOLEAN DEFAULT false,
  
  -- Announcement settings
  announcement_frequency TEXT DEFAULT 'hourly' 
    CHECK (announcement_frequency IN ('every_15min', 'every_30min', 'hourly', 'every_2hours', 'daily', 'custom')),
  announcement_times TIME[], -- Specific times to announce (for 'custom')
  announcement_days INTEGER[], -- Days of week to announce (0=Sunday, etc.)
  
  -- TTS Voice
  voice_id TEXT,
  voice_name TEXT DEFAULT 'Professional Announcer',
  
  -- Generated announcement
  announcement_script TEXT,
  announcement_audio_url TEXT,
  announcement_duration INTEGER, -- seconds
  
  -- Stats
  announcement_play_count INTEGER DEFAULT 0,
  total_entries INTEGER DEFAULT 0,
  
  -- Winner info
  winner_name TEXT,
  winner_contact TEXT,
  winner_announcement_audio_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contest Announcements Queue
CREATE TABLE IF NOT EXISTS contest_announcements_queue_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID REFERENCES contests_06086aa3(id) ON DELETE CASCADE,
  
  -- Scheduling
  scheduled_time TIMESTAMPTZ NOT NULL,
  announcement_type TEXT DEFAULT 'promo' CHECK (announcement_type IN ('promo', 'reminder', 'winner', 'last_chance')),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'completed', 'cancelled')),
  played_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contest Entries (Optional - for tracking)
CREATE TABLE IF NOT EXISTS contest_entries_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID REFERENCES contests_06086aa3(id) ON DELETE CASCADE,
  
  -- Entry info
  entry_method TEXT NOT NULL,
  contact_info TEXT, -- Phone, email, username, etc.
  entry_data JSONB, -- Additional data
  
  -- Validation
  is_valid BOOLEAN DEFAULT true,
  is_winner BOOLEAN DEFAULT false,
  
  -- Timestamps
  entered_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for contests
CREATE INDEX IF NOT EXISTS idx_contests_status_dates 
  ON contests_06086aa3(status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_contests_active 
  ON contests_06086aa3(status, is_featured) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_contest_queue_pending 
  ON contest_announcements_queue_06086aa3(status, scheduled_time) WHERE status = 'pending';

-- ==================== RPC FUNCTIONS ====================

-- Increment podcast play count
CREATE OR REPLACE FUNCTION increment_podcast_play_count(schedule_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE podcast_schedule_06086aa3
  SET 
    play_count = play_count + 1,
    last_played_at = now()
  WHERE id = schedule_id_param;
END;
$$ LANGUAGE plpgsql;

-- Increment contest announcement play count
CREATE OR REPLACE FUNCTION increment_contest_announcement_count(contest_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE contests_06086aa3
  SET announcement_play_count = announcement_play_count + 1
  WHERE id = contest_id_param;
END;
$$ LANGUAGE plpgsql;

-- Get next scheduled podcast
CREATE OR REPLACE FUNCTION get_next_scheduled_podcast(check_time TIMESTAMPTZ DEFAULT now())
RETURNS TABLE (
  id UUID,
  podcast_id TEXT,
  episode_id TEXT,
  title TEXT,
  duration INTEGER,
  scheduled_time TIMESTAMPTZ,
  schedule_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH current_day AS (
    SELECT EXTRACT(DOW FROM check_time)::INTEGER as dow,
           check_time::TIME as current_time
  )
  SELECT 
    ps.id,
    ps.podcast_id,
    ps.episode_id,
    ps.title,
    ps.duration,
    -- Calculate scheduled time
    CASE 
      WHEN ps.schedule_type = 'one_time' THEN ps.date::TIMESTAMPTZ + ps.time_of_day
      WHEN ps.schedule_type = 'weekly' THEN check_time::DATE + ps.time_of_day
      ELSE check_time::DATE + ps.time_of_day
    END as scheduled_time,
    ps.schedule_type
  FROM podcast_schedule_06086aa3 ps
  CROSS JOIN current_day cd
  WHERE ps.is_active = true
    AND (
      -- One-time schedule
      (ps.schedule_type = 'one_time' 
       AND ps.date = check_time::DATE 
       AND ps.time_of_day BETWEEN cd.current_time AND cd.current_time + INTERVAL '10 minutes')
      
      -- Weekly schedule
      OR (ps.schedule_type = 'weekly' 
          AND ps.day_of_week = cd.dow
          AND ps.time_of_day BETWEEN cd.current_time AND cd.current_time + INTERVAL '10 minutes')
      
      -- Daily schedule
      OR (ps.schedule_type = 'daily'
          AND ps.time_of_day BETWEEN cd.current_time AND cd.current_time + INTERVAL '10 minutes')
    )
    -- Smart rotation: don't play if played recently
    AND (ps.last_played_at IS NULL 
         OR ps.last_played_at < check_time - (ps.min_days_between_plays || ' days')::INTERVAL)
  ORDER BY ps.time_of_day
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ==================== SEED DATA ====================

-- Example: Weekly podcast schedule (every Wednesday at 7 PM)
INSERT INTO podcast_schedule_06086aa3 (
  podcast_id,
  episode_id,
  schedule_type,
  day_of_week,
  time_of_day,
  title,
  description,
  duration,
  min_days_between_plays
) VALUES
  (
    'podcast_soul_sessions',
    'episode_001',
    'weekly',
    3, -- Wednesday
    '19:00:00',
    'The Soul Sessions - Episode 1',
    'Deep dive into classic soul music with host Marcus Williams',
    2700, -- 45 minutes
    7
  ),
  (
    'podcast_jazz_tonight',
    'episode_001',
    'weekly',
    5, -- Friday
    '21:00:00',
    'Jazz Tonight - Smooth Grooves',
    'Late night jazz vibes hosted by Diana Ross',
    3600, -- 60 minutes
    7
  );

-- Example: Active contest
INSERT INTO contests_06086aa3 (
  title,
  description,
  prize,
  entry_method,
  entry_details,
  start_date,
  end_date,
  status,
  is_featured,
  announcement_frequency,
  voice_name,
  announcement_script
) VALUES
  (
    'Win Tickets to Miami Soul Festival 2026',
    'Enter to win 2 VIP tickets to the hottest soul music festival of the year! Meet your favorite artists, enjoy exclusive backstage access, and experience soul music like never before.',
    '2 VIP Tickets to Miami Soul Festival (Value: $500)',
    'text',
    '{"text": "SOUL to 305-555-SOUL", "keyword": "SOUL", "shortcode": "305-555-SOUL"}',
    now(),
    now() + INTERVAL '14 days',
    'active',
    true,
    'hourly',
    'Professional Announcer',
    'Hey Soul FM listeners! Want to win VIP tickets to the Miami Soul Festival? Text SOUL to 305-555-SOUL for your chance to win! That''s SOUL to 305-555-SOUL. Two lucky winners will get VIP access to the biggest soul music event of the year. Text now!'
  ),
  (
    'Soul FM Birthday Bash Giveaway',
    'It''s our birthday and YOU get the presents! Win a $100 gift card to your favorite music store.',
    '$100 Music Store Gift Card',
    'phone',
    '{"phone": "305-555-SOUL", "hours": "Mon-Fri 9AM-5PM"}',
    now(),
    now() + INTERVAL '7 days',
    'active',
    false,
    'every_2hours',
    'Professional Announcer',
    'Soul FM is celebrating our birthday with a special giveaway! Call 305-555-SOUL for your chance to win a hundred dollar gift card. That''s 305-555-SOUL. Lines open Monday through Friday, 9 AM to 5 PM. Call now and celebrate with us!'
  );

-- ==================== SETUP COMPLETE ====================

SELECT 
  'Podcast & Contest System Setup Complete!' as message,
  (SELECT COUNT(*) FROM podcast_schedule_06086aa3) as podcast_schedules,
  (SELECT COUNT(*) FROM contests_06086aa3) as active_contests;
