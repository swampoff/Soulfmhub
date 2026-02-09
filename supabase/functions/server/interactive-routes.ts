/**
 * Soul FM - Interactive Features Routes
 * Live DJ, Song Requests, Shoutouts, Call-Ins
 */

import { Hono } from "npm:hono@4";
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as interactive from "./interactive-features.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export function setupInteractiveRoutes(app: Hono, requireAuth: any) {
  
  // ==================== LIVE DJ SESSIONS ====================
  
  // Get all DJ sessions
  app.get("/make-server-06086aa3/dj-sessions", async (c) => {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from('dj_sessions_06086aa3')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      return c.json({ sessions: data || [] });
    } catch (error: any) {
      console.error('Get DJ sessions error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Get current active DJ session
  app.get("/make-server-06086aa3/dj-sessions/current", async (c) => {
    try {
      const session = interactive.getCurrentDJSession();
      const isLive = interactive.isLiveDJ();
      
      return c.json({ 
        isLive,
        session: session || null
      });
    } catch (error: any) {
      console.error('Get current DJ session error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Start DJ session (GO LIVE)
  app.post("/make-server-06086aa3/dj-sessions/start", async (c) => {
    try {
      const body = await c.req.json();
      const userId = 'admin'; // Default admin user for prototype
      
      const session = await interactive.startDJSession(
        userId,
        body.dj_name,
        body.title,
        body.session_type || 'live_show'
      );
      
      console.log(`🔴 LIVE: ${body.dj_name} - "${body.title}"`);
      return c.json({ session, isLive: true });
    } catch (error: any) {
      console.error('Start DJ session error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // End DJ session
  app.post("/make-server-06086aa3/dj-sessions/:id/end", async (c) => {
    try {
      const sessionId = c.req.param('id');
      
      await interactive.endDJSession(sessionId);
      
      console.log(`✅ DJ session ended: ${sessionId}`);
      return c.json({ message: 'DJ session ended', isLive: false });
    } catch (error: any) {
      console.error('End DJ session error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Get session tracks
  app.get("/make-server-06086aa3/dj-sessions/:id/tracks", async (c) => {
    try {
      const sessionId = c.req.param('id');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from('dj_session_tracks_06086aa3')
        .select('*')
        .eq('session_id', sessionId)
        .order('played_at', { ascending: false });
      
      if (error) throw error;
      
      return c.json({ tracks: data || [] });
    } catch (error: any) {
      console.error('Get session tracks error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // ==================== SONG REQUESTS ====================
  
  // Get all song requests (admin)
  app.get("/make-server-06086aa3/song-requests", async (c) => {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const status = c.req.query('status');
      
      let query = supabase
        .from('song_requests_06086aa3')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      
      return c.json({ requests: data || [] });
    } catch (error: any) {
      console.error('Get song requests error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Submit song request (PUBLIC API)
  app.post("/make-server-06086aa3/song-requests/submit", async (c) => {
    try {
      const body = await c.req.json();
      const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
      
      // Rate limiting
      const canSubmit = await interactive.canSubmitRequest(ip);
      if (!canSubmit) {
        return c.json({ 
          error: 'Rate limit exceeded. You can only submit 1 request per hour.' 
        }, 429);
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from('song_requests_06086aa3')
        .insert({
          requester_name: body.requester_name,
          requester_email: body.requester_email,
          requester_location: body.requester_location,
          track_id: body.track_id,
          custom_song_title: body.custom_song_title,
          custom_artist: body.custom_artist,
          message: body.message,
          requester_ip: ip,
          status: 'pending'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log(`🎵 New song request from ${body.requester_name}`);
      return c.json({ 
        request: data,
        message: 'Request submitted! It will be reviewed by our team.' 
      });
    } catch (error: any) {
      console.error('Submit song request error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Moderate song request (approve/reject)
  app.post("/make-server-06086aa3/song-requests/:id/moderate", async (c) => {
    try {
      const requestId = c.req.param('id');
      const body = await c.req.json();
      const userId = 'admin'; // Default admin for prototype
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from('song_requests_06086aa3')
        .update({
          status: body.status, // 'approved' or 'rejected'
          moderation_note: body.note,
          moderated_by: userId,
          moderated_at: new Date().toISOString(),
          priority: body.priority || 0
        })
        .eq('id', requestId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log(`✅ Request ${body.status}: ${requestId}`);
      return c.json({ request: data });
    } catch (error: any) {
      console.error('Moderate song request error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Vote on request (PUBLIC API)
  app.post("/make-server-06086aa3/song-requests/:id/vote", async (c) => {
    try {
      const requestId = c.req.param('id');
      const body = await c.req.json();
      const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const newVoteCount = await supabase.rpc('vote_on_request', {
        p_request_id: requestId,
        p_voter_ip: ip,
        p_user_id: body.user_id || null,
        p_vote_type: body.vote_type || 'up'
      });
      
      return c.json({ 
        votes: newVoteCount.data || 0,
        message: 'Vote recorded!' 
      });
    } catch (error: any) {
      console.error('Vote on request error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Get request stats
  app.get("/make-server-06086aa3/song-requests/stats", async (c) => {
    try {
      const activeCount = await interactive.getActiveRequestCount();
      
      return c.json({ 
        active: activeCount,
        nextCheck: interactive.getRequestCounter()
      });
    } catch (error: any) {
      console.error('Get request stats error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // ==================== SHOUTOUTS ====================
  
  // Get all shoutouts (admin)
  app.get("/make-server-06086aa3/shoutouts", async (c) => {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const status = c.req.query('status');
      
      let query = supabase
        .from('shoutouts_06086aa3')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      
      return c.json({ shoutouts: data || [] });
    } catch (error: any) {
      console.error('Get shoutouts error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Submit shoutout (PUBLIC API)
  app.post("/make-server-06086aa3/shoutouts/submit", async (c) => {
    try {
      const body = await c.req.json();
      const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
      
      // Rate limiting
      const canSubmit = await interactive.canSubmitShoutout(ip);
      if (!canSubmit) {
        return c.json({ 
          error: 'Rate limit exceeded. You can only submit 1 shoutout every 2 hours.' 
        }, 429);
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Auto-generate TTS script
      const ttsScript = generateShoutoutScript(body);
      
      const { data, error } = await supabase
        .from('shoutouts_06086aa3')
        .insert({
          sender_name: body.sender_name,
          sender_email: body.sender_email,
          sender_location: body.sender_location,
          recipient_name: body.recipient_name,
          occasion: body.occasion,
          message: body.message,
          tts_script: ttsScript,
          sender_ip: ip,
          status: 'pending'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log(`💬 New shoutout from ${body.sender_name} to ${body.recipient_name}`);
      return c.json({ 
        shoutout: data,
        message: 'Shoutout submitted! It will be reviewed and aired soon.' 
      });
    } catch (error: any) {
      console.error('Submit shoutout error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Moderate shoutout (approve/reject/schedule)
  app.post("/make-server-06086aa3/shoutouts/:id/moderate", async (c) => {
    try {
      const shoutoutId = c.req.param('id');
      const body = await c.req.json();
      const userId = 'admin'; // Default admin for prototype
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from('shoutouts_06086aa3')
        .update({
          status: body.status, // 'approved', 'rejected', or 'scheduled'
          moderation_note: body.note,
          moderated_by: userId,
          moderated_at: new Date().toISOString(),
          scheduled_date: body.scheduled_date,
          scheduled_time: body.scheduled_time,
          priority: body.priority || 0,
          tts_script: body.tts_script // Allow editing script
        })
        .eq('id', shoutoutId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log(`✅ Shoutout ${body.status}: ${shoutoutId}`);
      return c.json({ shoutout: data });
    } catch (error: any) {
      console.error('Moderate shoutout error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Get shoutout stats
  app.get("/make-server-06086aa3/shoutouts/stats", async (c) => {
    try {
      const pendingCount = await interactive.getPendingShoutoutCount();
      
      return c.json({ 
        pending: pendingCount,
        nextCheck: interactive.getShoutoutCounter()
      });
    } catch (error: any) {
      console.error('Get shoutout stats error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // ==================== CALL QUEUE ====================
  
  // Get call queue
  app.get("/make-server-06086aa3/call-queue", async (c) => {
    try {
      const queue = await interactive.getCallQueue();
      
      return c.json({ queue });
    } catch (error: any) {
      console.error('Get call queue error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Add caller to queue (simulated - in real system this would be telephony integration)
  app.post("/make-server-06086aa3/call-queue/add", async (c) => {
    try {
      const body = await c.req.json();
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Get next queue position
      const { count } = await supabase
        .from('call_queue_06086aa3')
        .select('*', { count: 'exact', head: true })
        .in('status', ['waiting', 'screened', 'approved']);
      
      const queuePosition = (count || 0) + 1;
      
      const { data, error } = await supabase
        .from('call_queue_06086aa3')
        .insert({
          caller_name: body.caller_name,
          caller_phone: body.caller_phone,
          caller_location: body.caller_location,
          call_reason: body.call_reason,
          topic: body.topic,
          status: 'waiting',
          queue_position: queuePosition
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log(`📞 New caller in queue: ${body.caller_name} (position ${queuePosition})`);
      return c.json({ call: data });
    } catch (error: any) {
      console.error('Add to call queue error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Screen call (approve/reject)
  app.post("/make-server-06086aa3/call-queue/:id/screen", async (c) => {
    try {
      const callId = c.req.param('id');
      const body = await c.req.json();
      const userId = 'admin'; // Default admin for prototype
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from('call_queue_06086aa3')
        .update({
          status: body.status, // 'screened', 'approved', or 'rejected'
          screened_by: userId,
          screened_at: new Date().toISOString(),
          screener_notes: body.notes
        })
        .eq('id', callId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log(`✅ Call ${body.status}: ${callId}`);
      return c.json({ call: data });
    } catch (error: any) {
      console.error('Screen call error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Connect call (go on air)
  app.post("/make-server-06086aa3/call-queue/:id/connect", async (c) => {
    try {
      const callId = c.req.param('id');
      const body = await c.req.json();
      
      await interactive.connectCall(callId, body.session_id);
      
      return c.json({ message: 'Call connected', status: 'on_air' });
    } catch (error: any) {
      console.error('Connect call error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Disconnect call (end)
  app.post("/make-server-06086aa3/call-queue/:id/disconnect", async (c) => {
    try {
      const callId = c.req.param('id');
      
      await interactive.disconnectCall(callId);
      
      return c.json({ message: 'Call ended', status: 'completed' });
    } catch (error: any) {
      console.error('Disconnect call error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
}

// ==================== HELPER FUNCTIONS ====================

function generateShoutoutScript(shoutout: any): string {
  const occasion = shoutout.occasion ? ` ${shoutout.occasion}` : '';
  const location = shoutout.sender_location ? ` from ${shoutout.sender_location}` : '';
  
  let script = `Soul FM has a special${occasion} shoutout! `;
  
  if (shoutout.occasion === 'birthday') {
    script += `Happy birthday to ${shoutout.recipient_name}${location}! `;
  } else if (shoutout.occasion === 'anniversary') {
    script += `Happy anniversary to ${shoutout.recipient_name}${location}! `;
  } else {
    script += `This one goes out to ${shoutout.recipient_name}${location}! `;
  }
  
  script += shoutout.message;
  script += ` We're sending you love and soul vibes from Soul FM!`;
  
  return script;
}