// Soul FM Hub – Edge Function (Lean version)
// Focuses on AutoDJ + AzuraCast + Core CRUD only
import { createClient } from "npm:@supabase/supabase-js@2";
import { Hono } from "npm:hono@4";
import { cors } from "npm:hono/cors";
import * as kv from "./kv_store.tsx";
import { setupAzuraCastRoutes, getAzuraCastConfig } from "./azuracast-routes.ts";

const app = new Hono();

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowHeaders: ['*'] }));

// ── AzuraCast constants ──
const AZURA_URL = 'https://stream.soul-fm.com';
const AZURA_STATION = '1';
const AZURA_STREAM_URL = 'https://stream.soul-fm.com/listen/soul_fm_/radio.mp3';
const AZURA_KEY = (Deno.env.get('AZURACAST_API_KEY') || '129fb7c30b2b9314:2169c875e9c0f0abc7e170697960fa0e').replace(/[^\x20-\x7E]/g, '').trim();
const azuraHeaders = () => ({ 'X-API-Key': AZURA_KEY, 'Accept': 'application/json' });
const azuraPostHeaders = () => ({ 'X-API-Key': AZURA_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' });
const _sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── SQL helpers ──
async function setStreamState(key: string, value: any) {
  try {
    await supabase.from('stream_state').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  } catch (e: any) { console.error('[stream_state] error:', e?.message); }
}

async function getStreamState(key: string): Promise<any> {
  try {
    const { data } = await supabase.from('stream_state').select('value').eq('key', key).single();
    return data?.value ?? null;
  } catch (_) { return null; }
}

// ── In-memory AutoDJ state ──
let autoDJState: any = { isPlaying: false, currentTrack: null, startTime: null };

// ── Auth middleware ──
const requireAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.substring(7);
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return c.json({ error: 'Invalid token' }, 401);
    c.set('userId', user.id);
    c.set('user', user);
    await next();
  } catch (e: any) {
    return c.json({ error: `Auth error: ${e.message}` }, 401);
  }
};

// ── Admin PIN auth ──
const ADMIN_PIN = Deno.env.get('ADMIN_PIN') || '1234';
const requireAdminPin = async (c: any, next: any) => {
  const pin = c.req.header('X-Admin-Pin') || c.req.query('pin');
  if (pin === ADMIN_PIN) { await next(); return; }
  return requireAuth(c, next);
};

// ── Schedule helper ──
async function getCurrentScheduledPlaylist() {
  try {
    const { data: allSchedules, error } = await supabase
      .from('schedules')
      .select('*, playlists(id, name, azuracast_playlist_id, track_ids)')
      .eq('is_active', true);
    if (error || !allSchedules?.length) return null;

    const now = new Date();
    const currentDay = now.getUTCDay();
    const currentTime = `${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}`;

    for (const schedule of allSchedules) {
      const start = schedule.start_time?.slice(0, 5) || '00:00';
      const end = schedule.end_time?.slice(0, 5) || '23:59';
      const dayOk = schedule.day_of_week === null || schedule.day_of_week === currentDay;
      const inRange = start <= end ? currentTime >= start && currentTime < end : currentTime >= start || currentTime < end;
      if (!dayOk || !inRange) continue;
      return {
        id: schedule.id, title: schedule.title, playlistId: schedule.playlist_id,
        playlistName: schedule.playlists?.name || 'Unknown',
        azuracastPlaylistId: schedule.playlists?.azuracast_playlist_id || null,
        startTime: schedule.start_time, endTime: schedule.end_time, dayOfWeek: schedule.day_of_week,
      };
    }
    return null;
  } catch (e: any) { console.error('[schedule]', e?.message); return null; }
}

// ==================== AUTH ROUTES ====================

app.post('/make-server-06086aa3/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return c.json({ error: error.message }, 401);
    return c.json({ user: data.user, session: data.session });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post('/make-server-06086aa3/auth/logout', requireAuth, async (c) => {
  try {
    const token = c.req.header('Authorization')?.substring(7) || '';
    await supabase.auth.admin.signOut(token);
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get('/make-server-06086aa3/auth/me', requireAuth, async (c) => {
  return c.json({ user: c.get('user'), userId: c.get('userId') });
});

// ==================== RADIO / AUTO DJ ====================

app.post("/make-server-06086aa3/radio/start", requireAdminPin, async (c) => {
  try {
    const scheduled = await getCurrentScheduledPlaylist();
    const sourceLabel = scheduled ? `Schedule: ${scheduled.title}` : 'AzuraCast default';

    const azNP = await fetch(`${AZURA_URL}/api/nowplaying/${AZURA_STATION}`, { headers: azuraHeaders() })
      .then(r => r.json()).catch(() => null);
    const nowPlaying = azNP?.now_playing;
    const song = nowPlaying?.song;

    const currentTrack = {
      id: `az-${song?.id || 'live'}`, title: song?.title || 'Soul FM Live',
      artist: song?.artist || 'Soul FM', album: song?.album || '',
      duration: nowPlaying?.duration || 180, coverUrl: song?.art || null,
      storageFilename: 'azuracast',
    };

    autoDJState = { isPlaying: true, currentTrack, startTime: new Date().toISOString() };
    await setStreamState('status', { status: 'online', updatedAt: new Date().toISOString() });
    await setStreamState('nowplaying', {
      track: { id: currentTrack.id, title: currentTrack.title, artist: currentTrack.artist, album: currentTrack.album, duration: currentTrack.duration, cover: currentTrack.coverUrl },
      startTime: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    const seekPosition = nowPlaying?.elapsed || 0;
    return c.json({
      message: `Auto DJ started (${sourceLabel})`, currentTrack, totalTracks: 61,
      source: sourceLabel, hasAudioFile: true,
      activeSchedule: scheduled ? { id: scheduled.id, title: scheduled.title, playlistName: scheduled.playlistName } : null,
      stream: {
        playing: true, audioUrl: AZURA_STREAM_URL, seekPosition,
        remainingSeconds: Math.max(0, (nowPlaying?.duration || 180) - seekPosition),
        track: { id: currentTrack.id, title: currentTrack.title, artist: currentTrack.artist, album: currentTrack.album, duration: currentTrack.duration || 180, coverUrl: currentTrack.coverUrl },
      },
    });
  } catch (e: any) { return c.json({ error: `Failed to start: ${e.message}` }, 500); }
});

app.post("/make-server-06086aa3/radio/stop", requireAdminPin, async (c) => {
  try {
    autoDJState = { isPlaying: false, currentTrack: null, startTime: null };
    await setStreamState('status', { status: 'offline', updatedAt: new Date().toISOString() });
    return c.json({ message: 'Auto DJ stopped successfully' });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post("/make-server-06086aa3/radio/next", requireAdminPin, async (c) => {
  try {
    const skipResp = await fetch(`${AZURA_URL}/api/station/${AZURA_STATION}/backend/skip`, { method: 'POST', headers: azuraPostHeaders() });
    if (!skipResp.ok) console.warn('[next] skip failed:', skipResp.status);
    await _sleep(1500);

    const azNP = await fetch(`${AZURA_URL}/api/nowplaying/${AZURA_STATION}`, { headers: azuraHeaders() }).then(r => r.json()).catch(() => null);
    const nowPlaying = azNP?.now_playing;
    const song = nowPlaying?.song;
    const seekPosition = nowPlaying?.elapsed || 0;
    const currentTrack = {
      id: `az-${song?.id || 'live'}`, title: song?.title || 'Soul FM Live',
      artist: song?.artist || 'Soul FM', album: song?.album || '',
      duration: nowPlaying?.duration || 180, coverUrl: song?.art || null,
    };
    autoDJState.currentTrack = currentTrack;
    await setStreamState('nowplaying', {
      track: { id: currentTrack.id, title: currentTrack.title, artist: currentTrack.artist, duration: currentTrack.duration, cover: currentTrack.coverUrl },
      startTime: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    return c.json({
      message: 'Skipped to next track', currentTrack,
      stream: { playing: true, audioUrl: AZURA_STREAM_URL, seekPosition, remainingSeconds: Math.max(0, (nowPlaying?.duration || 180) - seekPosition), track: currentTrack },
    });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get("/make-server-06086aa3/radio/status", async (c) => {
  try {
    const [azNP, sqlStatus, currentSchedule] = await Promise.all([
      fetch(`${AZURA_URL}/api/nowplaying/${AZURA_STATION}`, { headers: azuraHeaders() }).then(r => r.json()).catch(() => null),
      getStreamState('status'),
      getCurrentScheduledPlaylist().catch(() => null),
    ]);
    const nowPlaying = azNP?.now_playing;
    const song = nowPlaying?.song;
    const isPlaying = azNP?.is_online || sqlStatus?.status === 'online' || sqlStatus?.status === 'live' || autoDJState.isPlaying;
    const currentTrack = song ? { id: `az-${song.id || 'live'}`, title: song.title, artist: song.artist, album: song.album || '', duration: nowPlaying?.duration || 180, coverUrl: song.art || null } : autoDJState.currentTrack;
    const elapsed = nowPlaying?.elapsed || 0;
    return c.json({
      autoDJ: { isPlaying, currentTrack, totalTracks: 61, trackProgress: Math.min((elapsed / (nowPlaying?.duration || 180)) * 100, 100), elapsedSeconds: elapsed, autoAdvance: true, currentSchedule },
      nowPlaying: isPlaying ? { track: currentTrack, startTime: new Date(Date.now() - elapsed * 1000).toISOString(), updatedAt: new Date().toISOString() } : null,
      streamStatus: sqlStatus || { status: isPlaying ? 'online' : 'offline' },
      streamUrl: AZURA_STREAM_URL, listeners: azNP?.listeners?.current || 0,
    });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get("/make-server-06086aa3/radio/current-stream", async (c) => {
  try {
    const [azNP, sqlStatus] = await Promise.all([
      fetch(`${AZURA_URL}/api/nowplaying/${AZURA_STATION}`, { headers: azuraHeaders() }).then(r => r.json()).catch(() => null),
      getStreamState('status'),
    ]);
    const isOnline = azNP?.is_online || sqlStatus?.status === 'online' || sqlStatus?.status === 'live' || autoDJState.isPlaying;
    if (!isOnline) return c.json({ playing: false, message: 'Auto DJ is not running' }, 200);
    const nowPlaying = azNP?.now_playing;
    const song = nowPlaying?.song;
    const seekPosition = nowPlaying?.elapsed || 0;
    const duration = nowPlaying?.duration || 180;
    const track = { id: `az-${song?.id || 'live'}`, title: song?.title || 'Soul FM Live', artist: song?.artist || 'Soul FM', album: song?.album || '', duration, coverUrl: song?.art || null, isJingle: false };
    return c.json({ playing: true, track, audioUrl: AZURA_STREAM_URL, seekPosition, remainingSeconds: Math.max(0, duration - seekPosition), startedAt: new Date(Date.now() - seekPosition * 1000).toISOString(), crossfadeDuration: 5, listeners: azNP?.listeners?.current || 0, icecastUrl: AZURA_STREAM_URL, azuracastNowPlaying: song ? { title: song.title, artist: song.artist, art: song.art, duration, elapsed: seekPosition, remaining: Math.max(0, duration - seekPosition) } : null });
  } catch (e: any) { return c.json({ playing: false, error: e.message }, 500); }
});

app.get("/make-server-06086aa3/radio/queue", async (c) => {
  try {
    const [sqlStatus, scheduled] = await Promise.all([getStreamState('status'), getCurrentScheduledPlaylist().catch(() => null)]);
    const isOnline = true; // AzuraCast always streams - queue always available
    if (!isOnline) return c.json({ queue: [], currentIndex: 0, totalTracks: 0 });
    const playlistId = scheduled?.playlistId || 'pl-az-6';
    const { data: playlist } = await supabase.from('playlists').select('track_ids').eq('id', playlistId).single();
    const trackIds: string[] = playlist?.track_ids || [];
    let queue: any[] = [];
    if (trackIds.length > 0) {
      const { data: tracks } = await supabase.from('tracks').select('id, title, artist, album, duration, cover_url').in('id', trackIds);
      queue = (tracks || []).map((t: any) => ({ id: t.id, title: t.title || 'Untitled', artist: t.artist || 'Unknown', album: t.album || '', duration: t.duration || 0, coverUrl: t.cover_url || null, isCurrentTrack: false }));
    }
    return c.json({ queue, currentIndex: 0, totalTracks: queue.length, activeSchedule: scheduled ? { id: scheduled.id, title: scheduled.title } : null });
  } catch (e: any) { return c.json({ error: e.message, queue: [] }, 500); }
});

// ==================== TRACKS (/tracks) ====================

// Upload track file → AzuraCast + SQL
app.post("/make-server-06086aa3/tracks/upload", requireAuth, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    if (!file) return c.json({ error: 'No file provided' }, 400);

    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/flac', 'audio/ogg'];
    const isAllowed = allowedTypes.includes(file.type) || /\.(mp3|wav|m4a|flac|ogg)$/i.test(file.name);
    if (!isAllowed) return c.json({ error: 'Invalid file type' }, 400);

    // Upload to AzuraCast
    const azForm = new FormData();
    const arrayBuffer = await file.arrayBuffer();
    azForm.append('file', new Blob([arrayBuffer], { type: file.type || 'audio/mpeg' }), file.name);

    const azResp = await fetch(`${AZURA_URL}/api/station/${AZURA_STATION}/files`, {
      method: 'POST',
      headers: { 'X-API-Key': AZURA_KEY },
      body: azForm,
    });

    if (!azResp.ok) {
      const errText = await azResp.text();
      return c.json({ error: `AzuraCast upload failed: ${azResp.status} - ${errText}` }, 500);
    }

    const azData = await azResp.json();
    // AzuraCast returns: { id, song_id, text, artist, title, album, genre, length, ... }
    const azId = azData.id; // numeric media ID
    const title = azData.title || file.name.replace(/\.(mp3|wav|m4a|flac|ogg)$/i, '');
    const artist = azData.artist || 'Unknown Artist';
    const album = azData.album || '';
    const genre = azData.genre || '';
    const duration = Math.round(azData.length || 0);
    const coverUrl = azData.art || null;

    // Save to SQL tracks table
    const trackId = `az-${azId}`;
    const { data: track, error: dbErr } = await supabase.from('tracks').upsert({
      id: trackId,
      azuracast_id: azId,
      title,
      artist,
      album,
      genre,
      duration,
      cover_url: coverUrl,
      audio_url: `${AZURA_STREAM_URL}`,
      storage_filename: azData.path || file.name,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' }).select().single();

    if (dbErr) console.error('[upload] DB error:', dbErr.message);

    return c.json({
      success: true,
      track: track || { id: trackId, title, artist, album, duration, coverUrl },
      metadata: { title, artist, album, genre, duration, coverUrl },
      shortId: trackId,
      streamUrl: AZURA_STREAM_URL,
      azuracastId: azId,
    });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Step 1 of new upload flow: get signed upload URL for Supabase Storage
app.post("/make-server-06086aa3/tracks/get-upload-url", requireAuth, async (c) => {
  try {
    const { originalFilename, contentType } = await c.req.json();
    const ext = (originalFilename || 'track.mp3').split('.').pop() || 'mp3';
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const bucket = 'audio';

    // Ensure bucket exists
    await supabase.storage.createBucket(bucket, { public: false }).catch(() => {});

    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(filename);
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ signedUrl: data.signedUrl, token: data.token, filename, bucket });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Step 3 of new upload flow: process file from Supabase Storage → AzuraCast → DB
app.post("/make-server-06086aa3/tracks/process", requireAuth, async (c) => {
  try {
    const { filename, bucket, originalFilename } = await c.req.json();

    // Download from Supabase Storage
    const { data: fileBlob, error: dlErr } = await supabase.storage.from(bucket || 'audio').download(filename);
    if (dlErr || !fileBlob) return c.json({ error: `Download failed: ${dlErr?.message}` }, 500);

    // Upload to AzuraCast
    const azForm = new FormData();
    const arrayBuffer = await fileBlob.arrayBuffer();
    azForm.append('file', new Blob([arrayBuffer], { type: fileBlob.type || 'audio/mpeg' }), originalFilename || filename);

    const azResp = await fetch(`${AZURA_URL}/api/station/${AZURA_STATION}/files`, {
      method: 'POST',
      headers: { 'X-API-Key': AZURA_KEY },
      body: azForm,
    });

    if (!azResp.ok) {
      const errText = await azResp.text();
      return c.json({ error: `AzuraCast upload failed: ${azResp.status} - ${errText}` }, 500);
    }

    const azData = await azResp.json();
    const azId = azData.id;
    const title = azData.title || (originalFilename || filename).replace(/\.(mp3|wav|m4a|flac|ogg)$/i, '');
    const artist = azData.artist || 'Unknown Artist';
    const album = azData.album || '';
    const genre = azData.genre || '';
    const duration = Math.round(azData.length || 0);
    const coverUrl = azData.art ? azData.art.replace('http://187.77.85.42', 'https://stream.soul-fm.com') : null;

    const trackId = `az-${azId}`;
    const { data: track, error: dbErr } = await supabase.from('tracks').upsert({
      id: trackId, azuracast_id: azId,
      title, artist, album, genre, duration,
      cover_url: coverUrl, audio_url: AZURA_STREAM_URL,
      storage_filename: azData.path || originalFilename || filename,
      storage_bucket: 'azuracast',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' }).select().single();

    if (dbErr) console.error('[process] DB error:', dbErr.message);

    // Clean up temp file from Supabase Storage
    await supabase.storage.from(bucket || 'audio').remove([filename]).catch(() => {});

    return c.json({
      track: track || { id: trackId, title, artist, album, duration },
      metadata: { title, artist, album, genre, duration, coverUrl },
      shortId: trackId, streamUrl: AZURA_STREAM_URL, audioUrl: AZURA_STREAM_URL, azuracastId: azId,
    });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get("/make-server-06086aa3/tracks", async (c) => {
  try {
    const { data, error } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return c.json({ tracks: data || [] });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post("/make-server-06086aa3/tracks", requireAdminPin, async (c) => {
  try {
    const body = await c.req.json();
    const { data, error } = await supabase.from('tracks').insert(body).select().single();
    if (error) throw error;
    return c.json({ track: data }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.put("/make-server-06086aa3/tracks/:id", requireAdminPin, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { data, error } = await supabase.from('tracks').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return c.json({ track: data });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.delete("/make-server-06086aa3/tracks/:id", requireAdminPin, async (c) => {
  try {
    const id = c.req.param('id');
    const { error } = await supabase.from('tracks').delete().eq('id', id);
    if (error) throw error;
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ==================== PLAYLISTS ====================

app.get("/make-server-06086aa3/playlists", async (c) => {
  try {
    const { data, error } = await supabase.from('playlists').select('*').order('name');
    if (error) throw error;
    return c.json({ playlists: data || [] });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post("/make-server-06086aa3/playlists", requireAdminPin, async (c) => {
  try {
    const body = await c.req.json();
    const { data, error } = await supabase.from('playlists').insert(body).select().single();
    if (error) throw error;
    return c.json({ playlist: data }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.put("/make-server-06086aa3/playlists/:id", requireAdminPin, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { data, error } = await supabase.from('playlists').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return c.json({ playlist: data });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.delete("/make-server-06086aa3/playlists/:id", requireAdminPin, async (c) => {
  try {
    const id = c.req.param('id');
    const { error } = await supabase.from('playlists').delete().eq('id', id);
    if (error) throw error;
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Add track to playlist
app.post("/make-server-06086aa3/playlists/:id/tracks", requireAdminPin, async (c) => {
  try {
    const id = c.req.param('id');
    const { trackId } = await c.req.json();
    const { data: pl } = await supabase.from('playlists').select('track_ids').eq('id', id).single();
    const trackIds = [...(pl?.track_ids || [])];
    if (!trackIds.includes(trackId)) trackIds.push(trackId);
    const { data, error } = await supabase.from('playlists').update({ track_ids: trackIds, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return c.json({ playlist: data });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ==================== SCHEDULES ====================

app.get("/make-server-06086aa3/schedules", async (c) => {
  try {
    const { data, error } = await supabase.from('schedules').select('*, playlists(id, name)').order('start_time');
    if (error) throw error;
    return c.json({ schedules: data || [] });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post("/make-server-06086aa3/schedules", requireAdminPin, async (c) => {
  try {
    const body = await c.req.json();
    const { data, error } = await supabase.from('schedules').insert(body).select().single();
    if (error) throw error;
    return c.json({ schedule: data }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.put("/make-server-06086aa3/schedules/:id", requireAdminPin, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { data, error } = await supabase.from('schedules').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return c.json({ schedule: data });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.delete("/make-server-06086aa3/schedules/:id", requireAdminPin, async (c) => {
  try {
    const id = c.req.param('id');
    const { error } = await supabase.from('schedules').delete().eq('id', id);
    if (error) throw error;
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ==================== AZURACAST PROXY ====================

setupAzuraCastRoutes(app, requireAdminPin);

// AzuraCast upload (proxy to Hostinger)
app.post("/make-server-06086aa3/azuracast/upload", requireAdminPin, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    if (!file) return c.json({ error: 'No file provided' }, 400);
    const arrayBuffer = await file.arrayBuffer();
    const form = new FormData();
    form.append('file', new Blob([arrayBuffer], { type: file.type }), file.name);
    const resp = await fetch(`${AZURA_URL}/api/station/${AZURA_STATION}/files`, {
      method: 'POST',
      headers: { 'X-API-Key': AZURA_KEY },
      body: form,
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return c.json({ error: `AzuraCast upload failed: ${resp.status} ${errText}` }, 500);
    }
    const data = await resp.json();
    return c.json({ success: true, file: data });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Add tracks to AzuraCast playlist
app.put("/make-server-06086aa3/azuracast/playlists/:id/tracks", requireAdminPin, async (c) => {
  try {
    const playlistId = parseInt(c.req.param('id'));
    const { trackIds } = await c.req.json();
    const results = await Promise.all((trackIds as number[]).map(async (mediaId: number) => {
      const getR = await fetch(`${AZURA_URL}/api/station/${AZURA_STATION}/file/${mediaId}`, { headers: azuraHeaders() });
      const fileData = await getR.json();
      const currentPlaylists: number[] = (fileData.playlists || []).map((p: any) => typeof p === 'object' ? p.id : p);
      if (!currentPlaylists.includes(playlistId)) currentPlaylists.push(playlistId);
      const putR = await fetch(`${AZURA_URL}/api/station/${AZURA_STATION}/file/${mediaId}`, {
        method: 'PUT', headers: azuraPostHeaders(),
        body: JSON.stringify({ ...fileData, playlists: currentPlaylists }),
      });
      return putR.ok;
    }));
    return c.json({ success: true, updated: results.filter(Boolean).length });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ==================== DASHBOARD ====================

app.get("/make-server-06086aa3/dashboard/stats", async (c) => {
  try {
    const [tracksCount, playlistsCount, schedulesCount, azNP] = await Promise.all([
      supabase.from('tracks').select('id', { count: 'exact', head: true }),
      supabase.from('playlists').select('id', { count: 'exact', head: true }),
      supabase.from('schedules').select('id', { count: 'exact', head: true }),
      fetch(`${AZURA_URL}/api/nowplaying/${AZURA_STATION}`, { headers: azuraHeaders() }).then(r => r.json()).catch(() => null),
    ]);
    const sqlStatus = await getStreamState('status');
    return c.json({
      totalTracks: tracksCount.count || 0,
      totalPlaylists: playlistsCount.count || 0,
      totalSchedules: schedulesCount.count || 0,
      listeners: azNP?.listeners?.current || 0,
      isPlaying: sqlStatus?.status === 'online' || autoDJState.isPlaying,
      nowPlaying: azNP?.now_playing?.song ? { title: azNP.now_playing.song.title, artist: azNP.now_playing.song.artist } : null,
    });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Health check
app.get("/make-server-06086aa3/health", (c) => c.json({ ok: true, version: 'lean-sql' }));

// Debug: test AzuraCast connectivity from Edge Function
app.get("/make-server-06086aa3/debug/azuracast", async (c) => {
  const keyRaw = Deno.env.get('AZURACAST_API_KEY') || '';
  const keyClean = keyRaw.replace(/[^\x20-\x7E]/g, '').trim();
  const results: any = { keyLength: keyRaw.length, keyCleanLength: keyClean.length };

  // Test 1: no headers
  try {
    const r = await fetch(`${AZURA_URL}/api/nowplaying/${AZURA_STATION}`, { signal: AbortSignal.timeout(8000) });
    results.noHeaders = { status: r.status, ok: r.ok };
    if (r.ok) { const j = await r.json(); results.noHeaders.is_online = j?.is_online; }
  } catch (e: any) { results.noHeaders = { error: e.message }; }

  // Test 2: with cleaned key
  try {
    const r = await fetch(`${AZURA_URL}/api/nowplaying/${AZURA_STATION}`, {
      headers: { 'X-API-Key': keyClean, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    results.withKey = { status: r.status, ok: r.ok };
    if (r.ok) { const j = await r.json(); results.withKey.is_online = j?.is_online; }
  } catch (e: any) { results.withKey = { error: e.message }; }

  return c.json({ azura_url: AZURA_URL, results });
});

console.log('🎵 Soul FM Hub (lean) ready!');
Deno.serve(app.fetch);
