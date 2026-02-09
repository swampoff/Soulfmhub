/**
 * Soul FM - Interactive Features Integration
 * Live DJ, Song Requests, Shoutouts, Call-Ins
 * Uses KV store instead of direct table queries.
 */

import * as kv from './kv_store.tsx';

// ==================== GLOBAL STATE ====================

let currentDJSession: any = null;
let isLiveDJActive = false;

// ==================== LIVE DJ SESSION ====================

export async function startDJSession(
  djUserId: string,
  djName: string,
  title: string,
  sessionType: string = 'live_show'
): Promise<any> {
  try {
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      dj_user_id: djUserId,
      dj_name: djName,
      title,
      session_type: sessionType,
      started_at: new Date().toISOString(),
      ended_at: null,
      status: 'active',
      tracks_played: 0,
      requests_played: 0,
      callers_taken: 0,
      updated_at: new Date().toISOString()
    };

    await kv.set(`dj_session:${sessionId}`, session);

    currentDJSession = session;
    isLiveDJActive = true;

    console.log(`🎧 DJ Session started: "${title}" by ${djName}`);
    console.log(`🔴 LIVE DJ MODE ACTIVE - Auto-DJ paused`);

    return session;
  } catch (error: any) {
    console.error('Error in startDJSession:', error);
    throw error;
  }
}

export async function endDJSession(sessionId: string): Promise<void> {
  try {
    const session = await kv.get(`dj_session:${sessionId}`);
    if (session) {
      session.ended_at = new Date().toISOString();
      session.status = 'ended';
      session.updated_at = new Date().toISOString();
      await kv.set(`dj_session:${sessionId}`, session);
    }

    currentDJSession = null;
    isLiveDJActive = false;

    console.log(`✅ DJ Session ended: ${sessionId}`);
    console.log(`▶️  Auto-DJ resuming...`);
  } catch (error: any) {
    console.error('Error in endDJSession:', error);
    throw error;
  }
}

export function isLiveDJ(): boolean {
  return isLiveDJActive;
}

export function getCurrentDJSession(): any {
  return currentDJSession;
}

export async function trackPlayedInSession(
  sessionId: string,
  trackId: string,
  title: string,
  artist: string,
  duration: number,
  wasRequest: boolean = false,
  requesterName?: string
): Promise<void> {
  try {
    const trackRecordId = crypto.randomUUID();
    await kv.set(`dj_session_track:${trackRecordId}`, {
      id: trackRecordId,
      session_id: sessionId,
      track_id: trackId,
      title,
      artist,
      duration,
      was_request: wasRequest,
      requester_name: requesterName,
      played_at: new Date().toISOString()
    });

    // Increment session track count
    const session = await kv.get(`dj_session:${sessionId}`);
    if (session) {
      session.tracks_played = (session.tracks_played || 0) + 1;
      session.updated_at = new Date().toISOString();
      await kv.set(`dj_session:${sessionId}`, session);
    }

    console.log(`✅ Logged track in DJ session: "${title}" by ${artist}`);
  } catch (error: any) {
    console.error('Error in trackPlayedInSession:', error);
  }
}

// ==================== SONG REQUESTS ====================

export async function getNextApprovedRequest(): Promise<any | null> {
  try {
    const allRequests = await kv.getByPrefix('song_request:');
    const approved = allRequests
      .filter((r: any) => r.status === 'approved')
      .sort((a: any, b: any) => (b.votes || 0) - (a.votes || 0));

    if (approved.length === 0) return null;

    const request = approved[0];

    console.log(`🎵 Found song request: "${request.custom_song_title || request.title}" by ${request.custom_artist || request.artist}`);
    console.log(`   Requested by: ${request.requester_name} (${request.votes || 0} votes)`);

    return {
      requestId: request.id,
      trackId: request.track_id,
      title: request.custom_song_title || request.title,
      artist: request.custom_artist || request.artist,
      requesterName: request.requester_name,
      message: request.message,
      votes: request.votes || 0
    };
  } catch (error: any) {
    console.error('Error in getNextApprovedRequest:', error);
    return null;
  }
}

export async function markRequestAsPlayed(requestId: string, sessionId?: string): Promise<void> {
  try {
    const request = await kv.get(`song_request:${requestId}`);
    if (request) {
      request.status = 'played';
      request.played_at = new Date().toISOString();
      request.dj_session_id = sessionId || null;
      await kv.set(`song_request:${requestId}`, request);
    }

    // Increment session request count if in session
    if (sessionId) {
      const session = await kv.get(`dj_session:${sessionId}`);
      if (session) {
        session.requests_played = (session.requests_played || 0) + 1;
        await kv.set(`dj_session:${sessionId}`, session);
      }
    }

    console.log(`✅ Marked request ${requestId} as played`);
  } catch (error: any) {
    console.error('Error in markRequestAsPlayed:', error);
  }
}

// Counter for request frequency
let tracksSinceLastRequest = 0;

export function incrementRequestCounter(): void {
  tracksSinceLastRequest++;
}

export function resetRequestCounter(): void {
  tracksSinceLastRequest = 0;
}

export function shouldPlayRequest(): boolean {
  return tracksSinceLastRequest >= 5;
}

// ==================== SHOUTOUTS & DEDICATIONS ====================

export async function getNextShoutout(): Promise<any | null> {
  try {
    const allShoutouts = await kv.getByPrefix('shoutout:');
    const approved = allShoutouts
      .filter((s: any) => s.status === 'approved' || s.status === 'scheduled')
      .sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));

    if (approved.length === 0) return null;

    const shoutout = approved[0];

    console.log(`💬 Found shoutout for ${shoutout.recipient_name}`);
    if (shoutout.occasion) {
      console.log(`   Occasion: ${shoutout.occasion}`);
    }

    return {
      shoutoutId: shoutout.id,
      recipientName: shoutout.recipient_name,
      message: shoutout.message,
      audioUrl: shoutout.tts_audio_url,
      duration: shoutout.tts_duration || 30,
      occasion: shoutout.occasion
    };
  } catch (error: any) {
    console.error('Error in getNextShoutout:', error);
    return null;
  }
}

export async function markShoutoutAsPlayed(shoutoutId: string, sessionId?: string): Promise<void> {
  try {
    const shoutout = await kv.get(`shoutout:${shoutoutId}`);
    if (shoutout) {
      shoutout.status = 'played';
      shoutout.played_at = new Date().toISOString();
      shoutout.dj_session_id = sessionId || null;
      await kv.set(`shoutout:${shoutoutId}`, shoutout);
    }

    console.log(`✅ Marked shoutout ${shoutoutId} as played`);
  } catch (error: any) {
    console.error('Error in markShoutoutAsPlayed:', error);
  }
}

// Counter for shoutout frequency
let tracksSinceLastShoutout = 0;

export function incrementShoutoutCounter(): void {
  tracksSinceLastShoutout++;
}

export function resetShoutoutCounter(): void {
  tracksSinceLastShoutout = 0;
}

export function shouldPlayShoutout(): boolean {
  return tracksSinceLastShoutout >= 10;
}

// ==================== CALL-INS ====================

export async function getCallQueue(): Promise<any[]> {
  try {
    const allCalls = await kv.getByPrefix('call_queue:');
    return allCalls
      .filter((c: any) => ['waiting', 'screened', 'approved'].includes(c.status))
      .sort((a: any, b: any) => (a.queue_position || 0) - (b.queue_position || 0));
  } catch (error: any) {
    console.error('Error in getCallQueue:', error);
    return [];
  }
}

export async function connectCall(callId: string, sessionId: string): Promise<void> {
  try {
    const call = await kv.get(`call_queue:${callId}`);
    if (call) {
      call.status = 'on_air';
      call.connected_at = new Date().toISOString();
      call.dj_session_id = sessionId;
      await kv.set(`call_queue:${callId}`, call);
    }

    // Increment session caller count
    const session = await kv.get(`dj_session:${sessionId}`);
    if (session) {
      session.callers_taken = (session.callers_taken || 0) + 1;
      await kv.set(`dj_session:${sessionId}`, session);
    }

    console.log(`📞 Call connected: ${callId}`);
  } catch (error: any) {
    console.error('Error in connectCall:', error);
  }
}

export async function disconnectCall(callId: string): Promise<void> {
  try {
    const call = await kv.get(`call_queue:${callId}`);
    if (!call || !call.connected_at) return;

    const duration = Math.floor(
      (new Date().getTime() - new Date(call.connected_at).getTime()) / 1000
    );

    call.status = 'completed';
    call.disconnected_at = new Date().toISOString();
    call.call_duration = duration;
    await kv.set(`call_queue:${callId}`, call);

    console.log(`✅ Call ended: ${callId} (${duration}s)`);
  } catch (error: any) {
    console.error('Error in disconnectCall:', error);
  }
}

// ==================== RATE LIMITING ====================

export async function canSubmitRequest(ip: string): Promise<boolean> {
  try {
    const allRequests = await kv.getByPrefix('song_request:');
    const fromIp = allRequests
      .filter((r: any) => r.requester_ip === ip)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (fromIp.length === 0) return true;

    const lastRequest = new Date(fromIp[0].created_at);
    const now = new Date();
    const minutesSinceLastRequest = (now.getTime() - lastRequest.getTime()) / 1000 / 60;

    return minutesSinceLastRequest >= 60;
  } catch (error: any) {
    console.error('Error checking request rate limit:', error);
    return true;
  }
}

export async function canSubmitShoutout(ip: string): Promise<boolean> {
  try {
    const allShoutouts = await kv.getByPrefix('shoutout:');
    const fromIp = allShoutouts
      .filter((s: any) => s.sender_ip === ip)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (fromIp.length === 0) return true;

    const lastShoutout = new Date(fromIp[0].created_at);
    const now = new Date();
    const minutesSinceLastShoutout = (now.getTime() - lastShoutout.getTime()) / 1000 / 60;

    return minutesSinceLastShoutout >= 120;
  } catch (error: any) {
    console.error('Error checking shoutout rate limit:', error);
    return true;
  }
}

// ==================== HELPER FUNCTIONS ====================

export function getRequestCounter(): number {
  return tracksSinceLastRequest;
}

export function getShoutoutCounter(): number {
  return tracksSinceLastShoutout;
}

export async function getActiveRequestCount(): Promise<number> {
  try {
    const allRequests = await kv.getByPrefix('song_request:');
    return allRequests.filter((r: any) => ['pending', 'approved'].includes(r.status)).length;
  } catch (error: any) {
    console.error('Error getting active request count:', error);
    return 0;
  }
}

export async function getPendingShoutoutCount(): Promise<number> {
  try {
    const allShoutouts = await kv.getByPrefix('shoutout:');
    return allShoutouts.filter((s: any) => ['pending', 'approved', 'scheduled'].includes(s.status)).length;
  } catch (error: any) {
    console.error('Error getting pending shoutout count:', error);
    return 0;
  }
}
