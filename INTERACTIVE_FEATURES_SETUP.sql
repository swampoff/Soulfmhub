-- =====================================================
-- SOUL FM - INTERACTIVE FEATURES SYSTEM
-- Call-Ins, Live DJ, Song Requests, Shoutouts
-- =====================================================

-- ==================== LIVE DJ SESSIONS ====================

-- DJ Sessions Table
CREATE TABLE IF NOT EXISTS dj_sessions_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- DJ Info
  dj_user_id TEXT NOT NULL,
  dj_name TEXT NOT NULL,
  
  -- Session details
  session_type TEXT DEFAULT 'live_show' CHECK (session_type IN ('live_show', 'guest_mix', 'takeover', 'interview')),
  title TEXT NOT NULL,
  description TEXT,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration INTEGER, -- seconds (calculated when ended)
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'paused')),
  
  -- Stats
  tracks_played INTEGER DEFAULT 0,
  callers_taken INTEGER DEFAULT 0,
  requests_played INTEGER DEFAULT 0,
  
  -- Auto-DJ override
  auto_dj_paused BOOLEAN DEFAULT true,
  resume_schedule_id UUID, -- Which schedule to resume after
  
  -- Recording
  recording_url TEXT,
  recording_duration INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- DJ Session Tracks (what was played during session)
CREATE TABLE IF NOT EXISTS dj_session_tracks_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES dj_sessions_06086aa3(id) ON DELETE CASCADE,
  
  -- Track info
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  
  -- Timing
  played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration INTEGER NOT NULL,
  
  -- Context
  was_request BOOLEAN DEFAULT false,
  requester_name TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for DJ sessions
CREATE INDEX IF NOT EXISTS idx_dj_sessions_status 
  ON dj_sessions_06086aa3(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_dj_sessions_dj 
  ON dj_sessions_06086aa3(dj_user_id, started_at DESC);

-- ==================== SONG REQUESTS ====================

-- Song Requests Table
CREATE TABLE IF NOT EXISTS song_requests_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Requester info
  requester_name TEXT NOT NULL,
  requester_email TEXT,
  requester_location TEXT,
  
  -- Request details
  track_id TEXT, -- If they selected from library
  custom_song_title TEXT, -- If they typed manually
  custom_artist TEXT,
  
  -- Message
  message TEXT, -- Optional dedication message
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'played', 'cancelled')),
  moderation_note TEXT,
  moderated_by TEXT,
  moderated_at TIMESTAMPTZ,
  
  -- Scheduling
  priority INTEGER DEFAULT 0, -- Higher = plays sooner
  votes INTEGER DEFAULT 0, -- Community voting
  
  -- Played info
  played_at TIMESTAMPTZ,
  dj_session_id UUID REFERENCES dj_sessions_06086aa3(id),
  
  -- Rate limiting
  requester_ip TEXT,
  last_request_from_ip TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Request Votes (prevent duplicate voting)
CREATE TABLE IF NOT EXISTS request_votes_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES song_requests_06086aa3(id) ON DELETE CASCADE,
  
  -- Voter info
  voter_ip TEXT NOT NULL,
  user_id TEXT, -- If logged in
  
  -- Vote
  vote_type TEXT DEFAULT 'up' CHECK (vote_type IN ('up', 'down')),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent duplicate votes
  UNIQUE(request_id, voter_ip)
);

-- Indexes for song requests
CREATE INDEX IF NOT EXISTS idx_song_requests_status 
  ON song_requests_06086aa3(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_requests_pending 
  ON song_requests_06086aa3(status, priority DESC, votes DESC) 
  WHERE status = 'pending' OR status = 'approved';
CREATE INDEX IF NOT EXISTS idx_song_requests_ip 
  ON song_requests_06086aa3(requester_ip, created_at DESC);

-- ==================== SHOUTOUTS & DEDICATIONS ====================

-- Shoutouts Table
CREATE TABLE IF NOT EXISTS shoutouts_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Sender info
  sender_name TEXT NOT NULL,
  sender_email TEXT,
  sender_location TEXT,
  
  -- Recipient info
  recipient_name TEXT NOT NULL,
  occasion TEXT, -- birthday, anniversary, graduation, etc.
  
  -- Message
  message TEXT NOT NULL,
  custom_voice_message_url TEXT, -- If they upload audio
  
  -- Generated TTS
  tts_script TEXT, -- Auto-generated announcement
  tts_audio_url TEXT,
  tts_duration INTEGER,
  voice_id TEXT,
  voice_name TEXT DEFAULT 'Professional Announcer',
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'played', 'scheduled')),
  moderation_note TEXT,
  moderated_by TEXT,
  moderated_at TIMESTAMPTZ,
  
  -- Scheduling
  scheduled_date DATE, -- For special occasions
  scheduled_time TIME,
  priority INTEGER DEFAULT 0,
  
  -- Played info
  played_at TIMESTAMPTZ,
  dj_session_id UUID REFERENCES dj_sessions_06086aa3(id),
  
  -- Associated song (optional)
  song_request_id UUID REFERENCES song_requests_06086aa3(id),
  
  -- Rate limiting
  sender_ip TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for shoutouts
CREATE INDEX IF NOT EXISTS idx_shoutouts_status 
  ON shoutouts_06086aa3(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shoutouts_scheduled 
  ON shoutouts_06086aa3(status, scheduled_date, scheduled_time) 
  WHERE status = 'scheduled';

-- ==================== CALL-INS ====================

-- Call Queue Table
CREATE TABLE IF NOT EXISTS call_queue_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Caller info
  caller_name TEXT NOT NULL,
  caller_phone TEXT,
  caller_location TEXT,
  
  -- Call details
  call_reason TEXT, -- request, shoutout, question, comment, contest
  topic TEXT,
  notes TEXT, -- Screener notes
  
  -- Status
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'screened', 'approved', 'on_air', 'completed', 'rejected', 'dropped')),
  queue_position INTEGER,
  
  -- Screening
  screened_by TEXT,
  screened_at TIMESTAMPTZ,
  screener_notes TEXT,
  
  -- On-air details
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  call_duration INTEGER, -- seconds
  
  -- Recording
  recording_url TEXT,
  
  -- Session
  dj_session_id UUID REFERENCES dj_sessions_06086aa3(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for call queue
CREATE INDEX IF NOT EXISTS idx_call_queue_status 
  ON call_queue_06086aa3(status, queue_position) 
  WHERE status IN ('waiting', 'screened', 'approved');
CREATE INDEX IF NOT EXISTS idx_call_queue_session 
  ON call_queue_06086aa3(dj_session_id, created_at DESC);

-- ==================== RPC FUNCTIONS ====================

-- Start DJ Session
CREATE OR REPLACE FUNCTION start_dj_session(
  p_dj_user_id TEXT,
  p_dj_name TEXT,
  p_title TEXT,
  p_session_type TEXT DEFAULT 'live_show'
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  INSERT INTO dj_sessions_06086aa3 (
    dj_user_id,
    dj_name,
    title,
    session_type,
    status,
    auto_dj_paused
  ) VALUES (
    p_dj_user_id,
    p_dj_name,
    p_title,
    p_session_type,
    'active',
    true
  )
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- End DJ Session
CREATE OR REPLACE FUNCTION end_dj_session(p_session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE dj_sessions_06086aa3
  SET 
    status = 'ended',
    ended_at = now(),
    duration = EXTRACT(EPOCH FROM (now() - started_at))::INTEGER,
    updated_at = now()
  WHERE id = p_session_id AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Get next approved song request
CREATE OR REPLACE FUNCTION get_next_song_request()
RETURNS TABLE (
  id UUID,
  track_id TEXT,
  title TEXT,
  artist TEXT,
  requester_name TEXT,
  message TEXT,
  votes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.track_id,
    COALESCE(r.custom_song_title, '') as title,
    COALESCE(r.custom_artist, '') as artist,
    r.requester_name,
    r.message,
    r.votes
  FROM song_requests_06086aa3 r
  WHERE r.status = 'approved'
  ORDER BY r.priority DESC, r.votes DESC, r.created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get next scheduled shoutout
CREATE OR REPLACE FUNCTION get_next_shoutout(check_time TIMESTAMPTZ DEFAULT now())
RETURNS TABLE (
  id UUID,
  recipient_name TEXT,
  message TEXT,
  tts_audio_url TEXT,
  tts_duration INTEGER,
  occasion TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.recipient_name,
    s.message,
    s.tts_audio_url,
    s.tts_duration,
    s.occasion
  FROM shoutouts_06086aa3 s
  WHERE 
    (s.status = 'scheduled' OR s.status = 'approved')
    AND (
      -- Scheduled for today
      (s.scheduled_date = check_time::DATE AND s.scheduled_time <= check_time::TIME)
      -- Or approved and ready
      OR (s.status = 'approved' AND s.scheduled_date IS NULL)
    )
  ORDER BY s.priority DESC, s.created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Vote on request
CREATE OR REPLACE FUNCTION vote_on_request(
  p_request_id UUID,
  p_voter_ip TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_vote_type TEXT DEFAULT 'up'
)
RETURNS INTEGER AS $$
DECLARE
  v_new_vote_count INTEGER;
BEGIN
  -- Insert vote (will fail if duplicate due to unique constraint)
  INSERT INTO request_votes_06086aa3 (request_id, voter_ip, user_id, vote_type)
  VALUES (p_request_id, p_voter_ip, p_user_id, p_vote_type)
  ON CONFLICT (request_id, voter_ip) DO NOTHING;
  
  -- Update request votes count
  UPDATE song_requests_06086aa3
  SET votes = (
    SELECT COUNT(*) 
    FROM request_votes_06086aa3 
    WHERE request_id = p_request_id AND vote_type = 'up'
  ) - (
    SELECT COUNT(*) 
    FROM request_votes_06086aa3 
    WHERE request_id = p_request_id AND vote_type = 'down'
  )
  WHERE id = p_request_id
  RETURNING votes INTO v_new_vote_count;
  
  RETURN COALESCE(v_new_vote_count, 0);
END;
$$ LANGUAGE plpgsql;

-- ==================== SEED DATA ====================

-- Example song request
INSERT INTO song_requests_06086aa3 (
  requester_name,
  requester_location,
  track_id,
  message,
  status,
  votes
) VALUES
  (
    'Sarah from Miami',
    'Miami, FL',
    'track_lovely_day',
    'This song always makes my day better! Love you Soul FM!',
    'approved',
    15
  ),
  (
    'Marcus',
    'Fort Lauderdale',
    'track_aint_no_sunshine',
    'Can you play this for my wife? It''s our anniversary!',
    'pending',
    3
  );

-- Example shoutout
INSERT INTO shoutouts_06086aa3 (
  sender_name,
  sender_location,
  recipient_name,
  occasion,
  message,
  status,
  tts_script
) VALUES
  (
    'Jennifer',
    'Miami',
    'Mom (Linda)',
    'birthday',
    'Happy 60th birthday Mom! You''re the best! Love you so much!',
    'approved',
    'Soul FM has a special birthday shoutout! Happy 60th birthday to Linda from your daughter Jennifer! We''re sending you love and soul vibes all day long!'
  );

-- Example call in queue
INSERT INTO call_queue_06086aa3 (
  caller_name,
  caller_phone,
  caller_location,
  call_reason,
  topic,
  status,
  queue_position
) VALUES
  (
    'John',
    '305-555-1234',
    'Miami',
    'request',
    'Wants to request Earth Wind & Fire',
    'waiting',
    1
  );

-- ==================== SETUP COMPLETE ====================

SELECT 
  'Interactive Features Setup Complete!' as message,
  (SELECT COUNT(*) FROM dj_sessions_06086aa3) as dj_sessions,
  (SELECT COUNT(*) FROM song_requests_06086aa3) as song_requests,
  (SELECT COUNT(*) FROM shoutouts_06086aa3) as shoutouts,
  (SELECT COUNT(*) FROM call_queue_06086aa3) as call_queue;
