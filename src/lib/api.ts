import { API_BASE, supabase } from './supabase';
import { publicAnonKey } from '../../utils/supabase/info';

// ── JWT rejection cooldown ───────────────────────────────────────────
// When the Supabase gateway rejects a session JWT (expired, revoked,
// wrong signing key, etc.) we set a cooldown so that subsequent calls
// to getAuthHeaders / getAccessToken immediately return the anon key
// instead of sending the bad JWT again (which would trigger another
// warn + retry cycle on every single API call).
//
// The cooldown is reset on successful sign-in so a fresh session is
// used immediately.
let jwtCooldownUntil = 0;

/** Call after a gateway JWT rejection to suppress repeated attempts. */
function flagJwtRejected() {
  jwtCooldownUntil = Date.now() + 5 * 60_000; // 5 min cooldown
}

/** Call on successful sign-in to clear the cooldown. */
export function resetJwtCooldown() {
  jwtCooldownUntil = 0;
}

function isJwtOnCooldown(): boolean {
  return Date.now() < jwtCooldownUntil;
}

// ── Server-reachability tracking ─────────────────────────────────────
// After repeated network failures ("Failed to fetch"), we suppress further
// retries for a cooldown period to avoid flooding the console and UI with
// errors.  A successful request resets the flag instantly.
let serverUnreachableUntil = 0;
const SERVER_COOLDOWN_MS = 30_000; // 30 s

function markServerUnreachable() {
  serverUnreachableUntil = Date.now() + SERVER_COOLDOWN_MS;
  console.warn(`[API] Server marked unreachable for ${SERVER_COOLDOWN_MS / 1000}s`);
}

function markServerReachable() {
  if (serverUnreachableUntil > 0) {
    console.log('[API] Server is reachable again');
    serverUnreachableUntil = 0;
  }
}

export function isServerReachable(): boolean {
  return Date.now() >= serverUnreachableUntil;
}

// ── Retry-aware fetch (handles cold-start / transient failures) ──────
//
// Supabase Edge Functions gateway requires authentication via EITHER:
//   • `apikey` header  — project-level access (always the public anon key)
//   • `Authorization`  — user-level auth (session JWT or anon key)
//
// Problem: if `Authorization` carries an expired session JWT and there's no
// `apikey` header, the gateway rejects the request with:
//   { code: 401, message: "Invalid JWT" }
// BEFORE it even reaches our Hono server / requireAuth middleware.
//
// Solution: ALWAYS send `apikey` so the gateway accepts the request for
// project routing.  Our own `requireAuth` middleware then validates the
// `Authorization` token for admin operations.

async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 3,
  backoff = 1500,
  timeoutMs = 25000,
): Promise<Response> {
  // If the server was recently unreachable, fail fast
  if (!isServerReachable()) {
    throw new Error('Server unreachable (cooldown active — will retry automatically)');
  }
  // `apikey` — required by the Supabase gateway for project routing.
  // `Authorization` — fallback to anon key; callers may override with a session JWT.
  const defaultHeaders: Record<string, string> = {
    'apikey': publicAnonKey,
    'Authorization': `Bearer ${publicAnonKey}`,
  };
  const mergedHeaders = { ...defaultHeaders, ...(init?.headers as Record<string, string> || {}) };
  const mergedInit = { ...init, headers: mergedHeaders };

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort('timeout'), timeoutMs);
      const response = await fetch(input, { ...mergedInit, signal: controller.signal });
      clearTimeout(tid);

      // If the gateway rejected an expired session JWT, retry once with
      // the anon key so the request at least reaches our server.
      if (response.status === 401 && attempt < retries - 1) {
        const body = await response.clone().text();
        if (body.includes('Invalid JWT') || body.includes('invalid JWT') || body.includes('token is expired')) {
          console.log('[API] Gateway rejected JWT — flagging 5-min cooldown & retrying with anon key');
          flagJwtRejected();
          // Don't signOut — it destroys the session which may still be
          // valid for Supabase Realtime / other flows.  Just use anon key.
          mergedHeaders['Authorization'] = `Bearer ${publicAnonKey}`;
          continue;
        }
      }

      // If the gateway returned a boot/cold-start error, retry
      if ((response.status === 500 || response.status === 502 || response.status === 503) && attempt < retries - 1) {
        const body = await response.clone().text();
        console.warn(
          `[API] Server error (${response.status}) attempt ${attempt + 1}/${retries}:`,
          body.slice(0, 150),
        );
        const delay = backoff * (attempt + 1);
        console.log(`[API] Retrying in ${delay}ms (cold-start recovery)...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // ── Wrap .json() with safe parsing ─────────────────────────
      // The Edge Functions gateway can return non-JSON on boot errors,
      // 502s, etc.  By reading as text first and JSON.parse-ing, we get
      // a clear error message instead of a cryptic SyntaxError.
      const url = typeof input === 'string' ? input : (input as Request).url ?? String(input);
      (response as any).__safeJson = true;
      response.json = async function () {
        const text = await response.clone().text();
        try {
          return JSON.parse(text);
        } catch {
          console.error(
            `[API] Non-JSON response (${response.status}) from ${url}:`,
            text.slice(0, 200),
          );
          throw new Error(
            `Server returned non-JSON (HTTP ${response.status}): ${text.slice(0, 120)}`,
          );
        }
      } as any;
      // Server responded — mark reachable
      markServerReachable();
      return response;
    } catch (err: any) {
      lastError = err;
      const reason = err?.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : (err?.message || err);
      // Only log on first and last attempt to reduce console spam
      if (attempt === 0 || attempt === retries - 1) {
        console.warn(
          `[API] Fetch attempt ${attempt + 1}/${retries} failed:`,
          reason,
        );
      }
      if (attempt < retries - 1) {
        const delay = backoff * (attempt + 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  // All retries exhausted — mark server unreachable to prevent further spam
  markServerUnreachable();
  throw lastError ?? new Error('Fetch failed after retries');
}

async function getAuthHeaders() {
  // On ANY failure we fall back to the anon key, which our requireAuth
  // middleware accepts as "admin-pin" access, so the request still works.
  //
  // If we recently had a gateway JWT rejection, skip the session entirely
  // to avoid a repeated reject → warn → retry cycle on every request.
  if (isJwtOnCooldown()) {
    return {
      'Content-Type': 'application/json',
      'apikey': publicAnonKey,
      'Authorization': `Bearer ${publicAnonKey}`,
    };
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();

    let validToken: string | null = null;
    if (session?.access_token) {
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        const expiresAt = payload.exp * 1000;
        if (Date.now() < expiresAt - 120_000) {
          // Token valid with >= 2 min margin (avoids gateway race / latency)
          validToken = session.access_token;
        } else {
          // Token expired or about to — try refresh
          console.warn('[API] Auth token expiring (<2 min left), refreshing...');
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session?.access_token) {
            validToken = refreshData.session.access_token;
          } else {
            // Refresh failed — fall back silently to anon key.
            // Don't signOut: it wipes the session for other flows.
            console.warn('[API] Token refresh failed — using anon key');
          }
        }
      } catch {
        console.warn('[API] Malformed session token — using anon key');
      }
    }

    return {
      'Content-Type': 'application/json',
      'apikey': publicAnonKey,
      'Authorization': validToken ? `Bearer ${validToken}` : `Bearer ${publicAnonKey}`,
    };
  } catch (err: any) {
    console.warn('[API] getAuthHeaders error, using anon key:', err?.message);
    return {
      'Content-Type': 'application/json',
      'apikey': publicAnonKey,
      'Authorization': `Bearer ${publicAnonKey}`,
    };
  }
}

async function getPublicHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': publicAnonKey,
    'Authorization': `Bearer ${publicAnonKey}`,
  };
}

async function getAccessToken() {
  // Skip JWT during cooldown — avoids repeated gateway rejections
  if (isJwtOnCooldown()) return publicAnonKey;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        if (Date.now() < (payload.exp * 1000) - 120_000) {
          return session.access_token;
        }
        // Token expiring — try refresh
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData?.session?.access_token) {
          return refreshData.session.access_token;
        }
      } catch {
        // Malformed — fall back
      }
    }
  } catch {
    // Session error — fall back
  }
  return publicAnonKey;
}

// Exported helpers for admin components that make direct fetch calls
export { getAuthHeaders, getAccessToken, getPublicHeaders };

export const api = {
  // Auth
  async signUp(email: string, password: string, name: string, role: string = 'listener') {
    console.log('[API] Signing up:', { email, name, role });
    
    try {
      const headers = await getPublicHeaders();
      const response = await fetchWithRetry(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, password, name, role }),
      });
      
      console.log('[API] Signup response status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('[API] Signup response data:', data);
      
      if (!response.ok || data.error) {
        const errorMsg = data.error || `Signup failed with status ${response.status}: ${response.statusText}`;
        console.error('[API] Signup failed:', errorMsg);
        console.error('[API] Full error details:', JSON.stringify(data, null, 2));
        return { data: null, error: new Error(errorMsg) };
      }
      
      // Now sign in automatically
      console.log('[API] Auto-signing in after signup');
      const signInResult = await this.signIn(email, password);
      if (signInResult.error) {
        console.error('[API] Auto sign-in failed:', signInResult.error);
        return { data: null, error: signInResult.error };
      }
      
      console.log('[API] Signup and auto-login successful!');
      return { data: signInResult.data, error: null };
    } catch (error: any) {
      console.error('[API] Signup exception:', error);
      console.error('[API] Exception details:', error.stack);
      return { data: null, error };
    }
  },

  async signIn(email: string, password: string) {
    console.log('[API] Signing in:', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data?.session) {
      // Fresh session obtained — clear any JWT rejection cooldown
      resetJwtCooldown();
    }
    console.log('[API] Sign in result:', { data: data?.user?.email, error });
    return { data, error };
  },

  async signOut() {
    return supabase.auth.signOut();
  },

  async getProfile() {
    const headers = await getAuthHeaders();
    // Profile check — fewer retries since it's called on every auth change
    const response = await fetchWithRetry(`${API_BASE}/auth/profile`, { headers }, 2, 1000, 12000);
    return response.json();
  },

  // Stream
  async getNowPlaying() {
    // Lightweight polling endpoint — fewer retries, shorter timeout
    const response = await fetchWithRetry(`${API_BASE}/stream/nowplaying`, undefined, 2, 1000, 12000);
    return response.json();
  },

  async updateNowPlaying(track: any, show: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/stream/nowplaying`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ track, show }),
    });
    return response.json();
  },

  async getHistory(limit = 20) {
    const response = await fetchWithRetry(`${API_BASE}/stream/history?limit=${limit}`);
    return response.json();
  },

  async updateStreamStatus(status: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/stream/status`, {
      method: 'POST',
      headers,
      body: JSON.stringify(status),
    });
    return response.json();
  },

  // Tracks
  async getTracks(filters?: { genre?: string; search?: string }) {
    const headers = await getPublicHeaders();
    const params = new URLSearchParams();
    if (filters?.genre) params.set('genre', filters.genre);
    if (filters?.search) params.set('search', filters.search);
    const qs = params.toString();
    const response = await fetchWithRetry(`${API_BASE}/tracks${qs ? `?${qs}` : ''}`, { headers });
    if (!response.ok) {
      console.error('[API] getTracks failed:', response.status, await response.text().catch(() => ''));
      return { tracks: [] };
    }
    return response.json();
  },

  async getTrack(id: string) {
    const headers = await getPublicHeaders();
    const response = await fetchWithRetry(`${API_BASE}/tracks/${id}`, { headers });
    return response.json();
  },

  /** Get a fresh signed audio URL for playback (lightweight, no full track data). */
  async getTrackPlayUrl(id: string): Promise<{ audioUrl?: string; coverUrl?: string; error?: string }> {
    const headers = await getPublicHeaders();
    const response = await fetchWithRetry(`${API_BASE}/tracks/${id}/play-url`, { headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      console.error(`[API] getTrackPlayUrl failed for ${id}:`, response.status, errText);
      return { error: errText };
    }
    return response.json();
  },

  async createTrack(track: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/tracks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(track),
    });
    return response.json();
  },

  async updateTrack(id: string, track: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/tracks/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(track),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error(`[API] updateTrack failed: ${response.status}`, errBody);
      throw new Error(`Update track failed (${response.status}): ${errBody}`);
    }
    return response.json();
  },

  async deleteTrack(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/tracks/${id}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  async bulkUpdateTags(trackIds: string[], options: { action: 'add' | 'remove' | 'replace'; tags: string[] }) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/tracks/bulk-update-tags`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ trackIds, ...options }),
    });
    return response.json();
  },

  async uploadTrackCover(trackId: string, coverFile: File) {
    const token = await getAccessToken();
    const formData = new FormData();
    formData.append('cover', coverFile);
    
    const response = await fetchWithRetry(`${API_BASE}/tracks/${trackId}/cover`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    return response.json();
  },

  async extractTrackMetadata(trackId: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/tracks/${trackId}/extract-metadata`, {
      method: 'POST',
      headers,
    });
    return response.json();
  },

  // Playlists
  async getPlaylists() {
    const headers = await getPublicHeaders();
    const response = await fetchWithRetry(`${API_BASE}/playlists`, { headers });
    return response.json();
  },

  async getAllPlaylists() {
    return this.getPlaylists();
  },

  async getPlaylist(id: string) {
    const headers = await getPublicHeaders();
    const response = await fetchWithRetry(`${API_BASE}/playlists/${id}`, { headers });
    return response.json();
  },

  async createPlaylist(playlist: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/playlists`, {
      method: 'POST',
      headers,
      body: JSON.stringify(playlist),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error(`[API] createPlaylist failed: ${response.status}`, errBody);
      let msg = `Create playlist failed (${response.status})`;
      try { const j = JSON.parse(errBody); msg = j.error || msg; } catch {}
      throw new Error(msg);
    }
    return response.json();
  },

  async updatePlaylist(id: string, updates: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/playlists/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error(`[API] updatePlaylist failed: ${response.status}`, errBody);
      let msg = `Update playlist failed (${response.status})`;
      try { const j = JSON.parse(errBody); msg = j.error || msg; } catch {}
      throw new Error(msg);
    }
    return response.json();
  },

  async deletePlaylist(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/playlists/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error(`[API] deletePlaylist failed: ${response.status}`, errBody);
      let msg = `Delete playlist failed (${response.status})`;
      try { const j = JSON.parse(errBody); msg = j.error || msg; } catch {}
      throw new Error(msg);
    }
    return response.json();
  },

  async addTrackToPlaylist(playlistId: string, trackId: string, position?: 'start' | 'end') {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ trackId, position: position || 'end' }),
    });
    return response.json();
  },

  async removeTrackFromPlaylist(playlistId: string, trackId: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/playlists/${playlistId}/tracks/${trackId}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  // Jingle Playlist Rotation
  async getJinglePlaylistConfig() {
    const headers = await getPublicHeaders();
    const response = await fetchWithRetry(`${API_BASE}/jingle-playlist/config`, { headers });
    return response.json();
  },

  async updateJinglePlaylistConfig(config: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/jingle-playlist/config`, {
      method: 'POST',
      headers,
      body: JSON.stringify(config),
    });
    return response.json();
  },

  async ensureJinglesPlaylist() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/jingle-playlist/ensure`, {
      method: 'POST',
      headers,
    });
    return response.json();
  },

  async getNextJingle() {
    const headers = await getPublicHeaders();
    const response = await fetchWithRetry(`${API_BASE}/jingle-playlist/next`, { headers });
    return response.json();
  },

  async advanceJingleRotation() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/jingle-playlist/advance`, {
      method: 'POST',
      headers,
    });
    return response.json();
  },

  async resetJingleRotation() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/jingle-playlist/reset`, {
      method: 'POST',
      headers,
    });
    return response.json();
  },

  // Schedules
  async getAllSchedules() {
    // Cache-bust to avoid CDN / browser serving stale schedule list
    const response = await fetchWithRetry(`${API_BASE}/schedule?_t=${Date.now()}`);
    return response.json();
  },

  async getSchedule(id: string) {
    const response = await fetchWithRetry(`${API_BASE}/schedule/${id}`);
    return response.json();
  },

  async createSchedule(schedule: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/schedule`, {
      method: 'POST',
      headers,
      body: JSON.stringify(schedule),
    });
    return response.json();
  },

  async updateSchedule(id: string, schedule: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/schedule/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(schedule),
    });
    return response.json();
  },

  async deleteSchedule(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/schedule/${id}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  // Jingles
  async getAllJingles(params?: { category?: string; active?: string }) {
    const search = new URLSearchParams();
    if (params?.category) search.set('category', params.category);
    if (params?.active) search.set('active', params.active);
    const qs = search.toString();
    const response = await fetchWithRetry(`${API_BASE}/jingles${qs ? `?${qs}` : ''}`);
    return response.json();
  },

  async getJingle(id: string) {
    const response = await fetchWithRetry(`${API_BASE}/jingles/${id}`);
    return response.json();
  },

  async createJingle(jingle: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/jingles`, {
      method: 'POST',
      headers,
      body: JSON.stringify(jingle),
    });
    return response.json();
  },

  async updateJingle(id: string, jingle: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/jingles/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(jingle),
    });
    return response.json();
  },

  async deleteJingle(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/jingles/${id}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  async uploadJingleFile(jingleId: string, formData: FormData) {
    const token = await getAccessToken();
    const response = await fetchWithRetry(`${API_BASE}/jingles/${jingleId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    return response.json();
  },

  async getScheduleJingleMap() {
    const response = await fetchWithRetry(`${API_BASE}/schedule/jingle-map`);
    return response.json();
  },

  // Donations
  async getDonations() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/donations`, { headers });
    return response.json();
  },

  async createDonation(donation: any) {
    const response = await fetchWithRetry(`${API_BASE}/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donation),
    });
    return response.json();
  },

  async getDonationStats() {
    const response = await fetchWithRetry(`${API_BASE}/donations/stats`);
    return response.json();
  },

  async getRecentDonations(limit = 10) {
    const response = await fetchWithRetry(`${API_BASE}/donations/recent?limit=${limit}`);
    return response.json();
  },

  // Users Management
  async getAllUsers() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/users`, { headers });
    return response.json();
  },

  async updateUserRole(userId: string, role: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/users/${userId}/role`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ role }),
    });
    return response.json();
  },

  async deleteUser(userId: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/users/${userId}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  // Icecast Integration
  async getIcecastStatus() {
    const response = await fetchWithRetry(`${API_BASE}/icecast/status`);
    return response.json();
  },

  async getIcecastConfig() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/icecast/config`, { headers });
    return response.json();
  },

  async saveIcecastConfig(config: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/icecast/config`, {
      method: 'POST',
      headers,
      body: JSON.stringify(config),
    });
    return response.json();
  },

  async testIcecastConnection() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/icecast/test`, {
      method: 'POST',
      headers,
    }, 1, 2000, 15000); // single attempt, 15s timeout
    return response.json();
  },

  async getIcecastListenerUrl() {
    const response = await fetchWithRetry(`${API_BASE}/icecast/listener-url`);
    return response.json();
  },

  async updateIcecastMetadata(metadata: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/icecast/metadata`, {
      method: 'POST',
      headers,
      body: JSON.stringify(metadata),
    });
    return response.json();
  },

  // ==================== AZURACAST INTEGRATION ====================

  async getAzuraCastConfig() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/azuracast/config`, { headers });
    return response.json();
  },

  async saveAzuraCastConfig(config: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/azuracast/config`, {
      method: 'POST',
      headers,
      body: JSON.stringify(config),
    });
    return response.json();
  },

  async getAzuraCastNowPlaying() {
    const response = await fetchWithRetry(`${API_BASE}/azuracast/nowplaying`);
    return response.json();
  },

  async getAzuraCastStatus() {
    const response = await fetchWithRetry(`${API_BASE}/azuracast/status`);
    return response.json();
  },

  async getAzuraCastListeners() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/azuracast/listeners`, { headers });
    return response.json();
  },

  async getAzuraCastHistory() {
    const response = await fetchWithRetry(`${API_BASE}/azuracast/history`);
    return response.json();
  },

  async getAzuraCastQueue() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/azuracast/queue`, { headers });
    return response.json();
  },

  async getAzuraCastStation() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/azuracast/station`, { headers });
    return response.json();
  },

  async testAzuraCastConnection() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/azuracast/test`, {
      method: 'POST',
      headers,
    }, 1, 2000, 20000); // single attempt, 20s timeout
    return response.json();
  },

  async restartAzuraCastStation() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/azuracast/restart`, {
      method: 'POST',
      headers,
    });
    return response.json();
  },

  async getAzuraCastStreamUrl() {
    const response = await fetchWithRetry(`${API_BASE}/azuracast/stream-url`);
    return response.json();
  },

  // Track Upload with File — 3-step: signed URL → direct Storage upload → server processing
  async uploadTrackFile(formData: FormData, onProgress?: (progress: number) => void) {
    const accessToken = await getAccessToken();
    const file = formData.get('file') as File;
    if (!file) throw new Error('No file provided');

    // Step 1: Get a signed upload URL from the server (small JSON request)
    onProgress?.(1);
    console.log('[API] Step 1: Getting signed upload URL...');
    const urlResponse = await fetchWithRetry(`${API_BASE}/tracks/get-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        originalFilename: file.name,
        contentType: file.type || 'audio/mpeg',
      }),
    });

    if (!urlResponse.ok) {
      const errText = await urlResponse.text().catch(() => urlResponse.statusText);
      console.error('[API] Step 1 failed:', urlResponse.status, errText);
      throw new Error(`Failed to get upload URL (${urlResponse.status}): ${errText}`);
    }

    const urlData = await urlResponse.json();
    if (urlData.error) throw new Error(urlData.error);

    const { signedUrl, token: uploadToken, filename, bucket } = urlData;
    console.log('[API] Signed URL received for:', filename);
    onProgress?.(5);

    // Step 2: Upload file directly to Supabase Storage via signed URL (XHR for progress)
    // IMPORTANT: Supabase Kong gateway requires the `apikey` header for ALL requests
    console.log('[API] Step 2: Uploading file directly to Storage...');
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            // Map 0-100% upload to 5-80% progress
            const pct = Math.round(5 + (e.loaded / e.total) * 75);
            onProgress(pct);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('[API] File uploaded to Storage successfully, status:', xhr.status);
          onProgress?.(80);
          resolve();
        } else {
          console.error('[API] Storage upload failed:', xhr.status, xhr.responseText);
          let errMsg = `Storage upload failed (${xhr.status})`;
          try {
            const errBody = JSON.parse(xhr.responseText);
            errMsg = errBody.error || errBody.message || errMsg;
          } catch {}
          reject(new Error(errMsg));
        }
      });

      xhr.addEventListener('error', () => {
        console.error('[API] Storage upload network error');
        reject(new Error('Network error during file upload to Storage'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      xhr.timeout = 120000; // 2 min timeout for large files
      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timed out (120s)'));
      });

      xhr.open('PUT', signedUrl);
      // Supabase Kong gateway requires apikey header for all requests
      xhr.setRequestHeader('apikey', publicAnonKey);
      xhr.setRequestHeader('Authorization', `Bearer ${publicAnonKey}`);
      xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');
      xhr.send(file);
    });

    // Step 3: Ask server to process the uploaded file (metadata extraction, track creation)
    console.log('[API] Step 3: Processing uploaded file...');
    onProgress?.(85);

    const processResponse = await fetchWithRetry(`${API_BASE}/tracks/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        filename,
        bucket,
        originalFilename: file.name,
        position: formData.get('position') || 'end',
        autoAddToLiveStream: formData.get('autoAddToLiveStream') === 'true',
        generateWaveform: formData.get('generateWaveform') === 'true',
      }),
    }, 2, 2000, 45000); // 2 retries, 2s backoff, 45s timeout for metadata processing

    if (!processResponse.ok) {
      const errText = await processResponse.text().catch(() => processResponse.statusText);
      console.error('[API] Step 3 failed:', processResponse.status, errText);
      throw new Error(`Track processing failed (${processResponse.status}): ${errText}`);
    }

    const result = await processResponse.json();
    if (result.error) throw new Error(result.error);

    onProgress?.(100);
    console.log('[API] Track upload complete:', result.track?.title);
    return result;
  },

  // Podcasts
  async getPodcasts() {
    const response = await fetchWithRetry(`${API_BASE}/podcasts`);
    return response.json();
  },

  async getPodcast(id: string) {
    const response = await fetchWithRetry(`${API_BASE}/podcasts/${id}`);
    return response.json();
  },

  async createPodcast(podcast: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/podcasts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(podcast),
    });
    return response.json();
  },

  async updatePodcast(id: string, podcast: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/podcasts/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(podcast),
    });
    return response.json();
  },

  async deletePodcast(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/podcasts/${id}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  // Shows
  async getShows() {
    const response = await fetchWithRetry(`${API_BASE}/shows`);
    return response.json();
  },

  async getShow(id: string) {
    const response = await fetchWithRetry(`${API_BASE}/shows/${id}`);
    return response.json();
  },

  async createShow(show: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/shows`, {
      method: 'POST',
      headers,
      body: JSON.stringify(show),
    });
    return response.json();
  },

  async updateShow(id: string, show: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/shows/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(show),
    });
    return response.json();
  },

  async deleteShow(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/shows/${id}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  async deleteAllShows() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/shows`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  // Profiles
  async getProfiles() {
    const response = await fetchWithRetry(`${API_BASE}/profiles`);
    return response.json();
  },

  async getProfileById(id: string) {
    const response = await fetchWithRetry(`${API_BASE}/profiles/${id}`);
    return response.json();
  },

  async createProfile(profile: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/profiles`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profile),
    });
    return response.json();
  },

  async updateProfile(id: string, profile: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/profiles/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(profile),
    });
    return response.json();
  },

  async deleteProfile(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/profiles/${id}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  // Analytics
  async getAnalytics(filters?: { startDate?: string; endDate?: string; metric?: string }) {
    const params = new URLSearchParams(filters as any);
    const response = await fetchWithRetry(`${API_BASE}/analytics?${params}`);
    return response.json();
  },

  async getListenerStats() {
    const response = await fetchWithRetry(`${API_BASE}/analytics/listeners`);
    return response.json();
  },

  async getTrackStats() {
    const response = await fetchWithRetry(`${API_BASE}/analytics/tracks`);
    return response.json();
  },

  async getShowStats() {
    const response = await fetchWithRetry(`${API_BASE}/analytics/shows`);
    return response.json();
  },

  // Radio/Auto DJ
  async startAutoDJ() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/radio/start`, {
      method: 'POST',
      headers,
    });
    return response.json();
  },

  async stopAutoDJ() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/radio/stop`, {
      method: 'POST',
      headers,
    });
    return response.json();
  },

  async skipToNextTrack() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/radio/next`, {
      method: 'POST',
      headers,
    });
    return response.json();
  },

  async getRadioStatus() {
    const response = await fetchWithRetry(`${API_BASE}/radio/status`);
    return response.json();
  },

  // Get current stream info with signed audio URL for direct playback
  async getCurrentStream() {
    // Player-critical but called frequently — 2 retries, shorter timeout
    const response = await fetchWithRetry(`${API_BASE}/radio/current-stream`, undefined, 2, 1500, 15000);
    return response.json();
  },

  // Get live radio stream URL (legacy)
  getLiveRadioURL() {
    return `${API_BASE}/radio/live`;
  },

  // Get stream base URL
  getStreamURL() {
    return `${API_BASE}/stream`;
  },

  // Get debug info for Auto DJ (raw KV state)
  async getDebugInfo() {
    const response = await fetchWithRetry(`${API_BASE}/radio/debug`);
    return response.json();
  },

  // Raw KV schedule dump for diagnostics
  async getKVScheduleDump() {
    const response = await fetchWithRetry(`${API_BASE}/radio/kv-schedule-dump?_t=${Date.now()}`);
    return response.json();
  },

  // Migrate old schedule slots to IANA timezone (DST-correct)
  async migrateTimezone(timezone: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/radio/migrate-timezone`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ timezone }),
    });
    return response.json();
  },

  // Get Auto DJ queue (upcoming tracks with metadata)
  async getRadioQueue() {
    const response = await fetchWithRetry(`${API_BASE}/radio/queue`);
    return response.json();
  },

  // Get radio schedule status (current slot, upcoming, Auto DJ link)
  async getRadioScheduleStatus() {
    const response = await fetchWithRetry(`${API_BASE}/radio/schedule-status`);
    return response.json();
  },

  // Get stream info for public player
  async getStreamInfo(shortId: string) {
    const response = await fetchWithRetry(`${API_BASE}/stream/info/${shortId}`);
    return response.json();
  },

  // Active Listeners
  async getActiveListeners() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/analytics/active-listeners`, { headers });
    return response.json();
  },

  // Usage Stats (Storage & Bandwidth)
  async getUsageStats() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/analytics/usage`, { headers });
    return response.json();
  },

  // Podcast Episodes
  async getPodcastEpisodes(podcastId: string) {
    const response = await fetchWithRetry(`${API_BASE}/podcasts/${podcastId}/episodes`);
    return response.json();
  },

  async createEpisode(episode: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/podcasts/${episode.podcastId}/episodes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(episode),
    });
    return response.json();
  },

  async updateEpisode(id: string, episode: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/episodes/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(episode),
    });
    return response.json();
  },

  async deleteEpisode(id: string, podcastId: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/episodes/${id}?podcastId=${encodeURIComponent(podcastId)}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  // Schedule Slots
  async createScheduleSlot(slot: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/schedule/slots`, {
      method: 'POST',
      headers,
      body: JSON.stringify(slot),
    });
    return response.json();
  },

  async updateScheduleSlot(slotId: string, updates: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/schedule/slots/${slotId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    return response.json();
  },

  async deleteScheduleSlot(slotId: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/schedule/slots/${slotId}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  // Stream Settings
  async getStreamSettings() {
    const headers = await getPublicHeaders();
    const response = await fetchWithRetry(`${API_BASE}/settings/stream`, { headers });
    return response.json();
  },

  async updateStreamSettings(settings: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/settings/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update settings');
    }
    return response.json();
  },

  // ==================== INTERACTIVE FEATURES ====================

  // DJ Sessions
  async getDJSessions() {
    const response = await fetchWithRetry(`${API_BASE}/dj-sessions`);
    return response.json();
  },

  // Song Requests
  async getSongRequests(status?: string) {
    const url = status && status !== 'all'
      ? `${API_BASE}/song-requests?status=${status}`
      : `${API_BASE}/song-requests`;
    const response = await fetchWithRetry(url);
    return response.json();
  },

  async submitSongRequest(data: any) {
    const response = await fetchWithRetry(`${API_BASE}/song-requests/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async moderateSongRequest(requestId: string, data: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/song-requests/${requestId}/moderate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getSongRequestStats() {
    const response = await fetchWithRetry(`${API_BASE}/song-requests/stats`);
    return response.json();
  },

  async voteOnSongRequest(requestId: string, data: any) {
    const response = await fetchWithRetry(`${API_BASE}/song-requests/${requestId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Shoutouts
  async getShoutouts(status?: string) {
    const url = status && status !== 'all'
      ? `${API_BASE}/shoutouts?status=${status}`
      : `${API_BASE}/shoutouts`;
    const response = await fetchWithRetry(url);
    return response.json();
  },

  async submitShoutout(data: any) {
    const response = await fetchWithRetry(`${API_BASE}/shoutouts/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async moderateShoutout(shoutoutId: string, data: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/shoutouts/${shoutoutId}/moderate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getShoutoutStats() {
    const response = await fetchWithRetry(`${API_BASE}/shoutouts/stats`);
    return response.json();
  },

  // Call Queue
  async getCallQueue() {
    const response = await fetchWithRetry(`${API_BASE}/call-queue`);
    return response.json();
  },

  async addToCallQueue(data: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/call-queue/add`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async screenCall(callId: string, data: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/call-queue/${callId}/screen`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async connectCallToAir(callId: string, sessionId: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/call-queue/${callId}/connect`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ session_id: sessionId }),
    });
    return response.json();
  },

  async disconnectCall(callId: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/call-queue/${callId}/disconnect`, {
      method: 'POST',
      headers,
    });
    return response.json();
  },

  // Podcast Subscription
  async togglePodcastSubscription(podcastId: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/podcasts/${podcastId}/subscribe`, {
      method: 'POST',
      headers,
    });
    return response.json();
  },

  // Episode Like
  async toggleEpisodeLike(episodeId: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/podcasts/episodes/${episodeId}/like`, {
      method: 'POST',
      headers,
    });
    return response.json();
  },

  // ==================== NEWS CRUD ====================

  async getNews(category?: string) {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    const response = await fetchWithRetry(`${API_BASE}/news${params}`);
    return response.json();
  },

  async getNewsItem(id: string) {
    const response = await fetchWithRetry(`${API_BASE}/news/${id}`);
    return response.json();
  },

  async createNewsItem(news: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/news`, {
      method: 'POST',
      headers,
      body: JSON.stringify(news),
    });
    return response.json();
  },

  async updateNewsItem(id: string, news: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/news/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(news),
    });
    return response.json();
  },

  async deleteNewsItem(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/news/${id}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  // ==================== FEEDBACK ====================

  async getFeedback() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/feedback`, { headers });
    return response.json();
  },

  async submitFeedback(feedback: { name?: string; email?: string; subject: string; message: string; rating?: number; category?: string }) {
    const response = await fetchWithRetry(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    });
    return response.json();
  },

  async updateFeedback(id: string, updates: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/feedback/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    return response.json();
  },

  async deleteFeedback(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/feedback/${id}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  // ==================== BRANDING SETTINGS ====================

  async getBrandingSettings() {
    const response = await fetchWithRetry(`${API_BASE}/settings/branding`);
    return response.json();
  },

  async updateBrandingSettings(settings: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/settings/branding`, {
      method: 'POST',
      headers,
      body: JSON.stringify(settings),
    });
    return response.json();
  },

  // ==================== AUDIT LOGS ====================

  async getAuditLogs(limit = 100) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/logs?limit=${limit}`, { headers });
    return response.json();
  },

  async createAuditLog(entry: { level?: string; category?: string; message: string; details?: string }) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(entry),
    });
    return response.json();
  },

  async clearAuditLogs() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/logs`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  // ==================== BACKUP / EXPORT ====================

  async exportData(type: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/export/${type}`, { headers });
    return response.json();
  },

  async getExportHistory() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/export-history`, { headers });
    return response.json();
  },

  // ==================== ADMIN DASHBOARD STATS ====================

  async getDashboardStats() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/admin/dashboard-stats`, { headers });
    return response.json();
  },

  // ==================== RESOURCE USAGE ====================

  async getResourceUsage() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/admin/resource-usage`, { headers });
    return response.json();
  },

  async updateResourceUsage(data: {
    storageUsedGB?: number;
    storageTotalGB?: number;
    bandwidthUsedGB?: number;
    bandwidthTotalGB?: number;
    listenersPeak?: number;
  }) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/admin/resource-usage`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // ==================== CACHE MANAGEMENT ====================

  async clearServerCache() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/admin/cache/clear`, {
      method: 'POST',
      headers,
    });
    return response.json();
  },

  // ==================== DJ SESSIONS ====================

  async getDJSessionCurrent() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/dj-sessions/current`, { headers });
    return response.json();
  },

  async startDJSession(data: { dj_name: string; title: string; session_type?: string; source_app?: string }) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/dj-sessions/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async endDJSession(sessionId: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/dj-sessions/${sessionId}/end`, {
      method: 'POST',
      headers,
    });
    return response.json();
  },

  async updateDJSessionStats(data: { tracks_played?: number; callers_taken?: number; requests_played?: number }) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/dj-sessions/stats`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getDJSessionHistory() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/dj-sessions/history`, { headers });
    return response.json();
  },

  async getDJConnectionConfig() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/dj-sessions/connection-config`, { headers });
    return response.json();
  },

  async saveDJConnectionConfig(config: Record<string, any>) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/dj-sessions/connection-config`, {
      method: 'POST',
      headers,
      body: JSON.stringify(config),
    });
    return response.json();
  },

  async getAzuraCastStreamers() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/dj-sessions/azuracast-streamers`, { headers });
    return response.json();
  },

  async createAzuraCastStreamer(data: { username: string; password: string; displayName?: string; comments?: string }) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/dj-sessions/azuracast-streamers`, {
      method: 'POST', headers, body: JSON.stringify(data),
    });
    return response.json();
  },

  async updateAzuraCastStreamer(id: number, data: { username?: string; password?: string; displayName?: string; isActive?: boolean }) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/dj-sessions/azuracast-streamers/${id}`, {
      method: 'PUT', headers, body: JSON.stringify(data),
    });
    return response.json();
  },

  async deleteAzuraCastStreamer(id: number) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/dj-sessions/azuracast-streamers/${id}`, {
      method: 'DELETE', headers,
    });
    return response.json();
  },

  async getDJStationProfile() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/dj-sessions/station-profile`, { headers });
    return response.json();
  },

  async enableStreamers(enable: boolean) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/dj-sessions/enable-streamers`, {
      method: 'POST', headers, body: JSON.stringify({ enable }),
    });
    return response.json();
  },

  async checkDJPort() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/dj-sessions/port-check`, { headers });
    return response.json();
  },

  // ==================== EVENTS ====================

  async getEvents() {
    const response = await fetchWithRetry(`${API_BASE}/events`);
    return response.json();
  },

  async getEvent(id: string) {
    const response = await fetchWithRetry(`${API_BASE}/events/${id}`);
    return response.json();
  },

  async createEvent(event: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
    });
    return response.json();
  },

  async updateEvent(id: string, event: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/events/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(event),
    });
    return response.json();
  },

  async deleteEvent(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/events/${id}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  // ==================== MERCH ====================

  async getMerch() {
    const response = await fetchWithRetry(`${API_BASE}/merch`);
    return response.json();
  },

  async getMerchItem(id: string) {
    const response = await fetchWithRetry(`${API_BASE}/merch/${id}`);
    return response.json();
  },

  async createMerchItem(item: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/merch`, {
      method: 'POST',
      headers,
      body: JSON.stringify(item),
    });
    return response.json();
  },

  async updateMerchItem(id: string, item: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/merch/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(item),
    });
    return response.json();
  },

  async deleteMerchItem(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/merch/${id}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  async seedMerch() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/merch/seed`, {
      method: 'POST',
      headers,
    });
    return response.json();
  },

  // ==================== COMMUNITY ====================

  async getCommunityMessages(channel?: string, limit = 50) {
    const params = new URLSearchParams();
    if (channel) params.set('channel', channel);
    params.set('limit', String(limit));
    const response = await fetchWithRetry(`${API_BASE}/community/messages?${params}`);
    return response.json();
  },

  async postCommunityMessage(data: { user: string; color?: string; message: string; channel: string }) {
    const response = await fetchWithRetry(`${API_BASE}/community/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async likeCommunityMessage(messageId: string, userId?: string) {
    const response = await fetchWithRetry(`${API_BASE}/community/messages/${messageId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return response.json();
  },

  async deleteCommunityMessage(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/community/messages/${id}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  async getCommunityStats() {
    const response = await fetchWithRetry(`${API_BASE}/community/stats`);
    return response.json();
  },

  async seedCommunity() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/community/seed`, {
      method: 'POST',
      headers,
    });
    return response.json();
  },
};