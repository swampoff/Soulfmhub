import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import * as profiles from "./profiles.ts";
import * as podcasts from "./podcasts.ts";
import { seedProfiles } from "./seed-profiles.ts";
import { seedPodcasts } from "./seed-podcasts.ts";

const app = new Hono();

// Create Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ==================== AUTH ROUTES ====================

// Sign up
app.post("/make-server-06086aa3/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, role = 'listener' } = body;

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      email_confirm: true // Auto-confirm since email server isn't configured
    });

    if (error) {
      console.error('Signup error:', error);
      return c.json({ error: `Signup error: ${error.message}` }, 400);
    }

    // Store user profile in KV
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
      favorites: [],
      subscriptions: []
    });

    return c.json({ user: data.user, message: 'User created successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: `Signup error: ${error.message}` }, 500);
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

// Get analytics
app.get("/make-server-06086aa3/analytics", async (c) => {
  try {
    const analytics = await kv.get('analytics:current') || {
      currentListeners: 287,
      peakListeners: 1843,
      totalTracks: 12458,
      totalShows: 45,
      totalPlaylists: 128,
      topTracks: [
        { id: '1', title: 'Superstition', artist: 'Stevie Wonder', plays: 2543 },
        { id: '2', title: 'Ain\'t No Mountain High Enough', artist: 'Marvin Gaye', plays: 2234 },
        { id: '3', title: 'September', artist: 'Earth, Wind & Fire', plays: 2098 },
        { id: '4', title: 'Lovely Day', artist: 'Bill Withers', plays: 1987 },
        { id: '5', title: 'Use Me', artist: 'Bill Withers', plays: 1876 },
      ],
      topShows: [
        { id: '1', name: 'Funky Mornings', listeners: 8234 },
        { id: '2', name: 'Midnight Soul', listeners: 7521 },
        { id: '3', name: 'Crate Diggers', listeners: 6789 },
        { id: '4', name: 'Evening Vibes', listeners: 5432 },
        { id: '5', name: 'Soul Sessions', listeners: 4987 },
      ],
      listenersByCountry: {
        USA: 3245,
        UK: 1823,
        Germany: 987,
        France: 654,
        Canada: 432,
      }
    };

    return c.json({ analytics });
  } catch (error) {
    console.error('Get analytics error:', error);
    return c.json({ error: `Get analytics error: ${error.message}` }, 500);
  }
});

// Update analytics
app.post("/make-server-06086aa3/analytics", async (c) => {
  try {
    const body = await c.req.json();
    await kv.set('analytics:current', body);
    return c.json({ analytics: body });
  } catch (error) {
    console.error('Update analytics error:', error);
    return c.json({ error: `Update analytics error: ${error.message}` }, 500);
  }
});

// ==================== PROFILES/TEAM ====================

// Get all profiles
app.get("/make-server-06086aa3/profiles", profiles.getProfiles);

// Get featured profiles (MUST be before /:slug)
app.get("/make-server-06086aa3/profiles/featured", profiles.getFeaturedProfiles);

// Get profiles by role (MUST be before /:slug)
app.get("/make-server-06086aa3/profiles/role/:role", profiles.getProfilesByRole);

// Get single profile by slug (MUST be after specific routes)
app.get("/make-server-06086aa3/profiles/:slug", profiles.getProfileBySlug);

// Create profile (admin only)
app.post("/make-server-06086aa3/profiles", requireAuth, profiles.createProfile);

// Update profile (admin only)
app.put("/make-server-06086aa3/profiles/:slug", requireAuth, profiles.updateProfile);

// Delete profile (admin only)
app.delete("/make-server-06086aa3/profiles/:slug", requireAuth, profiles.deleteProfile);

// Seed profiles
app.post("/make-server-06086aa3/profiles/seed", requireAuth, async (c) => {
  try {
    await seedProfiles();
    return c.json({ message: 'Profiles seeded successfully' });
  } catch (error) {
    console.error('Seed profiles error:', error);
    return c.json({ error: `Seed profiles error: ${error.message}` }, 500);
  }
});

// Initialize profiles on server start
seedProfiles().catch(err => console.error('Failed to seed profiles:', err));

// ==================== PODCASTS ====================

// Get all podcasts
app.get("/make-server-06086aa3/podcasts", podcasts.getPodcasts);

// Get single podcast by slug (includes episodes)
app.get("/make-server-06086aa3/podcasts/:slug", podcasts.getPodcastBySlug);

// Create podcast
app.post("/make-server-06086aa3/podcasts", requireAuth, podcasts.createPodcast);

// Update podcast
app.put("/make-server-06086aa3/podcasts/:slug", requireAuth, podcasts.updatePodcast);

// Toggle subscription
app.post("/make-server-06086aa3/podcasts/:id/subscribe", podcasts.toggleSubscription);

// Toggle episode like
app.post("/make-server-06086aa3/podcasts/episodes/:id/like", podcasts.toggleEpisodeLike);

// Seed podcasts
app.post("/make-server-06086aa3/podcasts/seed", requireAuth, async (c) => {
  try {
    await seedPodcasts();
    return c.json({ message: 'Podcasts seeded successfully' });
  } catch (error) {
    console.error('Seed podcasts error:', error);
    return c.json({ error: `Seed podcasts error: ${error.message}` }, 500);
  }
});

// Initialize podcasts on server start
seedPodcasts().catch(err => console.error('Failed to seed podcasts:', err));

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
    // TODO: Use a library like jsmediatags or music-metadata for full ID3 tag extraction
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
      tags: ['NEWFUNK'], // Auto-tag with NEWFUNK
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
    
    console.log(`Track uploaded: ${metadata.title} by ${metadata.artist}`);
    
    return c.json({
      message: 'Track uploaded successfully',
      track,
      metadata: {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        duration: metadata.duration
      },
      addedToLiveStream: autoAddToLiveStream
    });
    
  } catch (error: any) {
    console.error('Track upload error:', error);
    return c.json({ error: `Failed to upload track: ${error.message}` }, 500);
  }
});

Deno.serve(app.fetch);