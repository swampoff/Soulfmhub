import { createClient } from "npm:@supabase/supabase-js@2";
import { Hono } from "npm:hono@4";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import * as profiles from "./profiles.ts";
import * as podcasts from "./podcasts.ts";
import { seedProfiles } from "./seed-profiles.ts";
import { seedPodcasts, seedShows } from "./seed-podcasts.ts";
import { seedNewsInjectionData, createSampleRules } from "./seed-news-injection.ts";
import { parseBuffer } from "npm:music-metadata@10";
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

const app = new Hono();

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

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

// ==================== STORAGE SETUP ====================

// Initialize Storage Buckets
async function initializeStorageBuckets() {
  try {
    console.log('🗄️  Initializing storage buckets...');
    
    const bucketsToCreate = [
      { name: 'make-06086aa3-tracks', public: true, fileType: 'audio' as const },
      { name: 'make-06086aa3-covers', public: true, fileType: 'image' as const },
      { name: 'make-06086aa3-jingles', public: true, fileType: 'audio' as const },
      { name: 'make-06086aa3-news-voiceovers', public: true, fileType: 'audio' as const },
      { name: 'make-06086aa3-announcements', public: true, fileType: 'audio' as const },
    ];

    const { data: buckets } = await supabase.storage.listBuckets();
    
    for (const bucketConfig of bucketsToCreate) {
      const bucketExists = buckets?.some(bucket => bucket.name === bucketConfig.name);
      
      if (bucketExists) {
        // Update bucket to ensure it's public (in case it was created as private before)
        const existingBucket = buckets?.find(b => b.name === bucketConfig.name);
        if (existingBucket && existingBucket.public !== bucketConfig.public) {
          console.log(`🔄 Updating bucket visibility: ${bucketConfig.name} → public: ${bucketConfig.public}`);
          await supabase.storage.updateBucket(bucketConfig.name, { public: bucketConfig.public });
        }
        console.log(`✅ Bucket exists: ${bucketConfig.name}`);
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
  if (!accessToken) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }

  // If the token is the public anon key, allow as admin (PIN-gated on frontend)
  // Check 1: exact string match against env var
  // Check 2: decode JWT and verify it's an anon key for our project
  //   (handles mismatch between info.tsx publicAnonKey and SUPABASE_ANON_KEY env var)
  if ((supabaseAnonKey && accessToken === supabaseAnonKey) || isProjectAnonKey(accessToken)) {
    c.set('userId', 'admin-pin');
    c.set('user', { id: 'admin-pin', role: 'admin' });
    await next();
    return;
  }

  // Otherwise validate as a real Supabase Auth token
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }
  
  c.set('userId', user.id);
  c.set('user', user);
  await next();
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

// Seed endpoint for testing
app.post('/make-server-06086aa3/seed-news-injection', async (c) => {
  try {
    const result = await seedNewsInjectionData();
    await createSampleRules();
    return c.json({ success: true, ...result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Seed all content (shows, podcasts, profiles)
app.post('/make-server-06086aa3/seed-all', async (c) => {
  try {
    console.log('🌱 Seeding all content...');
    await seedProfiles();
    await seedPodcasts();
    await seedShows();
    console.log('✅ All content seeded successfully');
    return c.json({ success: true, message: 'Shows, podcasts, and profiles seeded' });
  } catch (error: any) {
    console.error('Seed all error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Seed shows only
app.post('/make-server-06086aa3/seed-shows', async (c) => {
  try {
    await seedShows();
    return c.json({ success: true, message: 'Shows seeded' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Seed podcasts only
app.post('/make-server-06086aa3/seed-podcasts', async (c) => {
  try {
    await seedPodcasts();
    return c.json({ success: true, message: 'Podcasts seeded' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

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
  currentTrackStartTime: null as string | null,
  listeners: 0,
  autoAdvance: true,
  pendingJingle: null as any, // Jingle waiting to be played
  isPlayingJingle: false, // Currently playing a jingle
};

// Auto-advance tracks
async function checkAndAdvanceTrack() {
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
    }
    
    autoDJState.currentTrackIndex = (autoDJState.currentTrackIndex + 1) % autoDJState.playlistTracks.length;
    autoDJState.currentTrack = autoDJState.playlistTracks[autoDJState.currentTrackIndex];
    autoDJState.currentTrackStartTime = new Date().toISOString();
    
    await kv.set('stream:nowplaying', {
      track: {
        id: autoDJState.currentTrack.id,
        title: autoDJState.currentTrack.title,
        artist: autoDJState.currentTrack.artist,
        album: autoDJState.currentTrack.album,
        duration: autoDJState.currentTrack.duration,
        cover: autoDJState.currentTrack.coverUrl
      },
      startTime: autoDJState.currentTrackStartTime,
      updatedAt: new Date().toISOString()
    });
    
    // Broadcast track change via Supabase Realtime
    try {
      const channel = supabase.channel('radio-updates');
      await channel.send({
        type: 'broadcast',
        event: 'track-changed',
        payload: {
          track: {
            id: autoDJState.currentTrack.id,
            title: autoDJState.currentTrack.title,
            artist: autoDJState.currentTrack.artist,
            album: autoDJState.currentTrack.album,
            duration: autoDJState.currentTrack.duration,
            cover: autoDJState.currentTrack.coverUrl
          },
          startTime: autoDJState.currentTrackStartTime,
          updatedAt: new Date().toISOString()
        }
      });
      console.log('📡 Broadcast: Track change sent');
    } catch (broadcastError) {
      console.error('Broadcast error:', broadcastError);
    }
    
    console.log(`✅ Now playing: "${autoDJState.currentTrack.title}"`);
  }
}

async function getCurrentScheduledPlaylist() {
  try {
    const allSchedules = await kv.getByPrefix('schedule:');
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);
    
    for (const schedule of allSchedules) {
      if (!schedule.isActive) continue;
      if (schedule.dayOfWeek !== null && schedule.dayOfWeek !== currentDay) continue;
      if (currentTime >= schedule.startTime && currentTime < schedule.endTime) {
        const playlist = await kv.get(`playlist:${schedule.playlistId}`);
        return {
          ...schedule,
          playlistName: playlist?.name || 'Unknown',
          // Include jingleConfig for schedule-aware jingle integration
          jingleConfig: schedule.jingleConfig || null,
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting schedule:', error);
    return null;
  }
}

setInterval(() => {
  if (autoDJState.autoAdvance) {
    checkAndAdvanceTrack().catch(error => console.error('Auto-advance error:', error));
  }
}, 10000);

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
      currentTrackStartTime: new Date().toISOString(),
      listeners: 0,
      autoAdvance: true,
      pendingJingle: null,
      isPlayingJingle: false
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

    // Broadcast start event
    try {
      const channel = supabase.channel('radio-updates');
      await channel.send({
        type: 'broadcast',
        event: 'track-changed',
        payload: {
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
        }
      });
    } catch (broadcastError) {
      console.error('Broadcast error:', broadcastError);
    }

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
      
      return c.json({ 
        message: 'Playing jingle',
        currentTrack: autoDJState.currentTrack,
        isJingle: true
      });
    }

    // No jingle, skip to next track
    autoDJState.isPlayingJingle = false;
    
    // Increment track count
    autoDJHelper.incrementMusicTrackCount();
    
    // Move to next track
    autoDJState.currentTrackIndex = (autoDJState.currentTrackIndex + 1) % autoDJState.playlistTracks.length;
    autoDJState.currentTrack = autoDJState.playlistTracks[autoDJState.currentTrackIndex];
    autoDJState.currentTrackStartTime = new Date().toISOString();

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

    // Broadcast skip event
    try {
      const channel = supabase.channel('radio-updates');
      await channel.send({
        type: 'broadcast',
        event: 'track-changed',
        payload: {
          track: {
            id: autoDJState.currentTrack.id,
            title: autoDJState.currentTrack.title,
            artist: autoDJState.currentTrack.artist,
            album: autoDJState.currentTrack.album,
            duration: autoDJState.currentTrack.duration,
            cover: autoDJState.currentTrack.coverUrl
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
    
    // Calculate track progress
    let trackProgress = 0;
    let elapsedSeconds = 0;
    if (autoDJState.isPlaying && autoDJState.currentTrackStartTime && autoDJState.currentTrack) {
      const now = new Date();
      const trackStartTime = new Date(autoDJState.currentTrackStartTime);
      elapsedSeconds = Math.floor((now.getTime() - trackStartTime.getTime()) / 1000);
      const trackDuration = autoDJState.currentTrack.duration || 180;
      trackProgress = Math.min((elapsedSeconds / trackDuration) * 100, 100);
    }
    
    // Get current schedule
    const currentSchedule = await getCurrentScheduledPlaylist();

    return c.json({
      autoDJ: {
        isPlaying: autoDJState.isPlaying,
        currentTrack: autoDJState.currentTrack,
        currentTrackIndex: autoDJState.currentTrackIndex,
        totalTracks: autoDJState.playlistTracks.length,
        startTime: autoDJState.startTime,
        currentTrackStartTime: autoDJState.currentTrackStartTime,
        trackProgress,
        elapsedSeconds,
        autoAdvance: autoDJState.autoAdvance,
        currentSchedule
      },
      nowPlaying,
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
    if (!autoDJState.isPlaying || !autoDJState.currentTrack) {
      return c.json({ playing: false, message: 'Auto DJ is not running' }, 200);
    }

    const track = autoDJState.currentTrack;
    const bucket = track.storageBucket || 'make-06086aa3-tracks';
    const filename = track.storageFilename;

    if (!filename) {
      return c.json({ playing: true, error: 'Current track has no audio file', track: {
        id: track.id, title: track.title, artist: track.artist, album: track.album,
        duration: track.duration || 180, coverUrl: track.coverUrl || null,
        isJingle: autoDJState.isPlayingJingle || false,
      }}, 200);
    }

    // Generate signed URL (valid for 2 hours)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filename, 7200);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Signed URL error:', signedUrlError);
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
      const { data: jData } = await supabase.storage
        .from(jBucket)
        .createSignedUrl(pendingJingle.storageFilename, 7200);
      if (jData?.signedUrl) jingleUrl = jData.signedUrl;
    }

    // Cover art URL
    let coverUrl = track.coverUrl || null;
    if (track.coverFilename && track.coverBucket) {
      const { data: coverData } = await supabase.storage
        .from(track.coverBucket)
        .createSignedUrl(track.coverFilename, 7200);
      if (coverData?.signedUrl) coverUrl = coverData.signedUrl;
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
          const { data: ntUrl } = await supabase.storage
            .from(ntBucket)
            .createSignedUrl(nt.storageFilename, 7200);
          if (ntUrl?.signedUrl) {
            let ntCover = nt.coverUrl || null;
            if (nt.coverFilename && nt.coverBucket) {
              const { data: ntCoverData } = await supabase.storage
                .from(nt.coverBucket)
                .createSignedUrl(nt.coverFilename, 7200);
              if (ntCoverData?.signedUrl) ntCover = ntCoverData.signedUrl;
            }
            nextTrack = {
              id: nt.id,
              title: nt.title,
              artist: nt.artist,
              album: nt.album,
              duration: nt.duration || 180,
              coverUrl: ntCover,
              audioUrl: ntUrl.signedUrl,
            };
          }
        }
      }
    } catch (ntErr: any) {
      console.log('Next track peek failed (non-critical):', ntErr?.message || ntErr);
    }

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
      audioUrl: signedUrlData.signedUrl,
      seekPosition,
      remainingSeconds,
      startedAt: autoDJState.currentTrackStartTime,
      jingleUrl,
      nextTrack,
      crossfadeDuration: 5,
      listeners: autoDJState.listeners,
    });
  } catch (error: any) {
    console.error('Current stream error:', error);
    return c.json({ playing: false, error: `Stream error: ${error.message}` }, 500);
  }
});

// Live Radio Stream endpoint (legacy file-serving — kept for backward compat)
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
    console.log(`📀 [GET /tracks] Found ${tracks?.length ?? 0} tracks in KV (genre=${genre || 'all'}, search=${search || 'none'})`);
    
    let filteredTracks = Array.isArray(tracks) ? tracks : [];

    // Ensure every track has an audioUrl — reconstruct from storage metadata if missing
    filteredTracks = filteredTracks.map(track => {
      if (!track.audioUrl && track.storageBucket && track.storageFilename) {
        const { data } = supabase.storage
          .from(track.storageBucket)
          .getPublicUrl(track.storageFilename);
        track.audioUrl = data.publicUrl;
        console.log(`🔧 [GET /tracks] Reconstructed audioUrl for ${track.id}: ${track.audioUrl}`);
      }
      return track;
    });
    
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

    // Reconstruct audioUrl from storage metadata if missing
    if (!track.audioUrl && track.storageBucket && track.storageFilename) {
      const { data } = supabase.storage
        .from(track.storageBucket)
        .getPublicUrl(track.storageFilename);
      track.audioUrl = data.publicUrl;
      console.log(`🔧 [GET /tracks/:id] Reconstructed audioUrl for ${track.id}: ${track.audioUrl}`);
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

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('make-06086aa3-covers')
      .getPublicUrl(fileName);

    // Update track with new cover URL
    const updatedTrack = {
      ...track,
      coverUrl: publicUrl,
      updatedAt: new Date().toISOString()
    };
    await kv.set(`track:${trackId}`, updatedTrack);

    console.log(`✅ Cover uploaded for track ${trackId}: ${publicUrl}`);

    return c.json({ 
      message: 'Cover uploaded successfully',
      coverUrl: publicUrl,
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

    // Extract metadata
    let extractedMetadata: any = {};
    try {
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
            const { data: coverUrlData } = supabase.storage
              .from('make-06086aa3-covers')
              .getPublicUrl(coverFilename);
            extractedMetadata.coverUrl = coverUrlData.publicUrl;
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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename);

    const audioUrl = urlData.publicUrl;
    console.log(`🎵 [process] Public URL: ${audioUrl}`);

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

    const { metadata: extractedMetadata, coverUrl, waveform } = metadataResult;

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
    const playlists = allPlaylists.filter(p => p.id !== 'livestream'); // Exclude livestream from general list
    
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
    const body = await c.req.json();
    const { name, description, color, genre } = body;
    
    if (!name || !name.trim()) {
      return c.json({ error: 'Playlist name is required' }, 400);
    }
    
    const playlistId = `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const playlist = {
      id: playlistId,
      name: name.trim(),
      description: description || '',
      color: color || '#00d9ff',
      genre: genre || '',
      trackIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`playlist:${playlistId}`, playlist);
    
    return c.json({ 
      message: 'Playlist created successfully',
      playlist
    });
  } catch (error: any) {
    console.error('Create playlist error:', error);
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
    
    const playlist = await kv.get(`playlist:${id}`);
    if (!playlist) {
      return c.json({ error: 'Playlist not found' }, 404);
    }
    
    await kv.del(`playlist:${id}`);
    
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

// ==================== SCHEDULE API ====================

// Get all schedules
app.get("/make-server-06086aa3/schedule", async (c) => {
  try {
    const allSchedules = await kv.getByPrefix('schedule:');
    
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
    const { playlistId, dayOfWeek, startTime, endTime, title, isActive, repeatWeekly } = body;
    
    if (!playlistId || !startTime || !endTime || !title) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    // Verify playlist exists
    const playlist = await kv.get(`playlist:${playlistId}`);
    if (!playlist) {
      return c.json({ error: 'Playlist not found' }, 404);
    }
    
    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const schedule = {
      id: scheduleId,
      playlistId,
      dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== null ? parseInt(dayOfWeek) : null,
      startTime,
      endTime,
      title,
      isActive: isActive !== undefined ? isActive : true,
      repeatWeekly: repeatWeekly !== undefined ? repeatWeekly : true,
      // Jingle integration config (per-slot overrides)
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
    
    // Verify playlist exists if changed
    if (body.playlistId && body.playlistId !== schedule.playlistId) {
      const playlist = await kv.get(`playlist:${body.playlistId}`);
      if (!playlist) {
        return c.json({ error: 'Playlist not found' }, 404);
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
    
    if (!playlistId || !startTime || !endTime || !title) {
      return c.json({ error: 'Missing required fields: playlistId, startTime, endTime, title' }, 400);
    }
    
    const playlist = await kv.get(`playlist:${playlistId}`);
    if (!playlist) {
      return c.json({ error: 'Playlist not found' }, 404);
    }
    
    const slotId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const slot = {
      id: slotId,
      playlistId,
      dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== null ? parseInt(dayOfWeek) : null,
      startTime,
      endTime,
      title,
      isActive: isActive !== undefined ? isActive : true,
      repeatWeekly: body.repeatWeekly !== undefined ? body.repeatWeekly : true,
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

// Image upload endpoint (for covers, avatars, etc.)
app.post("/make-server-06086aa3/upload/image", async (c) => {
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

    // Get public URL (for public buckets) or signed URL (for private buckets)
    let publicUrl: string;
    
    if (bucketName === 'make-06086aa3-covers') {
      // Public bucket - get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      publicUrl = publicUrlData.publicUrl;
    } else {
      // Private bucket - create signed URL (valid for 1 year)
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 31536000); // 1 year

      if (signedError) {
        console.error('Signed URL error:', signedError);
        return c.json({ error: `Failed to create signed URL: ${signedError.message}` }, 500);
      }

      publicUrl = signedUrlData.signedUrl;
    }

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

// Audio upload endpoint (for podcast episodes, etc.)
app.post("/make-server-06086aa3/upload/audio", async (c) => {
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

    // Buckets are public now — use public URL instead of signed URL
    const { data: publicUrlData } = supabase.storage
      .from('make-06086aa3-tracks')
      .getPublicUrl(filePath);

    return c.json({
      success: true,
      url: publicUrlData.publicUrl,
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

// Run admin check on startup
console.log('🚀 Starting Soul FM Hub server...');
await initializeStorageBuckets();
await ensureSuperAdmin();
console.log('🎵 Server ready!');

Deno.serve(app.fetch);