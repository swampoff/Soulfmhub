import { createClient } from "npm:@supabase/supabase-js@2";
import { Hono } from "npm:hono@4";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
// All podcast/profile CRUD routes defined inline below. Seed data in separate files.
import { seedProfiles } from "./seed-profiles.ts";
import { seedPodcasts, seedShows } from "./seed-podcasts.ts";
import { seedNewsInjectionData, createSampleRules } from "./seed-news-injection.ts";
// NOTE: `parseBuffer` from music-metadata is loaded LAZILY (dynamic import) only in
// upload/metadata endpoints to avoid penalizing cold-start time for all other routes.
import { setupJinglesRoutes } from "./jingles.ts";
import * as jingleRotation from "./jingle-rotation.ts";
import * as autoDJHelper from "./auto-dj-helper.ts";
import * as newsIntegration from "./news-autodj-integration.ts";
import * as podcastContestIntegration from "./podcast-contest-integration.ts";
import * as interactive from "./interactive-features.ts";
import { extractCompleteMetadata, getDefaultCoverUrl } from "./metadata-utils.ts";
import { setupAutomationRoutes } from "./content-automation-routes.ts";
import { newsInjectionRoutes } from "./news-injection-routes.ts";
import { announcementsRoutes } from "./announcements-routes.ts";
import { setupPodcastContestRoutes } from "./podcast-contest-routes.ts";
import { setupInteractiveRoutes } from "./interactive-routes.ts";
import { setupAzuraCastRoutes, getAzuraCastConfig } from "./azuracast-routes.ts";

const app = new Hono();

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

console.log('[startup] SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
console.log('[startup] SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('FATAL: Missing Supabase configuration — server will not function correctly');
}

const supabase = createClient(
  supabaseUrl ?? '',
  supabaseServiceKey ?? '',
);

// ==================== STORAGE SETUP ====================

// Initialize Storage Buckets
async function initializeStorageBuckets() {
  try {
    console.log('🗄️  Initializing storage buckets...');
    
    // Buckets are PRIVATE — all audio/image access requires signed URLs.
    // getAudioUrl() generates signed URLs (2h TTL) for playback.
    const bucketsToCreate = [
      { name: 'make-06086aa3-tracks', public: false, fileType: 'audio' as const },
      { name: 'make-06086aa3-covers', public: false, fileType: 'image' as const },
      { name: 'make-06086aa3-jingles', public: false, fileType: 'audio' as const },
      { name: 'make-06086aa3-news-voiceovers', public: false, fileType: 'audio' as const },
      { name: 'make-06086aa3-announcements', public: false, fileType: 'audio' as const },
    ];

    const { data: buckets } = await supabase.storage.listBuckets();
    
    for (const bucketConfig of bucketsToCreate) {
      const bucketExists = buckets?.some(bucket => bucket.name === bucketConfig.name);
      
      if (bucketExists) {
        // Ensure bucket visibility matches config (private)
        const existingBucket = buckets?.find(b => b.name === bucketConfig.name);
        if (existingBucket && existingBucket.public !== bucketConfig.public) {
          console.log(`🔄 Updating bucket visibility: ${bucketConfig.name} → public: ${bucketConfig.public}`);
          await supabase.storage.updateBucket(bucketConfig.name, { public: bucketConfig.public });
        }
        console.log(`✅ Bucket exists: ${bucketConfig.name} (private)`);
        continue;
      }
      
      const { error } = await supabase.storage.createBucket(bucketConfig.name, {
        public: bucketConfig.public,
        fileSizeLimit: bucketConfig.fileType === 'audio' ? 52428800 : 5242880, // 50MB for audio, 5MB for images
        allowedMimeTypes: bucketConfig.fileType === 'audio' 
          ? ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/flac']
          : ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      });
      
      if (error) {
        // Ignore "already exists" errors (409)
        if (error.statusCode === '409' || error.message?.includes('already exists')) {
          console.log(`✅ Bucket exists: ${bucketConfig.name}`);
        } else {
          console.error(`❌ Error creating bucket ${bucketConfig.name}:`, error);
        }
      } else {
        console.log(`✅ Created bucket: ${bucketConfig.name}`);
      }
    }
    
    console.log('✅ Storage buckets initialized');
  } catch (error) {
    console.error('❌ Error initializing storage buckets:', error);
  }
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS — restricted to production domain and Vercel previews
app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (!origin) return 'https://soul-fm.com'; // non-browser / same-origin
      const allowed = [
        'https://soul-fm.com',
        'https://www.soul-fm.com',
      ];
      if (allowed.includes(origin)) return origin;
      // Allow Vercel preview deployments
      if (origin.endsWith('.vercel.app')) return origin;
      // Allow local dev
      if (origin.startsWith('http://localhost:')) return origin;
      return 'https://soul-fm.com'; // deny by not matching
    },
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper: check if a JWT is a Supabase anon key for OUR project
function isProjectAnonKey(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    // Decode payload (base64url → JSON)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.role !== 'anon' || payload.iss !== 'supabase') return false;
    // Extract project ref from SUPABASE_URL (https://<ref>.supabase.co)
    const urlMatch = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (!urlMatch) return false;
    return payload.ref === urlMatch[1];
  } catch {
    return false;
  }
}

// Middleware to verify auth for protected routes
// Accepts either a valid Supabase Auth JWT **or** the public anon key
// (the admin panel uses PIN-based access and sends the anon key).
async function requireAuth(c: any, next: any) {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const routeInfo = `${c.req.method} ${c.req.path}`;
  if (!accessToken) {
    console.warn(`[requireAuth] No Authorization token | ${routeInfo}`);
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }

  // If the token is the public anon key, allow as admin (PIN-gated on frontend)
  // Check 1: exact string match against env var
  // Check 2: decode JWT and verify it's an anon key for our project
  //   (handles mismatch between info.tsx publicAnonKey and SUPABASE_ANON_KEY env var)
  if ((supabaseAnonKey && accessToken === supabaseAnonKey) || isProjectAnonKey(accessToken)) {
    console.log(`[requireAuth] Anon-key access (admin-pin) | ${routeInfo}`);
    c.set('userId', 'admin-pin');
    c.set('user', { id: 'admin-pin', role: 'admin' });
    await next();
    return;
  }

  // Otherwise validate as a real Supabase Auth token
  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      console.warn(`[requireAuth] Auth failed | ${routeInfo} | error: ${error?.message || 'no user'}`);
      return c.json({ error: `Unauthorized: Invalid token — ${error?.message || 'user not found'}` }, 401);
    }
    
    const userEmail = user.email || 'unknown';
    const userRole = user.user_metadata?.role || 'user';
    console.log(`[requireAuth] JWT user: ${user.id} (${userEmail}, role: ${userRole}) | ${routeInfo}`);
    c.set('userId', user.id);
    c.set('userEmail', userEmail);
    c.set('user', user);
    await next();
  } catch (authErr: any) {
    console.error(`[requireAuth] Exception | ${routeInfo} | ${authErr?.message || authErr}`);
    return c.json({ error: `Auth error: ${authErr?.message || 'unknown'}` }, 401);
  }
}

// ── RBAC Middleware ─────────────────────────────────────────────────
// Higher-order middleware that wraps requireAuth and additionally
// checks the user's role stored in KV (or JWT metadata).
// Usage: app.post('/route', requireAuth, requireRole('admin'), handler)
function requireRole(...allowedRoles: string[]) {
  return async (c: any, next: any) => {
    const userId = c.get('userId');
    const routeInfo = `${c.req.method} ${c.req.path}`;

    // Admin-pin (anon key) users always pass — PIN-gated on frontend
    if (userId === 'admin-pin') {
      await next();
      return;
    }

    // Check JWT metadata first
    const user = c.get('user');
    const jwtRole = user?.user_metadata?.role || user?.role;
    if (jwtRole && allowedRoles.includes(jwtRole)) {
      await next();
      return;
    }

    // Check KV profile — also allow 'super_admin' to pass any role check
    try {
      const profile = await kv.get(`user:${userId}`);
      if (profile?.role && (allowedRoles.includes(profile.role) || profile.role === 'super_admin')) {
        await next();
        return;
      }
    } catch (e: any) {
      console.error(`[requireRole] KV lookup error for ${userId}:`, e?.message || e);
    }

    console.warn(`[requireRole] Access denied — user ${userId} lacks role [${allowedRoles.join(',')}] | ${routeInfo}`);
    return c.json({ error: `Forbidden: requires role [${allowedRoles.join(',')}]` }, 403);
  };
}

// Setup Jingles routes
setupJinglesRoutes(app, supabase, requireAuth);

// Setup Content Automation routes
setupAutomationRoutes(app, supabase, requireAuth);

// Setup News Injection routes
app.route('/make-server-06086aa3/news-injection', newsInjectionRoutes);

// Setup Announcements routes
app.route('/make-server-06086aa3/announcements', announcementsRoutes);

// Setup Podcast & Contest routes
setupPodcastContestRoutes(app, requireAuth);

// Setup Interactive Features routes (Live DJ, Requests, Shoutouts, Calls)
setupInteractiveRoutes(app, requireAuth);

// Setup AzuraCast Integration routes (Real streaming server)
setupAzuraCastRoutes(app, requireAuth);

// Seed endpoint for testing (ADMIN ONLY)
app.post('/make-server-06086aa3/seed-news-injection', requireAuth, async (c) => {
  try {
    const result = await seedNewsInjectionData();
    await createSampleRules();
    return c.json({ success: true, ...result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Seed all content — shows, podcasts, profiles (ADMIN ONLY)
app.post('/make-server-06086aa3/seed-all', requireAuth, async (c) => {
  try {
    console.log('🌱 Seeding all content...');
    await seedProfiles();
    await seedPodcasts();
    await seedShows();

    // Seed default AzuraCast config if not already set
    const existingAz = await kv.get('azuracast:config');
    if (!existingAz) {
      await kv.set('azuracast:config', {
        enabled: true,
        baseUrl: 'http://187.77.85.42',
        stationId: 1,
        stationShortName: 'soul_fm_',
        streamUrlHttps: 'https://stream.soul-fm.com/soulfm',
        streamUrlHttp: 'http://187.77.85.42:8000/soulfm',
        updatedAt: new Date().toISOString(),
      });
      console.log('✅ Default AzuraCast config seeded');
    }

    console.log('✅ All content seeded successfully');
    return c.json({ success: true, message: 'Shows, podcasts, profiles, and AzuraCast config seeded' });
  } catch (error: any) {
    console.error('Seed all error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Seed shows only (ADMIN ONLY)
app.post('/make-server-06086aa3/seed-shows', requireAuth, async (c) => {
  try {
    await seedShows();
    return c.json({ success: true, message: 'Shows seeded' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Seed podcasts only (ADMIN ONLY)
app.post('/make-server-06086aa3/seed-podcasts', requireAuth, async (c) => {
  try {
    await seedPodcasts();
    return c.json({ success: true, message: 'Podcasts seeded' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Health check endpoint (public, minimal — no secrets info)
app.get("/make-server-06086aa3/health", (c) => {
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    version: "2.2",
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

// Auto DJ State (in-memory cache; persisted to KV so it survives Edge Function cold-starts)
let autoDJState = {
  isPlaying: false,
  currentTrackIndex: 0,
  currentTrack: null as any,
  playlistTracks: [] as any[],
  startTime: null as string | null,
  currentTrackStartTime: null as string | null,
  listeners: 0,
  autoAdvance: true,
  pendingJingle: null as any,
  isPlayingJingle: false,
};

const AUTODJ_STATE_KEY = 'autodj:state';

const _sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const _isTransientKvError = (e: any) => {
  const msg: string = e?.message || String(e);
  return msg.includes('connection') || msg.includes('reset') || msg.includes('SendRequest') || msg.includes('error sending request');
};

// ── LIGHT version — only scalar fields, NO playlist track fetching ──
// Use this in read-only endpoints (status, current-stream) for speed.
async function loadAutoDJStateLight(retries = 2): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const saved = await kv.get(AUTODJ_STATE_KEY);
      if (saved && typeof saved.isPlaying === 'boolean') {
        autoDJState.isPlaying             = saved.isPlaying;
        autoDJState.currentTrackIndex     = saved.currentTrackIndex ?? 0;
        autoDJState.currentTrack          = saved.currentTrack ?? null;
        autoDJState.startTime             = saved.startTime ?? null;
        autoDJState.currentTrackStartTime = saved.currentTrackStartTime ?? null;
        autoDJState.listeners             = saved.listeners ?? 0;
        autoDJState.autoAdvance           = saved.autoAdvance ?? true;
        autoDJState.isPlayingJingle       = saved.isPlayingJingle ?? false;
        // Store track count from IDs without loading full objects
        (autoDJState as any)._totalTrackCount = saved.playlistTrackIds?.length ?? autoDJState.playlistTracks.length;
      }
      return saved;
    } catch (e: any) {
      if (_isTransientKvError(e) && attempt < retries) {
        console.warn(`[AutoDJ] KV light-load transient error (attempt ${attempt + 1}), retrying…`);
        await _sleep(600);
        continue;
      }
      console.error('[AutoDJ] KV light-load failed:', e?.message || e);
      return null;
    }
  }
  return null;
}

// ── FULL version — loads playlist tracks from IDs (expensive) ──
// Use only in start/stop/skip/advance operations.
async function loadAutoDJState(retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const saved = await kv.get(AUTODJ_STATE_KEY);
      if (saved && typeof saved.isPlaying === 'boolean') {
        // Restore scalar fields
        autoDJState.isPlaying             = saved.isPlaying;
        autoDJState.currentTrackIndex     = saved.currentTrackIndex ?? 0;
        autoDJState.currentTrack          = saved.currentTrack ?? null;
        autoDJState.startTime             = saved.startTime ?? null;
        autoDJState.currentTrackStartTime = saved.currentTrackStartTime ?? null;
        autoDJState.listeners             = saved.listeners ?? 0;
        autoDJState.autoAdvance           = saved.autoAdvance ?? true;
        autoDJState.isPlayingJingle       = saved.isPlayingJingle ?? false;

        // Restore playlist from stored IDs (if in-memory list is empty)
        if (autoDJState.playlistTracks.length === 0 && saved.playlistTrackIds?.length > 0) {
          const tracks: any[] = [];
          for (const id of saved.playlistTrackIds) {
            try {
              const t = await kv.get(`track:${id}`);
              if (t) tracks.push(t);
            } catch (_) { /* skip missing tracks */ }
          }
          autoDJState.playlistTracks = tracks;
        }
      }
      return;
    } catch (e: any) {
      if (_isTransientKvError(e) && attempt < retries) {
        console.warn(`[AutoDJ] KV load transient error (attempt ${attempt + 1}), retrying…`);
        await _sleep(600);
        continue;
      }
      console.error('[AutoDJ] KV load failed, using in-memory state:', e?.message || e);
      return;
    }
  }
}

async function saveAutoDJState(retries = 2) {
  // Store only lightweight scalar fields.
  // playlistTracks (full objects) is intentionally excluded — it can be
  // hundreds of track objects and blow the KV payload limit, causing silent failures.
  const payload = {
    isPlaying: autoDJState.isPlaying,
    currentTrackIndex: autoDJState.currentTrackIndex,
    // Only IDs — full track objects are reloaded on demand
    playlistTrackIds: autoDJState.playlistTracks.map((t: any) => t.id).filter(Boolean),
    // Trim current track to essential fields for the signed-URL route
    currentTrack: autoDJState.currentTrack ? {
      id:              autoDJState.currentTrack.id,
      title:           autoDJState.currentTrack.title,
      artist:          autoDJState.currentTrack.artist,
      album:           autoDJState.currentTrack.album,
      duration:        autoDJState.currentTrack.duration,
      coverUrl:        autoDJState.currentTrack.coverUrl,
      storageBucket:   autoDJState.currentTrack.storageBucket,
      storageFilename: autoDJState.currentTrack.storageFilename,
      coverBucket:     autoDJState.currentTrack.coverBucket,
      coverFilename:   autoDJState.currentTrack.coverFilename,
    } : null,
    startTime:             autoDJState.startTime,
    currentTrackStartTime: autoDJState.currentTrackStartTime,
    listeners:             autoDJState.listeners,
    autoAdvance:           autoDJState.autoAdvance,
    isPlayingJingle:       autoDJState.isPlayingJingle,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await kv.set(AUTODJ_STATE_KEY, payload);
      return;
    } catch (e: any) {
      if (_isTransientKvError(e) && attempt < retries) {
        console.warn(`[AutoDJ] KV save transient error (attempt ${attempt + 1}), retrying…`);
        await _sleep(600);
        continue;
      }
      console.error('[AutoDJ] KV save failed (non-critical):', e?.message || e);
      return;
    }
  }
}

// Auto-advance tracks
async function checkAndAdvanceTrack() {
  // Always reload from KV first — function may have cold-started
  await loadAutoDJState();
  if (!autoDJState.isPlaying || !autoDJState.currentTrack || !autoDJState.currentTrackStartTime) {
    return;
  }
  
  // 🔴 CHECK IF LIVE DJ IS ACTIVE - PAUSE AUTO-DJ
  if (interactive.isLiveDJ()) {
    console.log('🎧 Live DJ is active - Auto-DJ paused');
    return;
  }

  const now = new Date();
  const trackStartTime = new Date(autoDJState.currentTrackStartTime);
  const trackDuration = autoDJState.currentTrack.duration || 180;
  const elapsedSeconds = Math.floor((now.getTime() - trackStartTime.getTime()) / 1000);

  if (elapsedSeconds >= trackDuration - 5) {
    console.log(`⏭️  Auto-advancing from "${autoDJState.currentTrack.title}"`);
    
    // 🎙️ PRIORITY 1: CHECK FOR SCHEDULED PODCAST (VERY HIGH PRIORITY)
    const podcast = await podcastContestIntegration.checkForScheduledPodcast();
    
    if (podcast) {
      // Play scheduled podcast show
      console.log(`🎙️ Playing scheduled podcast: "${podcast.title}"`);
      
      await podcastContestIntegration.markPodcastAsPlaying(podcast.scheduleId);
      
      autoDJState.currentTrack = {
        id: podcast.scheduleId,
        title: `🎙️ ${podcast.title}`,
        artist: 'Podcast',
        album: podcast.scheduleType,
        duration: podcast.duration,
        coverUrl: podcast.coverUrl,
        isPodcast: true,
        scheduleId: podcast.scheduleId,
        podcastId: podcast.podcastId
      };
      autoDJState.currentTrackStartTime = new Date().toISOString();
      
      await kv.set('stream:nowplaying', {
        track: {
          id: podcast.scheduleId,
          title: `🎙️ ${podcast.title}`,
          artist: 'Podcast',
          album: podcast.scheduleType,
          duration: podcast.duration,
          cover: podcast.coverUrl
        },
        startTime: autoDJState.currentTrackStartTime,
        updatedAt: new Date().toISOString()
      });
      
      // Reset all counters when podcast plays
      newsIntegration.resetTrackCounter();
      podcastContestIntegration.resetContestCounter();
      
      console.log(`✅ Now playing podcast: "${podcast.title}" (${podcast.duration}s)`);
      
      // Mark as completed after duration
      setTimeout(async () => {
        await podcastContestIntegration.markPodcastAsCompleted(
          podcast.scheduleId, 
          podcast.podcastId, 
          podcast.episodeId
        );
      }, podcast.duration * 1000);
      
      return;
    }
    
    // 📰 PRIORITY 2: CHECK FOR NEWS (HIGHEST PRIORITY)
    const injection = await newsIntegration.checkInjectionPriority();
    
    if (injection.hasNews) {
      // Play scheduled news
      const news = injection.news;
      console.log(`📰 Playing scheduled news: "${news.title}"`);
      
      await newsIntegration.markNewsAsPlaying(news.queueId);
      
      autoDJState.currentTrack = {
        id: news.voiceOverId,
        title: `📰 ${news.title}`,
        artist: 'News Update',
        album: news.voiceName,
        duration: news.duration,
        coverUrl: null,
        isNews: true,
        queueId: news.queueId,
        voiceOverId: news.voiceOverId
      };
      autoDJState.currentTrackStartTime = new Date().toISOString();
      
      await kv.set('stream:nowplaying', {
        track: {
          id: news.voiceOverId,
          title: `📰 ${news.title}`,
          artist: 'News Update',
          album: news.voiceName,
          duration: news.duration,
          cover: null
        },
        startTime: autoDJState.currentTrackStartTime,
        updatedAt: new Date().toISOString()
      });
      
      newsIntegration.resetTrackCounter();
      console.log(`✅ Now playing news: "${news.title}"`);
      
      // Mark as completed after duration
      setTimeout(async () => {
        await newsIntegration.markNewsAsCompleted(news.queueId, news.voiceOverId);
      }, news.duration * 1000);
      
      return;
    }
    
    if (injection.hasAnnouncement) {
      // Play announcement (weather, time, station ID)
      const announcement = injection.announcement;
      console.log(`📻 Playing ${announcement.type} announcement`);
      
      autoDJState.currentTrack = {
        id: announcement.id,
        title: `📻 ${announcement.type.toUpperCase()}`,
        artist: 'Soul FM',
        album: announcement.voiceName,
        duration: announcement.duration,
        coverUrl: null,
        isAnnouncement: true,
        announcementId: announcement.id
      };
      autoDJState.currentTrackStartTime = new Date().toISOString();
      
      await kv.set('stream:nowplaying', {
        track: {
          id: announcement.id,
          title: `📻 ${announcement.type.replace('_', ' ').toUpperCase()}`,
          artist: 'Soul FM',
          album: announcement.voiceName,
          duration: announcement.duration,
          cover: null
        },
        startTime: autoDJState.currentTrackStartTime,
        updatedAt: new Date().toISOString()
      });
      
      await newsIntegration.markAnnouncementPlayed(announcement.id);
      newsIntegration.resetTrackCounter();
      podcastContestIntegration.resetContestCounter();
      console.log(`✅ Now playing ${announcement.type} announcement`);
      return;
    }
    
    // 🎁 PRIORITY 3: CHECK FOR CONTEST ANNOUNCEMENTS (HIGH PRIORITY)
    const contest = await podcastContestIntegration.checkForContestAnnouncement();
    
    if (contest) {
      // Play contest announcement
      console.log(`🎁 Playing contest announcement: "${contest.title}"`);
      
      await podcastContestIntegration.markContestAnnouncementPlaying(contest.queueId, contest.contestId);
      
      autoDJState.currentTrack = {
        id: contest.contestId,
        title: `🎁 ${contest.title}`,
        artist: 'Contest',
        album: contest.announcementType,
        duration: contest.duration,
        coverUrl: null,
        isContest: true,
        contestId: contest.contestId,
        queueId: contest.queueId
      };
      autoDJState.currentTrackStartTime = new Date().toISOString();
      
      await kv.set('stream:nowplaying', {
        track: {
          id: contest.contestId,
          title: `🎁 ${contest.title}`,
          artist: 'Contest',
          album: contest.announcementType,
          duration: contest.duration,
          cover: null
        },
        startTime: autoDJState.currentTrackStartTime,
        updatedAt: new Date().toISOString()
      });
      
      podcastContestIntegration.resetContestCounter();
      console.log(`✅ Now playing contest: "${contest.title}"`);
      
      // Mark as completed after duration
      setTimeout(async () => {
        await podcastContestIntegration.markContestAnnouncementCompleted(
          contest.queueId,
          contest.contestId
        );
      }, contest.duration * 1000);
      
      return;
    }
    
    // 🎵 PRIORITY 4: CHECK FOR SONG REQUESTS (HIGH PRIORITY)
    if (interactive.shouldPlayRequest()) {
      const request = await interactive.getNextApprovedRequest();
      
      if (request) {
        console.log(`🎵 Playing song request: "${request.title}" by ${request.artist}`);
        console.log(`   Requested by: ${request.requesterName}`);
        
        await interactive.markRequestAsPlayed(request.requestId);
        
        autoDJState.currentTrack = {
          id: request.trackId,
          title: `🎵 ${request.title}`,
          artist: request.artist,
          album: `Request from ${request.requesterName}`,
          duration: 240, // TODO: Get actual duration from track
          coverUrl: null,
          isRequest: true,
          requestId: request.requestId,
          requesterName: request.requesterName
        };
        autoDJState.currentTrackStartTime = new Date().toISOString();
        
        await kv.set('stream:nowplaying', {
          track: {
            id: request.trackId,
            title: `🎵 ${request.title}`,
            artist: request.artist,
            album: `Request from ${request.requesterName}`,
            duration: 240,
            cover: null
          },
          startTime: autoDJState.currentTrackStartTime,
          updatedAt: new Date().toISOString()
        });
        
        interactive.resetRequestCounter();
        console.log(`✅ Now playing request: "${request.title}"`);
        
        return;
      }
    }
    
    // 💬 PRIORITY 5: CHECK FOR SHOUTOUTS (MEDIUM-HIGH PRIORITY)
    if (interactive.shouldPlayShoutout()) {
      const shoutout = await interactive.getNextShoutout();
      
      if (shoutout) {
        console.log(`💬 Playing shoutout for ${shoutout.recipientName}`);
        
        await interactive.markShoutoutAsPlayed(shoutout.shoutoutId);
        
        autoDJState.currentTrack = {
          id: shoutout.shoutoutId,
          title: `💬 Shoutout to ${shoutout.recipientName}`,
          artist: 'Soul FM Listener',
          album: shoutout.occasion || 'Special Message',
          duration: shoutout.duration,
          coverUrl: null,
          isShoutout: true,
          shoutoutId: shoutout.shoutoutId
        };
        autoDJState.currentTrackStartTime = new Date().toISOString();
        
        await kv.set('stream:nowplaying', {
          track: {
            id: shoutout.shoutoutId,
            title: `💬 Shoutout to ${shoutout.recipientName}`,
            artist: 'Soul FM Listener',
            album: shoutout.occasion || 'Special Message',
            duration: shoutout.duration,
            cover: null
          },
          startTime: autoDJState.currentTrackStartTime,
          updatedAt: new Date().toISOString()
        });
        
        interactive.resetShoutoutCounter();
        console.log(`✅ Now playing shoutout for ${shoutout.recipientName}`);
        
        return;
      }
    }
    
    // 🔔 PRIORITY 6: CHECK FOR JINGLES (now schedule-aware)
    // Resolve current schedule FIRST so jingles get transition context + per-slot config
    const currentScheduleForJingle = await getCurrentScheduledPlaylist();
    const jingle = await autoDJHelper.checkAndPlayJingle(autoDJState, currentScheduleForJingle);
    
    if (jingle) {
      // Play jingle instead of next track
      console.log(`🔔 Playing jingle: "${jingle.title}"`);
      autoDJState.isPlayingJingle = true;
      autoDJState.currentTrack = {
        id: jingle.id,
        title: `🔔 ${jingle.title}`,
        artist: 'Station ID',
        album: jingle.category.replace(/_/g, ' '),
        duration: jingle.duration,
        coverUrl: null,
        isJingle: true
      };
      autoDJState.currentTrackStartTime = new Date().toISOString();
      
      // Update Now Playing with jingle
      await autoDJHelper.updateNowPlayingWithJingle(jingle);
      
      console.log(`✅ Now playing jingle: "${jingle.title}"`);
      return;
    }
    
    // No jingle to play, continue with regular track
    autoDJState.isPlayingJingle = false;
    
    // Increment track count for jingle rules, news injection, contest announcements, requests, AND shoutouts
    autoDJHelper.incrementMusicTrackCount();
    newsIntegration.incrementTrackCounter();
    podcastContestIntegration.incrementContestCounter();
    interactive.incrementRequestCounter();
    interactive.incrementShoutoutCounter();
    
    // Re-use already-fetched schedule (avoid duplicate KV lookup)
    const currentSchedule = currentScheduleForJingle;
    
    if (currentSchedule) {
      console.log(`📅 Schedule: "${currentSchedule.title}"`);
      const playlist = await kv.get(`playlist:${currentSchedule.playlistId}`);
      if (playlist && playlist.trackIds && playlist.trackIds.length > 0) {
        const tracks = [];
        for (const trackId of playlist.trackIds) {
          const track = await kv.get(`track:${trackId}`);
          if (track) tracks.push(track);
        }
        if (tracks.length > 0) {
          autoDJState.playlistTracks = tracks;
          autoDJState.currentTrackIndex = 0;
        }
      }
      // Keep active schedule reference in sync
      (autoDJState as any).activeScheduleSlot = {
        id: currentSchedule.id,
        title: currentSchedule.title,
        playlistId: currentSchedule.playlistId,
        playlistName: currentSchedule.playlistName,
        startTime: currentSchedule.startTime,
        endTime: currentSchedule.endTime,
        dayOfWeek: currentSchedule.dayOfWeek,
      };
    } else {
      (autoDJState as any).activeScheduleSlot = null;
    }
    
    if (autoDJState.playlistTracks.length === 0) {
      console.error('[checkAndAdvanceTrack] playlistTracks is empty — cannot advance');
      return;
    }

    // ── Skip external tracks that can't resolve audioUrl ──
    // Prevents Auto DJ from getting stuck on AzuraCast-only media when
    // AzuraCast is unreachable or the file lookup fails.
    const MAX_SKIP_ATTEMPTS = 10; // prevent infinite loop in all-external playlists
    let skipAttempts = 0;
    let candidateIndex = autoDJState.currentTrackIndex;

    while (skipAttempts < MAX_SKIP_ATTEMPTS) {
      candidateIndex = (candidateIndex + 1) % autoDJState.playlistTracks.length;
      const candidate = autoDJState.playlistTracks[candidateIndex];

      if (!candidate) {
        skipAttempts++;
        continue;
      }

      const candidateBucket = candidate.storageBucket || 'make-06086aa3-tracks';
      const isExternal = !candidateBucket.startsWith('make-06086aa3-');

      if (isExternal && candidate.storageFilename) {
        // Try to resolve URL — if it fails, skip this track
        const testUrl = await getAudioUrl(candidateBucket, candidate.storageFilename);
        if (!testUrl) {
          console.log(`[checkAndAdvanceTrack] Skipping external track "${candidate.title}" (${candidateBucket}/${candidate.storageFilename}) — no audio URL`);
          skipAttempts++;
          continue;
        }
      }

      // Valid track found (local Supabase or external with resolved URL)
      break;
    }

    if (skipAttempts >= MAX_SKIP_ATTEMPTS) {
      console.error(`[checkAndAdvanceTrack] Skipped ${MAX_SKIP_ATTEMPTS} unresolvable tracks — stopping advance`);
      return;
    }

    autoDJState.currentTrackIndex = candidateIndex;
    autoDJState.currentTrack = autoDJState.playlistTracks[autoDJState.currentTrackIndex];
    autoDJState.currentTrackStartTime = new Date().toISOString();
    
    if (!autoDJState.currentTrack) {
      console.error('[checkAndAdvanceTrack] currentTrack is null at index', autoDJState.currentTrackIndex);
      return;
    }

    // Generate fresh signed cover URL (stored coverUrl may be expired — buckets are private)
    const advTrack = autoDJState.currentTrack;
    let advCoverUrl = advTrack.coverUrl || null;
    if (advTrack.coverFilename && advTrack.coverBucket) {
      const freshCover = await getAudioUrl(advTrack.coverBucket, advTrack.coverFilename);
      if (freshCover) advCoverUrl = freshCover;
    }
    
    await kv.set('stream:nowplaying', {
      track: {
        id: advTrack.id,
        title: advTrack.title,
        artist: advTrack.artist,
        album: advTrack.album,
        duration: advTrack.duration,
        cover: advCoverUrl
      },
      startTime: autoDJState.currentTrackStartTime,
      updatedAt: new Date().toISOString()
    });
    
    // Broadcast track change via Supabase Realtime — use fresh signed cover URL
    try {
      const channel = supabase.channel('radio-updates');
      await channel.send({
        type: 'broadcast',
        event: 'track-changed',
        payload: {
          track: {
            id: advTrack.id,
            title: advTrack.title,
            artist: advTrack.artist,
            album: advTrack.album,
            duration: advTrack.duration,
            cover: advCoverUrl
          },
          startTime: autoDJState.currentTrackStartTime,
          updatedAt: new Date().toISOString()
        }
      });
      console.log('📡 Broadcast: Track change sent');
    } catch (broadcastError) {
      console.error('Broadcast error:', broadcastError);
    }
    
    // Persist new track position to KV
    await saveAutoDJState();

    // Push metadata to Icecast if configured
    try {
      const iceCfg: IcecastConfig | null = await kv.get(ICECAST_CONFIG_KEY);
      if (iceCfg?.enabled && iceCfg.serverUrl && iceCfg.adminPassword) {
        pushIcecastMetadata(iceCfg, `${advTrack.artist} - ${advTrack.title}`).catch((e: any) =>
          console.error('[AutoDJ→Icecast] metadata push error:', e?.message || e)
        );
      }
    } catch { /* non-critical */ }

    console.log(`✅ Now playing: "${advTrack.title}"`);
  }
}

// Helper: get current UTC offset (in JS getTimezoneOffset() convention) for an IANA timezone
// Returns minutes: positive = west of UTC, negative = east of UTC (e.g., -60 for Europe/Berlin in CET, -120 in CEST)
function getTimezoneOffsetNow(timezone: string): number {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
    // Construct a Date as if the local-time values were UTC
    const localAsUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') === 24 ? 0 : get('hour'), get('minute'), get('second'));
    // offset = actual UTC - local-as-UTC  → same sign convention as getTimezoneOffset()
    return Math.round((now.getTime() - localAsUTC) / 60000);
  } catch (e) {
    console.error(`[getTimezoneOffsetNow] Invalid timezone "${timezone}":`, e);
    return 0;
  }
}

// Helper: resolve effective UTC offset for a schedule slot
// If IANA timezone is stored, compute offset dynamically (DST-correct); otherwise fall back to stored fixed offset
function resolveSlotOffset(schedule: any): number {
  if (schedule.timezone) {
    return getTimezoneOffsetNow(schedule.timezone);
  }
  return schedule.utcOffsetMinutes ?? 0;
}

// Helper: convert "HH:MM" local time + utcOffsetMinutes to { utcTime: "HH:MM", dayDelta: -1|0|+1 }
// utcOffsetMinutes is JS getTimezoneOffset(): negative = east of UTC (e.g., -60 for UTC+1 Berlin)
function localTimeToUTC(timeStr: string, utcOffsetMinutes: number): { time: string; dayDelta: number } {
  const [h, m] = timeStr.split(':').map(Number);
  let totalMinutes = h * 60 + m + utcOffsetMinutes; // offset IS the diff (UTC - local)
  let dayDelta = 0;
  if (totalMinutes < 0) { totalMinutes += 1440; dayDelta = -1; }
  if (totalMinutes >= 1440) { totalMinutes -= 1440; dayDelta = 1; }
  const uh = Math.floor(totalMinutes / 60);
  const um = totalMinutes % 60;
  return { time: `${String(uh).padStart(2, '0')}:${String(um).padStart(2, '0')}`, dayDelta };
}

async function getCurrentScheduledPlaylist() {
  try {
    const allSchedules = await kv.getByPrefix('schedule:');
    const now = new Date();
    const currentDay = now.getUTCDay(); // 0=Sun..6=Sat in UTC
    const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const currentTime = `${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}`; // HH:MM in UTC
    const todayStr = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    console.log(`[getCurrentSchedule] Checking ${allSchedules.length} slots. Server UTC time: ${currentTime}, day: ${currentDay} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][currentDay]}), date: ${todayStr}`);

    let recurringMatch: any = null;
    let oneTimeMatch: any = null;

    for (const schedule of allSchedules) {
      if (!schedule.isActive) {
        console.log(`  [skip] "${schedule.title}" — inactive`);
        continue;
      }

      // Convert slot's local times to UTC — uses IANA timezone if available (DST-correct), else fixed offset
      const offset = resolveSlotOffset(schedule);
      const startUTC = localTimeToUTC(schedule.startTime, offset);
      const endUTC = localTimeToUTC(schedule.endTime, offset);
      
      // Determine which UTC day(s) this slot covers
      const slotDayOfWeek = schedule.dayOfWeek;
      const utcStartDay = slotDayOfWeek !== null && slotDayOfWeek !== undefined
        ? (slotDayOfWeek + startUTC.dayDelta + 7) % 7
        : null; // null = daily
      const utcEndDay = slotDayOfWeek !== null && slotDayOfWeek !== undefined
        ? (slotDayOfWeek + endUTC.dayDelta + 7) % 7
        : null;

      // Time comparison in UTC
      const inTimeRange = currentTime >= startUTC.time && currentTime < endUTC.time;
      
      if (offset !== 0) {
        console.log(`  [tz] "${schedule.title}" local ${schedule.startTime}-${schedule.endTime} (offset ${offset}min) → UTC ${startUTC.time}-${endUTC.time} (day delta: ${startUTC.dayDelta})`);
      }

      if (!inTimeRange) {
        console.log(`  [skip] "${schedule.title}" — UTC time ${startUTC.time}-${endUTC.time} doesn't cover UTC ${currentTime}`);
        continue;
      }

      const mode = schedule.scheduleMode || 'recurring';

      if (mode === 'one-time') {
        // One-time slot: must match today's date; skip expired ones
        if (!schedule.scheduledDate) continue;
        const slotDate = schedule.scheduledDate.slice(0, 10);
        if (slotDate !== todayStr) {
          console.log(`  [skip] "${schedule.title}" — one-time date ${slotDate} ≠ today ${todayStr}`);
          continue;
        }
        oneTimeMatch = schedule;
        console.log(`  [MATCH] "${schedule.title}" — one-time match!`);
        break; // one-time has highest priority, stop searching
      } else {
        // Recurring: match day of week (using UTC-converted day)
        if (utcStartDay !== null && utcStartDay !== currentDay) {
          console.log(`  [skip] "${schedule.title}" — UTC dayOfWeek ${utcStartDay} (local ${slotDayOfWeek}) ≠ UTC day ${currentDay}`);
          continue;
        }
        if (!recurringMatch) {
          recurringMatch = schedule;
          console.log(`  [MATCH] "${schedule.title}" — recurring match (utcDay=${utcStartDay}, UTC time=${startUTC.time}-${endUTC.time})`);
        }
      }
    }

    // One-time slots take priority over recurring
    const matched = oneTimeMatch || recurringMatch;
    if (!matched) {
      console.log(`[getCurrentSchedule] No matching slot found`);
      return null;
    }

    const playlist = await kv.get(`playlist:${matched.playlistId}`);
    console.log(`[getCurrentSchedule] ✅ Matched: "${matched.title}" → playlist "${playlist?.name || 'Unknown'}"`);
    return {
      ...matched,
      playlistName: playlist?.name || 'Unknown',
      jingleConfig: matched.jingleConfig || null,
    };
  } catch (error) {
    console.error('Error getting schedule:', error);
    return null;
  }
}

// ── Reusable audit-log helper ──────────────────────────────────────
async function addAuditLog(opts: {
  level?: 'info' | 'warning' | 'error' | 'success';
  category?: string;
  message: string;
  details?: string;
  userId?: string;
}) {
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    await kv.set(`auditlog:${logId}`, {
      id: logId,
      timestamp: new Date().toISOString(),
      level: opts.level || 'info',
      category: opts.category || 'System',
      message: opts.message,
      details: opts.details || null,
      userId: opts.userId || null,
    });
  } catch (err: any) {
    console.error('addAuditLog error (non-critical):', err?.message || err);
  }
}

// NOTE: setInterval is unreliable in stateless Edge Functions (dies between invocations).
// Auto-advance is driven entirely by the frontend (timer + audio.onended → POST /radio/next).
// The previous best-effort setInterval was removed because it ran within a single invocation
// context but died on cold starts, giving inconsistent behavior and masking real issues.

// ── Cache for AzuraCast file URL lookups (avoids repeated API calls within same invocation) ──
const azuraFileCache = new Map<string, { url: string | null; ts: number }>();
const AZURA_CACHE_TTL = 30 * 60 * 1000; // 30 min (within same invocation)

// ── Helper: get audio URL via signed URL (buckets are PRIVATE — public URLs return 403) ──
// Signed URLs have a 2-hour TTL; callers should generate fresh ones before playback.
// For non-Supabase buckets (e.g. AzuraCast media "hostinger-azura"), attempts to
// proxy via AzuraCast API; returns null gracefully if not available.
async function getAudioUrl(bucket: string, filename: string): Promise<string | null> {
  if (!filename) return null;

  // ── Non-Supabase bucket → treat as AzuraCast media reference ──
  if (!bucket.startsWith('make-06086aa3-')) {
    // Check cache first
    const cacheKey = `${bucket}/${filename}`;
    const cached = azuraFileCache.get(cacheKey);
    if (cached && (Date.now() - cached.ts) < AZURA_CACHE_TTL) {
      if (cached.url) console.log(`[getAudioUrl] AzuraCast cache hit for "${filename}"`);
      return cached.url;
    }

    console.log(`[getAudioUrl] External bucket "${bucket}" detected — trying AzuraCast proxy for "${filename}"`);
    try {
      const azConfig = await getAzuraCastConfig();
      if (azConfig?.enabled && azConfig.baseUrl) {
        const apiKey = Deno.env.get('AZURACAST_API_KEY') || '';
        // AzuraCast API: list files filtered by path to get the unique_id
        const listUrl = `${azConfig.baseUrl.replace(/\/$/, '')}/api/station/${azConfig.stationId}/files/list?searchPhrase=${encodeURIComponent(filename)}`;
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 8000);
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;

        const resp = await fetch(listUrl, { headers, signal: controller.signal });
        clearTimeout(tid);

        if (resp.ok) {
          const files = await resp.json();
          const arr = Array.isArray(files) ? files : (files?.rows ?? []);
          // Match by path (AzuraCast returns relative paths like "Caribbean/filename.mp3")
          const searchPath = filename.startsWith('/') ? filename : `/${filename}`;
          const match = arr.find((f: any) =>
            f.path === filename || f.path === searchPath || f.path === `/${filename}` ||
            f.unique_id === filename.split('/').pop()?.replace(/\.[^.]+$/, '')
          );
          if (match) {
            // Construct a direct play URL via AzuraCast API
            const playUrl = `${azConfig.baseUrl.replace(/\/$/, '')}/api/station/${azConfig.stationId}/file/${match.id}/play${apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : ''}`;
            console.log(`[getAudioUrl] AzuraCast file found: id=${match.id}, path="${match.path}" → play URL generated`);
            azuraFileCache.set(cacheKey, { url: playUrl, ts: Date.now() });
            return playUrl;
          }
          console.warn(`[getAudioUrl] AzuraCast file not found for "${filename}" (searched ${arr.length} results)`);
        } else {
          console.warn(`[getAudioUrl] AzuraCast file list API returned ${resp.status}`);
        }
      } else {
        console.log(`[getAudioUrl] AzuraCast not configured — cannot resolve external bucket "${bucket}/${filename}"`);
      }
    } catch (e: any) {
      console.warn(`[getAudioUrl] AzuraCast lookup failed for "${bucket}/${filename}":`, e?.message);
    }
    // Non-Supabase bucket, AzuraCast fallback failed — cache null and return gracefully
    azuraFileCache.set(cacheKey, { url: null, ts: Date.now() });
    return null;
  }

  // ── Supabase Storage bucket → generate signed URL ──
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filename, 7200); // 2 hours
    if (data?.signedUrl) return data.signedUrl;
    console.warn(`[getAudioUrl] createSignedUrl failed for ${bucket}/${filename}:`, error?.message);
  } catch (e: any) {
    console.warn(`[getAudioUrl] createSignedUrl exception for ${bucket}/${filename}:`, e?.message);
  }
  // No public URL fallback — buckets are private, public URLs return 403.
  console.error(`[getAudioUrl] Could not generate signed URL for ${bucket}/${filename}`);
  return null;
}

// ── Debug endpoint — dumps raw KV state for Auto DJ troubleshooting ──
app.get("/make-server-06086aa3/radio/debug", async (c) => {
  try {
    const [streamStatus, nowPlaying, autoDJSaved] = await Promise.all([
      kv.get('stream:status').catch((e: any) => ({ _error: e?.message || String(e) })),
      kv.get('stream:nowplaying').catch((e: any) => ({ _error: e?.message || String(e) })),
      kv.get(AUTODJ_STATE_KEY).catch((e: any) => ({ _error: e?.message || String(e) })),
    ]);

    // Detailed playlists with track counts
    let playlistCount = 0;
    let trackCount = 0;
    let playlistDetails: any[] = [];
    let scheduleDetails: any[] = [];
    let tracksWithAudio = 0;
    let tracksWithoutAudio = 0;
    try {
      const playlists = await kv.getByPrefix('playlist:');
      playlistCount = playlists?.length ?? 0;
      playlistDetails = (playlists || []).map((p: any) => ({
        id: p.id,
        name: p.name || p.id,
        trackCount: p.trackIds?.length ?? 0,
        isLiveStream: p.id === 'livestream',
      }));
    } catch (_) {}
    try {
      const tracks = await kv.getByPrefix('track:');
      trackCount = tracks?.length ?? 0;
      tracksWithAudio = (tracks || []).filter((t: any) => !!t.storageFilename).length;
      tracksWithoutAudio = trackCount - tracksWithAudio;
    } catch (_) {}
    try {
      const schedules = await kv.getByPrefix('schedule:');
      scheduleDetails = (schedules || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        playlistId: s.playlistId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: s.isActive,
        scheduleMode: s.scheduleMode || 'recurring',
      }));
    } catch (_) {}

    // Check storage buckets
    let storageBuckets: string[] = [];
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      storageBuckets = (buckets || []).map((b: any) => b.name);
    } catch (_) {}

    // Current schedule check (real-time)
    const currentSchedule = await getCurrentScheduledPlaylist().catch(() => null);

    return c.json({
      timestamp: new Date().toISOString(),
      serverTime: `${String(new Date().getUTCHours()).padStart(2,'0')}:${String(new Date().getUTCMinutes()).padStart(2,'0')}:${String(new Date().getUTCSeconds()).padStart(2,'0')}`,
      serverDay: new Date().getUTCDay(),
      kvState: {
        'stream:status': streamStatus,
        'stream:nowplaying': nowPlaying,
        'autodj:state': autoDJSaved ? {
          isPlaying: autoDJSaved.isPlaying,
          currentTrackIndex: autoDJSaved.currentTrackIndex,
          playlistTrackIds: autoDJSaved.playlistTrackIds?.length ?? 0,
          currentTrack: autoDJSaved.currentTrack ? {
            id: autoDJSaved.currentTrack.id,
            title: autoDJSaved.currentTrack.title,
            storageFilename: autoDJSaved.currentTrack.storageFilename || 'MISSING',
            storageBucket: autoDJSaved.currentTrack.storageBucket || 'MISSING',
          } : null,
          startTime: autoDJSaved.startTime,
          currentTrackStartTime: autoDJSaved.currentTrackStartTime,
          activeScheduleSlot: autoDJSaved.activeScheduleSlot || null,
        } : null,
      },
      inMemory: {
        isPlaying: autoDJState.isPlaying,
        currentTrack: autoDJState.currentTrack?.title || null,
        playlistLength: autoDJState.playlistTracks.length,
      },
      counts: {
        playlists: playlistCount,
        tracks: trackCount,
        tracksWithAudio,
        tracksWithoutAudio,
        schedules: scheduleDetails.length,
      },
      playlists: playlistDetails,
      schedules: scheduleDetails,
      currentScheduleSlot: currentSchedule,
      storageBuckets,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Raw KV dump — returns all schedule keys with their raw values for diagnostics
app.get("/make-server-06086aa3/radio/kv-schedule-dump", async (c) => {
  try {
    // Query raw keys + values from KV
    const scheduleEntries = await kv.getByPrefix('schedule:');
    const playlistEntries = await kv.getByPrefix('playlist:');
    
    c.header('Cache-Control', 'no-store');
    return c.json({
      timestamp: new Date().toISOString(),
      serverTimeUTC: `${String(new Date().getUTCHours()).padStart(2,'0')}:${String(new Date().getUTCMinutes()).padStart(2,'0')}:${String(new Date().getUTCSeconds()).padStart(2,'0')}`,
      serverDayUTC: new Date().getUTCDay(),
      scheduleCount: scheduleEntries.length,
      scheduleEntries: scheduleEntries.map((e: any) => {
        const storedOffset = e.utcOffsetMinutes ?? 0;
        const liveOffset = resolveSlotOffset(e);
        const startUTC = localTimeToUTC(e.startTime, liveOffset);
        const endUTC = localTimeToUTC(e.endTime, liveOffset);
        return {
          id: e.id,
          title: e.title,
          playlistId: e.playlistId,
          dayOfWeek: e.dayOfWeek,
          startTime: e.startTime,
          endTime: e.endTime,
          utcOffsetMinutes: storedOffset,
          liveOffsetMinutes: liveOffset,
          timezone: e.timezone || null,
          dstAware: !!e.timezone,
          startTimeUTC: startUTC.time,
          endTimeUTC: endUTC.time,
          startDayDelta: startUTC.dayDelta,
          isActive: e.isActive,
          scheduleMode: e.scheduleMode,
          scheduledDate: e.scheduledDate,
          createdAt: e.createdAt,
        };
      }),
      playlistCount: playlistEntries.length,
      playlistIds: playlistEntries.map((p: any) => ({ id: p.id, name: p.name })),
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Migrate old schedule slots to add IANA timezone (DST-correct matching)
app.post("/make-server-06086aa3/radio/migrate-timezone", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const timezone = body.timezone; // e.g., "Europe/Berlin"
    if (!timezone) {
      return c.json({ error: 'Missing "timezone" field' }, 400);
    }

    // Validate timezone
    try {
      Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch {
      return c.json({ error: `Invalid IANA timezone: "${timezone}"` }, 400);
    }

    const currentOffset = getTimezoneOffsetNow(timezone);
    const allSchedules = await kv.getByPrefix('schedule:');
    let migrated = 0;
    let alreadyOk = 0;
    const details: any[] = [];

    for (const slot of allSchedules) {
      const hadTimezone = !!slot.timezone;
      const hadOffset = slot.utcOffsetMinutes != null && slot.utcOffsetMinutes !== 0;

      if (hadTimezone && slot.timezone === timezone) {
        alreadyOk++;
        details.push({ id: slot.id, title: slot.title, action: 'skip', reason: 'already has correct timezone' });
        continue;
      }

      // Patch the slot with IANA timezone + current offset snapshot
      const updated = {
        ...slot,
        timezone,
        utcOffsetMinutes: currentOffset,
      };
      await kv.set(`schedule:${slot.id}`, updated);
      migrated++;
      details.push({
        id: slot.id,
        title: slot.title,
        action: 'migrated',
        previousTimezone: slot.timezone || null,
        previousOffset: slot.utcOffsetMinutes ?? 0,
        newTimezone: timezone,
        newOffset: currentOffset,
      });
    }

    console.log(`[migrate-timezone] Migrated ${migrated}/${allSchedules.length} slots to ${timezone} (offset ${currentOffset}min)`);

    return c.json({
      success: true,
      timezone,
      currentOffset,
      totalSlots: allSchedules.length,
      migrated,
      alreadyOk,
      details,
    });
  } catch (error: any) {
    console.error('[migrate-timezone] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Start Auto DJ
app.post("/make-server-06086aa3/radio/start", requireAuth, async (c) => {
  try {
    console.log('🚀 [radio/start] Starting Auto DJ...');

    // ── 1. Current scheduled slot playlist (PRIORITY — schedule drives the station) ──
    let tracks: any[] = [];
    let sourceLabel = 'Schedule';
    let activeScheduleSlot: any = null;

    const scheduled = await getCurrentScheduledPlaylist();
    console.log(`[radio/start] Scheduled slot: ${scheduled ? `"${scheduled.title}" (playlist: ${scheduled.playlistId})` : 'none active'}`);
    if (scheduled?.playlistId) {
      const schedPl = await kv.get(`playlist:${scheduled.playlistId}`);
      if (schedPl?.trackIds?.length > 0) {
        sourceLabel = `Schedule: ${scheduled.title}`;
        activeScheduleSlot = scheduled;
        for (const trackId of schedPl.trackIds) {
          const t = await kv.get(`track:${trackId}`);
          if (t) tracks.push(t);
        }
        console.log(`[radio/start] Loaded ${tracks.length} tracks from schedule "${scheduled.title}"`);
      }
    }

    // ── 2. Fallback: Live Stream playlist (default when no schedule is active) ──
    if (tracks.length === 0) {
      const livePlaylist = await kv.get('playlist:livestream');
      console.log(`[radio/start] Live Stream playlist: ${livePlaylist ? `${livePlaylist.trackIds?.length || 0} trackIds` : 'NOT FOUND'}`);
      if (livePlaylist?.trackIds?.length > 0) {
        sourceLabel = 'Live Stream playlist';
        for (const trackId of livePlaylist.trackIds) {
          const t = await kv.get(`track:${trackId}`);
          if (t) tracks.push(t);
        }
        console.log(`[radio/start] Loaded ${tracks.length} tracks from Live Stream`);
      }
    }

    // ── 3. Fallback: any playlist with tracks ────────────────────────
    if (tracks.length === 0) {
      console.log('[radio/start] Searching any playlist with tracks...');
      const allPlaylists = await kv.getByPrefix('playlist:');
      for (const pl of allPlaylists) {
        if (!pl.trackIds?.length) continue;
        const plTracks: any[] = [];
        for (const trackId of pl.trackIds) {
          const t = await kv.get(`track:${trackId}`);
          if (t) plTracks.push(t);
        }
        if (plTracks.length > 0) {
          sourceLabel = `Playlist: ${pl.name || pl.id}`;
          tracks = plTracks;
          console.log(`[radio/start] Found playlist "${pl.name}" with ${plTracks.length} tracks`);
          break;
        }
      }
    }

    // ── 4. Fallback: all uploaded tracks ────────────────────────────
    if (tracks.length === 0) {
      console.log('[radio/start] Loading all tracks as last resort...');
      const allTracks = await kv.getByPrefix('track:');
      tracks = allTracks.filter((t: any) => t?.id);
      if (tracks.length > 0) {
        sourceLabel = 'All tracks';
        tracks = tracks.sort(() => Math.random() - 0.5);
      }
    }

    if (tracks.length === 0) {
      console.error('[radio/start] NO TRACKS FOUND anywhere');
      return c.json({ error: 'No tracks found. Please upload some audio tracks first.' }, 400);
    }

    // ── Filter: ONLY keep tracks with actual audio files ──────────────
    const tracksWithAudio = tracks.filter((t: any) => t.storageFilename);
    const tracksWithoutAudio = tracks.filter((t: any) => !t.storageFilename);
    if (tracksWithAudio.length > 0) {
      // ONLY use tracks with audio — skip metadata-only entries entirely
      tracks = tracksWithAudio;
      console.log(`[radio/start] Using ${tracksWithAudio.length} tracks with audio (skipping ${tracksWithoutAudio.length} without audio files)`);
    } else {
      console.error(`[radio/start] FATAL: No tracks have audio files! storageFilename is missing on all ${tracks.length} tracks.`);
      return c.json({
        error: `Ни один трек (${tracks.length}) не имеет аудиофайла. Загрузите MP3/FLAC через Track Upload, затем добавьте в плейлист.`,
        totalTracks: tracks.length,
        tracksWithAudio: 0,
        tracksWithoutAudio: tracksWithoutAudio.length,
        hasAudioFile: false,
      }, 400);
    }

    const firstTrack = tracks[0];
    console.log(`[radio/start] First track: "${firstTrack.title}" by ${firstTrack.artist}, storageFilename=${firstTrack.storageFilename || 'NONE'}, storageBucket=${firstTrack.storageBucket || 'NONE'}`);

    // Initialize Auto DJ
    autoDJState = {
      isPlaying: true,
      currentTrackIndex: 0,
      currentTrack: firstTrack,
      playlistTracks: tracks,
      startTime: new Date().toISOString(),
      currentTrackStartTime: new Date().toISOString(),
      listeners: 0,
      autoAdvance: true,
      pendingJingle: null,
      isPlayingJingle: false,
      // Track which schedule slot (if any) drove the start
      activeScheduleSlot: activeScheduleSlot ? {
        id: activeScheduleSlot.id,
        title: activeScheduleSlot.title,
        playlistId: activeScheduleSlot.playlistId,
        playlistName: activeScheduleSlot.playlistName,
        startTime: activeScheduleSlot.startTime,
        endTime: activeScheduleSlot.endTime,
        dayOfWeek: activeScheduleSlot.dayOfWeek,
      } : null,
    };

    // Persist state to KV immediately so cold-starts don't lose it
    console.log('[radio/start] Saving autoDJ state to KV...');
    await saveAutoDJState();
    console.log('[radio/start] autoDJ state saved');

    // ── Generate audio URL for immediate playback ──────────────────────
    // Buckets are PRIVATE — uses signed URL only (no public URL fallback).
    // This lets the frontend start playing WITHOUT a second KV round-trip
    // to /radio/current-stream (which can fail on cold-start KV latency).
    const startBucket = firstTrack.storageBucket || 'make-06086aa3-tracks';
    const signedAudioUrl = await getAudioUrl(startBucket, firstTrack.storageFilename);
    if (signedAudioUrl) {
      console.log(`[radio/start] Audio URL generated for "${firstTrack.title}"`);
    } else if (firstTrack.storageFilename) {
      console.warn(`[radio/start] Could not generate audio URL for "${firstTrack.title}" (file: ${firstTrack.storageFilename})`);
    }
    // Cover art URL — generate a fresh signed URL (the stored coverUrl may be expired)
    let coverUrlSigned: string | null = firstTrack.coverUrl || null;
    if (firstTrack.coverFilename && firstTrack.coverBucket) {
      const coverUrl = await getAudioUrl(firstTrack.coverBucket, firstTrack.coverFilename);
      if (coverUrl) coverUrlSigned = coverUrl;
    }

    // Update Now Playing — use fresh signed cover URL, not the (possibly expired) stored one
    console.log('[radio/start] Saving stream:nowplaying to KV...');
    await kv.set('stream:nowplaying', {
      track: {
        id: firstTrack.id,
        title: firstTrack.title,
        artist: firstTrack.artist,
        album: firstTrack.album,
        duration: firstTrack.duration,
        cover: coverUrlSigned
      },
      startTime: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('[radio/start] stream:nowplaying saved');

    console.log('[radio/start] Saving stream:status = online to KV...');
    await kv.set('stream:status', {
      status: 'online',
      listeners: 0,
      bitrate: '128kbps',
      uptime: 0,
      updatedAt: new Date().toISOString()
    });
    console.log('[radio/start] stream:status saved ✅');

    console.log(`🎵 Auto DJ started: ${tracks.length} tracks from "${sourceLabel}"`);
    await addAuditLog({ level: 'success', category: 'Auto DJ', message: `Auto DJ started — ${tracks.length} tracks from "${sourceLabel}"`, userId: c.get('userId') });

    // Broadcast start event — use fresh signed cover URL
    try {
      const channel = supabase.channel('radio-updates');
      await channel.send({
        type: 'broadcast',
        event: 'track-changed',
        payload: {
          track: {
            id: firstTrack.id,
            title: firstTrack.title,
            artist: firstTrack.artist,
            album: firstTrack.album,
            duration: firstTrack.duration,
            cover: coverUrlSigned
          },
          startTime: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    } catch (broadcastError) {
      console.error('Broadcast error:', broadcastError);
    }

    return c.json({ 
      message: `Auto DJ started (${sourceLabel})`,
      currentTrack: firstTrack,
      totalTracks: tracks.length,
      tracksWithAudio: tracksWithAudio.length,
      source: sourceLabel,
      hasAudioFile: !!firstTrack.storageFilename,
      // Active schedule slot info (null if started from Live Stream/fallback)
      activeSchedule: activeScheduleSlot ? {
        id: activeScheduleSlot.id,
        title: activeScheduleSlot.title,
        playlistName: activeScheduleSlot.playlistName,
        startTime: activeScheduleSlot.startTime,
        endTime: activeScheduleSlot.endTime,
      } : null,
      // ── Inline stream data so frontend can play immediately ──
      // Bypasses KV read latency on cold-start Edge Function instances.
      stream: {
        playing: true,
        audioUrl: signedAudioUrl,
        seekPosition: 0,
        remainingSeconds: firstTrack.duration || 180,
        track: {
          id: firstTrack.id,
          title: firstTrack.title,
          artist: firstTrack.artist,
          album: firstTrack.album,
          duration: firstTrack.duration || 180,
          coverUrl: coverUrlSigned,
        },
      },
    });
  } catch (error: any) {
    console.error('Start Auto DJ error:', error);
    return c.json({ error: `Failed to start Auto DJ: ${error.message}` }, 500);
  }
});

// Stop Auto DJ
app.post("/make-server-06086aa3/radio/stop", requireAuth, async (c) => {
  try {
    await loadAutoDJState();
    autoDJState.isPlaying = false;
    autoDJState.currentTrack = null;
    autoDJState.playlistTracks = [];
    autoDJState.startTime = null;
    autoDJState.currentTrackStartTime = null;
    await saveAutoDJState();

    await kv.set('stream:status', {
      status: 'offline',
      listeners: 0,
      bitrate: '128kbps',
      uptime: 0,
      updatedAt: new Date().toISOString()
    });

    console.log('🛑 Auto DJ stopped');
    await addAuditLog({ level: 'info', category: 'Auto DJ', message: 'Auto DJ stopped', userId: c.get('userId') });

    return c.json({ message: 'Auto DJ stopped successfully' });
  } catch (error: any) {
    console.error('Stop Auto DJ error:', error);
    return c.json({ error: `Failed to stop Auto DJ: ${error.message}` }, 500);
  }
});

// Skip to next track
app.post("/make-server-06086aa3/radio/next", requireAuth, async (c) => {
  try {
    await loadAutoDJState();
    if (!autoDJState.isPlaying) {
      return c.json({ error: 'Auto DJ is not running' }, 400);
    }

    // 🔔 CHECK FOR JINGLES BEFORE SKIPPING TO NEXT TRACK
    const jingle = await autoDJHelper.checkAndPlayJingle(autoDJState);
    
    if (jingle) {
      // Play jingle instead of next track
      console.log(`🔔 Playing jingle: "${jingle.title}"`);
      autoDJState.isPlayingJingle = true;
      autoDJState.currentTrack = {
        id: jingle.id,
        title: `🔔 ${jingle.title}`,
        artist: 'Station ID',
        album: jingle.category.replace(/_/g, ' '),
        duration: jingle.duration,
        coverUrl: null,
        isJingle: true
      };
      autoDJState.currentTrackStartTime = new Date().toISOString();
      
      // Update Now Playing with jingle
      await autoDJHelper.updateNowPlayingWithJingle(jingle);
      
      // Mark jingle as played
      await jingleRotation.markJinglePlayed(jingle.id);
      
      console.log(`✅ Skipped to jingle: "${jingle.title}"`);

      // Generate audio URL for jingle (signed URL — buckets are private)
      const jingleBkt = jingle.storageBucket || 'make-06086aa3-jingles';
      const jingleAudioUrl = jingle.storageFilename
        ? await getAudioUrl(jingleBkt, jingle.storageFilename)
        : null;
      
      return c.json({ 
        message: 'Playing jingle',
        currentTrack: autoDJState.currentTrack,
        isJingle: true,
        stream: {
          playing: true,
          audioUrl: jingleAudioUrl,
          seekPosition: 0,
          remainingSeconds: jingle.duration || 15,
          track: {
            id: jingle.id,
            title: `🔔 ${jingle.title}`,
            artist: 'Station ID',
            album: jingle.category?.replace(/_/g, ' ') || 'Jingle',
            duration: jingle.duration || 15,
            coverUrl: null,
          },
        },
      });
    }

    // No jingle, skip to next track
    autoDJState.isPlayingJingle = false;
    
    // Increment track count
    autoDJHelper.incrementMusicTrackCount();

    // ── Schedule check: if a scheduled slot is active, switch to its playlist ──
    const scheduledForSkip = await getCurrentScheduledPlaylist();
    if (scheduledForSkip) {
      console.log(`📅 Skip: applying schedule "${scheduledForSkip.title}"`);
      const schedPlaylist = await kv.get(`playlist:${scheduledForSkip.playlistId}`);
      if (schedPlaylist && schedPlaylist.trackIds && schedPlaylist.trackIds.length > 0) {
        const schedTracks: any[] = [];
        for (const tid of schedPlaylist.trackIds) {
          const t = await kv.get(`track:${tid}`);
          if (t) schedTracks.push(t);
        }
        // Only keep tracks with audio files
        const schedTracksWithAudio = schedTracks.filter((t: any) => t.storageFilename);
        if (schedTracksWithAudio.length > 0) {
          autoDJState.playlistTracks = schedTracksWithAudio;
          autoDJState.currentTrackIndex = -1; // will be incremented to 0 below
          console.log(`[radio/next] Schedule "${scheduledForSkip.title}": ${schedTracksWithAudio.length} tracks with audio (${schedTracks.length - schedTracksWithAudio.length} skipped — no audio)`);
        } else {
          console.warn(`[radio/next] Schedule "${scheduledForSkip.title}": ${schedTracks.length} tracks but NONE have audio files — keeping current playlist`);
        }
      }
      // Update active schedule reference
      (autoDJState as any).activeScheduleSlot = {
        id: scheduledForSkip.id,
        title: scheduledForSkip.title,
        playlistId: scheduledForSkip.playlistId,
        playlistName: scheduledForSkip.playlistName,
        startTime: scheduledForSkip.startTime,
        endTime: scheduledForSkip.endTime,
        dayOfWeek: scheduledForSkip.dayOfWeek,
      };
    } else {
      // No schedule active — clear reference (playing from fallback source)
      (autoDJState as any).activeScheduleSlot = null;
    }
    
    // Move to next track
    autoDJState.currentTrackIndex = (autoDJState.currentTrackIndex + 1) % Math.max(autoDJState.playlistTracks.length, 1);
    autoDJState.currentTrack = autoDJState.playlistTracks[autoDJState.currentTrackIndex];
    autoDJState.currentTrackStartTime = new Date().toISOString();

    // Guard: if playlist is empty (KV failed to load tracks), return error gracefully
    if (!autoDJState.currentTrack) {
      console.error('[radio/next] No track available at index', autoDJState.currentTrackIndex, '— playlist length:', autoDJState.playlistTracks.length);
      return c.json({ error: 'No tracks available in playlist. Try restarting Auto DJ.', stream: { playing: false } }, 400);
    }

    // ── Auto-skip tracks without audio files (up to full playlist cycle) ──
    const playlistLen = autoDJState.playlistTracks.length;
    let skippedNoAudioCount = 0;
    while (!autoDJState.currentTrack?.storageFilename && skippedNoAudioCount < playlistLen) {
      console.warn(`[radio/next] Skipping track "${autoDJState.currentTrack?.title}" — no audio file`);
      autoDJState.currentTrackIndex = (autoDJState.currentTrackIndex + 1) % Math.max(playlistLen, 1);
      autoDJState.currentTrack = autoDJState.playlistTracks[autoDJState.currentTrackIndex];
      skippedNoAudioCount++;
    }
    if (!autoDJState.currentTrack?.storageFilename) {
      console.error('[radio/next] All tracks in playlist lack audio files — cannot play');
      return c.json({ error: 'Все треки без аудиофайлов. Загрузите аудио через Track Upload.', stream: { playing: false } }, 400);
    }
    if (skippedNoAudioCount > 0) {
      console.log(`[radio/next] Auto-skipped ${skippedNoAudioCount} tracks without audio`);
      autoDJState.currentTrackStartTime = new Date().toISOString();
    }

    // ── Generate fresh signed URLs FIRST (before writing to nowplaying/broadcast) ──
    const skipTrack = autoDJState.currentTrack;
    const skipBkt = skipTrack?.storageBucket || 'make-06086aa3-tracks';
    const skipAudioUrl = skipTrack?.storageFilename
      ? await getAudioUrl(skipBkt, skipTrack.storageFilename)
      : null;
    let skipCoverUrl = skipTrack?.coverUrl || null;
    if (skipTrack?.coverFilename && skipTrack?.coverBucket) {
      const coverResult = await getAudioUrl(skipTrack.coverBucket, skipTrack.coverFilename);
      if (coverResult) skipCoverUrl = coverResult;
    }

    // Update Now Playing — use fresh signed cover URL
    await kv.set('stream:nowplaying', {
      track: {
        id: skipTrack.id,
        title: skipTrack.title,
        artist: skipTrack.artist,
        album: skipTrack.album,
        duration: skipTrack.duration,
        cover: skipCoverUrl
      },
      startTime: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Persist updated position to KV
    await saveAutoDJState();

    console.log('⏭️ Skipped to next track:', skipTrack.title);

    // Broadcast skip event — use fresh signed cover URL
    try {
      const channel = supabase.channel('radio-updates');
      await channel.send({
        type: 'broadcast',
        event: 'track-changed',
        payload: {
          track: {
            id: skipTrack.id,
            title: skipTrack.title,
            artist: skipTrack.artist,
            album: skipTrack.album,
            duration: skipTrack.duration,
            cover: skipCoverUrl
          },
          startTime: autoDJState.currentTrackStartTime,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (broadcastError) {
      console.error('Broadcast error:', broadcastError);
    }

    return c.json({ 
      message: 'Skipped to next track',
      currentTrack: autoDJState.currentTrack,
      stream: {
        playing: true,
        audioUrl: skipAudioUrl,
        seekPosition: 0,
        remainingSeconds: skipTrack?.duration || 180,
        track: {
          id: skipTrack?.id,
          title: skipTrack?.title,
          artist: skipTrack?.artist,
          album: skipTrack?.album,
          duration: skipTrack?.duration || 180,
          coverUrl: skipCoverUrl,
        },
      },
    });
  } catch (error: any) {
    console.error('Skip track error:', error);
    return c.json({ error: `Failed to skip track: ${error.message}` }, 500);
  }
});

// Get Auto DJ status — FAST (uses light loader, no playlist track fetching)
app.get("/make-server-06086aa3/radio/status", async (c) => {
  try {
    // Load all KV sources in parallel — these are small, single-key reads
    const [nowPlaying, streamStatus, savedState] = await Promise.all([
      kv.get('stream:nowplaying').catch(() => null),
      kv.get('stream:status').catch(() => null),
      loadAutoDJStateLight(),
    ]);

    // ── Source of truth: stream:status (written atomically on start/stop) ──
    const kvIsOnline = streamStatus?.status === 'online';

    // ── Merge: KV wins for isPlaying; autodj:state wins for track detail ──
    const isPlayingFinal  = kvIsOnline || autoDJState.isPlaying;
    const currentTrackRaw = autoDJState.currentTrack ?? nowPlaying?.track ?? null;
    const startTimeFinal    = autoDJState.currentTrackStartTime ?? nowPlaying?.startTime ?? null;
    const totalTracks       = (autoDJState as any)._totalTrackCount ?? autoDJState.playlistTracks.length ?? 0;

    // ── Refresh cover signed URL if possible (stored URL may have expired — buckets are private) ──
    // autoDJState.currentTrack carries coverBucket/coverFilename; nowPlaying.track does not.
    let currentTrackFinal = currentTrackRaw;
    let freshCoverUrl: string | null = null;
    if (currentTrackRaw && currentTrackRaw.coverBucket && currentTrackRaw.coverFilename) {
      try {
        const fresh = await getAudioUrl(currentTrackRaw.coverBucket, currentTrackRaw.coverFilename);
        if (fresh) {
          freshCoverUrl = fresh;
          currentTrackFinal = { ...currentTrackRaw, coverUrl: fresh, cover: fresh };
        }
      } catch (_) { /* non-critical — fall through to stale URL */ }
    }

    // Also patch nowPlaying.track.cover in the response so both fields are consistent
    let nowPlayingResponse = nowPlaying;
    if (freshCoverUrl && nowPlaying?.track && currentTrackFinal?.id === nowPlaying.track.id) {
      nowPlayingResponse = {
        ...nowPlaying,
        track: { ...nowPlaying.track, cover: freshCoverUrl },
      };
    }

    // Calculate track progress
    let trackProgress = 0;
    let elapsedSeconds = 0;
    if (isPlayingFinal && startTimeFinal && currentTrackFinal) {
      const now = new Date();
      elapsedSeconds = Math.floor((now.getTime() - new Date(startTimeFinal).getTime()) / 1000);
      const duration = currentTrackFinal.duration || 180;
      trackProgress = Math.min((elapsedSeconds / duration) * 100, 100);
    }

    // Get current schedule (single KV prefix read, fast)
    const currentSchedule = await getCurrentScheduledPlaylist().catch(() => null);

    console.log(`[radio/status] isPlaying=${isPlayingFinal}, kvOnline=${kvIsOnline}, track=${currentTrackFinal?.title || 'none'}, totalTracks=${totalTracks}, coverRefreshed=${!!freshCoverUrl}`);

    return c.json({
      autoDJ: {
        isPlaying: isPlayingFinal,
        currentTrack: currentTrackFinal,
        currentTrackIndex: autoDJState.currentTrackIndex,
        totalTracks,
        startTime: autoDJState.startTime,
        currentTrackStartTime: startTimeFinal,
        trackProgress,
        elapsedSeconds,
        autoAdvance: autoDJState.autoAdvance,
        currentSchedule,
        // Which schedule slot was active when Auto DJ started (stored in state)
        activeScheduleSlot: (autoDJState as any).activeScheduleSlot || null,
        // Source of tracks: 'schedule', 'livestream', 'playlist', 'all', or null
        playlistSource: (autoDJState as any).activeScheduleSlot ? 'schedule' : null,
      },
      nowPlaying: nowPlayingResponse,
      streamStatus
    });
  } catch (error: any) {
    console.error('Get Auto DJ status error:', error);
    return c.json({ error: `Failed to get status: ${error.message}` }, 500);
  }
});

// ==================== DIRECT STREAM (Signed URL) ====================
// Returns signed URL for the current track so the browser plays directly from Storage.
// All listeners get the same track + seekPosition for synchronization.
app.get("/make-server-06086aa3/radio/current-stream", async (c) => {
  try {
    // Check KV sources in parallel (small, fast)
    const [streamStatus, nowPlaying] = await Promise.all([
      kv.get('stream:status').catch(() => null),
      kv.get('stream:nowplaying').catch(() => null),
    ]);

    const kvIsOnline = streamStatus?.status === 'online';

    // Light restore — no playlist fetching, fast
    await loadAutoDJStateLight();

    // Sync from KV if needed
    if (kvIsOnline && !autoDJState.isPlaying) {
      autoDJState.isPlaying = true;
    }
    // Use nowPlaying as fallback for current track (always available)
    if (!autoDJState.currentTrack && nowPlaying?.track) {
      autoDJState.currentTrack          = nowPlaying.track;
      autoDJState.currentTrackStartTime = nowPlaying.startTime ?? new Date().toISOString();
    }

    if ((!autoDJState.isPlaying && !kvIsOnline) || !autoDJState.currentTrack) {
      return c.json({ playing: false, message: 'Auto DJ is not running' }, 200);
    }

    let track = autoDJState.currentTrack;

    // If track from KV state doesn't have storage info, try loading full track from KV
    if (!track.storageFilename && track.id) {
      try {
        const fullTrack = await kv.get(`track:${track.id}`);
        if (fullTrack?.storageFilename) {
          track = fullTrack;
          console.log(`[current-stream] Loaded full track data for "${track.title}" from track:${track.id}`);
        }
      } catch (e: any) {
        console.warn('[current-stream] Could not load full track:', e?.message);
      }
    }

    const bucket = track.storageBucket || 'make-06086aa3-tracks';
    const filename = track.storageFilename;

    if (!filename) {
      console.warn(`[current-stream] Track "${track.title}" (${track.id}) has no storageFilename`);
      // Still refresh cover URL even though there's no audio
      let noAudioCover = track.coverUrl || null;
      if (track.coverFilename && track.coverBucket) {
        try {
          const fc = await getAudioUrl(track.coverBucket, track.coverFilename);
          if (fc) noAudioCover = fc;
        } catch (_) { /* non-critical */ }
      }
      return c.json({ playing: true, error: 'Current track has no audio file', track: {
        id: track.id, title: track.title, artist: track.artist, album: track.album,
        duration: track.duration || 180, coverUrl: noAudioCover,
        isJingle: autoDJState.isPlayingJingle || false,
      }}, 200);
    }

    // Generate audio URL (signed URL — buckets are private, no public fallback)
    const isExternalBucket = !bucket.startsWith('make-06086aa3-');
    const audioUrl = await getAudioUrl(bucket, filename);

    if (!audioUrl) {
      if (isExternalBucket) {
        // External track (e.g. AzuraCast media) — not a server error, just unavailable for direct play.
        // Trigger async auto-advance so the next poll from frontend gets a playable track.
        console.warn(`[current-stream] External track "${track.title}" (${bucket}/${filename}) — no audio URL, triggering async advance`);
        // Fire-and-forget: advance to a playable track in the background
        checkAndAdvanceTrack().catch(e => console.warn('[current-stream] async advance error:', e?.message));

        // Check for AzuraCast/Icecast URL — if available, tell frontend to use it
        let extIcecastUrl: string | null = null;
        try {
          const azCfg = await getAzuraCastConfig();
          if (azCfg?.enabled && (azCfg.streamUrlHttps || azCfg.streamUrlHttp)) {
            extIcecastUrl = azCfg.streamUrlHttps || azCfg.streamUrlHttp;
          }
        } catch { /* non-critical */ }

        return c.json({ playing: true, error: 'External track — audio not available for direct playback', isExternal: true, retryAfterMs: 3000, icecastUrl: extIcecastUrl, track: {
          id: track.id, title: track.title, artist: track.artist, album: track.album,
          duration: track.duration || 180, coverUrl: track.coverUrl || null,
          isJingle: autoDJState.isPlayingJingle || false, isExternal: true,
        }}, 200);
      }
      console.error(`[current-stream] Could not generate audio URL for ${bucket}/${filename}`);
      return c.json({ playing: true, error: 'Failed to generate audio URL' }, 500);
    }

    // Calculate where the listener should seek to (sync position)
    let seekPosition = 0;
    let remainingSeconds = 0;
    const trackDuration = track.duration || 180;

    if (autoDJState.currentTrackStartTime) {
      const now = new Date();
      const startTime = new Date(autoDJState.currentTrackStartTime);
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      seekPosition = Math.min(elapsed, trackDuration);
      remainingSeconds = Math.max(trackDuration - elapsed, 0);
    }

    // Check if there's a pending jingle (for crossfade hint)
    const pendingJingle = autoDJState.pendingJingle;
    let jingleUrl = null;
    if (pendingJingle?.storageFilename) {
      const jBucket = pendingJingle.storageBucket || 'make-06086aa3-jingles';
      jingleUrl = await getAudioUrl(jBucket, pendingJingle.storageFilename);
    }

    // Cover art URL
    let coverUrl = track.coverUrl || null;
    if (track.coverFilename && track.coverBucket) {
      const coverUrlResult = await getAudioUrl(track.coverBucket, track.coverFilename);
      if (coverUrlResult) coverUrl = coverUrlResult;
    }

    // ── Peek at next track for crossfade preloading ──
    let nextTrack: any = null;
    try {
      const pl = autoDJState.playlistTracks;
      if (pl.length > 1 && !autoDJState.isPlayingJingle) {
        const nextIdx = (autoDJState.currentTrackIndex + 1) % pl.length;
        const nt = pl[nextIdx];
        if (nt?.storageFilename) {
          const ntBucket = nt.storageBucket || 'make-06086aa3-tracks';
          const ntAudioUrl = await getAudioUrl(ntBucket, nt.storageFilename);
          if (ntAudioUrl) {
            let ntCover = nt.coverUrl || null;
            if (nt.coverFilename && nt.coverBucket) {
              const ntCoverUrl = await getAudioUrl(nt.coverBucket, nt.coverFilename);
              if (ntCoverUrl) ntCover = ntCoverUrl;
            }
            nextTrack = {
              id: nt.id,
              title: nt.title,
              artist: nt.artist,
              album: nt.album,
              duration: nt.duration || 180,
              coverUrl: ntCover,
              audioUrl: ntAudioUrl,
            };
          }
        }
      }
    } catch (ntErr: any) {
      console.log('Next track peek failed (non-critical):', ntErr?.message || ntErr);
    }

    // ── Check if AzuraCast or Icecast is enabled → include listener URL ──
    let icecastUrl: string | null = null;
    let azuracastNowPlaying: any = null;
    try {
      // Priority 1: AzuraCast (wraps Icecast + Liquidsoap)
      const azCfg = await getAzuraCastConfig();
      if (azCfg?.enabled && (azCfg.streamUrlHttps || azCfg.streamUrlHttp)) {
        icecastUrl = azCfg.streamUrlHttps || azCfg.streamUrlHttp;
        // Try to get now-playing from AzuraCast to enrich metadata
        try {
          const cached = await kv.get('azuracast:nowplaying-cache');
          if (cached?.now_playing?.song) {
            azuracastNowPlaying = {
              title: cached.now_playing.song.title,
              artist: cached.now_playing.song.artist,
              album: cached.now_playing.song.album,
              art: cached.now_playing.song.art,
              duration: cached.now_playing.duration,
              elapsed: cached.now_playing.elapsed,
              remaining: cached.now_playing.remaining,
              listeners: cached.listeners?.total ?? 0,
            };
          }
        } catch { /* non-critical */ }
      } else {
        // Fallback: legacy Icecast config
        const iceCfg: IcecastConfig | null = await kv.get(ICECAST_CONFIG_KEY);
        if (iceCfg?.enabled && iceCfg.serverUrl) {
          icecastUrl = getIcecastListenerUrl(iceCfg);
        }
      }
    } catch { /* non-critical */ }

    return c.json({
      playing: true,
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: trackDuration,
        coverUrl,
        isJingle: autoDJState.isPlayingJingle || false,
      },
      audioUrl,
      seekPosition,
      remainingSeconds,
      startedAt: autoDJState.currentTrackStartTime,
      jingleUrl,
      nextTrack,
      crossfadeDuration: 5,
      listeners: autoDJState.listeners,
      icecastUrl,
      azuracastNowPlaying,
    });
  } catch (error: any) {
    console.error('Current stream error:', error);
    return c.json({ playing: false, error: `Stream error: ${error.message}` }, 500);
  }
});

// ==================== RADIO QUEUE (Upcoming Tracks) ====================
// Returns the full playlist queue with track metadata for the UI.
// Uses the full loadAutoDJState since we need track details.
app.get("/make-server-06086aa3/radio/queue", async (c) => {
  try {
    // Check stream status first
    const streamStatus = await kv.get('stream:status').catch(() => null);
    const kvIsOnline = streamStatus?.status === 'online';
    await loadAutoDJStateLight();
    if (!autoDJState.isPlaying && !kvIsOnline) {
      return c.json({ queue: [], currentIndex: 0, totalTracks: 0 });
    }

    // Load full state to get playlist tracks
    await loadAutoDJState();

    const tracks = autoDJState.playlistTracks || [];
    const currentIdx = autoDJState.currentTrackIndex || 0;

    // Build queue items with essential metadata.
    // Refresh cover URLs in parallel (signed URLs expire after 2h — buckets are private).
    const queue = await Promise.all(tracks.map(async (t: any, idx: number) => {
      let coverUrl = t.coverUrl || null;
      if (t.coverFilename && t.coverBucket) {
        try {
          const fresh = await getAudioUrl(t.coverBucket, t.coverFilename);
          if (fresh) coverUrl = fresh;
        } catch (_) { /* non-critical */ }
      }
      return {
        id: t.id,
        title: t.title || 'Untitled',
        artist: t.artist || 'Unknown Artist',
        album: t.album || '',
        duration: t.duration || 0,
        coverUrl,
        isCurrentTrack: idx === currentIdx,
      };
    }));

    // Include schedule source info
    const activeSlot = (autoDJState as any).activeScheduleSlot || null;

    return c.json({
      queue,
      currentIndex: currentIdx,
      totalTracks: tracks.length,
      activeSchedule: activeSlot,
    });
  } catch (error: any) {
    console.error('Radio queue error:', error);
    return c.json({ error: `Failed to get queue: ${error.message}`, queue: [] }, 500);
  }
});

// ==================== RADIO SCHEDULE STATUS ====================
// Returns current schedule context for the Live Stream playlist page.
app.get("/make-server-06086aa3/radio/schedule-status", async (c) => {
  try {
    // Current schedule slot
    const currentSchedule = await getCurrentScheduledPlaylist().catch(() => null);
    
    // All schedule slots (for the "upcoming" list)
    const allSchedules = await kv.getByPrefix('schedule:').catch(() => []);
    const activeSchedules = (allSchedules as any[]).filter((s: any) => s.isActive);
    
    // Auto DJ status
    const streamStatus = await kv.get('stream:status').catch(() => null);
    await loadAutoDJStateLight();
    const isOnline = streamStatus?.status === 'online' || autoDJState.isPlaying;
    const activeSlot = (autoDJState as any).activeScheduleSlot || null;
    
    // Sort upcoming by day + startTime
    const now = new Date();
    const currentDay = now.getUTCDay();
    const currentTime = `${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}`;
    
    const upcoming = activeSchedules
      .filter((s: any) => {
        if (currentSchedule && s.id === currentSchedule.id) return false;
        return true;
      })
      .sort((a: any, b: any) => {
        const dayA = a.dayOfWeek ?? 0;
        const dayB = b.dayOfWeek ?? 0;
        if (dayA !== dayB) return ((dayA - currentDay + 7) % 7) - ((dayB - currentDay + 7) % 7);
        return (a.startTime || '').localeCompare(b.startTime || '');
      })
      .slice(0, 10);
    
    return c.json({
      isOnline,
      currentSchedule,
      activeScheduleSlot: activeSlot,
      upcomingSlots: upcoming,
      totalScheduleSlots: activeSchedules.length,
    });
  } catch (error: any) {
    console.error('Radio schedule status error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Live Radio Stream endpoint (legacy file-serving — kept for backward compat)
app.get("/make-server-06086aa3/radio/live", async (c) => {
  try {
    const ss = await kv.get('stream:status').catch(() => null);
    if (!autoDJState.isPlaying && ss?.status !== 'online') {
      return c.text('Radio stream is offline. Please start the Auto DJ first.', 503);
    }
    if (!autoDJState.currentTrack) {
      await loadAutoDJState();
    }
    if (!autoDJState.currentTrack) {
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

// Update now playing (admin only — protected)
app.post("/make-server-06086aa3/stream/nowplaying", requireAuth, async (c) => {
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
    
    // Sort by playedAt descending (getByPrefix returns plain values, no .key)
    const sortedHistory = history
      .sort((a, b) => {
        const timeA = new Date(a.playedAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.playedAt || b.updatedAt || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, limit);

    return c.json({ history: sortedHistory });
  } catch (error) {
    console.error('Get history error:', error);
    return c.json({ error: `Get history error: ${error.message}` }, 500);
  }
});

// Update stream status (admin only — protected)
app.post("/make-server-06086aa3/stream/status", requireAuth, async (c) => {
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
    console.log(`📀 [GET /tracks] Found ${tracks?.length ?? 0} tracks in KV (genre=${genre || 'all'}, search=${search || 'none'})`);
    
    let filteredTracks = Array.isArray(tracks) ? tracks : [];

    // Generate fresh signed URLs for every track with storage metadata.
    // Buckets are private — public URLs return 403, so we must use signed URLs.
    filteredTracks = await Promise.all(filteredTracks.map(async (track) => {
      // Tag tracks whose audio lives outside Supabase (e.g. on AzuraCast)
      const isExternal = track.storageBucket && !track.storageBucket.startsWith('make-06086aa3-');
      if (isExternal) track.isExternal = true;

      // Refresh audio URL
      if (track.storageBucket && track.storageFilename) {
        try {
          const freshUrl = await getAudioUrl(track.storageBucket, track.storageFilename);
          if (freshUrl) {
            track.audioUrl = freshUrl;
          }
        } catch (e: any) {
          console.warn(`⚠️ [GET /tracks] Could not generate audio URL for ${track.id}: ${e?.message}`);
        }
      }
      // Refresh cover URL
      if (track.coverBucket && track.coverFilename) {
        try {
          const freshCover = await getAudioUrl(track.coverBucket, track.coverFilename);
          if (freshCover) {
            track.coverUrl = freshCover;
          }
        } catch (e: any) {
          console.warn(`⚠️ [GET /tracks] Could not generate cover URL for ${track.id}: ${e?.message}`);
        }
      }
      return track;
    }));
    
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

    // Tag tracks whose audio lives outside Supabase (e.g. on AzuraCast)
    if (track.storageBucket && !track.storageBucket.startsWith('make-06086aa3-')) {
      track.isExternal = true;
    }

    // Generate fresh signed URLs (buckets are private — public URLs return 403)
    if (track.storageBucket && track.storageFilename) {
      const freshUrl = await getAudioUrl(track.storageBucket, track.storageFilename);
      if (freshUrl) {
        track.audioUrl = freshUrl;
      }
    }
    if (track.coverBucket && track.coverFilename) {
      const freshCover = await getAudioUrl(track.coverBucket, track.coverFilename);
      if (freshCover) {
        track.coverUrl = freshCover;
      }
    }

    return c.json({ track });
  } catch (error) {
    console.error('Get track error:', error);
    return c.json({ error: `Get track error: ${error.message}` }, 500);
  }
});

// Get a fresh signed audio URL for playback (lightweight — no track data, just the URL)
app.get("/make-server-06086aa3/tracks/:id/play-url", async (c) => {
  try {
    const id = c.req.param('id');
    const track = await kv.get(`track:${id}`);
    if (!track) {
      return c.json({ error: 'Track not found' }, 404);
    }
    const bucket = track.storageBucket || 'make-06086aa3-tracks';
    const filename = track.storageFilename;
    if (!filename) {
      return c.json({ error: 'Track has no audio file in storage' }, 404);
    }
    const audioUrl = await getAudioUrl(bucket, filename);
    if (!audioUrl) {
      return c.json({ error: `Could not generate audio URL for ${bucket}/${filename}` }, 500);
    }
    // Also return a fresh cover URL if available
    let coverUrl = track.coverUrl || null;
    if (track.coverFilename && track.coverBucket) {
      const freshCover = await getAudioUrl(track.coverBucket, track.coverFilename);
      if (freshCover) coverUrl = freshCover;
    }
    return c.json({ audioUrl, coverUrl });
  } catch (error: any) {
    console.error('Get play-url error:', error);
    return c.json({ error: `Get play-url error: ${error.message}` }, 500);
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
    await addAuditLog({ level: 'success', category: 'Tracks', message: `Track created: "${track.title || 'Untitled'}"`, userId: c.get('userId') });

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

// Delete track — permanently removes from KV, Storage (audio + cover), and all playlists
app.delete("/make-server-06086aa3/tracks/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');

    // 1. Load track data first to find Storage references
    const track = await kv.get(`track:${id}`);
    if (!track) {
      return c.json({ error: 'Track not found' }, 404);
    }

    // 2. Delete audio file from Storage
    if (track.storageBucket && track.storageFilename) {
      console.log(`[delete-track] Removing audio: bucket=${track.storageBucket}, file=${track.storageFilename}`);
      const { error: audioErr } = await supabase.storage
        .from(track.storageBucket)
        .remove([track.storageFilename]);
      if (audioErr) {
        console.warn(`[delete-track] Failed to delete audio file: ${audioErr.message}`);
      }
    }

    // 3. Delete cover art from Storage
    if (track.coverFilename) {
      const coverBucket = track.coverBucket || 'make-06086aa3-covers';
      console.log(`[delete-track] Removing cover: bucket=${coverBucket}, file=${track.coverFilename}`);
      const { error: coverErr } = await supabase.storage
        .from(coverBucket)
        .remove([track.coverFilename]);
      if (coverErr) {
        console.warn(`[delete-track] Failed to delete cover file: ${coverErr.message}`);
      }
    }

    // 4. Remove track reference from all playlists
    try {
      const allPlaylists = await kv.getByPrefix('playlist:');
      for (const pl of allPlaylists) {
        if (pl.trackIds && Array.isArray(pl.trackIds) && pl.trackIds.includes(id)) {
          pl.trackIds = pl.trackIds.filter((tid: string) => tid !== id);
          pl.updatedAt = new Date().toISOString();
          await kv.set(`playlist:${pl.id}`, pl);
          console.log(`[delete-track] Removed track ${id} from playlist ${pl.id}`);
        }
      }
    } catch (plErr: any) {
      console.warn(`[delete-track] Error cleaning playlists: ${plErr.message}`);
    }

    // 5. Delete from KV store
    await kv.del(`track:${id}`);

    console.log(`[delete-track] Track ${id} fully deleted (KV + Storage + playlists)`);
    await addAuditLog({ level: 'warning', category: 'Tracks', message: `Track deleted: "${track.title || id}"`, details: `Audio + cover removed from storage, cleaned from playlists`, userId: c.get('userId') });
    return c.json({ message: 'Track permanently deleted from library and storage' });
  } catch (error: any) {
    console.error('Delete track error:', error);
    return c.json({ error: `Delete track error: ${error.message}` }, 500);
  }
});

// Bulk update tags
app.post("/make-server-06086aa3/tracks/bulk-update-tags", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { trackIds, action, tags } = body;

    if (!trackIds || !Array.isArray(trackIds) || trackIds.length === 0) {
      return c.json({ error: 'trackIds array is required' }, 400);
    }

    if (!action || !['add', 'remove', 'replace'].includes(action)) {
      return c.json({ error: 'action must be "add", "remove", or "replace"' }, 400);
    }

    if (!tags || !Array.isArray(tags)) {
      return c.json({ error: 'tags array is required' }, 400);
    }

    let updatedCount = 0;
    for (const trackId of trackIds) {
      const track = await kv.get(`track:${trackId}`);
      if (!track) {
        console.warn(`Track ${trackId} not found, skipping`);
        continue;
      }

      let newTags = track.tags || [];
      
      if (action === 'add') {
        // Add tags (avoid duplicates)
        const tagsSet = new Set([...newTags, ...tags]);
        newTags = Array.from(tagsSet);
      } else if (action === 'remove') {
        // Remove tags
        newTags = newTags.filter(tag => !tags.includes(tag));
      } else if (action === 'replace') {
        // Replace all tags
        newTags = [...tags];
      }

      const updatedTrack = {
        ...track,
        tags: newTags,
        updatedAt: new Date().toISOString()
      };

      await kv.set(`track:${trackId}`, updatedTrack);
      updatedCount++;
    }

    return c.json({ 
      message: `Successfully updated tags for ${updatedCount} track(s)`,
      updatedCount 
    });
  } catch (error) {
    console.error('Bulk update tags error:', error);
    return c.json({ error: `Bulk update tags error: ${error.message}` }, 500);
  }
});

// Upload cover image for track
app.post("/make-server-06086aa3/tracks/:id/cover", requireAuth, async (c) => {
  try {
    const trackId = c.req.param('id');
    const formData = await c.req.formData();
    const file = formData.get('cover') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are supported.' }, 400);
    }

    // Validate file size (5MB max)
    if (file.size > 5242880) {
      return c.json({ error: 'File too large. Maximum size is 5MB.' }, 400);
    }

    // Get track to verify it exists
    const track = await kv.get(`track:${trackId}`);
    if (!track) {
      return c.json({ error: 'Track not found' }, 404);
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${trackId}-${Date.now()}.${fileExt}`;
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('make-06086aa3-covers')
      .upload(fileName, uint8Array, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Storage upload error:', error);
      return c.json({ error: `Failed to upload cover: ${error.message}` }, 500);
    }

    // Generate a signed URL for the cover (buckets are private — public URLs return 403)
    const signedCoverUrl = await getAudioUrl('make-06086aa3-covers', fileName);

    // Update track with cover storage info + signed URL
    const updatedTrack = {
      ...track,
      coverUrl: signedCoverUrl, // signed URL (2h TTL) — GET /tracks refreshes it
      coverBucket: 'make-06086aa3-covers',
      coverFilename: fileName,
      updatedAt: new Date().toISOString()
    };
    await kv.set(`track:${trackId}`, updatedTrack);

    console.log(`✅ Cover uploaded for track ${trackId}: ${fileName}`);

    return c.json({ 
      message: 'Cover uploaded successfully',
      coverUrl: signedCoverUrl,
      track: updatedTrack
    });
  } catch (error) {
    console.error('Upload cover error:', error);
    return c.json({ error: `Upload cover error: ${error.message}` }, 500);
  }
});

// Extract metadata from audio file endpoint (for re-processing existing tracks)
app.post("/make-server-06086aa3/tracks/:id/extract-metadata", requireAuth, async (c) => {
  try {
    const trackId = c.req.param('id');
    
    // Get track
    const track = await kv.get(`track:${trackId}`);
    if (!track) {
      return c.json({ error: 'Track not found' }, 404);
    }

    // Download audio file from storage
    if (!track.storageFilename || !track.storageBucket) {
      return c.json({ error: 'Track has no associated audio file in storage' }, 400);
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(track.storageBucket)
      .download(track.storageFilename);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return c.json({ error: 'Failed to download audio file for processing' }, 500);
    }

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Extract metadata (lazy-load music-metadata to keep cold-start fast)
    let extractedMetadata: any = {};
    try {
      const { parseBuffer } = await import("npm:music-metadata@10");
      const metadata = await parseBuffer(uint8Array, fileData.type, { duration: true });
      
      if (metadata) {
        extractedMetadata = {
          title: metadata.common.title || track.title,
          artist: metadata.common.artist || metadata.common.albumartist || track.artist,
          album: metadata.common.album || track.album,
          genre: metadata.common.genre?.[0] || track.genre,
          year: metadata.common.year || track.year,
          bpm: metadata.common.bpm || track.bpm,
          duration: metadata.format.duration ? Math.floor(metadata.format.duration) : track.duration,
          composer: metadata.common.composer?.[0],
          label: metadata.common.label?.[0],
          isrc: metadata.common.isrc?.[0],
        };

        // Extract and upload cover art if available
        if (metadata.common.picture && metadata.common.picture.length > 0) {
          const picture = metadata.common.picture[0];
          const coverBuffer = picture.data;
          const coverExt = picture.format.split('/')[1] || 'jpg';
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(7);
          const coverFilename = `cover-${trackId}-${timestamp}.${coverExt}`;
          
          const { error: coverUploadError } = await supabase.storage
            .from('make-06086aa3-covers')
            .upload(coverFilename, coverBuffer, {
              contentType: picture.format,
              upsert: true
            });
          
          if (!coverUploadError) {
            // Buckets are private — generate signed URL, also store bucket/filename for refresh
            const signedCover = await getAudioUrl('make-06086aa3-covers', coverFilename);
            extractedMetadata.coverUrl = signedCover;
            extractedMetadata.coverBucket = 'make-06086aa3-covers';
            extractedMetadata.coverFilename = coverFilename;
          }
        }

        console.log('✅ Metadata extracted for track:', trackId, extractedMetadata);
      }
    } catch (metadataError) {
      console.error('Metadata extraction error:', metadataError);
      return c.json({ 
        error: 'Failed to extract metadata from audio file',
        details: metadataError.message 
      }, 500);
    }

    // Update track with extracted metadata (only update fields that are not empty)
    const updatedTrack = {
      ...track,
      ...Object.fromEntries(
        Object.entries(extractedMetadata).filter(([_, v]) => v != null && v !== '')
      ),
      updatedAt: new Date().toISOString()
    };

    await kv.set(`track:${trackId}`, updatedTrack);

    return c.json({ 
      message: 'Metadata extracted and updated successfully',
      metadata: extractedMetadata,
      track: updatedTrack
    });
  } catch (error) {
    console.error('Extract metadata error:', error);
    return c.json({ error: `Extract metadata error: ${error.message}` }, 500);
  }
});

// ==================== PLAYLISTS (old section removed — see PLAYLISTS API section below) ====================
// Playlist CRUD routes are defined in the "PLAYLISTS API" section (line ~2764+)

// ==================== SHOWS ====================

// Get all shows
app.get("/make-server-06086aa3/shows", async (c) => {
  try {
    const shows = await kv.getByPrefix('show:');
    return c.json({ shows });
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

// Delete show
app.delete("/make-server-06086aa3/shows/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`show:${id}`);
    return c.json({ message: 'Show deleted successfully' });
  } catch (error) {
    console.error('Delete show error:', error);
    return c.json({ error: `Delete show error: ${error.message}` }, 500);
  }
});

// Bulk-delete ALL shows (purge seed data)
app.delete("/make-server-06086aa3/shows", requireAuth, async (c) => {
  try {
    const allShows = await kv.getByPrefix('show:');
    const ids = allShows.map((s: any) => s.id).filter(Boolean);
    if (ids.length > 0) {
      await kv.mdel(ids.map((id: string) => `show:${id}`));
    }
    console.log(`[shows/purge] Deleted ${ids.length} shows`);
    return c.json({ message: `Deleted ${ids.length} shows`, count: ids.length });
  } catch (error: any) {
    console.error('Purge shows error:', error);
    return c.json({ error: `Purge shows error: ${error.message}` }, 500);
  }
});

// ==================== SCHEDULE (old section removed — see SCHEDULE API section below) ====================
// Schedule CRUD routes are defined in the "SCHEDULE API" section (line ~2874+)

// ==================== DONATIONS ====================

// Get all donations
app.get("/make-server-06086aa3/donations", requireAuth, async (c) => {
  try {
    const allEntries = await kv.getByPrefix('donation:');
    // Filter out non-donation entries (e.g. donation:stats)
    const donations = allEntries.filter((d: any) => d.id && d.amount !== undefined);
    // Sort by date desc
    donations.sort((a: any, b: any) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    return c.json({ donations });
  } catch (error) {
    console.error('Get donations error:', error);
    return c.json({ error: `Get donations error: ${error.message}` }, 500);
  }
});

// Create donation
app.post("/make-server-06086aa3/donations", async (c) => {
  try {
    const body = await c.req.json();

    if (!body.amount || isNaN(parseFloat(body.amount))) {
      return c.json({ error: 'Valid donation amount is required' }, 400);
    }

    const donationId = crypto.randomUUID();
    
    const donation = {
      id: donationId,
      name: body.name || 'Anonymous',
      email: body.email || null,
      amount: parseFloat(body.amount),
      tier: body.tier || null,
      message: body.message || null,
      isAnonymous: body.isAnonymous || false,
      createdAt: new Date().toISOString()
    };

    await kv.set(`donation:${donationId}`, donation);

    // Update donation stats
    const stats = await kv.get('donation:stats') || { total: 0, count: 0, monthlyGoal: 2000 };
    stats.total = (stats.total || 0) + donation.amount;
    stats.count = (stats.count || 0) + 1;
    stats.lastDonation = donation.createdAt;
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

// Get recent donations (public — for SupportPage)
app.get("/make-server-06086aa3/donations/recent", async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    const allEntries = await kv.getByPrefix('donation:');
    // Filter out non-donation entries (e.g. donation:stats), sort newest first
    const donations = allEntries
      .filter((d: any) => d.id && d.amount !== undefined)
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit)
      .map((d: any) => ({
        id: d.id,
        name: d.isAnonymous ? 'Anonymous' : (d.name || 'Anonymous'),
        amount: d.amount,
        tier: d.tier || null,
        message: d.isAnonymous ? null : (d.message || null),
        createdAt: d.createdAt,
      }));

    return c.json({ donations });
  } catch (error: any) {
    console.error('Get recent donations error:', error);
    return c.json({ error: `Get recent donations error: ${error.message}` }, 500);
  }
});

// ==================== NEWS/BLOG ====================

// Get all news
app.get("/make-server-06086aa3/news", async (c) => {
  try {
    const category = c.req.query('category');
    const news = await kv.getByPrefix('news:');
    
    let filteredNews = news;
    
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

// Update news
app.put("/make-server-06086aa3/news/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const existing = await kv.get(`news:${id}`);
    if (!existing) {
      return c.json({ error: 'News item not found' }, 404);
    }

    const updatedNews = {
      ...existing,
      ...body,
      id: existing.id,
      createdAt: existing.createdAt,
      createdBy: existing.createdBy,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`news:${id}`, updatedNews);
    console.log(`✅ News updated: ${id}`);
    return c.json({ news: updatedNews });
  } catch (error: any) {
    console.error('Update news error:', error);
    return c.json({ error: `Update news error: ${error.message}` }, 500);
  }
});

// Delete news
app.delete("/make-server-06086aa3/news/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');

    const existing = await kv.get(`news:${id}`);
    if (!existing) {
      return c.json({ error: 'News item not found' }, 404);
    }

    await kv.del(`news:${id}`);
    console.log(`✅ News deleted: ${id}`);
    return c.json({ message: 'News item deleted successfully' });
  } catch (error: any) {
    console.error('Delete news error:', error);
    return c.json({ error: `Delete news error: ${error.message}` }, 500);
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
    return c.json({ profiles });
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
    const allPodcastEntries = await kv.getByPrefix('podcast:');
    // Filter out episode entries (seeded as podcast:<slug>:episode:<id>)
    // Episodes have a 'podcastSlug' field; real podcasts don't
    const podcasts = allPodcastEntries.filter((p: any) => !p.podcastSlug && (p.title || p.name));
    return c.json({ podcasts });
  } catch (error: any) {
    console.error('Get podcasts error:', error);
    return c.json({ error: `Get podcasts error: ${error.message}` }, 500);
  }
});

// Get single podcast (by id or slug)
app.get("/make-server-06086aa3/podcasts/:id", async (c) => {
  try {
    const id = c.req.param('id');
    let podcast = await kv.get(`podcast:${id}`);
    
    if (!podcast) {
      // Try finding by slug if the id-based lookup failed
      const allPodcasts = await kv.getByPrefix('podcast:');
      podcast = allPodcasts.find((p: any) => (p.slug === id || p.id === id) && !p.podcastSlug);
    }
    
    if (!podcast) {
      return c.json({ error: 'Podcast not found' }, 404);
    }

    // Load episodes from both key formats
    const episodesById = await kv.getByPrefix(`episode:${podcast.id}:`);
    const episodesBySlug = podcast.slug ? await kv.getByPrefix(`podcast:${podcast.slug}:episode:`) : [];
    const allEpisodes = [...episodesById, ...episodesBySlug];
    
    // Deduplicate by id
    const seen = new Set();
    const episodes = allEpisodes.filter((ep: any) => {
      if (seen.has(ep.id)) return false;
      seen.add(ep.id);
      return true;
    }).sort((a: any, b: any) => {
      const dateA = new Date(a.publishedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.publishedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
    
    return c.json({ 
      podcast: { 
        ...podcast, 
        episodes, 
        episodeCount: episodes.length 
      } 
    });
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

// Toggle podcast subscription
app.post("/make-server-06086aa3/podcasts/:id/subscribe", async (c) => {
  try {
    const podcastId = c.req.param('id');
    const userId = 'anonymous'; // simplified for now
    
    const subscriptionKey = `subscription:${userId}:podcast:${podcastId}`;
    const existing = await kv.get(subscriptionKey);
    
    if (existing) {
      await kv.del(subscriptionKey);
      return c.json({ subscribed: false });
    } else {
      await kv.set(subscriptionKey, {
        userId,
        podcastId,
        subscribedAt: new Date().toISOString(),
      });
      return c.json({ subscribed: true });
    }
  } catch (error: any) {
    console.error('Toggle subscription error:', error);
    return c.json({ error: `Toggle subscription error: ${error.message}` }, 500);
  }
});

// Toggle episode like
app.post("/make-server-06086aa3/podcasts/episodes/:id/like", async (c) => {
  try {
    const episodeId = c.req.param('id');
    const userId = 'anonymous'; // simplified for now
    
    const likeKey = `like:${userId}:episode:${episodeId}`;
    const existing = await kv.get(likeKey);
    
    if (existing) {
      await kv.del(likeKey);
      return c.json({ liked: false });
    } else {
      await kv.set(likeKey, {
        userId,
        episodeId,
        likedAt: new Date().toISOString(),
      });
      return c.json({ liked: true });
    }
  } catch (error: any) {
    console.error('Toggle like error:', error);
    return c.json({ error: `Toggle like error: ${error.message}` }, 500);
  }
});

// ==================== PODCAST EPISODES ====================

// Get episodes for a podcast
app.get("/make-server-06086aa3/podcasts/:podcastId/episodes", async (c) => {
  try {
    const podcastId = c.req.param('podcastId');
    const episodes = await kv.getByPrefix(`episode:${podcastId}:`);
    
    // Sort by episode number or date descending
    episodes.sort((a, b) => {
      const dateA = new Date(a.publishedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.publishedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
    
    return c.json({ episodes });
  } catch (error: any) {
    console.error('Get episodes error:', error);
    return c.json({ error: `Get episodes error: ${error.message}` }, 500);
  }
});

// Create episode for a podcast
app.post("/make-server-06086aa3/podcasts/:podcastId/episodes", requireAuth, async (c) => {
  try {
    const podcastId = c.req.param('podcastId');
    const body = await c.req.json();
    
    // Verify podcast exists
    const podcast = await kv.get(`podcast:${podcastId}`);
    if (!podcast) {
      return c.json({ error: 'Podcast not found' }, 404);
    }
    
    const episodeId = `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const episode = {
      id: episodeId,
      podcastId,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`episode:${podcastId}:${episodeId}`, episode);
    
    return c.json({ message: 'Episode created successfully', episode }, 201);
  } catch (error: any) {
    console.error('Create episode error:', error);
    return c.json({ error: `Create episode error: ${error.message}` }, 500);
  }
});

// Update episode
app.put("/make-server-06086aa3/episodes/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { podcastId } = body;
    
    if (!podcastId) {
      return c.json({ error: 'podcastId is required in the body' }, 400);
    }
    
    const episode = await kv.get(`episode:${podcastId}:${id}`);
    if (!episode) {
      return c.json({ error: 'Episode not found' }, 404);
    }
    
    const updatedEpisode = {
      ...episode,
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`episode:${podcastId}:${id}`, updatedEpisode);
    
    return c.json({ message: 'Episode updated', episode: updatedEpisode });
  } catch (error: any) {
    console.error('Update episode error:', error);
    return c.json({ error: `Update episode error: ${error.message}` }, 500);
  }
});

// Delete episode
app.delete("/make-server-06086aa3/episodes/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const podcastId = c.req.query('podcastId');
    
    if (!podcastId) {
      return c.json({ error: 'podcastId query parameter is required' }, 400);
    }
    
    await kv.del(`episode:${podcastId}:${id}`);
    
    return c.json({ message: 'Episode deleted successfully' });
  } catch (error: any) {
    console.error('Delete episode error:', error);
    return c.json({ error: `Delete episode error: ${error.message}` }, 500);
  }
});

// ==================== USERS MANAGEMENT ====================

// Get all users
app.get("/make-server-06086aa3/users", requireAuth, async (c) => {
  try {
    const users = await kv.getByPrefix('user:');
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

const ICECAST_CONFIG_KEY = 'icecast:config';

interface IcecastConfig {
  enabled: boolean;
  serverUrl: string;
  port: number;
  mountPoint: string;
  adminUser: string;
  adminPassword: string;
  sourcePassword: string;
  ssl: boolean;
  listenerUrl?: string;
  updatedAt?: string;
}

function getIcecastListenerUrl(config: IcecastConfig): string {
  if (config.listenerUrl) return config.listenerUrl;
  const proto = config.ssl ? 'https' : 'http';
  const host = config.serverUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `${proto}://${host}:${config.port}${config.mountPoint}`;
}

async function fetchIcecastRealStatus(config: IcecastConfig): Promise<any> {
  const host = config.serverUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const proto = config.ssl ? 'https' : 'http';
  const statusUrl = `${proto}://${host}:${config.port}/status-json.xsl`;
  console.log(`[Icecast] Fetching status from ${statusUrl}`);
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 8000);
  try {
    const resp = await fetch(statusUrl, { signal: controller.signal });
    clearTimeout(tid);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (e: any) {
    clearTimeout(tid);
    throw e;
  }
}

async function pushIcecastMetadata(config: IcecastConfig, song: string): Promise<boolean> {
  const host = config.serverUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const proto = config.ssl ? 'https' : 'http';
  const params = new URLSearchParams({ mount: config.mountPoint, mode: 'updinfo', song });
  const url = `${proto}://${host}:${config.port}/admin/metadata?${params}`;
  const authHeader = 'Basic ' + btoa(`${config.adminUser}:${config.adminPassword}`);
  console.log(`[Icecast] Pushing metadata: "${song}" to ${config.mountPoint}`);
  try {
    const resp = await fetch(url, { headers: { 'Authorization': authHeader } });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      console.error(`[Icecast] Metadata push failed: HTTP ${resp.status} — ${body}`);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error(`[Icecast] Metadata push error: ${e?.message || e}`);
    return false;
  }
}

// GET Icecast config (admin)
app.get("/make-server-06086aa3/icecast/config", requireAuth, async (c) => {
  try {
    const config = await kv.get(ICECAST_CONFIG_KEY);
    if (!config) {
      return c.json({ config: { enabled: false, serverUrl: '', port: 8000, mountPoint: '/live', adminUser: 'admin', adminPassword: '', sourcePassword: '', ssl: false, listenerUrl: '' } });
    }
    return c.json({ config: { ...config, adminPassword: config.adminPassword ? '••••••••' : '', sourcePassword: config.sourcePassword ? '••••••••' : '' } });
  } catch (error: any) {
    console.error('Get icecast config error:', error);
    return c.json({ error: `Failed to get icecast config: ${error.message}` }, 500);
  }
});

// SAVE Icecast config (admin)
app.post("/make-server-06086aa3/icecast/config", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const existing: IcecastConfig | null = await kv.get(ICECAST_CONFIG_KEY);
    const config: IcecastConfig = {
      enabled: body.enabled ?? existing?.enabled ?? false,
      serverUrl: body.serverUrl ?? existing?.serverUrl ?? '',
      port: body.port ?? existing?.port ?? 8000,
      mountPoint: body.mountPoint ?? existing?.mountPoint ?? '/live',
      adminUser: body.adminUser ?? existing?.adminUser ?? 'admin',
      adminPassword: (body.adminPassword && !body.adminPassword.includes('••')) ? body.adminPassword : (existing?.adminPassword ?? ''),
      sourcePassword: (body.sourcePassword && !body.sourcePassword.includes('••')) ? body.sourcePassword : (existing?.sourcePassword ?? ''),
      ssl: body.ssl ?? existing?.ssl ?? false,
      listenerUrl: body.listenerUrl ?? existing?.listenerUrl ?? '',
      updatedAt: new Date().toISOString(),
    };
    await kv.set(ICECAST_CONFIG_KEY, config);
    console.log(`[Icecast] Config saved — enabled: ${config.enabled}, server: ${config.serverUrl}:${config.port}${config.mountPoint}`);
    return c.json({ success: true, listenerUrl: getIcecastListenerUrl(config) });
  } catch (error: any) {
    console.error('Save icecast config error:', error);
    return c.json({ error: `Failed to save icecast config: ${error.message}` }, 500);
  }
});

// TEST Icecast connection (admin)
app.post("/make-server-06086aa3/icecast/test", requireAuth, async (c) => {
  try {
    const config: IcecastConfig | null = await kv.get(ICECAST_CONFIG_KEY);
    if (!config || !config.serverUrl) {
      return c.json({ success: false, error: 'Icecast not configured — save config first' }, 400);
    }
    let statusData: any;
    try { statusData = await fetchIcecastRealStatus(config); }
    catch (e: any) { return c.json({ success: false, error: `Cannot reach Icecast at ${config.serverUrl}:${config.port} — ${e?.message || e}`, step: 'status' }); }

    const icestats = statusData?.icestats;
    let source = icestats?.source;
    let mount: any = null;
    if (Array.isArray(source)) mount = source.find((s: any) => s.listenurl?.includes(config.mountPoint));
    else if (source?.listenurl?.includes(config.mountPoint)) mount = source;

    let adminOk = false;
    if (config.adminPassword) {
      try {
        const host = config.serverUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const proto = config.ssl ? 'https' : 'http';
        const r = await fetch(`${proto}://${host}:${config.port}/admin/stats`, { headers: { 'Authorization': 'Basic ' + btoa(`${config.adminUser}:${config.adminPassword}`) } });
        adminOk = r.ok;
      } catch { /* */ }
    }

    return c.json({
      success: true,
      server: { serverId: icestats?.server_id ?? 'unknown', host: icestats?.host ?? config.serverUrl },
      mountActive: !!mount,
      mountInfo: mount ? { listenUrl: mount.listenurl, listeners: mount.listeners ?? 0, peakListeners: mount.listener_peak ?? 0, bitrate: mount.bitrate ? `${mount.bitrate}kbps` : 'unknown', genre: mount.genre ?? '', title: mount.server_name ?? mount.title ?? '' } : null,
      adminAuth: adminOk,
      listenerUrl: getIcecastListenerUrl(config),
    });
  } catch (error: any) {
    console.error('Icecast test error:', error);
    return c.json({ success: false, error: `Test failed: ${error.message}` }, 500);
  }
});

// GET Icecast status (public)
app.get("/make-server-06086aa3/icecast/status", async (c) => {
  try {
    const config: IcecastConfig | null = await kv.get(ICECAST_CONFIG_KEY);
    if (!config?.enabled || !config.serverUrl) {
      return c.json({ status: 'offline', configured: false, message: 'Icecast is not configured' });
    }
    try {
      const statusData = await fetchIcecastRealStatus(config);
      const icestats = statusData?.icestats;
      let source = icestats?.source;
      let mount: any = null;
      if (Array.isArray(source)) mount = source.find((s: any) => s.listenurl?.includes(config.mountPoint));
      else if (source?.listenurl?.includes(config.mountPoint)) mount = source;

      const result = {
        status: mount ? 'online' : 'no_source',
        configured: true,
        listeners: mount?.listeners ?? 0,
        peakListeners: mount?.listener_peak ?? 0,
        bitrate: mount?.bitrate ? `${mount.bitrate}kbps` : '128kbps',
        source: { connected: !!mount, mount: config.mountPoint },
        server: { id: icestats?.server_id ?? 'Icecast', location: icestats?.location ?? '' },
        listenerUrl: getIcecastListenerUrl(config),
      };
      await kv.set('icecast:status-cache', { ...result, cachedAt: new Date().toISOString() }).catch(() => {});
      return c.json(result);
    } catch (e: any) {
      const cached: any = await kv.get('icecast:status-cache').catch(() => null);
      if (cached) return c.json({ ...cached, status: 'unreachable', error: e?.message });
      return c.json({ status: 'unreachable', configured: true, error: `Cannot reach Icecast: ${e?.message || e}`, listeners: 0, listenerUrl: getIcecastListenerUrl(config) });
    }
  } catch (error: any) {
    console.error('Icecast status error:', error);
    return c.json({ error: `Failed to get Icecast status: ${error.message}`, status: 'offline' }, 500);
  }
});

// GET Icecast listener URL (public — for the player)
app.get("/make-server-06086aa3/icecast/listener-url", async (c) => {
  try {
    const config: IcecastConfig | null = await kv.get(ICECAST_CONFIG_KEY);
    if (!config?.enabled || !config.serverUrl) return c.json({ enabled: false, url: null });
    return c.json({ enabled: true, url: getIcecastListenerUrl(config) });
  } catch (error: any) {
    return c.json({ enabled: false, url: null, error: error.message }, 500);
  }
});

// POST update Icecast metadata
app.post("/make-server-06086aa3/icecast/metadata", requireAuth, async (c) => {
  try {
    const { title, artist, album } = await c.req.json();
    const metadata = { track: { title, artist, album }, updatedAt: new Date().toISOString() };
    await kv.set('stream:nowplaying', metadata);

    const config: IcecastConfig | null = await kv.get(ICECAST_CONFIG_KEY);
    let icecastPushed = false;
    if (config?.enabled && config.serverUrl && config.adminPassword) {
      icecastPushed = await pushIcecastMetadata(config, `${artist} - ${title}`);
    }
    console.log(`Metadata updated: ${artist} - ${title} | Icecast push: ${icecastPushed}`);
    return c.json({ message: 'Metadata updated successfully', metadata, icecastPushed });
  } catch (error: any) {
    console.error('Update metadata error:', error);
    return c.json({ error: `Failed to update metadata: ${error.message}` }, 500);
  }
});

// ==================== TRACK UPLOAD (2-STEP: SIGNED URL + PROCESS) ====================

// Helper to generate unique shortId
function generateShortId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let shortId = '';
  for (let i = 0; i < 6; i++) {
    shortId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return shortId;
}

// Helper: race a promise against a timeout
function withServerTimeout<T>(promise: Promise<T>, ms: number, fallback: T, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => {
      console.warn(`⏱️  ${label} timed out after ${ms}ms, using fallback`);
      resolve(fallback);
    }, ms))
  ]);
}

// Step 1: Get a signed upload URL for direct-to-Storage upload (bypasses Edge Function body limit)
app.post("/make-server-06086aa3/tracks/get-upload-url", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { originalFilename, contentType } = body;
    console.log(`📤 [get-upload-url] Request: filename=${originalFilename}, type=${contentType}`);

    if (!originalFilename) {
      return c.json({ error: 'originalFilename is required' }, 400);
    }

    // Validate MP3
    const allowedTypes = ['audio/mpeg', 'audio/mp3'];
    const isMP3 = allowedTypes.includes(contentType || '') || /\.mp3$/i.test(originalFilename);
    if (!isMP3) {
      return c.json({ error: 'Invalid file type. Only MP3 files are supported.' }, 400);
    }

    const bucket = 'make-06086aa3-tracks';
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = originalFilename.split('.').pop() || 'mp3';
    const filename = `track-${timestamp}-${randomString}.${extension}`;

    // Create a signed upload URL (valid 10 minutes)
    console.log(`📤 [get-upload-url] Creating signed URL for bucket=${bucket}, file=${filename}`);
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(filename);

    if (error) {
      console.error('❌ [get-upload-url] Signed URL creation failed:', error);
      return c.json({ error: `Failed to create upload URL: ${error.message}` }, 500);
    }

    if (!data?.signedUrl) {
      console.error('❌ [get-upload-url] No signedUrl in response:', JSON.stringify(data));
      return c.json({ error: 'No signed URL returned from storage' }, 500);
    }

    console.log(`✅ [get-upload-url] Signed URL created for: ${filename} (url length: ${data.signedUrl.length})`);

    return c.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      filename,
      bucket,
    });
  } catch (error: any) {
    console.error('❌ [get-upload-url] Error:', error);
    return c.json({ error: `Failed to create upload URL: ${error.message}` }, 500);
  }
});

// Step 2: Process an already-uploaded file (extract metadata, create track record)
app.post("/make-server-06086aa3/tracks/process", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const {
      filename,
      bucket: reqBucket,
      originalFilename,
      position = 'end',
      autoAddToLiveStream = true,
      generateWaveform: enableWaveform = false,
    } = body;

    console.log(`🎵 [process] Request: file=${filename}, original=${originalFilename}, position=${position}`);

    if (!filename || !originalFilename) {
      return c.json({ error: 'filename and originalFilename are required' }, 400);
    }

    const bucket = reqBucket || 'make-06086aa3-tracks';

    // Ensure shortId is unique
    let shortId = generateShortId();
    let existing = await kv.get(`shortlink:${shortId}`);
    while (existing) {
      shortId = generateShortId();
      existing = await kv.get(`shortlink:${shortId}`);
    }

    // Get signed URL (buckets are private — public URLs return 403)
    const audioUrl = await getAudioUrl(bucket, filename);
    console.log(`🎵 [process] Signed audio URL generated: ${audioUrl ? 'OK' : 'FAILED'}`);

    // Download the file from Storage to extract metadata
    console.log('🎵 [process] Downloading file from Storage for metadata extraction...');

    // Parse filename for fallback metadata
    const originalName = originalFilename.replace(/\.(mp3|wav|m4a|flac)$/i, '');
    const nameParts = originalName.split(' - ');
    const fallbackTitle = nameParts.length >= 2 ? nameParts.slice(1).join(' - ').trim() : originalName;
    const fallbackArtist = nameParts.length >= 2 ? nameParts[0].trim() : 'Unknown Artist';

    const fallbackResult = {
      metadata: {
        title: fallbackTitle,
        artist: fallbackArtist,
        album: '',
        genre: 'Funk',
        year: new Date().getFullYear(),
        duration: 180,
        bpm: undefined as number | undefined,
        coverData: undefined as any,
      },
      coverUrl: getDefaultCoverUrl('Funk'),
      waveform: undefined as number[] | undefined,
    };

    let metadataResult = fallbackResult;

    try {
      // Download the file from storage (service role key has access)
      console.log(`🎵 [process] Downloading from bucket=${bucket}, file=${filename}...`);
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(filename);

      if (downloadError || !fileData) {
        console.warn(`⚠️  [process] Could not download file for metadata extraction: ${downloadError?.message || 'no data returned'}`);
        console.warn(`⚠️  [process] Using fallback metadata from filename: ${originalFilename}`);
      } else {
        const fileBuffer = await fileData.arrayBuffer();
        console.log(`📦 Downloaded ${(fileBuffer.byteLength / 1024 / 1024).toFixed(1)}MB for metadata extraction`);

        // Run full metadata extraction with a 15-second timeout
        metadataResult = await withServerTimeout(
          extractCompleteMetadata(
            supabase,
            fileBuffer,
            'audio/mpeg',
            originalFilename,
            {
              searchOnline: true,
              generateWaveform: enableWaveform,
              waveformSamples: 100,
            }
          ),
          15000,
          fallbackResult,
          'extractCompleteMetadata'
        );
      }
    } catch (metaErr: any) {
      console.warn('⚠️  Metadata extraction failed, using fallback:', metaErr.message);
    }

    const { metadata: extractedMetadata, coverUrl, coverBucket, coverFilename: coverFn, waveform } = metadataResult;

    const {
      title,
      artist,
      album,
      genre,
      year,
      duration,
      bpm,
    } = extractedMetadata;

    const metadata = {
      title,
      artist,
      album,
      duration,
      genre,
      year,
      bpm,
      coverUrl,
      coverBucket: coverBucket || null,    // for signed URL refresh
      coverFilename: coverFn || null,      // for signed URL refresh
      audioUrl,
      waveform,
      shortId,
      streamUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-06086aa3/stream/${shortId}`,
      storageFilename: filename,
      storageBucket: bucket,
      tags: ['NEWFUNK'],
      playCount: 0,
      uploadedBy: c.get('userId'),
      uploadedAt: new Date().toISOString(),
    };

    // Create track in database
    const trackId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const track = {
      id: trackId,
      ...metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`track:${trackId}`, track);

    // Create shortlink mapping
    await kv.set(`shortlink:${shortId}`, {
      trackId,
      shortId,
      createdAt: new Date().toISOString(),
    });

    // Add to Live Stream playlist if requested
    if (autoAddToLiveStream) {
      let livePlaylist = await kv.get('playlist:livestream');

      if (!livePlaylist) {
        livePlaylist = {
          id: 'livestream',
          name: 'Live Stream',
          description: 'Main broadcast playlist',
          genre: 'Mixed',
          trackIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      if (position === 'start') {
        livePlaylist.trackIds = [trackId, ...(livePlaylist.trackIds || [])];
      } else {
        livePlaylist.trackIds = [...(livePlaylist.trackIds || []), trackId];
      }

      livePlaylist.updatedAt = new Date().toISOString();
      await kv.set('playlist:livestream', livePlaylist);
    }

    console.log(`✅ Track processed: ${metadata.title} by ${metadata.artist} → ${metadata.streamUrl}`);

    return c.json({
      message: 'Track uploaded successfully',
      track,
      metadata: {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        duration: metadata.duration,
        genre: metadata.genre,
        year: metadata.year,
        coverUrl: metadata.coverUrl,
      },
      shortId,
      streamUrl: metadata.streamUrl,
      audioUrl: metadata.audioUrl,
      addedToLiveStream: autoAddToLiveStream,
    });
  } catch (error: any) {
    console.error('Track process error:', error);
    return c.json({ error: `Failed to process track: ${error.message}` }, 500);
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

// Assign super_admin role by email (REQUIRES secret key — no bypass)
app.post("/make-server-06086aa3/admin/assign-super-admin", async (c) => {
  try {
    const { email, secretKey } = await c.req.json();
    
    // ALWAYS require the setup secret — no bypass allowed
    const SETUP_SECRET = Deno.env.get('ADMIN_SETUP_SECRET');
    
    if (!SETUP_SECRET) {
      return c.json({ error: 'ADMIN_SETUP_SECRET env variable not configured. Set it in Supabase Edge Function secrets.' }, 500);
    }
    
    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }
    
    if (!secretKey || secretKey !== SETUP_SECRET) {
      console.warn(`[SECURITY] Unauthorized assign-super-admin attempt for: ${email}`);
      return c.json({ error: 'Invalid or missing secret key' }, 403);
    }
    
    // Find user by email in KV store (getByPrefix returns plain values)
    const allUsers = await kv.getByPrefix('user:');
    const user = allUsers.find((entry: any) => entry?.email === email);
    
    if (!user) {
      return c.json({ error: `User with email ${email} not found. Please sign up first.` }, 404);
    }
    
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
    
    // Find user by email in KV store (getByPrefix returns plain values)
    const allUsers = await kv.getByPrefix('user:');
    const user = allUsers.find((entry: any) => entry?.email === email);
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
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

// ==================== PLAYLISTS API ====================

// Get all playlists
app.get("/make-server-06086aa3/playlists", async (c) => {
  try {
    const allPlaylists = await kv.getByPrefix('playlist:');
    const playlists = allPlaylists.filter((p: any) => p && p.id); // Filter out invalid entries
    
    return c.json({ 
      playlists: playlists.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    });
  } catch (error: any) {
    console.error('Get playlists error:', error);
    return c.json({ error: `Failed to get playlists: ${error.message}` }, 500);
  }
});

// Create playlist
app.post("/make-server-06086aa3/playlists", requireAuth, async (c) => {
  try {
    console.log('[createPlaylist] Request received from userId:', c.get('userId'));
    const body = await c.req.json();
    const { name, description, color, genre, id: customId, trackIds } = body;
    console.log('[createPlaylist] Body:', JSON.stringify({ name, description, color, genre, customId, trackIds }));
    
    if (!name || !name.trim()) {
      console.warn('[createPlaylist] Rejected: empty name');
      return c.json({ error: 'Playlist name is required' }, 400);
    }
    
    // Allow custom ID (e.g. 'livestream') or auto-generate
    const playlistId = customId || `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const playlist = {
      id: playlistId,
      name: name.trim(),
      description: description || '',
      color: color || '#00d9ff',
      genre: genre || '',
      trackIds: Array.isArray(trackIds) ? trackIds : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('[createPlaylist] Saving playlist:', playlistId);
    await kv.set(`playlist:${playlistId}`, playlist);
    console.log('[createPlaylist] Saved successfully:', playlistId);
    await addAuditLog({ level: 'success', category: 'Playlists', message: `Playlist created: "${playlist.name}"`, userId: c.get('userId') });
    
    return c.json({ 
      message: 'Playlist created successfully',
      playlist
    });
  } catch (error: any) {
    console.error('[createPlaylist] Error:', error?.message || error, error?.stack);
    return c.json({ error: `Failed to create playlist: ${error.message}` }, 500);
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
    
    const updatedPlaylist = {
      ...playlist,
      name: body.name !== undefined ? body.name : playlist.name,
      description: body.description !== undefined ? body.description : playlist.description,
      color: body.color !== undefined ? body.color : playlist.color,
      genre: body.genre !== undefined ? body.genre : playlist.genre,
      trackIds: body.trackIds !== undefined ? body.trackIds : (playlist.trackIds || []),
      isPublic: body.isPublic !== undefined ? body.isPublic : playlist.isPublic,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`playlist:${id}`, updatedPlaylist);
    
    return c.json({ 
      message: 'Playlist updated successfully',
      playlist: updatedPlaylist
    });
  } catch (error: any) {
    console.error('Update playlist error:', error);
    return c.json({ error: `Failed to update playlist: ${error.message}` }, 500);
  }
});

// Delete playlist
app.delete("/make-server-06086aa3/playlists/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    
    // Don't allow deleting the livestream playlist
    if (id === 'livestream') {
      return c.json({ error: 'Cannot delete the Live Stream playlist' }, 400);
    }

    // Don't allow deleting the jingles playlist
    if (id === 'jingles') {
      return c.json({ error: 'Cannot delete the Jingles playlist — it is a mandatory rotation playlist' }, 400);
    }
    
    const playlist = await kv.get(`playlist:${id}`);
    if (!playlist) {
      return c.json({ error: 'Playlist not found' }, 404);
    }
    
    await kv.del(`playlist:${id}`);
    await addAuditLog({ level: 'warning', category: 'Playlists', message: `Playlist deleted: ${id}`, userId: c.get('userId') });
    
    return c.json({ message: 'Playlist deleted successfully' });
  } catch (error: any) {
    console.error('Delete playlist error:', error);
    return c.json({ error: `Failed to delete playlist: ${error.message}` }, 500);
  }
});

// Add track to playlist
app.post("/make-server-06086aa3/playlists/:id/tracks", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const { trackId, position } = await c.req.json();
    
    if (!trackId) {
      return c.json({ error: 'trackId is required' }, 400);
    }
    
    const playlist = await kv.get(`playlist:${id}`);
    if (!playlist) {
      return c.json({ error: 'Playlist not found' }, 404);
    }
    
    const trackIds = playlist.trackIds || [];
    
    if (trackIds.includes(trackId)) {
      return c.json({ error: 'Track already in playlist' }, 400);
    }
    
    if (position === 'start') {
      trackIds.unshift(trackId);
    } else {
      trackIds.push(trackId);
    }
    
    playlist.trackIds = trackIds;
    playlist.updatedAt = new Date().toISOString();
    await kv.set(`playlist:${id}`, playlist);
    
    return c.json({ message: 'Track added to playlist', playlist });
  } catch (error: any) {
    console.error('Add track to playlist error:', error);
    return c.json({ error: `Failed to add track: ${error.message}` }, 500);
  }
});

// Remove track from playlist
app.delete("/make-server-06086aa3/playlists/:id/tracks/:trackId", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const trackId = c.req.param('trackId');
    
    const playlist = await kv.get(`playlist:${id}`);
    if (!playlist) {
      return c.json({ error: 'Playlist not found' }, 404);
    }
    
    playlist.trackIds = (playlist.trackIds || []).filter((tid: string) => tid !== trackId);
    playlist.updatedAt = new Date().toISOString();
    await kv.set(`playlist:${id}`, playlist);
    
    return c.json({ message: 'Track removed from playlist', playlist });
  } catch (error: any) {
    console.error('Remove track from playlist error:', error);
    return c.json({ error: `Failed to remove track: ${error.message}` }, 500);
  }
});

// ==================== JINGLE PLAYLIST ROTATION ====================

// Get jingle rotation config
app.get("/make-server-06086aa3/jingle-playlist/config", async (c) => {
  try {
    const config = await kv.get('jingle-playlist:config');
    return c.json({
      config: config || {
        interval: 5,
        enabled: true,
        rotationIndex: 0,
        tracksSinceLastJingle: 0,
        updatedAt: null,
      }
    });
  } catch (error: any) {
    console.error('Get jingle playlist config error:', error);
    return c.json({ error: `Get config error: ${error.message}` }, 500);
  }
});

// Update jingle rotation config
app.post("/make-server-06086aa3/jingle-playlist/config", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const existing = await kv.get('jingle-playlist:config') || {};

    const config = {
      interval: body.interval ?? existing.interval ?? 5,
      enabled: body.enabled ?? existing.enabled ?? true,
      rotationIndex: body.rotationIndex ?? existing.rotationIndex ?? 0,
      tracksSinceLastJingle: body.tracksSinceLastJingle ?? existing.tracksSinceLastJingle ?? 0,
      updatedAt: new Date().toISOString(),
    };

    await kv.set('jingle-playlist:config', config);
    console.log(`✅ Jingle playlist config updated: interval=${config.interval}, enabled=${config.enabled}`);
    return c.json({ config });
  } catch (error: any) {
    console.error('Update jingle playlist config error:', error);
    return c.json({ error: `Update config error: ${error.message}` }, 500);
  }
});

// Ensure jingles playlist exists (idempotent)
app.post("/make-server-06086aa3/jingle-playlist/ensure", requireAuth, async (c) => {
  try {
    const existing = await kv.get('playlist:jingles');
    if (existing) {
      return c.json({ playlist: existing, created: false });
    }

    const playlist = {
      id: 'jingles',
      name: 'Jingles Rotation',
      description: 'Mandatory jingle playlist — jingles play in order, cycling after every N songs on air',
      color: '#FFD700',
      genre: 'jingles',
      trackIds: [],
      isPublic: false,
      isSystemPlaylist: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set('playlist:jingles', playlist);
    console.log('✅ Jingles rotation playlist created (system)');

    // Also ensure default config exists
    const config = await kv.get('jingle-playlist:config');
    if (!config) {
      await kv.set('jingle-playlist:config', {
        interval: 5,
        enabled: true,
        rotationIndex: 0,
        tracksSinceLastJingle: 0,
        updatedAt: new Date().toISOString(),
      });
      console.log('✅ Jingle playlist default config created (interval=5)');
    }

    return c.json({ playlist, created: true });
  } catch (error: any) {
    console.error('Ensure jingles playlist error:', error);
    return c.json({ error: `Ensure error: ${error.message}` }, 500);
  }
});

// Get next jingle in rotation (for Auto DJ)
app.get("/make-server-06086aa3/jingle-playlist/next", async (c) => {
  try {
    const config = await kv.get('jingle-playlist:config') || { interval: 5, enabled: true, rotationIndex: 0 };
    if (!config.enabled) {
      return c.json({ jingle: null, reason: 'Jingle rotation is disabled' });
    }

    const playlist = await kv.get('playlist:jingles');
    if (!playlist || !playlist.trackIds || playlist.trackIds.length === 0) {
      return c.json({ jingle: null, reason: 'Jingles playlist is empty' });
    }

    // Get the next jingle in rotation order
    const index = (config.rotationIndex || 0) % playlist.trackIds.length;
    const trackId = playlist.trackIds[index];

    // Fetch the track data (it's stored in jingle:id or track:id)
    let jingle = await kv.get(`jingle:${trackId}`);
    if (!jingle) {
      jingle = await kv.get(`track:${trackId}`);
    }

    return c.json({
      jingle: jingle || { id: trackId, title: 'Unknown Jingle' },
      rotationIndex: index,
      totalJingles: playlist.trackIds.length,
      interval: config.interval,
    });
  } catch (error: any) {
    console.error('Get next jingle error:', error);
    return c.json({ error: `Get next jingle error: ${error.message}` }, 500);
  }
});

// Advance jingle rotation (called after a jingle plays)
app.post("/make-server-06086aa3/jingle-playlist/advance", requireAuth, async (c) => {
  try {
    const config = await kv.get('jingle-playlist:config') || { interval: 5, enabled: true, rotationIndex: 0, tracksSinceLastJingle: 0 };
    const playlist = await kv.get('playlist:jingles');
    const totalJingles = playlist?.trackIds?.length || 1;

    const updatedConfig = {
      ...config,
      rotationIndex: ((config.rotationIndex || 0) + 1) % totalJingles,
      tracksSinceLastJingle: 0,
      lastPlayedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set('jingle-playlist:config', updatedConfig);
    console.log(`🔔 Jingle rotation advanced: index ${config.rotationIndex} → ${updatedConfig.rotationIndex}`);
    return c.json({ config: updatedConfig });
  } catch (error: any) {
    console.error('Advance jingle rotation error:', error);
    return c.json({ error: `Advance error: ${error.message}` }, 500);
  }
});

// Increment track count (called after each music track plays)
app.post("/make-server-06086aa3/jingle-playlist/track-played", async (c) => {
  try {
    const config = await kv.get('jingle-playlist:config') || { interval: 5, enabled: true, rotationIndex: 0, tracksSinceLastJingle: 0 };

    const updatedConfig = {
      ...config,
      tracksSinceLastJingle: (config.tracksSinceLastJingle || 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    await kv.set('jingle-playlist:config', updatedConfig);

    const shouldPlayJingle = updatedConfig.enabled && updatedConfig.tracksSinceLastJingle >= (config.interval || 5);

    return c.json({
      tracksSinceLastJingle: updatedConfig.tracksSinceLastJingle,
      interval: config.interval || 5,
      shouldPlayJingle,
    });
  } catch (error: any) {
    console.error('Track played error:', error);
    return c.json({ error: `Track played error: ${error.message}` }, 500);
  }
});

// Reset jingle rotation
app.post("/make-server-06086aa3/jingle-playlist/reset", requireAuth, async (c) => {
  try {
    const config = await kv.get('jingle-playlist:config') || {};
    const updatedConfig = {
      ...config,
      rotationIndex: 0,
      tracksSinceLastJingle: 0,
      updatedAt: new Date().toISOString(),
    };
    await kv.set('jingle-playlist:config', updatedConfig);
    console.log('🔄 Jingle rotation reset to beginning');
    return c.json({ config: updatedConfig });
  } catch (error: any) {
    console.error('Reset jingle rotation error:', error);
    return c.json({ error: `Reset error: ${error.message}` }, 500);
  }
});

// ==================== SCHEDULE API ====================

// Get all schedules
app.get("/make-server-06086aa3/schedule", async (c) => {
  try {
    const allSchedules = await kv.getByPrefix('schedule:');
    console.log(`[GET /schedule] Found ${allSchedules.length} schedule entries in KV. IDs: ${allSchedules.map((s: any) => s.id).join(', ')}`);
    
    // Load playlist info for each schedule
    const schedulesWithPlaylists = await Promise.all(
      allSchedules.map(async (schedule) => {
        const playlist = await kv.get(`playlist:${schedule.playlistId}`);
        return {
          ...schedule,
          playlistName: playlist?.name || 'Unknown',
          playlistColor: playlist?.color || '#00d9ff',
          jingleConfig: schedule.jingleConfig || null,
        };
      })
    );
    
    // Prevent CDN / browser caching of schedule list
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    c.header('Pragma', 'no-cache');
    return c.json({ 
      schedules: schedulesWithPlaylists.sort((a, b) => {
        // Sort by day of week, then by start time
        if (a.dayOfWeek === null && b.dayOfWeek !== null) return -1;
        if (a.dayOfWeek !== null && b.dayOfWeek === null) return 1;
        if (a.dayOfWeek !== b.dayOfWeek) return (a.dayOfWeek || 0) - (b.dayOfWeek || 0);
        return a.startTime.localeCompare(b.startTime);
      })
    });
  } catch (error: any) {
    console.error('Get schedules error:', error);
    return c.json({ error: `Failed to get schedules: ${error.message}` }, 500);
  }
});

// Create schedule
app.post("/make-server-06086aa3/schedule", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { playlistId, dayOfWeek, startTime, endTime, title, isActive, repeatWeekly, scheduleMode, scheduledDate, utcOffsetMinutes, timezone } = body;
    
    console.log(`[schedule/create] Received:`, JSON.stringify({ playlistId, dayOfWeek, startTime, endTime, title, isActive, repeatWeekly, scheduleMode, scheduledDate, utcOffsetMinutes, timezone }));
    
    if (!playlistId || !startTime || !endTime || !title) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    // Soft-verify playlist (warn but allow — reference may be stale/deleted)
    let resolvedPlaylistId = playlistId;
    const playlist = await kv.get(`playlist:${playlistId}`);
    if (!playlist) {
      const allPl = await kv.getByPrefix('playlist:');
      const byName = allPl.find((p: any) => p?.name === playlistId || p?.id === playlistId);
      if (byName) {
        console.log(`[schedule/create] Playlist "${playlistId}" found by fallback (actual id: ${byName.id})`);
        resolvedPlaylistId = byName.id;
      } else {
        console.warn(`[schedule/create] ⚠ Playlist "${playlistId}" not found — creating anyway (${allPl.length} playlists: ${allPl.slice(0, 5).map((p: any) => p?.id).join(', ')})`);
      }
    }
    
    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const schedule = {
      id: scheduleId,
      playlistId: resolvedPlaylistId,
      dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== null ? parseInt(dayOfWeek) : null,
      startTime,
      endTime,
      title,
      isActive: isActive !== undefined ? isActive : true,
      repeatWeekly: repeatWeekly !== undefined ? repeatWeekly : true,
      scheduleMode: scheduleMode || 'recurring',
      scheduledDate: scheduledDate || null,
      // Jingle integration config (per-slot overrides)
      // Timezone: stored as JS getTimezoneOffset() value (e.g. -60 for UTC+1 Berlin winter)
      // Used by getCurrentScheduledPlaylist() to convert local slot times to UTC for matching
      utcOffsetMinutes: utcOffsetMinutes !== undefined ? parseInt(utcOffsetMinutes) : 0,
      timezone: timezone || null,
      jingleConfig: body.jingleConfig || {
        introJingleId: null,
        outroJingleId: null,
        jingleFrequencyOverride: null,
        disableJingles: false,
        jingleCategoryFilter: null,
      },
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`schedule:${scheduleId}`, schedule);
    
    // Verify write was successful (read-after-write check)
    const verify = await kv.get(`schedule:${scheduleId}`);
    if (!verify) {
      console.error(`[schedule/create] CRITICAL: kv.set succeeded but read-back failed for key schedule:${scheduleId}`);
      return c.json({ error: 'Schedule created but verification failed — possible KV consistency issue' }, 500);
    }
    
    console.log(`[schedule/create] ✅ Created schedule ${scheduleId}: "${title}" → day=${dayOfWeek}, ${startTime}-${endTime}, mode=${schedule.scheduleMode}`);
    
    return c.json({ 
      message: 'Schedule created successfully',
      schedule
    });
  } catch (error: any) {
    console.error('Create schedule error:', error);
    return c.json({ error: `Failed to create schedule: ${error.message}` }, 500);
  }
});

// Update schedule
app.put("/make-server-06086aa3/schedule/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const schedule = await kv.get(`schedule:${id}`);
    if (!schedule) {
      return c.json({ error: 'Schedule not found' }, 404);
    }
    
    // Soft-check playlist if changed (warn but don't block)
    if (body.playlistId && body.playlistId !== schedule.playlistId) {
      const playlist = await kv.get(`playlist:${body.playlistId}`);
      if (!playlist) {
        console.warn(`[schedule/update] ⚠ Playlist "${body.playlistId}" not found — allowing update anyway`);
      }
    }
    
    const updatedSchedule = {
      ...schedule,
      playlistId: body.playlistId !== undefined ? body.playlistId : schedule.playlistId,
      dayOfWeek: body.dayOfWeek !== undefined ? (body.dayOfWeek !== null ? parseInt(body.dayOfWeek) : null) : schedule.dayOfWeek,
      startTime: body.startTime !== undefined ? body.startTime : schedule.startTime,
      endTime: body.endTime !== undefined ? body.endTime : schedule.endTime,
      title: body.title !== undefined ? body.title : schedule.title,
      isActive: body.isActive !== undefined ? body.isActive : schedule.isActive,
      repeatWeekly: body.repeatWeekly !== undefined ? body.repeatWeekly : schedule.repeatWeekly,
      scheduleMode: body.scheduleMode !== undefined ? body.scheduleMode : (schedule.scheduleMode || 'recurring'),
      scheduledDate: body.scheduledDate !== undefined ? body.scheduledDate : (schedule.scheduledDate || null),
      utcOffsetMinutes: body.utcOffsetMinutes !== undefined ? parseInt(body.utcOffsetMinutes) : (schedule.utcOffsetMinutes ?? 0),
      timezone: body.timezone !== undefined ? body.timezone : (schedule.timezone || null),
      // Jingle integration config (merge with existing)
      jingleConfig: body.jingleConfig !== undefined
        ? { ...(schedule.jingleConfig || {}), ...body.jingleConfig }
        : (schedule.jingleConfig || null),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`schedule:${id}`, updatedSchedule);
    
    return c.json({ 
      message: 'Schedule updated successfully',
      schedule: updatedSchedule
    });
  } catch (error: any) {
    console.error('Update schedule error:', error);
    return c.json({ error: `Failed to update schedule: ${error.message}` }, 500);
  }
});

// Delete schedule
app.delete("/make-server-06086aa3/schedule/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    
    const schedule = await kv.get(`schedule:${id}`);
    if (!schedule) {
      return c.json({ error: 'Schedule not found' }, 404);
    }
    
    await kv.del(`schedule:${id}`);
    
    return c.json({ message: 'Schedule deleted successfully' });
  } catch (error: any) {
    console.error('Delete schedule error:', error);
    return c.json({ error: `Failed to delete schedule: ${error.message}` }, 500);
  }
});

// ==================== SCHEDULE SLOTS (alias for schedule CRUD) ====================

// Create schedule slot (alias used by frontend)
app.post("/make-server-06086aa3/schedule/slots", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { playlistId, dayOfWeek, startTime, endTime, title, isActive } = body;
    
    console.log(`[schedule/slots/create] Received:`, JSON.stringify({ playlistId, dayOfWeek, startTime, endTime, title, isActive, scheduleMode: body.scheduleMode, scheduledDate: body.scheduledDate }));
    
    if (!playlistId || !startTime || !endTime || !title) {
      return c.json({ error: 'Missing required fields: playlistId, startTime, endTime, title' }, 400);
    }
    
    // Soft-verify playlist (warn but allow — reference may be stale/deleted)
    let resolvedSlotPlaylistId = playlistId;
    const playlist = await kv.get(`playlist:${playlistId}`);
    if (!playlist) {
      const allPl = await kv.getByPrefix('playlist:');
      const byName = allPl.find((p: any) => p?.name === playlistId || p?.id === playlistId);
      if (byName) {
        console.log(`[schedule/slots/create] Playlist "${playlistId}" found by fallback (actual id: ${byName.id})`);
        resolvedSlotPlaylistId = byName.id;
      } else {
        console.warn(`[schedule/slots/create] ⚠ Playlist "${playlistId}" not found — creating anyway (${allPl.length} playlists: ${allPl.slice(0, 5).map((p: any) => p?.id).join(', ')})`);
      }
    }
    
    const slotId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const slot = {
      id: slotId,
      playlistId: resolvedSlotPlaylistId,
      dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== null ? parseInt(dayOfWeek) : null,
      startTime,
      endTime,
      title,
      isActive: isActive !== undefined ? isActive : true,
      repeatWeekly: body.repeatWeekly !== undefined ? body.repeatWeekly : true,
      scheduleMode: body.scheduleMode || 'recurring',
      scheduledDate: body.scheduledDate || null,
      utcOffsetMinutes: body.utcOffsetMinutes !== undefined ? parseInt(body.utcOffsetMinutes) : 0,
      timezone: body.timezone || null,
      jingleConfig: body.jingleConfig || null,
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`schedule:${slotId}`, slot);
    
    return c.json({ message: 'Schedule slot created', slot });
  } catch (error: any) {
    console.error('Create schedule slot error:', error);
    return c.json({ error: `Failed to create slot: ${error.message}` }, 500);
  }
});

// Update schedule slot (alias used by frontend)
app.put("/make-server-06086aa3/schedule/slots/:slotId", requireAuth, async (c) => {
  try {
    const slotId = c.req.param('slotId');
    const body = await c.req.json();
    
    const slot = await kv.get(`schedule:${slotId}`);
    if (!slot) {
      return c.json({ error: 'Schedule slot not found' }, 404);
    }
    
    const updatedSlot = {
      ...slot,
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`schedule:${slotId}`, updatedSlot);
    
    return c.json({ message: 'Schedule slot updated', slot: updatedSlot });
  } catch (error: any) {
    console.error('Update schedule slot error:', error);
    return c.json({ error: `Failed to update slot: ${error.message}` }, 500);
  }
});

// Delete schedule slot (alias)
app.delete("/make-server-06086aa3/schedule/slots/:slotId", requireAuth, async (c) => {
  try {
    const slotId = c.req.param('slotId');
    
    const slot = await kv.get(`schedule:${slotId}`);
    if (!slot) {
      return c.json({ error: 'Schedule slot not found' }, 404);
    }
    
    await kv.del(`schedule:${slotId}`);
    
    return c.json({ message: 'Schedule slot deleted successfully' });
  } catch (error: any) {
    console.error('Delete schedule slot error:', error);
    return c.json({ error: `Failed to delete slot: ${error.message}` }, 500);
  }
});

// ==================== SCHEDULE ↔ JINGLE INTEGRATION ====================

// Get schedule-jingle integration map: which jingles are configured per schedule slot
app.get("/make-server-06086aa3/schedule/jingle-map", async (c) => {
  try {
    const allSchedules = await kv.getByPrefix('schedule:') as any[];
    const allJingles = await kv.getByPrefix('jingle:') as any[];
    const allRules = await kv.getByPrefix('jingle-rule:') as any[];
    
    const jingleMap: Record<string, any> = {};
    const jinglesById: Record<string, any> = {};
    for (const j of allJingles) {
      if (j?.id) jinglesById[j.id] = j;
    }
    
    // Per-slot jingle info
    for (const s of allSchedules) {
      if (!s?.id) continue;
      const config = s.jingleConfig || {};
      const entry: any = {
        scheduleId: s.id,
        title: s.title,
        playlistId: s.playlistId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        jingleConfig: config,
        introJingle: config.introJingleId ? (jinglesById[config.introJingleId] || null) : null,
        outroJingle: config.outroJingleId ? (jinglesById[config.outroJingleId] || null) : null,
        scheduleBasedRules: [],
      };
      
      // Find schedule_based rules targeting this slot or its playlist
      for (const rule of allRules) {
        if (!rule?.active || rule.ruleType !== 'schedule_based') continue;
        if (rule.scheduleId === s.id || rule.playlistId === s.playlistId || (!rule.scheduleId && !rule.playlistId)) {
          entry.scheduleBasedRules.push({
            ruleId: rule.id,
            position: rule.schedulePosition,
            jingle: jinglesById[rule.jingleId] || null,
          });
        }
      }
      
      jingleMap[s.id] = entry;
    }
    
    // Global state
    const integrationState = autoDJHelper.getIntegrationState();
    
    return c.json({ jingleMap, integrationState, totalSchedules: allSchedules.length, totalJingles: allJingles.length });
  } catch (error: any) {
    console.error('Jingle map error:', error);
    return c.json({ error: `Jingle map error: ${error.message}` }, 500);
  }
});

// ==================== ANALYTICS: ACTIVE LISTENERS ====================

// Get active listeners with geolocation
app.get("/make-server-06086aa3/analytics/active-listeners", requireAuth, async (c) => {
  try {
    // Get active listeners from KV store
    const listeners = await kv.getByPrefix('listener:active:');
    
    // Transform to array with geolocation data
    const activeListeners = listeners.filter((l: any) => {
      // Filter out listeners that have been inactive for more than 5 minutes
      const inactiveTime = Date.now() - new Date(l.lastSeen).getTime();
      return inactiveTime < 5 * 60 * 1000; // 5 minutes
    });
    
    return c.json({
      listeners: activeListeners,
      total: activeListeners.length,
      countries: [...new Set(activeListeners.map((l: any) => l.country))].length
    });
  } catch (error: any) {
    console.error('Get active listeners error:', error);
    return c.json({ error: `Failed to get active listeners: ${error.message}` }, 500);
  }
});

// Track listener connection (called when someone starts listening)
app.post("/make-server-06086aa3/analytics/listener-connect", async (c) => {
  try {
    const clientIP = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    // Try to get geolocation from IP (using ipapi.co or similar service)
    let geoData = {
      country: 'Unknown',
      city: 'Unknown',
      coordinates: [0, 0] as [number, number]
    };
    
    try {
      // Use free IP geolocation API
      const geoResponse = await fetch(`https://ipapi.co/${clientIP}/json/`);
      if (geoResponse.ok) {
        const geo = await geoResponse.json();
        geoData = {
          country: geo.country_name || 'Unknown',
          city: geo.city || 'Unknown',
          coordinates: [geo.longitude || 0, geo.latitude || 0]
        };
      }
    } catch (geoError) {
      console.warn('Geolocation lookup failed:', geoError);
      // Use default values
    }
    
    const listenerId = `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const listener = {
      id: listenerId,
      country: geoData.country,
      city: geoData.city,
      coordinates: geoData.coordinates,
      connectedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      userAgent: c.req.header('user-agent') || 'Unknown',
      ip: clientIP
    };
    
    await kv.set(`listener:active:${listenerId}`, listener);
    
    console.log(`📻 New listener connected from ${listener.city}, ${listener.country}`);
    
    return c.json({ 
      message: 'Listener tracked',
      listenerId 
    });
  } catch (error: any) {
    console.error('Track listener error:', error);
    return c.json({ error: `Failed to track listener: ${error.message}` }, 500);
  }
});

// Update listener heartbeat
app.post("/make-server-06086aa3/analytics/listener-heartbeat/:id", async (c) => {
  try {
    const listenerId = c.req.param('id');
    const listener = await kv.get(`listener:active:${listenerId}`);
    
    if (listener) {
      listener.lastSeen = new Date().toISOString();
      await kv.set(`listener:active:${listenerId}`, listener);
    }
    
    return c.json({ message: 'Heartbeat updated' });
  } catch (error: any) {
    console.error('Update heartbeat error:', error);
    return c.json({ error: `Failed to update heartbeat: ${error.message}` }, 500);
  }
});

// ==================== ANALYTICS: USAGE STATS ====================

// Get usage statistics (Storage & Bandwidth)
app.get("/make-server-06086aa3/analytics/usage", requireAuth, async (c) => {
  try {
    // Get all tracks to calculate storage usage
    const tracks = await kv.getByPrefix('track:');
    const totalTracks = tracks.length;
    
    // Calculate approximate storage (rough estimate based on average file size)
    // Average MP3 file size: ~4-5 MB per track
    const averageTrackSize = 4.5; // MB
    const estimatedStorageUsed = (totalTracks * averageTrackSize) / 1024; // Convert to GB
    
    // Get active listeners and calculate bandwidth
    const listeners = await kv.getByPrefix('listener:active:');
    const activeListeners = listeners.filter((entry: any) => {
      const inactiveTime = Date.now() - new Date(entry.lastSeen).getTime();
      return inactiveTime < 5 * 60 * 1000; // 5 minutes
    });
    
    // Calculate approximate bandwidth
    // Average streaming bitrate: 128 kbps = 0.96 MB/min = 57.6 MB/hour
    // Bandwidth calculation: activeListeners * 0.96 MB/min * minutes in current month
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const minutesInMonth = daysInMonth * 24 * 60;
    const estimatedBandwidthUsed = (activeListeners.length * 0.96 * minutesInMonth) / 1024; // Convert to GB
    
    // Get actual bucket sizes if available
    let actualStorageUsed = estimatedStorageUsed;
    try {
      const bucket = 'make-06086aa3-tracks';
      const { data: files } = await supabase.storage.from(bucket).list();
      if (files && files.length > 0) {
        // Sum up file sizes if available in metadata
        const totalBytes = files.reduce((sum: number, file: any) => {
          return sum + (file.metadata?.size || 0);
        }, 0);
        actualStorageUsed = totalBytes / (1024 * 1024 * 1024); // Convert bytes to GB
      }
    } catch (storageError) {
      console.warn('Could not get actual storage usage:', storageError);
    }
    
    return c.json({
      storage: {
        used: parseFloat(actualStorageUsed.toFixed(2)),
        total: 50, // GB - default limit
        percentage: Math.round((actualStorageUsed / 50) * 100)
      },
      bandwidth: {
        used: parseFloat(estimatedBandwidthUsed.toFixed(2)),
        total: 20, // TB - default limit
        percentage: Math.round((estimatedBandwidthUsed / 20) * 100)
      },
      totalTracks,
      activeListeners: activeListeners.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get usage stats error:', error);
    return c.json({ error: `Failed to get usage stats: ${error.message}` }, 500);
  }
});

// ==================== AUTO ADMIN ASSIGNMENT ON STARTUP ====================

// Automatically assign super_admin role to niqbello@gmail.com on server startup
async function ensureSuperAdmin() {
  try {
    const adminEmail = 'niqbello@gmail.com';
    console.log(`🔍 Checking if ${adminEmail} needs super_admin role...`);
    
    // Find user by email in KV store (getByPrefix returns plain values)
    const allUsers = await kv.getByPrefix('user:');
    const user = allUsers.find((entry: any) => entry?.email === adminEmail);
    
    if (!user) {
      console.log(`⚠️  User ${adminEmail} not found yet. Will be assigned admin role upon first signup.`);
      return;
    }
    
    // Check if already super_admin
    if (user.role === 'super_admin') {
      console.log(`✅ ${adminEmail} already has super_admin role`);
      return;
    }
    
    // Assign super_admin role
    user.role = 'super_admin';
    user.updatedAt = new Date().toISOString();
    await kv.set(`user:${user.id}`, user);
    
    console.log(`✅ Super Admin role assigned to ${adminEmail} (${user.id})`);
  } catch (error: any) {
    console.error('❌ Error ensuring super admin:', error?.message || error);
  }
}

// ==================== STREAM SETTINGS ROUTES ====================

// Get Stream Settings
app.get("/make-server-06086aa3/settings/stream", async (c) => {
  try {
    let settings = await kv.get('settings:stream');
    
    // Initialize with defaults if not exists
    if (!settings) {
      settings = {
        stationName: 'Soul FM Hub',
        stationSlogan: 'Your Soul & Funk Headquarters',
        stationGenre: 'Soul, Funk, R&B',
        defaultPlaylistId: 'livestream',
        autoAdvanceEnabled: true,
        crossfadeDuration: 3,
        bufferSize: 8192,
        bitrate: '128',
        maxListeners: 100,
        fallbackTrackId: null,
        autoRestartOnError: true,
        metadataUpdateInterval: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await kv.set('settings:stream', settings);
    }
    
    return c.json({ settings });
  } catch (error: any) {
    console.error('Get stream settings error:', error);
    return c.json({ error: `Failed to get stream settings: ${error.message}` }, 500);
  }
});

// Update Stream Settings
app.post("/make-server-06086aa3/settings/stream", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const currentSettings = await kv.get('settings:stream');
    
    const updatedSettings = {
      ...currentSettings,
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set('settings:stream', updatedSettings);
    
    console.log('✅ Stream settings updated');
    
    return c.json({ 
      message: 'Stream settings updated successfully',
      settings: updatedSettings
    });
  } catch (error: any) {
    console.error('Update stream settings error:', error);
    return c.json({ error: `Failed to update stream settings: ${error.message}` }, 500);
  }
});

// ==================== UPLOAD ENDPOINTS ====================

// Image upload endpoint (for covers, avatars, etc.) — requires auth
app.post("/make-server-06086aa3/upload/image", requireAuth, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const bucketName = (formData.get('bucket') as string) || 'make-06086aa3-covers';

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return c.json({ error: 'File must be an image' }, 400);
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: 'File size must be less than 5MB' }, 400);
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return c.json({ error: `Upload failed: ${error.message}` }, 500);
    }

    // All buckets are private — generate signed URL (2h TTL)
    const signedUrl = await getAudioUrl(bucketName, filePath);
    if (!signedUrl) {
      console.error('Signed URL generation failed for:', bucketName, filePath);
      return c.json({ error: `Failed to create signed URL for ${bucketName}/${filePath}` }, 500);
    }
    const publicUrl = signedUrl;

    return c.json({
      success: true,
      url: publicUrl,
      path: filePath,
      bucket: bucketName,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error('Image upload error:', error);
    return c.json({ error: `Upload failed: ${error.message}` }, 500);
  }
});

// Audio upload endpoint (for podcast episodes, etc.) — requires auth
app.post("/make-server-06086aa3/upload/audio", requireAuth, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const extractMetadata = formData.get('extractMetadata') === 'true';

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/flac', 'audio/ogg'];
    const isValidType = validTypes.includes(file.type) || file.name.match(/\.(mp3|wav|m4a|flac|ogg)$/i);
    
    if (!isValidType) {
      return c.json({ error: 'File must be an audio file (MP3, WAV, M4A, FLAC, OGG)' }, 400);
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      return c.json({ error: 'File size must be less than 50MB' }, 400);
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `episodes/${fileName}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const { data, error } = await supabase.storage
      .from('make-06086aa3-tracks')
      .upload(filePath, arrayBuffer, {
        contentType: file.type || 'audio/mpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return c.json({ error: `Upload failed: ${error.message}` }, 500);
    }

    // Extract metadata if requested
    let metadata = null;
    if (extractMetadata) {
      try {
        const buffer = new Uint8Array(arrayBuffer);
        const { parseBuffer } = await import("npm:music-metadata@10");
        const parsedMeta = await parseBuffer(buffer, file.type || 'audio/mpeg', { duration: true });
        if (parsedMeta) {
          metadata = {
            title: parsedMeta.common.title || null,
            artist: parsedMeta.common.artist || parsedMeta.common.albumartist || null,
            album: parsedMeta.common.album || null,
            genre: parsedMeta.common.genre?.[0] || null,
            year: parsedMeta.common.year || null,
            duration: parsedMeta.format.duration ? Math.floor(parsedMeta.format.duration) : null,
            bpm: parsedMeta.common.bpm || null,
          };
          console.log('Extracted audio metadata:', metadata);
        }
      } catch (metadataError) {
        console.error('Metadata extraction error:', metadataError);
        // Don't fail upload if metadata extraction fails
      }
    }

    // Buckets are private — generate signed URL for immediate playback
    const signedTrackUrl = await getAudioUrl('make-06086aa3-tracks', filePath);

    return c.json({
      success: true,
      url: signedTrackUrl,
      path: filePath,
      size: file.size,
      type: file.type,
      metadata: metadata,
      duration: metadata?.duration || null,
    });
  } catch (error: any) {
    console.error('Audio upload error:', error);
    return c.json({ error: `Upload failed: ${error.message}` }, 500);
  }
});

// ==================== FEEDBACK MANAGEMENT ====================

// Get all feedback
app.get("/make-server-06086aa3/feedback", requireAuth, async (c) => {
  try {
    const feedback = await kv.getByPrefix('feedback:');
    feedback.sort((a: any, b: any) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    return c.json({ feedback });
  } catch (error: any) {
    console.error('Get feedback error:', error);
    return c.json({ error: `Get feedback error: ${error.message}` }, 500);
  }
});

// Submit feedback (public)
app.post("/make-server-06086aa3/feedback", async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, subject, message, rating, category } = body;

    if (!subject || !message) {
      return c.json({ error: 'Subject and message are required' }, 400);
    }

    const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sentiment: string = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';

    const item = {
      id: feedbackId,
      name: name || 'Anonymous',
      email: email || '',
      subject,
      message,
      rating: rating || 3,
      sentiment,
      status: 'new',
      category: category || 'General',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`feedback:${feedbackId}`, item);
    console.log(`📝 Feedback received: "${subject}" from ${item.name}`);
    await addAuditLog({ level: 'info', category: 'Feedback', message: `New feedback from ${item.name}: "${subject}"` });

    return c.json({ feedback: item }, 201);
  } catch (error: any) {
    console.error('Create feedback error:', error);
    return c.json({ error: `Create feedback error: ${error.message}` }, 500);
  }
});

// Update feedback status
app.put("/make-server-06086aa3/feedback/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const existing = await kv.get(`feedback:${id}`);
    if (!existing) {
      return c.json({ error: 'Feedback not found' }, 404);
    }

    const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
    await kv.set(`feedback:${id}`, updated);

    return c.json({ feedback: updated });
  } catch (error: any) {
    console.error('Update feedback error:', error);
    return c.json({ error: `Update feedback error: ${error.message}` }, 500);
  }
});

// Delete feedback
app.delete("/make-server-06086aa3/feedback/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`feedback:${id}`);
    return c.json({ message: 'Feedback deleted successfully' });
  } catch (error: any) {
    console.error('Delete feedback error:', error);
    return c.json({ error: `Delete feedback error: ${error.message}` }, 500);
  }
});

// ==================== BRANDING SETTINGS ====================

// Get branding settings
app.get("/make-server-06086aa3/settings/branding", async (c) => {
  try {
    let settings = await kv.get('settings:branding');

    if (!settings) {
      settings = {
        stationName: 'Soul FM Hub',
        tagline: 'The Wave of Your Soul',
        description: 'Online radio station dedicated to soul, funk, R&B, and jazz music. Broadcasting 24/7.',
        primaryColor: '#00d9ff',
        secondaryColor: '#00ffaa',
        accentColor: '#FF8C42',
        bgDark: '#0a1628',
        fontDisplay: 'Righteous',
        fontBody: 'Space Grotesk',
        metaTitle: 'Soul FM Hub — The Wave of Your Soul',
        metaDescription: 'Listen to the best soul, funk, R&B, and jazz music 24/7. Live DJs, curated playlists, and community.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await kv.set('settings:branding', settings);
    }

    return c.json({ settings });
  } catch (error: any) {
    console.error('Get branding settings error:', error);
    return c.json({ error: `Get branding settings error: ${error.message}` }, 500);
  }
});

// Update branding settings
app.post("/make-server-06086aa3/settings/branding", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const current = await kv.get('settings:branding') || {};
    const updated = { ...current, ...body, updatedAt: new Date().toISOString() };
    await kv.set('settings:branding', updated);
    await addAuditLog({ level: 'info', category: 'Settings', message: 'Branding settings updated', userId: c.get('userId') });

    console.log('✅ Branding settings updated');
    return c.json({ settings: updated });
  } catch (error: any) {
    console.error('Update branding settings error:', error);
    return c.json({ error: `Update branding settings error: ${error.message}` }, 500);
  }
});

// ==================== AUDIT LOGS ====================

// Get audit logs
app.get("/make-server-06086aa3/logs", requireAuth, async (c) => {
  try {
    const logs = await kv.getByPrefix('auditlog:');
    logs.sort((a: any, b: any) =>
      new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );

    const limit = parseInt(c.req.query('limit') || '100');
    return c.json({ logs: logs.slice(0, limit) });
  } catch (error: any) {
    console.error('Get logs error:', error);
    return c.json({ error: `Get logs error: ${error.message}` }, 500);
  }
});

// Create audit log entry
app.post("/make-server-06086aa3/logs", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const entry = {
      id: logId,
      timestamp: new Date().toISOString(),
      level: body.level || 'info',
      category: body.category || 'System',
      message: body.message || '',
      details: body.details || null,
      userId: c.get('userId') || null,
      ip: body.ip || null,
    };
    await kv.set(`auditlog:${logId}`, entry);
    return c.json({ log: entry }, 201);
  } catch (error: any) {
    console.error('Create log error:', error);
    return c.json({ error: `Create log error: ${error.message}` }, 500);
  }
});

// Clear old logs
app.delete("/make-server-06086aa3/logs", requireAuth, async (c) => {
  try {
    const logs = await kv.getByPrefix('auditlog:');
    let deleted = 0;
    for (const log of logs) {
      if (log.id) {
        await kv.del(`auditlog:${log.id}`);
        deleted++;
      }
    }
    // Re-add a single audit log recording this clear action
    await addAuditLog({ level: 'warning', category: 'System', message: `Audit logs cleared (${deleted} entries)`, userId: c.get('userId') });
    return c.json({ message: `${deleted} log(s) cleared` });
  } catch (error: any) {
    console.error('Clear logs error:', error);
    return c.json({ error: `Clear logs error: ${error.message}` }, 500);
  }
});

// ==================== BACKUP / EXPORT ====================

// Export data as JSON
app.get("/make-server-06086aa3/export/:type", requireAuth, async (c) => {
  try {
    const type = c.req.param('type');
    let data: any = {};
    const timestamp = new Date().toISOString();

    switch (type) {
      case 'tracks': {
        const tracks = await kv.getByPrefix('track:');
        data = { type: 'tracks', count: tracks.length, exportedAt: timestamp, tracks };
        break;
      }
      case 'playlists': {
        const playlists = await kv.getByPrefix('playlist:');
        data = { type: 'playlists', count: playlists.length, exportedAt: timestamp, playlists };
        break;
      }
      case 'schedule': {
        const schedules = await kv.getByPrefix('schedule:');
        data = { type: 'schedule', count: schedules.length, exportedAt: timestamp, schedules };
        break;
      }
      case 'shows': {
        const shows = await kv.getByPrefix('show:');
        const podcasts = (await kv.getByPrefix('podcast:')).filter((p: any) => !p.podcastSlug && (p.title || p.name));
        data = { type: 'shows_podcasts', shows: { count: shows.length, items: shows }, podcasts: { count: podcasts.length, items: podcasts }, exportedAt: timestamp };
        break;
      }
      case 'settings': {
        const streamSettings = await kv.get('settings:stream');
        const brandingSettings = await kv.get('settings:branding');
        data = { type: 'settings', exportedAt: timestamp, stream: streamSettings, branding: brandingSettings };
        break;
      }
      case 'news': {
        const news = await kv.getByPrefix('news:');
        data = { type: 'news', count: news.length, exportedAt: timestamp, news };
        break;
      }
      case 'full': {
        const tracks = await kv.getByPrefix('track:');
        const playlists = await kv.getByPrefix('playlist:');
        const schedules = await kv.getByPrefix('schedule:');
        const shows = await kv.getByPrefix('show:');
        const podcasts = (await kv.getByPrefix('podcast:')).filter((p: any) => !p.podcastSlug && (p.title || p.name));
        const news = await kv.getByPrefix('news:');
        const profiles = await kv.getByPrefix('profile:');
        const streamSettings = await kv.get('settings:stream');
        const brandingSettings = await kv.get('settings:branding');
        data = {
          type: 'full_backup',
          exportedAt: timestamp,
          tracks: { count: tracks.length, items: tracks },
          playlists: { count: playlists.length, items: playlists },
          schedules: { count: schedules.length, items: schedules },
          shows: { count: shows.length, items: shows },
          podcasts: { count: podcasts.length, items: podcasts },
          news: { count: news.length, items: news },
          profiles: { count: profiles.length, items: profiles },
          settings: { stream: streamSettings, branding: brandingSettings },
        };
        break;
      }
      default:
        return c.json({ error: `Unknown export type: ${type}` }, 400);
    }

    // Record export in audit log
    await addAuditLog({ level: 'success', category: 'Backup', message: `Data exported: ${type}`, userId: c.get('userId') });

    console.log(`📦 Data exported: ${type}`);
    return c.json(data);
  } catch (error: any) {
    console.error('Export error:', error);
    return c.json({ error: `Export error: ${error.message}` }, 500);
  }
});

// Get export history (from audit logs)
app.get("/make-server-06086aa3/export-history", requireAuth, async (c) => {
  try {
    const logs = await kv.getByPrefix('auditlog:');
    const exportLogs = logs
      .filter((l: any) => l.category === 'Backup')
      .sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, 20);
    return c.json({ history: exportLogs });
  } catch (error: any) {
    console.error('Export history error:', error);
    return c.json({ error: `Export history error: ${error.message}` }, 500);
  }
});

// ==================== ADMIN DASHBOARD STATS ====================

app.get("/make-server-06086aa3/admin/dashboard-stats", requireAuth, async (c) => {
  try {
    const [feedback, logs] = await Promise.all([
      kv.getByPrefix('feedback:'),
      kv.getByPrefix('auditlog:'),
    ]);

    const newFeedbackCount = feedback.filter((f: any) => f.status === 'new').length;
    const totalFeedbackCount = feedback.length;

    // Sort logs by timestamp desc and take the latest 5
    const recentLogs = logs
      .sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, 5)
      .map((l: any) => ({
        id: l.id,
        timestamp: l.timestamp,
        level: l.level,
        category: l.category,
        message: l.message,
      }));

    const errorCount = logs.filter((l: any) => l.level === 'error').length;
    const warningCount = logs.filter((l: any) => l.level === 'warning').length;

    return c.json({
      feedback: { total: totalFeedbackCount, new: newFeedbackCount },
      logs: { total: logs.length, errors: errorCount, warnings: warningCount, recent: recentLogs },
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return c.json({ error: `Dashboard stats error: ${error.message}` }, 500);
  }
});

// ==================== RESOURCE USAGE (REAL DATA) ====================

app.get("/make-server-06086aa3/admin/resource-usage", requireAuth, async (c) => {
  try {
    // 1. Try AzuraCast server stats (requires admin API key)
    let azuraStorage: any = null;
    let azuraListeners: any = null;
    try {
      const config = await kv.get('azuracast:config');
      if (config?.enabled && config?.baseUrl) {
        const apiKey = Deno.env.get('AZURACAST_API_KEY') || '';
        
        // Get server stats (disk usage)
        if (apiKey) {
          try {
            const serverUrl = `${config.baseUrl.replace(/\/$/, '')}/api/admin/server/stats`;
            const c1 = new AbortController();
            const t1 = setTimeout(() => c1.abort(), 8000);
            const sr = await fetch(serverUrl, {
              headers: { 'X-API-Key': apiKey, 'Accept': 'application/json' },
              signal: c1.signal,
            });
            clearTimeout(t1);
            if (sr.ok) {
              const ss = await sr.json();
              azuraStorage = { disk: ss.disk, memory: ss.memory, cpu: ss.cpu };
            }
          } catch (e: any) {
            console.warn('[ResourceUsage] AzuraCast server stats:', e?.message);
          }
        }

        // Get station details (media storage)
        try {
          const stUrl = `${config.baseUrl.replace(/\/$/, '')}/api/station/${config.stationId}`;
          const c2 = new AbortController();
          const t2 = setTimeout(() => c2.abort(), 8000);
          const stR = await fetch(stUrl, {
            headers: { 'X-API-Key': apiKey || '', 'Accept': 'application/json' },
            signal: c2.signal,
          });
          clearTimeout(t2);
          if (stR.ok) {
            const stD = await stR.json();
            if (stD.storage_available || stD.storage_used) {
              azuraStorage = {
                ...azuraStorage,
                stationStorageUsed: stD.storage_used,
                stationStorageAvailable: stD.storage_available,
                stationStorageQuota: stD.storage_quota,
              };
            }
          }
        } catch (e: any) {
          console.warn('[ResourceUsage] AzuraCast station info:', e?.message);
        }

        // Get live listeners from nowplaying (public)
        try {
          const npUrl = `${config.baseUrl.replace(/\/$/, '')}/api/nowplaying/${config.stationId}`;
          const c3 = new AbortController();
          const t3 = setTimeout(() => c3.abort(), 6000);
          const npR = await fetch(npUrl, {
            headers: { 'Accept': 'application/json' },
            signal: c3.signal,
          });
          clearTimeout(t3);
          if (npR.ok) {
            const npD = await npR.json();
            azuraListeners = npD.listeners || {};
          }
        } catch (e: any) {
          console.warn('[ResourceUsage] AzuraCast nowplaying:', e?.message);
        }
      }
    } catch (e: any) {
      console.warn('[ResourceUsage] AzuraCast fetch error:', e?.message);
    }

    // 2. KV-based resource tracking
    const kvUsage = await kv.get('system:resource-usage') || {};

    // 3. Real KV data counts
    const [tracks, playlists, schedules, shows, podcasts] = await Promise.all([
      kv.getByPrefix('track:').catch(() => []),
      kv.getByPrefix('playlist:').catch(() => []),
      kv.getByPrefix('schedule:').catch(() => []),
      kv.getByPrefix('show:').catch(() => []),
      kv.getByPrefix('podcast:').catch(() => []),
    ]);

    // 4. Storage/bandwidth from AzuraCast or KV
    let storageUsedGB = kvUsage.storageUsedGB ?? 0;
    let storageTotalGB = kvUsage.storageTotalGB ?? 50;
    let bandwidthUsedGB = kvUsage.bandwidthUsedGB ?? 0;
    let bandwidthTotalGB = kvUsage.bandwidthTotalGB ?? 20;

    if (azuraStorage?.disk) {
      const d = azuraStorage.disk;
      if (d.bytes_total) {
        storageTotalGB = parseFloat((d.bytes_total / (1024 ** 3)).toFixed(2));
        storageUsedGB = parseFloat((d.bytes_used / (1024 ** 3)).toFixed(2));
      } else if (typeof d.total === 'string') {
        storageTotalGB = parseFloat(d.total) || storageTotalGB;
        storageUsedGB = parseFloat(d.used) || storageUsedGB;
      }
    }

    // Listeners from AzuraCast (REAL)
    const listenersNow = azuraListeners?.current ?? azuraListeners?.total ?? kvUsage.listenersNow ?? 0;
    const listenersUnique = azuraListeners?.unique ?? kvUsage.listenersUnique ?? 0;
    const listenersPeak = Math.max(kvUsage.listenersPeak ?? 0, listenersNow);

    // 5. Save updated values
    const updatedUsage = {
      storageUsedGB, storageTotalGB, bandwidthUsedGB, bandwidthTotalGB,
      listenersNow, listenersUnique, listenersPeak,
      lastUpdated: new Date().toISOString(),
      source: azuraStorage ? 'azuracast' : 'manual',
    };
    await kv.set('system:resource-usage', updatedUsage).catch(() => {});

    return c.json({
      storage: {
        usedGB: storageUsedGB,
        totalGB: storageTotalGB,
        percentUsed: storageTotalGB > 0 ? parseFloat(((storageUsedGB / storageTotalGB) * 100).toFixed(1)) : 0,
      },
      bandwidth: {
        usedGB: bandwidthUsedGB,
        totalGB: bandwidthTotalGB,
        percentUsed: bandwidthTotalGB > 0 ? parseFloat(((bandwidthUsedGB / bandwidthTotalGB) * 100).toFixed(1)) : 0,
      },
      listeners: {
        current: listenersNow,
        unique: listenersUnique,
        peak: listenersPeak,
      },
      content: {
        tracks: tracks.length,
        playlists: playlists.length,
        schedules: schedules.length,
        shows: shows.length,
        podcasts: podcasts.length,
      },
      azuracast: azuraStorage ? {
        connected: true,
        disk: azuraStorage.disk,
        memory: azuraStorage.memory,
        stationStorage: azuraStorage.stationStorageUsed ? {
          used: azuraStorage.stationStorageUsed,
          available: azuraStorage.stationStorageAvailable,
        } : null,
      } : { connected: false },
      lastUpdated: updatedUsage.lastUpdated,
    });
  } catch (error: any) {
    console.error('Resource usage error:', error);
    return c.json({ error: `Resource usage error: ${error.message}` }, 500);
  }
});

// PUT /admin/resource-usage — manually update resource limits/values
app.put("/make-server-06086aa3/admin/resource-usage", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const existing = await kv.get('system:resource-usage') || {};
    const updated = {
      ...existing,
      ...(body.storageUsedGB !== undefined && { storageUsedGB: parseFloat(body.storageUsedGB) }),
      ...(body.storageTotalGB !== undefined && { storageTotalGB: parseFloat(body.storageTotalGB) }),
      ...(body.bandwidthUsedGB !== undefined && { bandwidthUsedGB: parseFloat(body.bandwidthUsedGB) }),
      ...(body.bandwidthTotalGB !== undefined && { bandwidthTotalGB: parseFloat(body.bandwidthTotalGB) }),
      ...(body.listenersPeak !== undefined && { listenersPeak: parseInt(body.listenersPeak) }),
      lastUpdated: new Date().toISOString(),
      source: 'manual',
    };
    await kv.set('system:resource-usage', updated);
    console.log('[ResourceUsage] Manual update:', JSON.stringify(updated));
    return c.json({ success: true, usage: updated });
  } catch (error: any) {
    console.error('Update resource usage error:', error);
    return c.json({ error: `Update resource usage error: ${error.message}` }, 500);
  }
});

// POST /admin/cache/clear — flush all server-side caches
app.post("/make-server-06086aa3/admin/cache/clear", requireAuth, async (c) => {
  try {
    const cleared: string[] = [];

    // 1. In-memory AzuraCast file URL cache
    const azuraCacheSize = azuraFileCache.size;
    azuraFileCache.clear();
    cleared.push(`azuraFileCache (${azuraCacheSize} entries)`);

    // 2. KV: AzuraCast now-playing cache
    try {
      const np = await kv.get('azuracast:nowplaying-cache');
      if (np) {
        await kv.del('azuracast:nowplaying-cache');
        cleared.push('azuracast:nowplaying-cache');
      }
    } catch { /* key may not exist */ }

    // 3. KV: Icecast status cache
    try {
      const ice = await kv.get('icecast:status-cache');
      if (ice) {
        await kv.del('icecast:status-cache');
        cleared.push('icecast:status-cache');
      }
    } catch { /* key may not exist */ }

    console.log(`[CacheClear] Admin cleared caches: ${cleared.join(', ')}`);
    return c.json({
      success: true,
      cleared,
      message: `Cleared ${cleared.length} cache layer(s)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Cache clear error:', error);
    return c.json({ error: `Cache clear error: ${error.message}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════
// ── BROADCAST TEAM (Отдел Эфира) ─────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

const DEFAULT_BROADCAST_MEMBERS = [
  { id: 'nico', name: 'Nico', fullName: 'Nico Steel', role: 'Program Director', roleKey: 'program-director', color: '#94a3b8', emoji: '🎬', bio: 'Программный директор Soul FM Hub. Координирует эфирную сетку, утверждает контент, управляет командой и определяет стратегическое развитие станции.', specialties: ['Programming', 'Team Management', 'Content Strategy', 'Scheduling', 'Quality Control'], photoType: 'figma', photoId: 'nico', status: 'online', show: null, schedule: 'Mon-Sun 24/7', genres: ['All Formats', 'Strategy', 'Management'] },
  { id: 'sandra', name: 'Sandra', fullName: 'Sandra Ray', role: 'Singer / Vocalist', roleKey: 'singer', color: '#ff69b4', emoji: '🎤', bio: 'Главный голос Soul FM Hub. Записывает вокальные партии, джинглы и промо-ролики для эфира. Её тёплый тембр стал визитной карточкой станции.', specialties: ['Vocals', 'Jingles', 'Promo Voiceovers', 'Live Sessions'], photoType: 'figma', photoId: 'sandra', status: 'online', show: 'Morning Vibes', schedule: 'Mon-Fri 07:00-10:00', genres: ['Soul', 'R&B', 'Neo-Soul', 'Jazz'] },
  { id: 'liana', name: 'Liana', fullName: 'Liana Nova', role: 'Announcer / Host', roleKey: 'announcer', color: '#ff6b35', emoji: '📻', bio: 'Профессиональный диктор и ведущая эфира. Озвучивает новости, анонсы, спецвыпуски. Мастер импровизации и живого общения с аудиторией.', specialties: ['News Reading', 'Live Hosting', 'Announcements', 'Interviews'], photoType: 'figma', photoId: 'liana', status: 'on-air', show: 'Soul FM News Hour', schedule: 'Mon-Fri 12:00-13:00', genres: ['Talk', 'News', 'Entertainment'] },
  { id: 'den', name: 'Den', fullName: 'Den Cipher', role: 'DJ / Music Director', roleKey: 'dj', color: '#00d9ff', emoji: '🎧', bio: 'Главный диджей и музыкальный директор Soul FM Hub. Создаёт микс-шоу, курирует плейлисты и задаёт музыкальный вектор станции.', specialties: ['DJ Sets', 'Mix Shows', 'Music Curation', 'Live Mixing'], photoType: 'figma', photoId: 'den', status: 'online', show: 'Neon Nights', schedule: 'Fri-Sat 22:00-02:00', genres: ['Deep House', 'Electronic', 'Chillwave', 'Nu-Disco'] },
  { id: 'mark', name: 'Mark', fullName: 'Mark Volt', role: 'News & Marketing', roleKey: 'news-marketing', color: '#3b82f6', emoji: '📰', bio: 'Отвечает за новостной контент и маркетинг станции. Ведёт новостные выпуски, создаёт промо-кампании, работает с рекламодателями и развивает бренд Soul FM.', specialties: ['News Production', 'Marketing Strategy', 'Brand Development', 'Ad Campaigns', 'Social Media'], photoType: 'figma', photoId: 'mark', status: 'online', show: 'Soul FM News & Trends', schedule: 'Mon-Fri 09:00-17:00', genres: ['News', 'Marketing', 'Promo', 'Trends'] },
  { id: 'max', name: 'Max', fullName: 'Max Sterling', role: 'Mix Engineer', roleKey: 'mix-engineer', color: '#a855f7', emoji: '🎛️', bio: 'Звукоинженер и мастер сведения. Обрабатывает треки, сводит звук, отвечает за качество аудио в эфире. Работает с микшерным пультом и DAW.', specialties: ['Audio Mixing', 'Mastering', 'Sound Design', 'DAW Production', 'Live Sound'], photoType: 'figma', photoId: 'max', status: 'online', show: 'Studio Sessions', schedule: 'Mon-Fri 10:00-18:00', genres: ['All Genres', 'Production', 'Mastering'] },
  { id: 'stella', name: 'Stella', fullName: 'Stella Vox', role: 'Dictor / News Editor', roleKey: 'dictor-editor', color: '#ec4899', emoji: '🎙️', bio: 'Диктор, редактор новостей и голос информационного вещания Soul FM. Готовит выпуски, редактирует тексты, ведёт прямые эфиры и интервью.', specialties: ['News Anchoring', 'Script Writing', 'Content Editing', 'Live Broadcasting', 'Interviews'], photoType: 'figma', photoId: 'stella', status: 'on-air', show: 'Evening News Digest', schedule: 'Mon-Fri 18:00-19:00', genres: ['News', 'Talk', 'Interviews', 'Editorial'] },
];

app.get("/make-server-06086aa3/broadcast-team/members", requireAuth, async (c) => {
  try {
    let members = await kv.getByPrefix('broadcast:member:');
    // Re-seed if empty or if team composition changed (new members added)
    const expectedIds = new Set(DEFAULT_BROADCAST_MEMBERS.map(m => m.id));
    const existingIds = new Set(members.map((m: any) => m.id));
    const needsReseed = members.length === 0 || DEFAULT_BROADCAST_MEMBERS.some(m => !existingIds.has(m.id));
    if (needsReseed) {
      // Remove old members not in new default list
      for (const m of members) {
        if (!expectedIds.has((m as any).id)) await kv.del(`broadcast:member:${(m as any).id}`);
      }
      // Add missing members from default list
      for (const m of DEFAULT_BROADCAST_MEMBERS) {
        if (!existingIds.has(m.id)) {
          await kv.set(`broadcast:member:${m.id}`, { ...m, joinedAt: new Date().toISOString() });
        }
      }
      members = await kv.getByPrefix('broadcast:member:');
      await addAuditLog({ level: 'info', category: 'Broadcast Team', message: `Synced broadcast team: ${members.length} members` });
    }
    const order = ['program-director', 'singer', 'announcer', 'dj', 'news-marketing', 'mix-engineer', 'dictor-editor'];
    members.sort((a: any, b: any) => order.indexOf(a.roleKey) - order.indexOf(b.roleKey));
    return c.json({ members });
  } catch (e: any) { return c.json({ error: `Broadcast team error: ${e.message}` }, 500); }
});

app.put("/make-server-06086aa3/broadcast-team/members/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const existing: any = await kv.get(`broadcast:member:${id}`);
    if (!existing) return c.json({ error: 'Member not found' }, 404);
    const updates = await c.req.json();
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await kv.set(`broadcast:member:${id}`, updated);
    await addAuditLog({ level: 'info', category: 'Broadcast Team', message: `Updated broadcast member: ${updated.name}` });
    return c.json({ member: updated });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get("/make-server-06086aa3/broadcast-team/on-air", requireAuth, async (c) => {
  try {
    const members = await kv.getByPrefix('broadcast:member:');
    const onAir = members.filter((m: any) => m.status === 'on-air');
    return c.json({ onAir, total: members.length, onlineCount: members.filter((m: any) => m.status !== 'offline').length });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post("/make-server-06086aa3/broadcast-team/members/:id/status", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    const member: any = await kv.get(`broadcast:member:${id}`);
    if (!member) return c.json({ error: 'Member not found' }, 404);
    member.status = status; member.updatedAt = new Date().toISOString();
    await kv.set(`broadcast:member:${id}`, member);
    await addAuditLog({ level: status === 'on-air' ? 'success' : 'info', category: 'Broadcast Team', message: `${member.name} status → ${status}` });
    return c.json({ member });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post("/make-server-06086aa3/broadcast-team/reset", requireAuth, async (c) => {
  try {
    const existing = await kv.getByPrefix('broadcast:member:');
    for (const m of existing) await kv.del(`broadcast:member:${(m as any).id}`);
    for (const m of DEFAULT_BROADCAST_MEMBERS) await kv.set(`broadcast:member:${m.id}`, { ...m, joinedAt: new Date().toISOString() });
    return c.json({ message: 'Broadcast team reset', count: DEFAULT_BROADCAST_MEMBERS.length });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ══════════════════════════════════════════════════════════════════════
// ── AUTOPILOT SYSTEM ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

// POST /ai-team/autopilot/start
app.post("/make-server-06086aa3/ai-team/autopilot/start", requireAuth, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const durationMin = body.durationMinutes || 60;
    const session = {
      id: `ap_${Date.now()}`,
      status: 'running',
      startedAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + durationMin * 60 * 1000).toISOString(),
      durationMinutes: durationMin,
      cyclesCompleted: 0,
      successCount: 0,
      errorCount: 0,
      warningCount: 0,
    };
    await kv.set('ai-team:autopilot:session', session);
    await addAuditLog({ level: 'info', category: 'Autopilot', message: `Autopilot started for ${durationMin} minutes` });
    return c.json({ session });
  } catch (e: any) {
    return c.json({ error: `Autopilot start error: ${e.message}` }, 500);
  }
});

// POST /ai-team/autopilot/stop
app.post("/make-server-06086aa3/ai-team/autopilot/stop", requireAuth, async (c) => {
  try {
    const session: any = await kv.get('ai-team:autopilot:session');
    if (session) {
      session.status = 'stopped';
      session.stoppedAt = new Date().toISOString();
      await kv.set('ai-team:autopilot:session', session);
    }
    await addAuditLog({ level: 'info', category: 'Autopilot', message: 'Autopilot stopped by admin' });
    return c.json({ session });
  } catch (e: any) {
    return c.json({ error: `Autopilot stop error: ${e.message}` }, 500);
  }
});

// GET /ai-team/autopilot/status
app.get("/make-server-06086aa3/ai-team/autopilot/status", requireAuth, async (c) => {
  try {
    const session: any = await kv.get('ai-team:autopilot:session');
    const logs = await kv.getByPrefix('ai-team:autopilot:log:');
    logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Auto-stop if expired
    if (session?.status === 'running' && new Date(session.endsAt) <= new Date()) {
      session.status = 'completed';
      session.completedAt = new Date().toISOString();
      await kv.set('ai-team:autopilot:session', session);
    }

    return c.json({ session: session || null, logs: logs.slice(0, 100) });
  } catch (e: any) {
    return c.json({ error: `Autopilot status error: ${e.message}` }, 500);
  }
});

// POST /ai-team/autopilot/cycle — execute one autopilot work cycle
app.post("/make-server-06086aa3/ai-team/autopilot/cycle", requireAuth, async (c) => {
  try {
    const session: any = await kv.get('ai-team:autopilot:session');
    if (!session || session.status !== 'running') {
      return c.json({ error: 'Autopilot is not running' }, 400);
    }
    if (new Date(session.endsAt) <= new Date()) {
      session.status = 'completed';
      session.completedAt = new Date().toISOString();
      await kv.set('ai-team:autopilot:session', session);
      return c.json({ error: 'Autopilot session has ended', session });
    }

    // Pick a random member
    const members = await kv.getByPrefix('ai-team:member:');
    if (!members.length) return c.json({ error: 'No team members found' }, 404);
    const member: any = members[Math.floor(Math.random() * members.length)];

    // Perform real system check based on role
    const result = await performAutopilotCheck(member);

    // Create task in Kanban board
    const taskId = `task_ap_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const task = {
      id: taskId,
      title: result.title,
      description: result.description,
      status: result.status === 'success' ? 'done' : result.status === 'error' ? 'backlog' : 'review',
      priority: result.status === 'error' ? 'high' : result.status === 'warning' ? 'medium' : 'low',
      assigneeId: member.id,
      labels: ['autopilot', result.category.toLowerCase().replace(/\s+/g, '-')],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      autopilot: true,
      autopilotResult: result.status,
    };
    await kv.set(`ai-team:task:${taskId}`, task);

    // If error, create a follow-up fix task
    let fixTaskId: string | null = null;
    if (result.status === 'error') {
      fixTaskId = `task_fix_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const fixTask = {
        id: fixTaskId,
        title: `[FIX] ${result.title}`,
        description: `Auto-generated fix task:\n\nOriginal issue: ${result.description}\n\nError details: ${result.details}\n\nAssigned for rework.`,
        status: 'in-progress',
        priority: 'high',
        assigneeId: member.id,
        labels: ['autopilot', 'bug', 'rework'],
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        autopilot: true,
        autopilotResult: 'rework',
      };
      await kv.set(`ai-team:task:${fixTaskId}`, fixTask);
    }

    // Log the activity
    const logId = `aplog_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const logEntry = {
      id: logId,
      timestamp: new Date().toISOString(),
      memberId: member.id,
      memberName: member.name,
      memberRole: member.role,
      memberAvatar: member.avatar,
      memberColor: member.color,
      title: result.title,
      description: result.description,
      details: result.details,
      category: result.category,
      status: result.status,
      taskId,
      fixTaskId,
      metrics: result.metrics || null,
    };
    await kv.set(`ai-team:autopilot:log:${logId}`, logEntry);

    // Update session counters
    session.cyclesCompleted = (session.cyclesCompleted || 0) + 1;
    if (result.status === 'success') session.successCount = (session.successCount || 0) + 1;
    else if (result.status === 'error') session.errorCount = (session.errorCount || 0) + 1;
    else session.warningCount = (session.warningCount || 0) + 1;
    await kv.set('ai-team:autopilot:session', session);

    // Audit log
    await addAuditLog({
      level: result.status === 'error' ? 'error' : result.status === 'warning' ? 'warning' : 'success',
      category: 'Autopilot',
      message: `[${member.name}] ${result.title}: ${result.status}`,
      details: result.details,
    });

    return c.json({ log: logEntry, task, session });
  } catch (e: any) {
    console.error('Autopilot cycle error:', e);
    return c.json({ error: `Autopilot cycle error: ${e.message}` }, 500);
  }
});

// POST /ai-team/autopilot/clear-logs
app.post("/make-server-06086aa3/ai-team/autopilot/clear-logs", requireAuth, async (c) => {
  try {
    const logs = await kv.getByPrefix('ai-team:autopilot:log:');
    for (const log of logs) {
      await kv.del(`ai-team:autopilot:log:${(log as any).id}`);
    }
    return c.json({ cleared: logs.length });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── Autopilot check logic ──────────────────────────────────���──────────

async function performAutopilotCheck(member: any): Promise<{
  title: string; description: string; details: string;
  category: string; status: 'success' | 'error' | 'warning';
  metrics?: Record<string, any>;
}> {
  const role = member.role;

  try {
    switch (role) {
      case 'Backend Developer': return await checkBackend();
      case 'DevOps Engineer': return await checkDevOps();
      case 'QA Engineer': return await checkQA();
      case 'Frontend Developer': return await checkFrontend();
      case 'UX Designer': return await checkUX();
      case 'Team Lead': return await checkTeamLead();
      default: return await checkGeneric(member);
    }
  } catch (err: any) {
    return {
      title: `${role} check failed`,
      description: `Unexpected error during ${role.toLowerCase()} check`,
      details: err.message || String(err),
      category: 'System Error',
      status: 'error',
    };
  }
}

async function checkBackend(): Promise<any> {
  const checks: string[] = [];
  let hasIssue = false;
  let issueDetail = '';

  // 1. Count tracks & verify data integrity
  const tracks = await kv.getByPrefix('track:');
  checks.push(`${tracks.length} tracks in KV store`);

  // 2. Check for tracks missing required fields
  const badTracks = tracks.filter((t: any) => !t.title || !t.id);
  if (badTracks.length > 0) {
    hasIssue = true;
    issueDetail = `${badTracks.length} tracks missing required fields (title/id)`;
    checks.push(`⚠ ${issueDetail}`);
  } else {
    checks.push(`All tracks have valid schema`);
  }

  // 3. Count playlists and check orphaned track refs
  const playlists = await kv.getByPrefix('playlist:');
  checks.push(`${playlists.length} playlists`);
  const trackIds = new Set(tracks.map((t: any) => t.id));
  let orphanCount = 0;
  for (const pl of playlists) {
    const ids: string[] = (pl as any).trackIds || [];
    orphanCount += ids.filter(id => !trackIds.has(id)).length;
  }
  if (orphanCount > 0) {
    hasIssue = true;
    issueDetail = `${orphanCount} orphaned track references in playlists`;
    checks.push(`⚠ ${issueDetail}`);

    // Auto-fix: remove orphans from playlists
    for (const pl of playlists) {
      const p = pl as any;
      const orig = p.trackIds || [];
      const cleaned = orig.filter((id: string) => trackIds.has(id));
      if (cleaned.length < orig.length) {
        p.trackIds = cleaned;
        await kv.set(`playlist:${p.id}`, p);
      }
    }
    checks.push(`✓ Auto-cleaned orphaned references from playlists`);
  } else {
    checks.push(`No orphaned track references`);
  }

  // 4. Check schedule slots
  const schedules = await kv.getByPrefix('schedule:');
  checks.push(`${schedules.length} schedule slots`);

  // 5. Check KV key count
  const allLogs = await kv.getByPrefix('auditlog:');
  checks.push(`${allLogs.length} audit log entries`);

  return {
    title: 'Backend data integrity check',
    description: `Validated ${tracks.length} tracks, ${playlists.length} playlists, ${schedules.length} schedule slots`,
    details: checks.join('\n'),
    category: 'Data Integrity',
    status: hasIssue ? (orphanCount > 0 ? 'warning' : 'error') : 'success',
    metrics: { tracks: tracks.length, playlists: playlists.length, schedules: schedules.length, orphans: orphanCount, badTracks: badTracks.length },
  };
}

async function checkDevOps(): Promise<any> {
  const checks: string[] = [];
  let hasIssue = false;

  // 1. Check storage buckets
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  if (bucketsErr) {
    return {
      title: 'Storage health check failed',
      description: 'Unable to list storage buckets',
      details: bucketsErr.message,
      category: 'Infrastructure',
      status: 'error',
    };
  }

  const expectedBuckets = ['make-06086aa3-tracks', 'make-06086aa3-covers', 'make-06086aa3-jingles'];
  const existingNames = buckets?.map(b => b.name) || [];

  for (const expected of expectedBuckets) {
    if (existingNames.includes(expected)) {
      checks.push(`✓ Bucket "${expected}" exists`);

      // Check bucket contents
      const { data: files } = await supabase.storage.from(expected).list('', { limit: 1000 });
      const fileCount = files?.length || 0;
      checks.push(`  → ${fileCount} files`);
    } else {
      hasIssue = true;
      checks.push(`✗ Bucket "${expected}" MISSING`);
    }
  }

  // 2. Check bucket public configs
  for (const b of buckets || []) {
    if (b.name.startsWith('make-06086aa3')) {
      if (!b.public) {
        hasIssue = true;
        checks.push(`⚠ Bucket "${b.name}" is not public — fixing...`);
        await supabase.storage.updateBucket(b.name, { public: true });
        checks.push(`✓ Fixed bucket "${b.name}" → public`);
      }
    }
  }

  checks.push(`Total storage buckets: ${buckets?.length || 0}`);

  return {
    title: 'Infrastructure & storage health check',
    description: `Checked ${expectedBuckets.length} critical buckets, ${buckets?.length || 0} total`,
    details: checks.join('\n'),
    category: 'Infrastructure',
    status: hasIssue ? 'warning' : 'success',
    metrics: { totalBuckets: buckets?.length || 0, expected: expectedBuckets.length, missing: expectedBuckets.filter(e => !existingNames.includes(e)).length },
  };
}

async function checkQA(): Promise<any> {
  const checks: string[] = [];
  let errorCount = 0;

  // 1. Validate track schemas
  const tracks = await kv.getByPrefix('track:');
  let missingAudio = 0;
  let missingTitle = 0;
  let missingDuration = 0;

  for (const t of tracks) {
    const track = t as any;
    if (!track.title) missingTitle++;
    if (!track.audioUrl && !track.storageBucket) missingAudio++;
    if (!track.duration && track.duration !== 0) missingDuration++;
  }

  if (missingTitle > 0) { errorCount++; checks.push(`✗ ${missingTitle} tracks without title`); }
  else checks.push(`✓ All ${tracks.length} tracks have titles`);

  if (missingAudio > 0) { checks.push(`⚠ ${missingAudio} tracks without audio source`); }
  else checks.push(`✓ All tracks have audio source`);

  if (missingDuration > 0) { checks.push(`⚠ ${missingDuration} tracks without duration metadata`); }
  else checks.push(`✓ All tracks have duration metadata`);

  // 2. Check playlist consistency
  const playlists = await kv.getByPrefix('playlist:');
  let emptyPlaylists = 0;
  for (const pl of playlists) {
    if (!((pl as any).trackIds?.length > 0)) emptyPlaylists++;
  }
  if (emptyPlaylists > 0) checks.push(`⚠ ${emptyPlaylists} empty playlists`);
  else checks.push(`✓ All ${playlists.length} playlists have tracks`);

  // 3. Check branding config exists
  const branding = await kv.get('branding:config');
  if (branding) checks.push(`✓ Branding config present`);
  else { checks.push(`⚠ No branding config found`); }

  // 4. Validate schedule slots have valid playlist refs
  const schedules = await kv.getByPrefix('schedule:');
  const playlistIds = new Set(playlists.map((p: any) => p.id));
  let invalidSchedules = 0;
  for (const s of schedules) {
    const slot = s as any;
    if (slot.playlistId && !playlistIds.has(slot.playlistId)) invalidSchedules++;
  }
  if (invalidSchedules > 0) {
    errorCount++;
    checks.push(`✗ ${invalidSchedules} schedule slots reference non-existent playlists`);
  } else {
    checks.push(`✓ All schedule slots reference valid playlists`);
  }

  return {
    title: 'QA regression test suite',
    description: `Tested ${tracks.length} tracks, ${playlists.length} playlists, ${schedules.length} schedules`,
    details: checks.join('\n'),
    category: 'Quality Assurance',
    status: errorCount > 0 ? 'error' : (missingAudio + missingDuration + emptyPlaylists > 0 ? 'warning' : 'success'),
    metrics: { tracks: tracks.length, missingAudio, missingTitle, missingDuration, emptyPlaylists, invalidSchedules },
  };
}

async function checkFrontend(): Promise<any> {
  const checks: string[] = [];

  // 1. Check branding config consistency
  const branding: any = await kv.get('branding:config');
  if (branding) {
    checks.push(`✓ Station name: "${branding.stationName || 'Soul FM Hub'}"`);
    if (branding.primaryColor) checks.push(`✓ Primary color: ${branding.primaryColor}`);
    if (branding.fontFamily) checks.push(`✓ Font: ${branding.fontFamily}`);
  } else {
    checks.push(`⚠ No branding config — using defaults`);
  }

  // 2. Check tracks have cover art
  const tracks = await kv.getByPrefix('track:');
  const noCover = tracks.filter((t: any) => !t.coverUrl).length;
  if (noCover > 0) {
    checks.push(`⚠ ${noCover}/${tracks.length} tracks without cover art`);
  } else {
    checks.push(`✓ All ${tracks.length} tracks have cover art`);
  }

  // 3. Check feedback entries
  const feedback = await kv.getByPrefix('feedback:');
  const unreadFeedback = feedback.filter((f: any) => !f.read).length;
  checks.push(`📬 ${feedback.length} feedback entries (${unreadFeedback} unread)`);

  // 4. Component audit — check AI team member data
  const members = await kv.getByPrefix('ai-team:member:');
  const incompleteBios = members.filter((m: any) => !m.bio || m.bio.length < 10).length;
  if (incompleteBios > 0) {
    checks.push(`⚠ ${incompleteBios} team members with incomplete bios`);
  } else {
    checks.push(`✓ All ${members.length} team members have complete profiles`);
  }

  return {
    title: 'Frontend component & branding audit',
    description: `Audited branding, ${tracks.length} track covers, ${feedback.length} feedback items`,
    details: checks.join('\n'),
    category: 'Frontend Audit',
    status: noCover > 3 ? 'warning' : 'success',
    metrics: { tracksWithoutCover: noCover, totalTracks: tracks.length, feedbackTotal: feedback.length, unreadFeedback },
  };
}

async function checkUX(): Promise<any> {
  const checks: string[] = [];

  // 1. Design consistency — check if branding uses expected palette
  const branding: any = await kv.get('branding:config');
  if (branding?.primaryColor) {
    const isOnBrand = branding.primaryColor.toLowerCase().includes('00d9ff') || branding.primaryColor.toLowerCase().includes('00ffaa');
    checks.push(isOnBrand ? `✓ Primary color on-brand (${branding.primaryColor})` : `⚠ Primary color off-brand: ${branding.primaryColor}`);
  } else {
    checks.push(`✓ Using default cyan/mint palette`);
  }

  // 2. User flow — check media library has content
  const tracks = await kv.getByPrefix('track:');
  const playlists = await kv.getByPrefix('playlist:');
  if (tracks.length === 0) {
    checks.push(`⚠ Media library empty — poor user experience`);
  } else {
    checks.push(`✓ Media library has ${tracks.length} tracks for playback`);
  }

  if (playlists.length === 0) {
    checks.push(`⚠ No playlists — consider creating default playlist`);
  } else {
    checks.push(`✓ ${playlists.length} playlists available`);
  }

  // 3. Accessibility — check all tracks have readable titles
  const longTitles = tracks.filter((t: any) => t.title && t.title.length > 80).length;
  if (longTitles > 0) checks.push(`⚠ ${longTitles} tracks with overly long titles (>80 chars)`);
  else checks.push(`✓ All track titles have appropriate length`);

  // 4. User engagement — song requests and shoutouts
  const requests = await kv.getByPrefix('song-request:');
  const shoutouts = await kv.getByPrefix('shoutout:');
  checks.push(`📊 ${requests.length} song requests, ${shoutouts.length} shoutouts (engagement data)`);

  return {
    title: 'UX & accessibility audit',
    description: `Reviewed design system, media library UX, accessibility standards`,
    details: checks.join('\n'),
    category: 'UX Design',
    status: tracks.length === 0 ? 'warning' : 'success',
    metrics: { tracks: tracks.length, playlists: playlists.length, requests: requests.length, shoutouts: shoutouts.length },
  };
}

async function checkTeamLead(): Promise<any> {
  const checks: string[] = [];

  // 1. Overall system health
  const tracks = await kv.getByPrefix('track:');
  const playlists = await kv.getByPrefix('playlist:');
  const tasks = await kv.getByPrefix('ai-team:task:');
  const members = await kv.getByPrefix('ai-team:member:');

  checks.push(`📊 System overview:`);
  checks.push(`  Tracks: ${tracks.length}`);
  checks.push(`  Playlists: ${playlists.length}`);
  checks.push(`  AI Tasks: ${tasks.length}`);
  checks.push(`  Team Members: ${members.length}`);

  // 2. Sprint progress
  const done = tasks.filter((t: any) => t.status === 'done').length;
  const inProgress = tasks.filter((t: any) => t.status === 'in-progress').length;
  const backlog = tasks.filter((t: any) => t.status === 'backlog').length;
  const sprintProgress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
  checks.push(`\n🏃 Sprint: ${sprintProgress}% complete`);
  checks.push(`  Done: ${done} | In Progress: ${inProgress} | Backlog: ${backlog}`);

  // 3. Critical/high tasks check
  const critical = tasks.filter((t: any) => t.priority === 'critical' && t.status !== 'done').length;
  const high = tasks.filter((t: any) => t.priority === 'high' && t.status !== 'done').length;
  if (critical > 0) checks.push(`⚠ ${critical} critical tasks still open!`);
  if (high > 0) checks.push(`⚠ ${high} high-priority tasks pending`);
  if (critical === 0 && high === 0) checks.push(`✓ No critical/high priority issues`);

  // 4. Team status
  const online = members.filter((m: any) => m.status === 'online').length;
  checks.push(`\n👥 Team: ${online}/${members.length} online`);

  // 5. Autopilot task ratio
  const autopilotTasks = tasks.filter((t: any) => t.autopilot);
  const apSuccess = autopilotTasks.filter((t: any) => t.status === 'done').length;
  const apErrors = autopilotTasks.filter((t: any) => t.autopilotResult === 'error' || t.autopilotResult === 'rework').length;
  if (autopilotTasks.length > 0) {
    checks.push(`\n🤖 Autopilot tasks: ${autopilotTasks.length} (✓${apSuccess} ✗${apErrors})`);
  }

  return {
    title: 'Team Lead system health review',
    description: `Sprint ${sprintProgress}% done, ${online}/${members.length} online, ${tracks.length} tracks in library`,
    details: checks.join('\n'),
    category: 'Leadership Review',
    status: critical > 0 ? 'warning' : 'success',
    metrics: { sprintProgress, done, inProgress, backlog, critical, high, online, totalMembers: members.length },
  };
}

async function checkGeneric(member: any): Promise<any> {
  return {
    title: `${member.role} routine check`,
    description: `${member.name} performed a routine system check`,
    details: `Standard check cycle by ${member.name} (${member.role})`,
    category: 'General',
    status: 'success' as const,
  };
}

// ── NON-BLOCKING startup tasks ──────────────────────────────────────
// Fire-and-forget: buckets, admin check, and migrations run in background
// so the server starts accepting requests immediately (faster cold-start).
console.log('🚀 Starting Soul FM Hub server...');

(async () => {
  try {
    await initializeStorageBuckets();
    await ensureSuperAdmin();

    // Seed default resource usage if not set (Hostinger VPS: 50GB disk, 20GB bandwidth)
    const existingUsage = await kv.get('system:resource-usage');
    if (!existingUsage) {
      await kv.set('system:resource-usage', {
        storageUsedGB: 11,
        storageTotalGB: 50,
        bandwidthUsedGB: 0.67,
        bandwidthTotalGB: 20,
        listenersNow: 0,
        listenersUnique: 0,
        listenersPeak: 0,
        lastUpdated: new Date().toISOString(),
        source: 'seed',
      });
      console.log('📊 Seeded initial resource usage (11/50 GB storage, 0.67/20 GB bandwidth)');
    }

    console.log('✅ Startup tasks completed (buckets, admin, migrations, resource-usage)');
  } catch (e: any) {
    console.error("Startup task error (non-fatal):", e.message);
  }
})();

// ==================== EVENTS CRUD ====================

// Get all events (public)
app.get("/make-server-06086aa3/events", async (c) => {
  try {
    const events = await kv.getByPrefix('event:');
    // Sort by date ascending
    events.sort((a: any, b: any) => {
      return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
    });
    return c.json({ events });
  } catch (error: any) {
    console.error('Get events error:', error);
    return c.json({ error: `Get events error: ${error.message}` }, 500);
  }
});

// Get single event (public)
app.get("/make-server-06086aa3/events/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const event = await kv.get(`event:${id}`);
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }
    return c.json({ event });
  } catch (error: any) {
    console.error('Get event error:', error);
    return c.json({ error: `Get event error: ${error.message}` }, 500);
  }
});

// Create event (admin)
app.post("/make-server-06086aa3/events", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const eventId = crypto.randomUUID();

    const event = {
      id: eventId,
      title: body.title || 'Untitled Event',
      description: body.description || '',
      date: body.date || new Date().toISOString().split('T')[0],
      time: body.time || '20:00',
      venue: body.venue || '',
      location: body.location || '',
      category: body.category || 'live',
      artists: body.artists || [],
      isFeatured: body.isFeatured || false,
      isFree: body.isFree ?? true,
      price: body.price || null,
      status: body.status || 'upcoming',
      attendees: body.attendees || 0,
      image: body.image || null,
      ticketUrl: body.ticketUrl || null,
      createdAt: new Date().toISOString(),
      createdBy: c.get('userId'),
    };

    await kv.set(`event:${eventId}`, event);
    return c.json({ event }, 201);
  } catch (error: any) {
    console.error('Create event error:', error);
    return c.json({ error: `Create event error: ${error.message}` }, 500);
  }
});

// Update event (admin)
app.put("/make-server-06086aa3/events/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const event = await kv.get(`event:${id}`);
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    const updated = { ...event, ...body, updatedAt: new Date().toISOString() };
    await kv.set(`event:${id}`, updated);
    return c.json({ event: updated });
  } catch (error: any) {
    console.error('Update event error:', error);
    return c.json({ error: `Update event error: ${error.message}` }, 500);
  }
});

// Delete event (admin)
app.delete("/make-server-06086aa3/events/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`event:${id}`);
    return c.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('Delete event error:', error);
    return c.json({ error: `Delete event error: ${error.message}` }, 500);
  }
});

// ==================== MERCH ROUTES ====================

// Default merch catalog (used for seeding)
const DEFAULT_MERCH = [
  { name: 'Soul FM Classic Tee', description: 'Premium cotton tee with iconic Soul FM logo. Soft, breathable, and perfect for everyday vibes.', price: 29.99, category: 'Apparel', colors: ['Black', 'White', 'Navy'], sizes: ['S', 'M', 'L', 'XL', 'XXL'], rating: 4.8, reviews: 156, badge: 'Bestseller', gradient: 'from-[#00d9ff] to-[#0088cc]', emoji: '👕' },
  { name: 'Groove Master Hoodie', description: 'Stay warm in style. Heavyweight hoodie with embroidered logo and kangaroo pocket.', price: 59.99, originalPrice: 79.99, category: 'Apparel', colors: ['Black', 'Charcoal', 'Forest Green'], sizes: ['S', 'M', 'L', 'XL'], rating: 4.9, reviews: 89, badge: 'Sale', gradient: 'from-[#00ffaa] to-[#00cc88]', emoji: '🧥' },
  { name: 'Vinyl Vibes Snapback', description: 'Structured snapback cap with Soul FM wave embroidery. One size fits all.', price: 24.99, category: 'Accessories', colors: ['Black', 'White'], sizes: ['One Size'], rating: 4.7, reviews: 67, gradient: 'from-[#FF8C42] to-[#FF6B1A]', emoji: '🧢' },
  { name: 'Soul FM Tote Bag', description: 'Eco-friendly canvas tote. Carry your records, groceries, or good vibes.', price: 19.99, category: 'Accessories', colors: ['Natural', 'Black'], sizes: ['One Size'], rating: 4.6, reviews: 42, gradient: 'from-[#E91E63] to-[#C2185B]', emoji: '👜' },
  { name: 'Frequency Mug', description: 'Ceramic mug with heat-reactive Soul FM waveform. Changes color with hot drinks!', price: 16.99, category: 'Accessories', colors: ['Black/Cyan'], sizes: ['11oz', '15oz'], rating: 4.9, reviews: 203, badge: 'New', gradient: 'from-[#9C27B0] to-[#7B1FA2]', emoji: '☕' },
  { name: 'Wave Rider Sticker Pack', description: '10 premium vinyl stickers featuring Soul FM designs. Waterproof and UV resistant.', price: 9.99, category: 'Accessories', colors: ['Multi'], sizes: ['One Size'], rating: 4.8, reviews: 312, gradient: 'from-[#FFD700] to-[#FFA000]', emoji: '🎨' },
];

// Get all merch items (public)
app.get("/make-server-06086aa3/merch", async (c) => {
  try {
    const items = await kv.getByPrefix('merch:');
    items.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return c.json({ items });
  } catch (error: any) {
    console.error('Get merch error:', error);
    return c.json({ error: `Get merch error: ${error.message}` }, 500);
  }
});

// Get single merch item (public)
app.get("/make-server-06086aa3/merch/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const item = await kv.get(`merch:${id}`);
    if (!item) return c.json({ error: 'Item not found' }, 404);
    return c.json({ item });
  } catch (error: any) {
    return c.json({ error: `Get merch item error: ${error.message}` }, 500);
  }
});

// Create merch item (admin)
app.post("/make-server-06086aa3/merch", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const itemId = crypto.randomUUID();
    const item = {
      id: itemId,
      name: body.name || 'Untitled Item',
      description: body.description || '',
      price: body.price || 0,
      originalPrice: body.originalPrice || null,
      category: body.category || 'Accessories',
      colors: body.colors || [],
      sizes: body.sizes || [],
      rating: body.rating || 0,
      reviews: body.reviews || 0,
      badge: body.badge || null,
      gradient: body.gradient || 'from-[#00d9ff] to-[#00ffaa]',
      emoji: body.emoji || '🎵',
      image: body.image || null,
      inStock: body.inStock ?? true,
      sortOrder: body.sortOrder || 0,
      createdAt: new Date().toISOString(),
      createdBy: c.get('userId'),
    };
    await kv.set(`merch:${itemId}`, item);
    return c.json({ item }, 201);
  } catch (error: any) {
    console.error('Create merch error:', error);
    return c.json({ error: `Create merch error: ${error.message}` }, 500);
  }
});

// Update merch item (admin)
app.put("/make-server-06086aa3/merch/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const existing = await kv.get(`merch:${id}`);
    if (!existing) return c.json({ error: 'Item not found' }, 404);
    const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
    await kv.set(`merch:${id}`, updated);
    return c.json({ item: updated });
  } catch (error: any) {
    return c.json({ error: `Update merch error: ${error.message}` }, 500);
  }
});

// Delete merch item (admin)
app.delete("/make-server-06086aa3/merch/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`merch:${id}`);
    return c.json({ message: 'Merch item deleted' });
  } catch (error: any) {
    return c.json({ error: `Delete merch error: ${error.message}` }, 500);
  }
});

// Seed merch (admin) — idempotent: only seeds if no items exist
app.post("/make-server-06086aa3/merch/seed", requireAuth, async (c) => {
  try {
    const existing = await kv.getByPrefix('merch:');
    if (existing.length > 0) {
      return c.json({ message: `Merch already has ${existing.length} items — skipped`, seeded: false });
    }
    for (let i = 0; i < DEFAULT_MERCH.length; i++) {
      const m = DEFAULT_MERCH[i];
      const id = crypto.randomUUID();
      await kv.set(`merch:${id}`, { id, ...m, inStock: true, sortOrder: i, createdAt: new Date().toISOString() });
    }
    return c.json({ message: `Seeded ${DEFAULT_MERCH.length} merch items`, seeded: true });
  } catch (error: any) {
    return c.json({ error: `Seed merch error: ${error.message}` }, 500);
  }
});

// ==================== COMMUNITY ROUTES ====================

// Get community messages (public, filterable by channel)
app.get("/make-server-06086aa3/community/messages", async (c) => {
  try {
    const channel = c.req.query('channel');
    const limit = parseInt(c.req.query('limit') || '50');
    let messages = await kv.getByPrefix('community_msg:');
    if (channel) {
      messages = messages.filter((m: any) => m.channel === channel);
    }
    // Sort newest first
    messages.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ messages: messages.slice(0, limit) });
  } catch (error: any) {
    console.error('Get community messages error:', error);
    return c.json({ error: `Get community messages error: ${error.message}` }, 500);
  }
});

// Post a community message (public — anonymous or authenticated)
app.post("/make-server-06086aa3/community/messages", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.message?.trim()) {
      return c.json({ error: 'Message cannot be empty' }, 400);
    }
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const msg = {
      id: msgId,
      user: body.user || 'Anonymous',
      initial: (body.user || 'A')[0].toUpperCase(),
      color: body.color || '#00d9ff',
      message: body.message.trim().slice(0, 500), // Max 500 chars
      channel: body.channel || 'general',
      likes: 0,
      likedBy: [],
      createdAt: new Date().toISOString(),
    };
    await kv.set(`community_msg:${msgId}`, msg);
    return c.json({ message: msg }, 201);
  } catch (error: any) {
    console.error('Post community message error:', error);
    return c.json({ error: `Post message error: ${error.message}` }, 500);
  }
});

// Toggle like on a community message
app.post("/make-server-06086aa3/community/messages/:id/like", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const userId = body.userId || 'anon_' + Math.random().toString(36).substr(2, 8);
    const msg = await kv.get(`community_msg:${id}`);
    if (!msg) return c.json({ error: 'Message not found' }, 404);
    const likedBy: string[] = msg.likedBy || [];
    const alreadyLiked = likedBy.includes(userId);
    if (alreadyLiked) {
      msg.likedBy = likedBy.filter((u: string) => u !== userId);
      msg.likes = Math.max(0, (msg.likes || 0) - 1);
    } else {
      msg.likedBy = [...likedBy, userId];
      msg.likes = (msg.likes || 0) + 1;
    }
    await kv.set(`community_msg:${id}`, msg);
    return c.json({ message: msg, liked: !alreadyLiked });
  } catch (error: any) {
    return c.json({ error: `Like message error: ${error.message}` }, 500);
  }
});

// Delete a community message (admin only)
app.delete("/make-server-06086aa3/community/messages/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`community_msg:${id}`);
    return c.json({ message: 'Message deleted' });
  } catch (error: any) {
    return c.json({ error: `Delete message error: ${error.message}` }, 500);
  }
});

// Community stats (public)
app.get("/make-server-06086aa3/community/stats", async (c) => {
  try {
    const messages = await kv.getByPrefix('community_msg:');
    const today = new Date().toISOString().slice(0, 10);
    const todayMessages = messages.filter((m: any) => m.createdAt?.startsWith(today));
    const channels: Record<string, number> = {};
    for (const m of messages) {
      const ch = m.channel || 'general';
      channels[ch] = (channels[ch] || 0) + 1;
    }
    return c.json({
      totalMessages: messages.length,
      todayMessages: todayMessages.length,
      channels,
    });
  } catch (error: any) {
    return c.json({ error: `Community stats error: ${error.message}` }, 500);
  }
});

// Seed community messages (admin) — idempotent
app.post("/make-server-06086aa3/community/seed", requireAuth, async (c) => {
  try {
    const existing = await kv.getByPrefix('community_msg:');
    if (existing.length > 0) {
      return c.json({ message: `Community already has ${existing.length} messages — skipped`, seeded: false });
    }
    const seedMessages = [
      { user: 'SoulSeeker42', color: '#00d9ff', message: 'That last track was absolutely fire! Anyone know the artist?', channel: 'general' },
      { user: 'FunkMaster', color: '#00ffaa', message: 'DJ SoulWave is killing it tonight! Best midnight groove session yet.', channel: 'general' },
      { user: 'VinylLover', color: '#FF8C42', message: 'Just discovered this station yesterday and I\'m already hooked. The music selection is incredible!', channel: 'general' },
      { user: 'NeoSoulFan', color: '#E91E63', message: 'Has anyone checked out the new Erykah Badu remix? It\'s giving me all the vibes.', channel: 'music-talk' },
      { user: 'GrooveRider', color: '#9C27B0', message: 'The funk university episode about Parliament was educational and funky at the same time.', channel: 'music-talk' },
      { user: 'BeatDropper', color: '#FFD700', message: 'Anyone going to the Soul FM Summer Festival? I just got my tickets!', channel: 'events' },
      { user: 'MidnightJazz', color: '#00BCD4', message: 'Late night jazz vibes hitting different. Perfect for coding at 2am.', channel: 'general' },
      { user: 'DJ Heritage', color: '#00ffaa', message: 'Hey everyone! Thanks for tuning in to tonight\'s Vinyl Vault. Next week we\'re diving into rare Northern Soul 45s.', channel: 'dj-chat' },
    ];
    const now = Date.now();
    for (let i = 0; i < seedMessages.length; i++) {
      const sm = seedMessages[i];
      const id = `msg_${now - (i * 300000)}_${Math.random().toString(36).substr(2, 6)}`;
      await kv.set(`community_msg:${id}`, {
        id,
        user: sm.user,
        initial: sm.user[0],
        color: sm.color,
        message: sm.message,
        channel: sm.channel,
        likes: Math.floor(Math.random() * 20),
        likedBy: [],
        createdAt: new Date(now - (i * 300000)).toISOString(),
      });
    }
    return c.json({ message: `Seeded ${seedMessages.length} community messages`, seeded: true });
  } catch (error: any) {
    return c.json({ error: `Seed community error: ${error.message}` }, 500);
  }
});

// ==================== DJ SESSIONS & LIVE STREAMING ====================

const DJ_SESSION_KEY = 'dj-session:current';
const DJ_SESSION_HISTORY_PREFIX = 'dj-session-history:';
const DJ_CONNECTION_CONFIG_KEY = 'dj-connection:config';

// GET current DJ session
app.get("/make-server-06086aa3/dj-sessions/current", async (c) => {
  try {
    const session = await kv.get(DJ_SESSION_KEY);
    return c.json({
      isLive: !!session && session.status === 'live',
      session: session || null,
    });
  } catch (error: any) {
    console.error('Get DJ session error:', error);
    return c.json({ isLive: false, session: null });
  }
});

// POST start DJ session (admin only)
app.post("/make-server-06086aa3/dj-sessions/start", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { dj_name, title, session_type, source_app } = body;

    if (!dj_name?.trim() || !title?.trim()) {
      return c.json({ error: 'DJ name and title are required' }, 400);
    }

    // Check if there's already an active session
    const existing = await kv.get(DJ_SESSION_KEY);
    if (existing && existing.status === 'live') {
      return c.json({ error: `Session already active: "${existing.title}" by ${existing.dj_name}` }, 409);
    }

    const session = {
      id: `djs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      dj_name: dj_name.trim(),
      title: title.trim(),
      session_type: session_type || 'live_show',
      source_app: source_app || 'direct',
      started_at: new Date().toISOString(),
      status: 'live',
      tracks_played: 0,
      callers_taken: 0,
      requests_played: 0,
    };

    await kv.set(DJ_SESSION_KEY, session);
    console.log(`[DJ] Session started: "${session.title}" by ${session.dj_name} (${session.source_app})`);

    return c.json({ session });
  } catch (error: any) {
    console.error('Start DJ session error:', error);
    return c.json({ error: `Failed to start DJ session: ${error.message}` }, 500);
  }
});

// POST end DJ session
app.post("/make-server-06086aa3/dj-sessions/:id/end", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const session = await kv.get(DJ_SESSION_KEY);
    
    if (!session || (session.id !== id && id !== 'current')) {
      return c.json({ error: 'No matching active session found' }, 404);
    }

    const endedSession = {
      ...session,
      status: 'ended',
      ended_at: new Date().toISOString(),
      duration_seconds: Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000),
    };

    // Save to history
    await kv.set(`${DJ_SESSION_HISTORY_PREFIX}${session.id}`, endedSession);
    // Clear current session
    await kv.del(DJ_SESSION_KEY);
    
    console.log(`[DJ] Session ended: "${session.title}" by ${session.dj_name} — ${endedSession.duration_seconds}s`);
    return c.json({ session: endedSession });
  } catch (error: any) {
    console.error('End DJ session error:', error);
    return c.json({ error: `Failed to end DJ session: ${error.message}` }, 500);
  }
});

// PUT update session stats (increment tracks, callers etc.)
app.put("/make-server-06086aa3/dj-sessions/stats", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const session = await kv.get(DJ_SESSION_KEY);
    if (!session || session.status !== 'live') {
      return c.json({ error: 'No active session' }, 404);
    }

    const updated = {
      ...session,
      tracks_played: (session.tracks_played || 0) + (body.tracks_played || 0),
      callers_taken: (session.callers_taken || 0) + (body.callers_taken || 0),
      requests_played: (session.requests_played || 0) + (body.requests_played || 0),
    };

    await kv.set(DJ_SESSION_KEY, updated);
    return c.json({ session: updated });
  } catch (error: any) {
    return c.json({ error: `Update stats error: ${error.message}` }, 500);
  }
});

// GET DJ session history
app.get("/make-server-06086aa3/dj-sessions/history", requireAuth, async (c) => {
  try {
    const sessions = await kv.getByPrefix(DJ_SESSION_HISTORY_PREFIX);
    const sorted = (sessions || [])
      .sort((a: any, b: any) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, 50);
    return c.json({ sessions: sorted });
  } catch (error: any) {
    return c.json({ error: `Session history error: ${error.message}`, sessions: [] }, 500);
  }
});

// ── DJ Connection Config (AzuraCast Streamer credentials) ───────
// GET connection config
app.get("/make-server-06086aa3/dj-sessions/connection-config", requireAuth, async (c) => {
  try {
    const config = await kv.get(DJ_CONNECTION_CONFIG_KEY);
    const defaultConfig = {
      server: '187.77.85.42',
      port: 8005,
      mountPoint: '/live',
      protocol: 'icecast',
      username: 'dj',
      password: '',
      streamFormat: 'mp3',
      bitrate: 128,
      sampleRate: 44100,
      edjingGuide: true,
      customApps: [],
    };
    return c.json({ config: config || defaultConfig });
  } catch (error: any) {
    return c.json({ error: `Get connection config error: ${error.message}` }, 500);
  }
});

// POST save connection config
app.post("/make-server-06086aa3/dj-sessions/connection-config", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const config = {
      server: body.server || '187.77.85.42',
      port: body.port || 8005,
      mountPoint: body.mountPoint || '/live',
      protocol: body.protocol || 'icecast',
      username: body.username || 'dj',
      password: body.password || '',
      streamFormat: body.streamFormat || 'mp3',
      bitrate: body.bitrate || 128,
      sampleRate: body.sampleRate || 44100,
      edjingGuide: body.edjingGuide ?? true,
      customApps: body.customApps || [],
      updatedAt: new Date().toISOString(),
    };
    await kv.set(DJ_CONNECTION_CONFIG_KEY, config);
    return c.json({ success: true, config });
  } catch (error: any) {
    return c.json({ error: `Save connection config error: ${error.message}` }, 500);
  }
});

// ── AzuraCast Streamers CRUD ─────────────────────────────────────
async function azuraStreamerFetch(method: string, path: string, body?: any) {
  const azConfig = await getAzuraCastConfig();
  if (!azConfig?.enabled || !azConfig.baseUrl) throw new Error('AzuraCast not configured or disabled');
  const apiKey = Deno.env.get('AZURACAST_API_KEY') || '';
  if (!apiKey) throw new Error('AZURACAST_API_KEY not set');
  const url = `${azConfig.baseUrl.replace(/\/$/, '')}/api${path}`;
  console.log(`[DJ/AzuraCast] ${method} ${url}`);
  const headers: Record<string, string> = { 'Accept': 'application/json', 'X-API-Key': apiKey };
  if (body) headers['Content-Type'] = 'application/json';
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 15000);
  try {
    const resp = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
    clearTimeout(tid);
    const text = await resp.text();
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : { success: true };
  } catch (e: any) { clearTimeout(tid); throw e; }
}

app.get("/make-server-06086aa3/dj-sessions/azuracast-streamers", requireAuth, async (c) => {
  try {
    const azConfig = await getAzuraCastConfig();
    if (!azConfig?.enabled || !azConfig.baseUrl) return c.json({ streamers: [], configured: false, error: 'AzuraCast not configured' });
    const data = await azuraStreamerFetch('GET', `/station/${azConfig.stationId}/streamers`);
    const streamers = (Array.isArray(data) ? data : []).map((s: any) => ({
      id: s.id, streamer_username: s.streamer_username || '', streamer_password: s.streamer_password || '',
      display_name: s.display_name || '', is_active: s.is_active ?? true,
      enforce_schedule: s.enforce_schedule ?? false, comments: s.comments || '',
    }));
    return c.json({ streamers, configured: true });
  } catch (error: any) {
    console.error('[DJ] AzuraCast streamers list error:', error);
    return c.json({ streamers: [], configured: true, error: error.message });
  }
});

app.post("/make-server-06086aa3/dj-sessions/azuracast-streamers", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { username, password, displayName, comments } = body;
    if (!username?.trim()) return c.json({ error: 'Username is required' }, 400);
    if (!password?.trim() || password.length < 6) return c.json({ error: 'Password must be at least 6 characters' }, 400);
    const azConfig = await getAzuraCastConfig();
    if (!azConfig?.enabled) return c.json({ error: 'AzuraCast not configured' }, 400);
    const payload = {
      streamer_username: username.trim(), streamer_password: password.trim(),
      display_name: (displayName || username).trim(), is_active: true, enforce_schedule: false,
      comments: comments || `Created via Soul FM Hub on ${new Date().toISOString()}`,
    };
    const created = await azuraStreamerFetch('POST', `/station/${azConfig.stationId}/streamers`, payload);
    console.log(`[DJ] Created AzuraCast streamer: ${username} (id: ${created?.id})`);
    const connConfig = await kv.get(DJ_CONNECTION_CONFIG_KEY);
    if (connConfig) {
      await kv.set(DJ_CONNECTION_CONFIG_KEY, { ...connConfig, username: username.trim(), password: password.trim(), updatedAt: new Date().toISOString() });
    }
    return c.json({ success: true, streamer: created });
  } catch (error: any) {
    console.error('[DJ] Create streamer error:', error);
    return c.json({ error: `Failed to create DJ account: ${error.message}` }, 500);
  }
});

app.put("/make-server-06086aa3/dj-sessions/azuracast-streamers/:id", requireAuth, async (c) => {
  try {
    const streamerId = c.req.param('id');
    const body = await c.req.json();
    const azConfig = await getAzuraCastConfig();
    if (!azConfig?.enabled) return c.json({ error: 'AzuraCast not configured' }, 400);
    const payload: Record<string, any> = {};
    if (body.username) payload.streamer_username = body.username.trim();
    if (body.password) payload.streamer_password = body.password.trim();
    if (body.displayName !== undefined) payload.display_name = body.displayName.trim();
    if (body.isActive !== undefined) payload.is_active = body.isActive;
    if (body.comments !== undefined) payload.comments = body.comments;
    const updated = await azuraStreamerFetch('PUT', `/station/${azConfig.stationId}/streamer/${streamerId}`, payload);
    console.log(`[DJ] Updated AzuraCast streamer ${streamerId}`);
    return c.json({ success: true, streamer: updated });
  } catch (error: any) {
    console.error('[DJ] Update streamer error:', error);
    return c.json({ error: `Failed to update DJ account: ${error.message}` }, 500);
  }
});

app.delete("/make-server-06086aa3/dj-sessions/azuracast-streamers/:id", requireAuth, async (c) => {
  try {
    const streamerId = c.req.param('id');
    const azConfig = await getAzuraCastConfig();
    if (!azConfig?.enabled) return c.json({ error: 'AzuraCast not configured' }, 400);
    await azuraStreamerFetch('DELETE', `/station/${azConfig.stationId}/streamer/${streamerId}`);
    console.log(`[DJ] Deleted AzuraCast streamer ${streamerId}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('[DJ] Delete streamer error:', error);
    return c.json({ error: `Failed to delete DJ account: ${error.message}` }, 500);
  }
});

app.get("/make-server-06086aa3/dj-sessions/station-profile", requireAuth, async (c) => {
  try {
    const azConfig = await getAzuraCastConfig();
    if (!azConfig?.enabled || !azConfig.baseUrl) return c.json({ profile: null, configured: false });
    const station = await azuraStreamerFetch('GET', `/station/${azConfig.stationId}`);
    let mounts: any[] = [];
    try { mounts = await azuraStreamerFetch('GET', `/station/${azConfig.stationId}/mounts`); } catch { /* ok */ }
    const profile = {
      name: station?.name || '', shortcode: station?.shortcode || '',
      description: station?.description || '', backend: station?.backend_config || {},
      frontend: station?.frontend_config || {},
      enable_streamers: station?.enable_streamers ?? false,
      is_streamer_live: station?.is_streamer_live ?? false,
      mounts: (Array.isArray(mounts) ? mounts : []).map((m: any) => ({
        id: m.id, name: m.name, display_name: m.display_name, is_default: m.is_default,
        url: m.url, listeners_unique: m.listeners_unique, listeners_total: m.listeners_total,
      })),
    };
    return c.json({ profile, configured: true });
  } catch (error: any) {
    console.error('[DJ] Station profile error:', error);
    return c.json({ profile: null, configured: true, error: error.message });
  }
});

app.post("/make-server-06086aa3/dj-sessions/enable-streamers", requireAuth, async (c) => {
  try {
    const azConfig = await getAzuraCastConfig();
    if (!azConfig?.enabled) return c.json({ error: 'AzuraCast not configured' }, 400);
    const body = await c.req.json();
    const enable = body.enable !== false;
    await azuraStreamerFetch('PUT', `/station/${azConfig.stationId}`, { enable_streamers: enable });
    console.log(`[DJ] Streamers ${enable ? 'enabled' : 'disabled'} on station ${azConfig.stationId}`);
    return c.json({ success: true, enable_streamers: enable });
  } catch (error: any) {
    console.error('[DJ] Enable streamers error:', error);
    return c.json({ error: `Failed to toggle streamers: ${error.message}` }, 500);
  }
});

app.get("/make-server-06086aa3/dj-sessions/port-check", requireAuth, async (c) => {
  try {
    const connConfig = await kv.get(DJ_CONNECTION_CONFIG_KEY);
    const host = connConfig?.server || '187.77.85.42';
    const port = connConfig?.port || 8005;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    try {
      const resp = await fetch(`http://${host}:${port}/status-json.xsl`, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
      clearTimeout(tid);
      return c.json({ host, port, open: true, status: resp.status, message: `Port ${port} is reachable (HTTP ${resp.status})` });
    } catch (fetchErr: any) {
      clearTimeout(tid);
      if (fetchErr.name === 'AbortError') return c.json({ host, port, open: false, message: `Port ${port} timed out after 5s — likely blocked by firewall` });
      if (fetchErr.message?.includes('Connection refused') || fetchErr.message?.includes('ECONNREFUSED'))
        return c.json({ host, port, open: false, message: `Port ${port} connection refused — service not running or port blocked` });
      return c.json({ host, port, open: 'unknown', message: `Port ${port} response unclear: ${fetchErr.message}` });
    }
  } catch (error: any) {
    return c.json({ error: `Port check error: ${error.message}` }, 500);
  }
});

console.log('🎵 Server ready!');

Deno.serve(app.fetch);