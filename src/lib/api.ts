import { API_BASE, supabase } from './supabase';
import { publicAnonKey } from '../../utils/supabase/info';

// ── Retry-aware fetch (handles cold-start / transient failures) ──────
async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 3,
  backoff = 1500,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 s timeout
      const response = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(
        `[API] Fetch attempt ${attempt + 1}/${retries} failed:`,
        err?.message || err,
      );
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, backoff * (attempt + 1)));
      }
    }
  }
  throw lastError ?? new Error('Fetch failed after retries');
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${publicAnonKey}`,
  };
}

async function getPublicHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
  };
}

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || publicAnonKey;
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
    console.log('[API] Sign in result:', { data: data?.user?.email, error });
    return { data, error };
  },

  async signOut() {
    return supabase.auth.signOut();
  },

  async getProfile() {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/auth/profile`, { headers });
    return response.json();
  },

  // Stream
  async getNowPlaying() {
    const response = await fetchWithRetry(`${API_BASE}/stream/nowplaying`);
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
    const params = new URLSearchParams(filters as any);
    const response = await fetchWithRetry(`${API_BASE}/tracks?${params}`);
    return response.json();
  },

  async getTrack(id: string) {
    const response = await fetchWithRetry(`${API_BASE}/tracks/${id}`);
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
    const response = await fetchWithRetry(`${API_BASE}/playlists`);
    return response.json();
  },

  async getAllPlaylists() {
    const response = await fetchWithRetry(`${API_BASE}/playlists`);
    return response.json();
  },

  async getPlaylist(id: string) {
    const response = await fetchWithRetry(`${API_BASE}/playlists/${id}`);
    return response.json();
  },

  async createPlaylist(playlist: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/playlists`, {
      method: 'POST',
      headers,
      body: JSON.stringify(playlist),
    });
    return response.json();
  },

  async updatePlaylist(id: string, updates: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/playlists/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    return response.json();
  },

  async deletePlaylist(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/playlists/${id}`, {
      method: 'DELETE',
      headers,
    });
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

  // Schedules
  async getAllSchedules() {
    const response = await fetchWithRetry(`${API_BASE}/schedule`);
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

  async updateIcecastMetadata(metadata: any) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/icecast/metadata`, {
      method: 'POST',
      headers,
      body: JSON.stringify(metadata),
    });
    return response.json();
  },

  // Track Upload with File
  async uploadTrackFile(formData: FormData, onProgress?: (progress: number) => void) {
    const accessToken = await getAccessToken();
    
    return new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 85); // 0-85%
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      xhr.open('POST', `${API_BASE}/tracks/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.send(formData);
    });
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
    const response = await fetchWithRetry(`${API_BASE}/radio/current-stream`);
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

  async deleteEpisode(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${API_BASE}/episodes/${id}`, {
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

  async getCurrentDJSession() {
    const response = await fetchWithRetry(`${API_BASE}/dj-sessions/current`);
    return response.json();
  },

  async startDJSession(data: { dj_name: string; title: string; session_type?: string }) {
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
};