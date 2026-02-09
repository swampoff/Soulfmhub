/**
 * Soul FM - Interactive Features Routes
 * Live DJ, Song Requests, Shoutouts, Call-Ins
 * Uses KV store instead of direct table queries.
 */

import { Hono } from "npm:hono@4";
import * as kv from './kv_store.tsx';
import * as interactive from "./interactive-features.ts";

export function setupInteractiveRoutes(app: Hono, requireAuth: any) {

  // ==================== LIVE DJ SESSIONS ====================

  // Get all DJ sessions
  app.get("/make-server-06086aa3/dj-sessions", async (c) => {
    try {
      const allSessions = await kv.getByPrefix('dj_session:');
      const sessions = allSessions
        .sort((a: any, b: any) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
        .slice(0, 50);

      return c.json({ sessions });
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
      const userId = 'admin';

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
      const allTracks = await kv.getByPrefix('dj_session_track:');
      const tracks = allTracks
        .filter((t: any) => t.session_id === sessionId)
        .sort((a: any, b: any) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());

      return c.json({ tracks });
    } catch (error: any) {
      console.error('Get session tracks error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // ==================== SONG REQUESTS ====================

  // Get all song requests (admin)
  app.get("/make-server-06086aa3/song-requests", async (c) => {
    try {
      const status = c.req.query('status');
      let allRequests = await kv.getByPrefix('song_request:');

      if (status) {
        allRequests = allRequests.filter((r: any) => r.status === status);
      }

      const requests = allRequests
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 100);

      return c.json({ requests });
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

      const requestId = crypto.randomUUID();
      const request = {
        id: requestId,
        requester_name: body.requester_name,
        requester_email: body.requester_email,
        requester_location: body.requester_location,
        track_id: body.track_id,
        custom_song_title: body.custom_song_title,
        custom_artist: body.custom_artist,
        message: body.message,
        requester_ip: ip,
        status: 'pending',
        votes: 0,
        created_at: new Date().toISOString()
      };

      await kv.set(`song_request:${requestId}`, request);

      console.log(`🎵 New song request from ${body.requester_name}`);
      return c.json({
        request,
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
      const userId = 'admin';

      const request = await kv.get(`song_request:${requestId}`);
      if (!request) {
        return c.json({ error: 'Request not found' }, 404);
      }

      request.status = body.status;
      request.moderation_note = body.note;
      request.moderated_by = userId;
      request.moderated_at = new Date().toISOString();
      request.priority = body.priority || 0;

      await kv.set(`song_request:${requestId}`, request);

      console.log(`✅ Request ${body.status}: ${requestId}`);
      return c.json({ request });
    } catch (error: any) {
      console.error('Moderate song request error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Vote on request (PUBLIC API)
  app.post("/make-server-06086aa3/song-requests/:id/vote", async (c) => {
    try {
      const requestId = c.req.param('id');

      const request = await kv.get(`song_request:${requestId}`);
      if (!request) {
        return c.json({ error: 'Request not found' }, 404);
      }

      request.votes = (request.votes || 0) + 1;
      await kv.set(`song_request:${requestId}`, request);

      return c.json({
        votes: request.votes,
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
      const status = c.req.query('status');
      let allShoutouts = await kv.getByPrefix('shoutout:');

      if (status) {
        allShoutouts = allShoutouts.filter((s: any) => s.status === status);
      }

      const shoutouts = allShoutouts
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 100);

      return c.json({ shoutouts });
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

      const shoutoutId = crypto.randomUUID();
      const ttsScript = generateShoutoutScript(body);

      const shoutout = {
        id: shoutoutId,
        sender_name: body.sender_name,
        sender_email: body.sender_email,
        sender_location: body.sender_location,
        recipient_name: body.recipient_name,
        occasion: body.occasion,
        message: body.message,
        tts_script: ttsScript,
        sender_ip: ip,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      await kv.set(`shoutout:${shoutoutId}`, shoutout);

      console.log(`💬 New shoutout from ${body.sender_name} to ${body.recipient_name}`);
      return c.json({
        shoutout,
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
      const userId = 'admin';

      const shoutout = await kv.get(`shoutout:${shoutoutId}`);
      if (!shoutout) {
        return c.json({ error: 'Shoutout not found' }, 404);
      }

      shoutout.status = body.status;
      shoutout.moderation_note = body.note;
      shoutout.moderated_by = userId;
      shoutout.moderated_at = new Date().toISOString();
      shoutout.scheduled_date = body.scheduled_date;
      shoutout.scheduled_time = body.scheduled_time;
      shoutout.priority = body.priority || 0;
      if (body.tts_script) shoutout.tts_script = body.tts_script;

      await kv.set(`shoutout:${shoutoutId}`, shoutout);

      console.log(`✅ Shoutout ${body.status}: ${shoutoutId}`);
      return c.json({ shoutout });
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

  // Add caller to queue
  app.post("/make-server-06086aa3/call-queue/add", async (c) => {
    try {
      const body = await c.req.json();

      // Get next queue position
      const allCalls = await kv.getByPrefix('call_queue:');
      const activeCalls = allCalls.filter((c: any) => ['waiting', 'screened', 'approved'].includes(c.status));
      const queuePosition = activeCalls.length + 1;

      const callId = crypto.randomUUID();
      const call = {
        id: callId,
        caller_name: body.caller_name,
        caller_phone: body.caller_phone,
        caller_location: body.caller_location,
        call_reason: body.call_reason,
        topic: body.topic,
        status: 'waiting',
        queue_position: queuePosition,
        created_at: new Date().toISOString()
      };

      await kv.set(`call_queue:${callId}`, call);

      console.log(`📞 New caller in queue: ${body.caller_name} (position ${queuePosition})`);
      return c.json({ call });
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
      const userId = 'admin';

      const call = await kv.get(`call_queue:${callId}`);
      if (!call) {
        return c.json({ error: 'Call not found' }, 404);
      }

      call.status = body.status;
      call.screened_by = userId;
      call.screened_at = new Date().toISOString();
      call.screener_notes = body.notes;

      await kv.set(`call_queue:${callId}`, call);

      console.log(`✅ Call ${body.status}: ${callId}`);
      return c.json({ call });
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
