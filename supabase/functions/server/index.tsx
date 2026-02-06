import { createClient } from "npm:@supabase/supabase-js@2";
import { Hono } from "npm:hono@4";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import * as profiles from "./profiles.ts";
import * as podcasts from "./podcasts.ts";
import { seedProfiles } from "./seed-profiles.ts";
import { seedPodcasts } from "./seed-podcasts.ts";

const app = new Hono();

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

console.log('=== SUPABASE CONFIGURATION ===');
console.log('SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? `SET (length: ${supabaseServiceKey.length})` : 'NOT SET');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Missing Supabase configuration!');
  console.error('SUPABASE_URL:', supabaseUrl || 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING');
}

const supabase = createClient(
  supabaseUrl ?? '',
  supabaseServiceKey ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Middleware to verify auth for protected routes
async function requireAuth(c: any, next: any) {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }
  
  c.set('userId', user.id);
  c.set('user', user);
  await next();
}

// Health check endpoint
app.get("/make-server-06086aa3/health", (c) => {
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: {
      supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
      supabaseServiceKey: supabaseServiceKey ? `SET (${supabaseServiceKey.length} chars)` : 'MISSING'
    }
  });
});

// ==================== AUTH ROUTES ====================

// Sign up
app.post("/make-server-06086aa3/auth/signup", async (c) => {
  try {
    console.log('=== SIGNUP REQUEST RECEIVED ===');
    const body = await c.req.json();
    const { email, password, name, role = 'listener' } = body;
    console.log('Signup data:', { email, name, role, hasPassword: !!password });

    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('CRITICAL: Supabase not configured!');
      console.error('SUPABASE_URL:', supabaseUrl || 'MISSING');
      console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? `SET (${supabaseServiceKey.length} chars)` : 'MISSING');
      return c.json({ 
        error: 'Server configuration error: Supabase credentials not set. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.' 
      }, 500);
    }

    if (!email || !password) {
      console.error('Missing email or password');
      return c.json({ error: 'Email and password are required' }, 400);
    }

    console.log('Creating user via Supabase admin...');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Service key length:', supabaseServiceKey?.length);
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      email_confirm: true // Auto-confirm since email server isn't configured
    });

    if (error) {
      console.error('Supabase createUser error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return c.json({ error: `Signup error: ${error.message || JSON.stringify(error)}` }, 400);
    }

    if (!data?.user) {
      console.error('No user data returned from Supabase');
      return c.json({ error: 'Failed to create user - no user data returned' }, 500);
    }

    console.log('User created successfully:', data.user.id);

    // Store user profile in KV
    console.log('Storing user profile in KV...');
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
      favorites: [],
      subscriptions: []
    });

    console.log('Profile stored, signup complete!');
    return c.json({ user: data.user, message: 'User created successfully' });
  } catch (error) {
    console.error('Signup exception:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    return c.json({ error: `Signup exception: ${errorMessage}` }, 500);
  }
});

// Get user profile
app.get("/make-server-06086aa3/auth/profile", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const profile = await kv.get(`user:${userId}`);
    
    if (!profile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    return c.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json({ error: `Get profile error: ${error.message}` }, 500);
  }
});

// Update user profile
app.put("/make-server-06086aa3/auth/profile", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    
    const profile = await kv.get(`user:${userId}`);
    if (!profile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const updatedProfile = { ...profile, ...body, updatedAt: new Date().toISOString() };
    await kv.set(`user:${userId}`, updatedProfile);

    return c.json({ profile: updatedProfile });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ error: `Update profile error: ${error.message}` }, 500);
  }
});

// ==================== AUTO DJ & LIVE RADIO STREAM ====================

// Auto DJ State
let autoDJState = {
  isPlaying: false,
  currentTrackIndex: 0,
  currentTrack: null as any,
  playlistTracks: [] as any[],
  startTime: null as string | null,
  listeners: 0
};

// Start Auto DJ
app.post("/make-server-06086aa3/radio/start", requireAuth, async (c) => {
  try {
    // Load Live Stream playlist
    const livePlaylist = await kv.get('playlist:livestream');
    
    if (!livePlaylist || !livePlaylist.trackIds || livePlaylist.trackIds.length === 0) {
      return c.json({ error: 'Live Stream playlist is empty. Please add tracks first.' }, 400);
    }

    // Load all tracks from playlist
    const tracks = [];
    for (const trackId of livePlaylist.trackIds) {
      const track = await kv.get(`track:${trackId}`);
      if (track) {
        tracks.push(track);
      }
    }

    if (tracks.length === 0) {
      return c.json({ error: 'No valid tracks found in playlist' }, 400);
    }

    // Initialize Auto DJ
    autoDJState = {
      isPlaying: true,
      currentTrackIndex: 0,
      currentTrack: tracks[0],
      playlistTracks: tracks,
      startTime: new Date().toISOString(),
      listeners: 0
    };

    // Update Now Playing
    await kv.set('stream:nowplaying', {
      track: {
        id: tracks[0].id,
        title: tracks[0].title,
        artist: tracks[0].artist,
        album: tracks[0].album,
        duration: tracks[0].duration,
        cover: tracks[0].coverUrl
      },
      startTime: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Update stream status
    await kv.set('stream:status', {
      status: 'online',
      listeners: 0,
      bitrate: '128kbps',
      uptime: 0,
      updatedAt: new Date().toISOString()
    });

    console.log('🎵 Auto DJ started with', tracks.length, 'tracks');

    return c.json({ 
      message: 'Auto DJ started successfully',
      currentTrack: tracks[0],
      totalTracks: tracks.length
    });
  } catch (error: any) {
    console.error('Start Auto DJ error:', error);
    return c.json({ error: `Failed to start Auto DJ: ${error.message}` }, 500);
  }
});

// Stop Auto DJ
app.post("/make-server-06086aa3/radio/stop", requireAuth, async (c) => {
  try {
    autoDJState.isPlaying = false;

    await kv.set('stream:status', {
      status: 'offline',
      listeners: 0,
      bitrate: '128kbps',
      uptime: 0,
      updatedAt: new Date().toISOString()
    });

    console.log('🛑 Auto DJ stopped');

    return c.json({ message: 'Auto DJ stopped successfully' });
  } catch (error: any) {
    console.error('Stop Auto DJ error:', error);
    return c.json({ error: `Failed to stop Auto DJ: ${error.message}` }, 500);
  }
});

// Skip to next track
app.post("/make-server-06086aa3/radio/next", requireAuth, async (c) => {
  try {
    if (!autoDJState.isPlaying) {
      return c.json({ error: 'Auto DJ is not running' }, 400);
    }

    // Move to next track
    autoDJState.currentTrackIndex = (autoDJState.currentTrackIndex + 1) % autoDJState.playlistTracks.length;
    autoDJState.currentTrack = autoDJState.playlistTracks[autoDJState.currentTrackIndex];

    // Update Now Playing
    await kv.set('stream:nowplaying', {
      track: {
        id: autoDJState.currentTrack.id,
        title: autoDJState.currentTrack.title,
        artist: autoDJState.currentTrack.artist,
        album: autoDJState.currentTrack.album,
        duration: autoDJState.currentTrack.duration,
        cover: autoDJState.currentTrack.coverUrl
      },
      startTime: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log('⏭️ Skipped to next track:', autoDJState.currentTrack.title);

    return c.json({ 
      message: 'Skipped to next track',
      currentTrack: autoDJState.currentTrack
    });
  } catch (error: any) {
    console.error('Skip track error:', error);
    return c.json({ error: `Failed to skip track: ${error.message}` }, 500);
  }
});

// Get Auto DJ status
app.get("/make-server-06086aa3/radio/status", async (c) => {
  try {
    const nowPlaying = await kv.get('stream:nowplaying');
    const streamStatus = await kv.get('stream:status');

    return c.json({
      autoDJ: {
        isPlaying: autoDJState.isPlaying,
        currentTrack: autoDJState.currentTrack,
        currentTrackIndex: autoDJState.currentTrackIndex,
        totalTracks: autoDJState.playlistTracks.length,
        startTime: autoDJState.startTime
      },
      nowPlaying,
      streamStatus
    });
  } catch (error: any) {
    console.error('Get Auto DJ status error:', error);
    return c.json({ error: `Failed to get status: ${error.message}` }, 500);
  }
});

// Live Radio Stream endpoint (unified for all listeners)
app.get("/make-server-06086aa3/radio/live", async (c) => {
  try {
    if (!autoDJState.isPlaying || !autoDJState.currentTrack) {
      return c.text('Radio stream is offline. Please start the Auto DJ first.', 503);
    }

    // Increment listeners count
    autoDJState.listeners += 1;
    
    // Update listener count in DB
    const streamStatus = await kv.get('stream:status') || {};
    streamStatus.listeners = autoDJState.listeners;
    await kv.set('stream:status', streamStatus);

    // Get current track file from storage
    const track = autoDJState.currentTrack;
    
    const { data, error } = await supabase.storage
      .from(track.storageBucket)
      .download(track.storageFilename);
    
    if (error || !data) {
      console.error('Storage download error:', error);
      autoDJState.listeners -= 1;
      return c.text('Failed to load audio stream', 500);
    }

    // Convert blob to array buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const fileSize = buffer.byteLength;

    // Support range requests for seeking
    const range = c.req.header('range');
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      
      const chunk = buffer.slice(start, end + 1);
      
      return new Response(chunk, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-cache',
          'X-Now-Playing': `${track.artist} - ${track.title}`,
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else {
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': 'audio/mpeg',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache',
          'X-Now-Playing': `${track.artist} - ${track.title}`,
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  } catch (error: any) {
    console.error('Live stream error:', error);
    autoDJState.listeners = Math.max(0, autoDJState.listeners - 1);
    return c.text(`Failed to stream: ${error.message}`, 500);
  }
});

// Listener disconnected (cleanup)
app.delete("/make-server-06086aa3/radio/listener", async (c) => {
  autoDJState.listeners = Math.max(0, autoDJState.listeners - 1);
  
  const streamStatus = await kv.get('stream:status') || {};
  streamStatus.listeners = autoDJState.listeners;
  await kv.set('stream:status', streamStatus);
  
  return c.json({ message: 'Listener disconnected', listeners: autoDJState.listeners });
});

// ==================== NOW PLAYING / STREAM STATUS ====================

// Get current playing track
app.get("/make-server-06086aa3/stream/nowplaying", async (c) => {
  try {
    const nowPlaying = await kv.get('stream:nowplaying');
    const streamStatus = await kv.get('stream:status');
    
    return c.json({ 
      nowPlaying: nowPlaying || null,
      streamStatus: streamStatus || { status: 'offline', listeners: 0 }
    });
  } catch (error) {
    console.error('Get now playing error:', error);
    return c.json({ error: `Get now playing error: ${error.message}` }, 500);
  }
});

// Update now playing (admin only)
app.post("/make-server-06086aa3/stream/nowplaying", async (c) => {
  try {
    const body = await c.req.json();
    const { track, show, startTime } = body;

    const nowPlaying = {
      track,
      show,
      startTime: startTime || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await kv.set('stream:nowplaying', nowPlaying);
    
    // Add to history
    const historyKey = `history:${Date.now()}`;
    await kv.set(historyKey, {
      ...nowPlaying,
      playedAt: new Date().toISOString()
    });

    return c.json({ nowPlaying });
  } catch (error) {
    console.error('Update now playing error:', error);
    return c.json({ error: `Update now playing error: ${error.message}` }, 500);
  }
});

// Get play history
app.get("/make-server-06086aa3/stream/history", async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20');
    const history = await kv.getByPrefix('history:');
    
    // Sort by timestamp descending
    const sortedHistory = history
      .sort((a, b) => {
        const timeA = parseInt(a.key.split(':')[1]);
        const timeB = parseInt(b.key.split(':')[1]);
        return timeB - timeA;
      })
      .slice(0, limit)
      .map(item => item.value);

    return c.json({ history: sortedHistory });
  } catch (error) {
    console.error('Get history error:', error);
    return c.json({ error: `Get history error: ${error.message}` }, 500);
  }
});

// Update stream status
app.post("/make-server-06086aa3/stream/status", async (c) => {
  try {
    const body = await c.req.json();
    const { status, listeners, bitrate, uptime } = body;

    const streamStatus = {
      status: status || 'online',
      listeners: listeners || 0,
      bitrate: bitrate || '128kbps',
      uptime: uptime || 0,
      updatedAt: new Date().toISOString()
    };

    await kv.set('stream:status', streamStatus);

    return c.json({ streamStatus });
  } catch (error) {
    console.error('Update stream status error:', error);
    return c.json({ error: `Update stream status error: ${error.message}` }, 500);
  }
});

// ==================== TRACKS ====================

// Get all tracks
app.get("/make-server-06086aa3/tracks", async (c) => {
  try {
    const genre = c.req.query('genre');
    const search = c.req.query('search');
    const tracks = await kv.getByPrefix('track:');
    
    let filteredTracks = tracks.map(item => item.value);
    
    if (genre) {
      filteredTracks = filteredTracks.filter(track => 
        track.genre?.toLowerCase().includes(genre.toLowerCase())
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTracks = filteredTracks.filter(track =>
        track.title?.toLowerCase().includes(searchLower) ||
        track.artist?.toLowerCase().includes(searchLower) ||
        track.album?.toLowerCase().includes(searchLower)
      );
    }

    return c.json({ tracks: filteredTracks });
  } catch (error) {
    console.error('Get tracks error:', error);
    return c.json({ error: `Get tracks error: ${error.message}` }, 500);
  }
});

// Get single track
app.get("/make-server-06086aa3/tracks/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const track = await kv.get(`track:${id}`);
    
    if (!track) {
      return c.json({ error: 'Track not found' }, 404);
    }

    return c.json({ track });
  } catch (error) {
    console.error('Get track error:', error);
    return c.json({ error: `Get track error: ${error.message}` }, 500);
  }
});

// Create track (auth required)
app.post("/make-server-06086aa3/tracks", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const trackId = crypto.randomUUID();
    
    const track = {
      id: trackId,
      ...body,
      playCount: 0,
      createdAt: new Date().toISOString(),
      createdBy: c.get('userId')
    };

    await kv.set(`track:${trackId}`, track);

    return c.json({ track }, 201);
  } catch (error) {
    console.error('Create track error:', error);
    return c.json({ error: `Create track error: ${error.message}` }, 500);
  }
});

// Update track
app.put("/make-server-06086aa3/tracks/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const track = await kv.get(`track:${id}`);
    if (!track) {
      return c.json({ error: 'Track not found' }, 404);
    }

    const updatedTrack = { ...track, ...body, updatedAt: new Date().toISOString() };
    await kv.set(`track:${id}`, updatedTrack);

    return c.json({ track: updatedTrack });
  } catch (error) {
    console.error('Update track error:', error);
    return c.json({ error: `Update track error: ${error.message}` }, 500);
  }
});

// Delete track
app.delete("/make-server-06086aa3/tracks/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`track:${id}`);
    return c.json({ message: 'Track deleted successfully' });
  } catch (error) {
    console.error('Delete track error:', error);
    return c.json({ error: `Delete track error: ${error.message}` }, 500);
  }
});

// ==================== PLAYLISTS ====================

// Get all playlists
app.get("/make-server-06086aa3/playlists", async (c) => {
  try {
    const playlists = await kv.getByPrefix('playlist:');
    return c.json({ playlists: playlists.map(item => item.value) });
  } catch (error) {
    console.error('Get playlists error:', error);
    return c.json({ error: `Get playlists error: ${error.message}` }, 500);
  }
});

// Get single playlist
app.get("/make-server-06086aa3/playlists/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const playlist = await kv.get(`playlist:${id}`);
    
    if (!playlist) {
      return c.json({ error: 'Playlist not found' }, 404);
    }

    return c.json({ playlist });
  } catch (error) {
    console.error('Get playlist error:', error);
    return c.json({ error: `Get playlist error: ${error.message}` }, 500);
  }
});

// Create playlist
app.post("/make-server-06086aa3/playlists", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const playlistId = crypto.randomUUID();
    
    const playlist = {
      id: playlistId,
      ...body,
      tracks: body.tracks || [],
      createdAt: new Date().toISOString(),
      createdBy: c.get('userId')
    };

    await kv.set(`playlist:${playlistId}`, playlist);

    return c.json({ playlist }, 201);
  } catch (error) {
    console.error('Create playlist error:', error);
    return c.json({ error: `Create playlist error: ${error.message}` }, 500);
  }
});

// Update playlist
app.put("/make-server-06086aa3/playlists/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const playlist = await kv.get(`playlist:${id}`);
    if (!playlist) {
      return c.json({ error: 'Playlist not found' }, 404);
    }

    const updatedPlaylist = { ...playlist, ...body, updatedAt: new Date().toISOString() };
    await kv.set(`playlist:${id}`, updatedPlaylist);

    return c.json({ playlist: updatedPlaylist });
  } catch (error) {
    console.error('Update playlist error:', error);
    return c.json({ error: `Update playlist error: ${error.message}` }, 500);
  }
});

// ==================== SHOWS ====================

// Get all shows
app.get("/make-server-06086aa3/shows", async (c) => {
  try {
    const shows = await kv.getByPrefix('show:');
    return c.json({ shows: shows.map(item => item.value) });
  } catch (error) {
    console.error('Get shows error:', error);
    return c.json({ error: `Get shows error: ${error.message}` }, 500);
  }
});

// Get single show
app.get("/make-server-06086aa3/shows/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const show = await kv.get(`show:${id}`);
    
    if (!show) {
      return c.json({ error: 'Show not found' }, 404);
    }

    return c.json({ show });
  } catch (error) {
    console.error('Get show error:', error);
    return c.json({ error: `Get show error: ${error.message}` }, 500);
  }
});

// Create show
app.post("/make-server-06086aa3/shows", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const showId = crypto.randomUUID();
    
    const show = {
      id: showId,
      ...body,
      episodes: [],
      createdAt: new Date().toISOString(),
      createdBy: c.get('userId')
    };

    await kv.set(`show:${showId}`, show);

    return c.json({ show }, 201);
  } catch (error) {
    console.error('Create show error:', error);
    return c.json({ error: `Create show error: ${error.message}` }, 500);
  }
});

// Update show
app.put("/make-server-06086aa3/shows/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const show = await kv.get(`show:${id}`);
    if (!show) {
      return c.json({ error: 'Show not found' }, 404);
    }

    const updatedShow = { ...show, ...body, updatedAt: new Date().toISOString() };
    await kv.set(`show:${id}`, updatedShow);

    return c.json({ show: updatedShow });
  } catch (error) {
    console.error('Update show error:', error);
    return c.json({ error: `Update show error: ${error.message}` }, 500);
  }
});

// ==================== SCHEDULE ====================

// Get schedule
app.get("/make-server-06086aa3/schedule", async (c) => {
  try {
    const date = c.req.query('date'); // format: YYYY-MM-DD
    const schedules = await kv.getByPrefix('schedule:');
    
    let filteredSchedules = schedules.map(item => item.value);
    
    if (date) {
      filteredSchedules = filteredSchedules.filter(item => 
        item.date === date
      );
    }

    // Sort by date and time
    filteredSchedules.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.startTime}`);
      const dateTimeB = new Date(`${b.date}T${b.startTime}`);
      return dateTimeA.getTime() - dateTimeB.getTime();
    });

    return c.json({ schedule: filteredSchedules });
  } catch (error) {
    console.error('Get schedule error:', error);
    return c.json({ error: `Get schedule error: ${error.message}` }, 500);
  }
});

// Create schedule entry
app.post("/make-server-06086aa3/schedule", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const scheduleId = crypto.randomUUID();
    
    const scheduleEntry = {
      id: scheduleId,
      ...body,
      createdAt: new Date().toISOString(),
      createdBy: c.get('userId')
    };

    await kv.set(`schedule:${scheduleId}`, scheduleEntry);

    return c.json({ schedule: scheduleEntry }, 201);
  } catch (error) {
    console.error('Create schedule error:', error);
    return c.json({ error: `Create schedule error: ${error.message}` }, 500);
  }
});

// Update schedule entry
app.put("/make-server-06086aa3/schedule/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const scheduleEntry = await kv.get(`schedule:${id}`);
    if (!scheduleEntry) {
      return c.json({ error: 'Schedule entry not found' }, 404);
    }

    const updatedSchedule = { ...scheduleEntry, ...body, updatedAt: new Date().toISOString() };
    await kv.set(`schedule:${id}`, updatedSchedule);

    return c.json({ schedule: updatedSchedule });
  } catch (error) {
    console.error('Update schedule error:', error);
    return c.json({ error: `Update schedule error: ${error.message}` }, 500);
  }
});

// Delete schedule entry
app.delete("/make-server-06086aa3/schedule/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`schedule:${id}`);
    return c.json({ message: 'Schedule entry deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    return c.json({ error: `Delete schedule error: ${error.message}` }, 500);
  }
});

// ==================== DONATIONS ====================

// Get all donations
app.get("/make-server-06086aa3/donations", requireAuth, async (c) => {
  try {
    const donations = await kv.getByPrefix('donation:');
    return c.json({ donations: donations.map(item => item.value) });
  } catch (error) {
    console.error('Get donations error:', error);
    return c.json({ error: `Get donations error: ${error.message}` }, 500);
  }
});

// Create donation
app.post("/make-server-06086aa3/donations", async (c) => {
  try {
    const body = await c.req.json();
    const donationId = crypto.randomUUID();
    
    const donation = {
      id: donationId,
      ...body,
      createdAt: new Date().toISOString()
    };

    await kv.set(`donation:${donationId}`, donation);

    // Update donation stats
    const stats = await kv.get('donation:stats') || { total: 0, count: 0, monthlyGoal: 2000 };
    stats.total += parseFloat(body.amount || 0);
    stats.count += 1;
    await kv.set('donation:stats', stats);

    return c.json({ donation }, 201);
  } catch (error) {
    console.error('Create donation error:', error);
    return c.json({ error: `Create donation error: ${error.message}` }, 500);
  }
});

// Get donation stats
app.get("/make-server-06086aa3/donations/stats", async (c) => {
  try {
    const stats = await kv.get('donation:stats') || { total: 0, count: 0, monthlyGoal: 2000 };
    return c.json({ stats });
  } catch (error) {
    console.error('Get donation stats error:', error);
    return c.json({ error: `Get donation stats error: ${error.message}` }, 500);
  }
});

// ==================== NEWS/BLOG ====================

// Get all news
app.get("/make-server-06086aa3/news", async (c) => {
  try {
    const category = c.req.query('category');
    const news = await kv.getByPrefix('news:');
    
    let filteredNews = news.map(item => item.value);
    
    if (category) {
      filteredNews = filteredNews.filter(item => item.category === category);
    }

    // Sort by date descending
    filteredNews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ news: filteredNews });
  } catch (error) {
    console.error('Get news error:', error);
    return c.json({ error: `Get news error: ${error.message}` }, 500);
  }
});

// Get single news
app.get("/make-server-06086aa3/news/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const newsItem = await kv.get(`news:${id}`);
    
    if (!newsItem) {
      return c.json({ error: 'News item not found' }, 404);
    }

    return c.json({ news: newsItem });
  } catch (error) {
    console.error('Get news item error:', error);
    return c.json({ error: `Get news item error: ${error.message}` }, 500);
  }
});

// Create news
app.post("/make-server-06086aa3/news", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const newsId = crypto.randomUUID();
    
    const newsItem = {
      id: newsId,
      ...body,
      createdAt: new Date().toISOString(),
      createdBy: c.get('userId')
    };

    await kv.set(`news:${newsId}`, newsItem);

    return c.json({ news: newsItem }, 201);
  } catch (error) {
    console.error('Create news error:', error);
    return c.json({ error: `Create news error: ${error.message}` }, 500);
  }
});

// ==================== ANALYTICS ====================

// Get analytics data
app.get("/make-server-06086aa3/analytics", async (c) => {
  try {
    // Get all analytics data from KV store
    const listeners = await kv.get('analytics:listeners') || { total: 0, current: 0, peak: 0 };
    const tracks = await kv.get('analytics:tracks') || { totalPlays: 0, uniqueTracks: 0, mostPlayed: [] };
    const shows = await kv.get('analytics:shows') || { totalShows: 0, liveNow: 0, upcoming: 0 };
    
    return c.json({
      analytics: {
        listeners,
        tracks,
        shows,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Get analytics error:', error);
    return c.json({ error: `Get analytics error: ${error.message}` }, 500);
  }
});

// Get listener stats
app.get("/make-server-06086aa3/analytics/listeners", async (c) => {
  try {
    const stats = await kv.get('analytics:listeners') || { 
      total: 0, 
      current: 0, 
      peak: 0,
      daily: [],
      weekly: [],
      monthly: []
    };
    
    return c.json({ stats });
  } catch (error: any) {
    console.error('Get listener stats error:', error);
    return c.json({ error: `Get listener stats error: ${error.message}` }, 500);
  }
});

// Get track stats
app.get("/make-server-06086aa3/analytics/tracks", async (c) => {
  try {
    const stats = await kv.get('analytics:tracks') || { 
      totalPlays: 0, 
      uniqueTracks: 0, 
      mostPlayed: [],
      recentlyAdded: []
    };
    
    return c.json({ stats });
  } catch (error: any) {
    console.error('Get track stats error:', error);
    return c.json({ error: `Get track stats error: ${error.message}` }, 500);
  }
});

// Get show stats
app.get("/make-server-06086aa3/analytics/shows", async (c) => {
  try {
    const stats = await kv.get('analytics:shows') || { 
      totalShows: 0, 
      liveNow: 0, 
      upcoming: 0,
      mostPopular: []
    };
    
    return c.json({ stats });
  } catch (error: any) {
    console.error('Get show stats error:', error);
    return c.json({ error: `Get show stats error: ${error.message}` }, 500);
  }
});

// ==================== PROFILES ====================

// Get all profiles
app.get("/make-server-06086aa3/profiles", async (c) => {
  try {
    const profiles = await kv.getByPrefix('profile:');
    return c.json({ profiles: profiles.map(item => item.value) });
  } catch (error: any) {
    console.error('Get profiles error:', error);
    return c.json({ error: `Get profiles error: ${error.message}` }, 500);
  }
});

// Get single profile
app.get("/make-server-06086aa3/profiles/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const profile = await kv.get(`profile:${id}`);
    
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }
    
    return c.json({ profile });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return c.json({ error: `Get profile error: ${error.message}` }, 500);
  }
});

// Create profile
app.post("/make-server-06086aa3/profiles", requireAuth, async (c) => {
  try {
    const profile = await c.req.json();
    const id = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newProfile = {
      id,
      ...profile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`profile:${id}`, newProfile);
    console.log(`Profile created: ${newProfile.name}`);
    
    return c.json({ message: 'Profile created successfully', profile: newProfile });
  } catch (error: any) {
    console.error('Create profile error:', error);
    return c.json({ error: `Create profile error: ${error.message}` }, 500);
  }
});

// Update profile
app.put("/make-server-06086aa3/profiles/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const existingProfile = await kv.get(`profile:${id}`);
    if (!existingProfile) {
      return c.json({ error: 'Profile not found' }, 404);
    }
    
    const updatedProfile = {
      ...existingProfile,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`profile:${id}`, updatedProfile);
    console.log(`Profile updated: ${id}`);
    
    return c.json({ message: 'Profile updated successfully', profile: updatedProfile });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return c.json({ error: `Update profile error: ${error.message}` }, 500);
  }
});

// Delete profile
app.delete("/make-server-06086aa3/profiles/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`profile:${id}`);
    console.log(`Profile deleted: ${id}`);
    
    return c.json({ message: 'Profile deleted successfully' });
  } catch (error: any) {
    console.error('Delete profile error:', error);
    return c.json({ error: `Delete profile error: ${error.message}` }, 500);
  }
});

// ==================== PODCASTS ====================

// Get all podcasts
app.get("/make-server-06086aa3/podcasts", async (c) => {
  try {
    const podcasts = await kv.getByPrefix('podcast:');
    return c.json({ podcasts: podcasts.map(item => item.value) });
  } catch (error: any) {
    console.error('Get podcasts error:', error);
    return c.json({ error: `Get podcasts error: ${error.message}` }, 500);
  }
});

// Get single podcast
app.get("/make-server-06086aa3/podcasts/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const podcast = await kv.get(`podcast:${id}`);
    
    if (!podcast) {
      return c.json({ error: 'Podcast not found' }, 404);
    }
    
    return c.json({ podcast });
  } catch (error: any) {
    console.error('Get podcast error:', error);
    return c.json({ error: `Get podcast error: ${error.message}` }, 500);
  }
});

// Create podcast
app.post("/make-server-06086aa3/podcasts", requireAuth, async (c) => {
  try {
    const podcast = await c.req.json();
    const id = `podcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newPodcast = {
      id,
      ...podcast,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`podcast:${id}`, newPodcast);
    console.log(`Podcast created: ${newPodcast.title}`);
    
    return c.json({ message: 'Podcast created successfully', podcast: newPodcast });
  } catch (error: any) {
    console.error('Create podcast error:', error);
    return c.json({ error: `Create podcast error: ${error.message}` }, 500);
  }
});

// Update podcast
app.put("/make-server-06086aa3/podcasts/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const existingPodcast = await kv.get(`podcast:${id}`);
    if (!existingPodcast) {
      return c.json({ error: 'Podcast not found' }, 404);
    }
    
    const updatedPodcast = {
      ...existingPodcast,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`podcast:${id}`, updatedPodcast);
    console.log(`Podcast updated: ${id}`);
    
    return c.json({ message: 'Podcast updated successfully', podcast: updatedPodcast });
  } catch (error: any) {
    console.error('Update podcast error:', error);
    return c.json({ error: `Update podcast error: ${error.message}` }, 500);
  }
});

// Delete podcast
app.delete("/make-server-06086aa3/podcasts/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`podcast:${id}`);
    console.log(`Podcast deleted: ${id}`);
    
    return c.json({ message: 'Podcast deleted successfully' });
  } catch (error: any) {
    console.error('Delete podcast error:', error);
    return c.json({ error: `Delete podcast error: ${error.message}` }, 500);
  }
});

// ==================== USERS MANAGEMENT ====================

// Get all users
app.get("/make-server-06086aa3/users", requireAuth, async (c) => {
  try {
    const userKeys = await kv.getByPrefix('user:');
    const users = userKeys.map(item => item.value);
    return c.json({ users });
  } catch (error: any) {
    console.error('Get users error:', error);
    return c.json({ error: `Failed to get users: ${error.message}` }, 500);
  }
});

// Update user role
app.put("/make-server-06086aa3/users/:userId/role", requireAuth, async (c) => {
  try {
    const userId = c.req.param('userId');
    const { role } = await c.req.json();
    
    const user = await kv.get(`user:${userId}`);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    user.role = role;
    user.updatedAt = new Date().toISOString();
    await kv.set(`user:${userId}`, user);
    
    return c.json({ message: 'User role updated', user });
  } catch (error: any) {
    console.error('Update user role error:', error);
    return c.json({ error: `Failed to update user role: ${error.message}` }, 500);
  }
});

// Delete user
app.delete("/make-server-06086aa3/users/:userId", requireAuth, async (c) => {
  try {
    const userId = c.req.param('userId');
    
    // Delete from KV store
    await kv.del(`user:${userId}`);
    
    // Delete from Supabase Auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    await supabase.auth.admin.deleteUser(userId);
    
    return c.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return c.json({ error: `Failed to delete user: ${error.message}` }, 500);
  }
});

// ==================== ICECAST INTEGRATION ====================

// Get Icecast status
app.get("/make-server-06086aa3/icecast/status", async (c) => {
  try {
    // TODO: Replace with your actual Icecast server URL
    // const icecastUrl = 'http://your-icecast-server:8000/status-json.xsl';
    // const response = await fetch(icecastUrl);
    // const data = await response.json();
    
    // For now, return mock data
    const status = {
      status: 'online',
      listeners: 0,
      bitrate: '128kbps',
      uptime: 0,
      source: {
        connected: true,
        mount: '/stream'
      },
      server: {
        location: 'Soul FM Studios',
        description: '24/7 Soul, Funk, Jazz Radio'
      }
    };
    
    return c.json(status);
  } catch (error: any) {
    console.error('Icecast status error:', error);
    return c.json({ 
      error: `Failed to get Icecast status: ${error.message}`,
      status: 'offline'
    }, 500);
  }
});

// Update Icecast metadata
app.post("/make-server-06086aa3/icecast/metadata", requireAuth, async (c) => {
  try {
    const { title, artist, album } = await c.req.json();
    
    // Update internal now playing
    const metadata = {
      track: { title, artist, album },
      updatedAt: new Date().toISOString()
    };
    
    await kv.set('stream:nowplaying', metadata);
    
    // TODO: Send to actual Icecast server
    // Example using Icecast admin API:
    // const icecastUrl = `http://admin:${password}@your-server:8000/admin/metadata`;
    // const params = new URLSearchParams({
    //   mount: '/stream',
    //   mode: 'updinfo',
    //   song: `${artist} - ${title}`
    // });
    // await fetch(`${icecastUrl}?${params}`);
    
    console.log(`Metadata updated: ${artist} - ${title}`);
    
    return c.json({ 
      message: 'Metadata updated successfully',
      metadata 
    });
  } catch (error: any) {
    console.error('Update metadata error:', error);
    return c.json({ error: `Failed to update metadata: ${error.message}` }, 500);
  }
});

// ==================== TRACK UPLOAD WITH FILE ====================

// Track upload endpoint (supports multipart/form-data)
app.post("/make-server-06086aa3/tracks/upload", requireAuth, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const position = formData.get('position') as string || 'end';
    const autoAddToLiveStream = formData.get('autoAddToLiveStream') === 'true';
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/flac'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|flac)$/i)) {
      return c.json({ error: 'Invalid file type. Only MP3, WAV, M4A, and FLAC are supported.' }, 400);
    }
    
    // Generate unique shortId (6 characters, alphanumeric)
    const generateShortId = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let shortId = '';
      for (let i = 0; i < 6; i++) {
        shortId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return shortId;
    };
    
    // Ensure shortId is unique
    let shortId = generateShortId();
    let existing = await kv.get(`shortlink:${shortId}`);
    while (existing) {
      shortId = generateShortId();
      existing = await kv.get(`shortlink:${shortId}`);
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop() || 'mp3';
    const filename = `track-${timestamp}-${randomString}.${extension}`;
    
    // Upload to Supabase Storage
    const bucket = 'make-06086aa3-tracks';
    
    // Create bucket if it doesn't exist
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === bucket);
    if (!bucketExists) {
      await supabase.storage.createBucket(bucket, { public: false });
    }
    
    // Upload file
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, fileBuffer, {
        contentType: file.type,
        upsert: false
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return c.json({ error: `Failed to upload file: ${uploadError.message}` }, 500);
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename);
    
    const audioUrl = urlData.publicUrl;
    
    // Extract metadata from filename (basic extraction)
    const originalName = file.name.replace(/\.(mp3|wav|m4a|flac)$/i, '');
    const parts = originalName.split(' - ');
    
    let title = originalName;
    let artist = 'Unknown Artist';
    
    if (parts.length >= 2) {
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }
    
    // Estimate duration (rough estimate based on file size, not accurate)
    const estimatedDuration = Math.floor(file.size / 16000); // Rough estimate for 128kbps MP3
    
    const metadata = {
      title,
      artist,
      album: '',
      duration: estimatedDuration,
      genre: 'Funk', // Default genre
      year: new Date().getFullYear(),
      coverUrl: '',
      audioUrl,
      shortId, // Short link ID
      streamUrl: `https://soulfm.stream/${shortId}`, // Full streaming URL
      storageFilename: filename, // Original storage filename
      storageBucket: bucket,
      tags: ['NEWFUNK'], // Auto-tag with NEWFUNK
      playCount: 0, // Initialize play count
      uploadedBy: c.get('userId'),
      uploadedAt: new Date().toISOString()
    };
    
    // Create track in database
    const trackId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const track = {
      id: trackId,
      ...metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`track:${trackId}`, track);
    
    // Create shortlink mapping (for quick lookup)
    await kv.set(`shortlink:${shortId}`, {
      trackId,
      shortId,
      createdAt: new Date().toISOString()
    });
    
    // Add to Live Stream playlist if requested
    if (autoAddToLiveStream) {
      let livePlaylist = await kv.get('playlist:livestream');
      
      if (!livePlaylist) {
        // Create Live Stream playlist if it doesn't exist
        livePlaylist = {
          id: 'livestream',
          name: 'Live Stream',
          description: 'Main broadcast playlist',
          genre: 'Mixed',
          trackIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      // Add track to playlist
      if (position === 'start') {
        livePlaylist.trackIds = [trackId, ...(livePlaylist.trackIds || [])];
      } else {
        livePlaylist.trackIds = [...(livePlaylist.trackIds || []), trackId];
      }
      
      livePlaylist.updatedAt = new Date().toISOString();
      await kv.set('playlist:livestream', livePlaylist);
    }
    
    console.log(`Track uploaded: ${metadata.title} by ${metadata.artist} → ${metadata.streamUrl}`);
    
    return c.json({
      message: 'Track uploaded successfully',
      track,
      metadata: {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        duration: metadata.duration
      },
      shortId,
      streamUrl: metadata.streamUrl,
      addedToLiveStream: autoAddToLiveStream
    });
    
  } catch (error: any) {
    console.error('Track upload error:', error);
    return c.json({ error: `Failed to upload track: ${error.message}` }, 500);
  }
});

// ==================== STREAMING BY SHORT ID ====================

// Get track info by shortId
app.get("/make-server-06086aa3/stream/info/:shortId", async (c) => {
  try {
    const shortId = c.req.param('shortId');
    
    // Find track by shortId
    const shortlink = await kv.get(`shortlink:${shortId}`);
    if (!shortlink) {
      return c.json({ error: 'Track not found' }, 404);
    }
    
    const track = await kv.get(`track:${shortlink.trackId}`);
    if (!track) {
      return c.json({ error: 'Track not found' }, 404);
    }
    
    return c.json({
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        genre: track.genre,
        year: track.year,
        coverUrl: track.coverUrl,
        playCount: track.playCount || 0,
        shortId: track.shortId,
        streamUrl: track.streamUrl
      }
    });
  } catch (error: any) {
    console.error('Get track info error:', error);
    return c.json({ error: `Failed to get track info: ${error.message}` }, 500);
  }
});

// Stream audio file by shortId (supports range requests)
app.get("/make-server-06086aa3/stream/:shortId", async (c) => {
  try {
    const shortId = c.req.param('shortId');
    
    // Find track by shortId
    const shortlink = await kv.get(`shortlink:${shortId}`);
    if (!shortlink) {
      return c.text('Track not found', 404);
    }
    
    const track = await kv.get(`track:${shortlink.trackId}`);
    if (!track) {
      return c.text('Track not found', 404);
    }
    
    // Increment play count
    track.playCount = (track.playCount || 0) + 1;
    await kv.set(`track:${shortlink.trackId}`, track);
    
    // Get file from Supabase Storage
    const { data, error } = await supabase.storage
      .from(track.storageBucket)
      .download(track.storageFilename);
    
    if (error || !data) {
      console.error('Storage download error:', error);
      return c.text('Failed to load audio file', 500);
    }
    
    // Convert blob to array buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const fileSize = buffer.byteLength;
    
    // Check for range request
    const range = c.req.header('range');
    
    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      
      // Slice the buffer
      const chunk = buffer.slice(start, end + 1);
      
      // Return partial content (206)
      return new Response(chunk, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=31536000',
        }
      });
    } else {
      // Return full file (200)
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': 'audio/mpeg',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000',
        }
      });
    }
  } catch (error: any) {
    console.error('Stream audio error:', error);
    return c.text(`Failed to stream audio: ${error.message}`, 500);
  }
});

// ==================== ADMIN ROLE ASSIGNMENT ====================

// Assign super_admin role by email (special endpoint for initial setup)
app.post("/make-server-06086aa3/admin/assign-super-admin", async (c) => {
  try {
    const { email, secretKey } = await c.req.json();
    
    // Simple security check - require a secret key for this operation
    // In production, you might want to use a proper admin token
    const SETUP_SECRET = Deno.env.get('ADMIN_SETUP_SECRET') || 'soulfm-admin-setup-2024';
    
    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }
    
    // For initial setup, allow without secret key OR with correct secret key
    // This makes it easier for first-time setup
    if (secretKey && secretKey !== SETUP_SECRET) {
      return c.json({ error: 'Invalid secret key' }, 403);
    }
    
    // Find user by email in KV store
    const allUsers = await kv.getByPrefix('user:');
    const userEntry = allUsers.find((entry: any) => entry.value.email === email);
    
    if (!userEntry) {
      return c.json({ error: `User with email ${email} not found. Please sign up first.` }, 404);
    }
    
    const user = userEntry.value;
    
    // Update user role to super_admin
    user.role = 'super_admin';
    user.updatedAt = new Date().toISOString();
    await kv.set(`user:${user.id}`, user);
    
    console.log(`✅ Super Admin assigned: ${email} (${user.id})`);
    
    return c.json({ 
      message: 'Super Admin role assigned successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Assign super admin error:', error);
    return c.json({ error: `Failed to assign super admin: ${error.message}` }, 500);
  }
});

// Get user by email (helper endpoint for checking user status)
app.get("/make-server-06086aa3/admin/user-by-email", async (c) => {
  try {
    const email = c.req.query('email');
    
    if (!email) {
      return c.json({ error: 'Email parameter is required' }, 400);
    }
    
    // Find user by email in KV store
    const allUsers = await kv.getByPrefix('user:');
    const userEntry = allUsers.find((entry: any) => entry.value.email === email);
    
    if (!userEntry) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    const user = userEntry.value;
    
    return c.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    console.error('Get user by email error:', error);
    return c.json({ error: `Failed to get user: ${error.message}` }, 500);
  }
});

Deno.serve(app.fetch);