/**
 * Soul FM - Interactive Features Integration
 * Live DJ, Song Requests, Shoutouts, Call-Ins
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Use RPC to start session
    const { data, error } = await supabase.rpc('start_dj_session', {
      p_dj_user_id: djUserId,
      p_dj_name: djName,
      p_title: title,
      p_session_type: sessionType
    });
    
    if (error) {
      console.error('Error starting DJ session:', error);
      throw error;
    }
    
    // Get full session details
    const { data: session, error: sessionError } = await supabase
      .from('dj_sessions_06086aa3')
      .select('*')
      .eq('id', data)
      .single();
    
    if (sessionError) throw sessionError;
    
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Use RPC to end session
    const { error } = await supabase.rpc('end_dj_session', {
      p_session_id: sessionId
    });
    
    if (error) {
      console.error('Error ending DJ session:', error);
      throw error;
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Add track to session history
    const { error } = await supabase
      .from('dj_session_tracks_06086aa3')
      .insert({
        session_id: sessionId,
        track_id: trackId,
        title,
        artist,
        duration,
        was_request: wasRequest,
        requester_name: requesterName
      });
    
    if (error) {
      console.error('Error logging session track:', error);
      return;
    }
    
    // Increment session track count
    await supabase
      .from('dj_sessions_06086aa3')
      .update({ 
        tracks_played: supabase.raw('tracks_played + 1'),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
    
    console.log(`✅ Logged track in DJ session: "${title}" by ${artist}`);
  } catch (error: any) {
    console.error('Error in trackPlayedInSession:', error);
  }
}

// ==================== SONG REQUESTS ====================

export async function getNextApprovedRequest(): Promise<any | null> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Use RPC to get next request
    const { data, error } = await supabase.rpc('get_next_song_request');
    
    if (error) {
      console.error('Error getting next request:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    const request = data[0];
    
    console.log(`🎵 Found song request: "${request.title}" by ${request.artist}`);
    console.log(`   Requested by: ${request.requester_name} (${request.votes} votes)`);
    
    return {
      requestId: request.id,
      trackId: request.track_id,
      title: request.title,
      artist: request.artist,
      requesterName: request.requester_name,
      message: request.message,
      votes: request.votes
    };
  } catch (error: any) {
    console.error('Error in getNextApprovedRequest:', error);
    return null;
  }
}

export async function markRequestAsPlayed(requestId: string, sessionId?: string): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error } = await supabase
      .from('song_requests_06086aa3')
      .update({
        status: 'played',
        played_at: new Date().toISOString(),
        dj_session_id: sessionId || null
      })
      .eq('id', requestId);
    
    if (error) {
      console.error('Error marking request as played:', error);
      return;
    }
    
    // Increment session request count if in session
    if (sessionId) {
      await supabase
        .from('dj_sessions_06086aa3')
        .update({ requests_played: supabase.raw('requests_played + 1') })
        .eq('id', sessionId);
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
  // Play requests every 5-8 tracks
  return tracksSinceLastRequest >= 5;
}

// ==================== SHOUTOUTS & DEDICATIONS ====================

export async function getNextShoutout(): Promise<any | null> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const now = new Date();
    
    // Use RPC to get next shoutout
    const { data, error } = await supabase.rpc('get_next_shoutout', {
      check_time: now.toISOString()
    });
    
    if (error) {
      console.error('Error getting next shoutout:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    const shoutout = data[0];
    
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error } = await supabase
      .from('shoutouts_06086aa3')
      .update({
        status: 'played',
        played_at: new Date().toISOString(),
        dj_session_id: sessionId || null
      })
      .eq('id', shoutoutId);
    
    if (error) {
      console.error('Error marking shoutout as played:', error);
      return;
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
  // Play shoutouts every 10-15 tracks
  return tracksSinceLastShoutout >= 10;
}

// ==================== CALL-INS ====================

export async function getCallQueue(): Promise<any[]> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('call_queue_06086aa3')
      .select('*')
      .in('status', ['waiting', 'screened', 'approved'])
      .order('queue_position', { ascending: true });
    
    if (error) {
      console.error('Error getting call queue:', error);
      return [];
    }
    
    return data || [];
  } catch (error: any) {
    console.error('Error in getCallQueue:', error);
    return [];
  }
}

export async function connectCall(callId: string, sessionId: string): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error } = await supabase
      .from('call_queue_06086aa3')
      .update({
        status: 'on_air',
        connected_at: new Date().toISOString(),
        dj_session_id: sessionId
      })
      .eq('id', callId);
    
    if (error) {
      console.error('Error connecting call:', error);
      return;
    }
    
    // Increment session caller count
    await supabase
      .from('dj_sessions_06086aa3')
      .update({ callers_taken: supabase.raw('callers_taken + 1') })
      .eq('id', sessionId);
    
    console.log(`📞 Call connected: ${callId}`);
  } catch (error: any) {
    console.error('Error in connectCall:', error);
  }
}

export async function disconnectCall(callId: string): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get call start time
    const { data: call } = await supabase
      .from('call_queue_06086aa3')
      .select('connected_at')
      .eq('id', callId)
      .single();
    
    if (!call || !call.connected_at) return;
    
    const duration = Math.floor(
      (new Date().getTime() - new Date(call.connected_at).getTime()) / 1000
    );
    
    const { error } = await supabase
      .from('call_queue_06086aa3')
      .update({
        status: 'completed',
        disconnected_at: new Date().toISOString(),
        call_duration: duration
      })
      .eq('id', callId);
    
    if (error) {
      console.error('Error disconnecting call:', error);
      return;
    }
    
    console.log(`✅ Call ended: ${callId} (${duration}s)`);
  } catch (error: any) {
    console.error('Error in disconnectCall:', error);
  }
}

// ==================== RATE LIMITING ====================

export async function canSubmitRequest(ip: string): Promise<boolean> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check last request from this IP
    const { data, error } = await supabase
      .from('song_requests_06086aa3')
      .select('created_at')
      .eq('requester_ip', ip)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error || !data || data.length === 0) {
      return true;
    }
    
    const lastRequest = new Date(data[0].created_at);
    const now = new Date();
    const minutesSinceLastRequest = (now.getTime() - lastRequest.getTime()) / 1000 / 60;
    
    // Allow 1 request per hour
    return minutesSinceLastRequest >= 60;
  } catch (error: any) {
    console.error('Error checking request rate limit:', error);
    return true; // Allow on error
  }
}

export async function canSubmitShoutout(ip: string): Promise<boolean> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check last shoutout from this IP
    const { data, error } = await supabase
      .from('shoutouts_06086aa3')
      .select('created_at')
      .eq('sender_ip', ip)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error || !data || data.length === 0) {
      return true;
    }
    
    const lastShoutout = new Date(data[0].created_at);
    const now = new Date();
    const minutesSinceLastShoutout = (now.getTime() - lastShoutout.getTime()) / 1000 / 60;
    
    // Allow 1 shoutout per 2 hours
    return minutesSinceLastShoutout >= 120;
  } catch (error: any) {
    console.error('Error checking shoutout rate limit:', error);
    return true; // Allow on error
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { count, error } = await supabase
      .from('song_requests_06086aa3')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'approved']);
    
    return count || 0;
  } catch (error: any) {
    console.error('Error getting active request count:', error);
    return 0;
  }
}

export async function getPendingShoutoutCount(): Promise<number> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { count, error } = await supabase
      .from('shoutouts_06086aa3')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'approved', 'scheduled']);
    
    return count || 0;
  } catch (error: any) {
    console.error('Error getting pending shoutout count:', error);
    return 0;
  }
}
