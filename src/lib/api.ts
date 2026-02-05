import { API_BASE, supabase } from './supabase';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${(await import('/utils/supabase/info')).publicAnonKey}`,
  };
}

export const api = {
  // Auth
  async signUp(email: string, password: string, name: string) {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    return response.json();
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  async signOut() {
    return supabase.auth.signOut();
  },

  async getProfile() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/auth/profile`, { headers });
    return response.json();
  },

  // Stream
  async getNowPlaying() {
    const response = await fetch(`${API_BASE}/stream/nowplaying`);
    return response.json();
  },

  async updateNowPlaying(track: any, show: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/stream/nowplaying`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ track, show }),
    });
    return response.json();
  },

  async getHistory(limit = 20) {
    const response = await fetch(`${API_BASE}/stream/history?limit=${limit}`);
    return response.json();
  },

  async updateStreamStatus(status: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/stream/status`, {
      method: 'POST',
      headers,
      body: JSON.stringify(status),
    });
    return response.json();
  },

  // Tracks
  async getTracks(filters?: { genre?: string; search?: string }) {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`${API_BASE}/tracks?${params}`);
    return response.json();
  },

  async getTrack(id: string) {
    const response = await fetch(`${API_BASE}/tracks/${id}`);
    return response.json();
  },

  async createTrack(track: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/tracks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(track),
    });
    return response.json();
  },

  async updateTrack(id: string, track: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/tracks/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(track),
    });
    return response.json();
  },

  async deleteTrack(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/tracks/${id}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  // Playlists
  async getPlaylists() {
    const response = await fetch(`${API_BASE}/playlists`);
    return response.json();
  },

  async getPlaylist(id: string) {
    const response = await fetch(`${API_BASE}/playlists/${id}`);
    return response.json();
  },

  async createPlaylist(playlist: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/playlists`, {
      method: 'POST',
      headers,
      body: JSON.stringify(playlist),
    });
    return response.json();
  },

  async updatePlaylist(id: string, playlist: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/playlists/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(playlist),
    });
    return response.json();
  },

  async deletePlaylist(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/playlists/${id}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  // Shows
  async getShows() {
    const response = await fetch(`${API_BASE}/shows`);
    return response.json();
  },

  async getShow(id: string) {
    const response = await fetch(`${API_BASE}/shows/${id}`);
    return response.json();
  },

  async createShow(show: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/shows`, {
      method: 'POST',
      headers,
      body: JSON.stringify(show),
    });
    return response.json();
  },

  async updateShow(id: string, show: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/shows/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(show),
    });
    return response.json();
  },

  // Schedule
  async getSchedule(date?: string) {
    const params = date ? `?date=${date}` : '';
    const response = await fetch(`${API_BASE}/schedule${params}`);
    return response.json();
  },

  async createSchedule(schedule: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/schedule`, {
      method: 'POST',
      headers,
      body: JSON.stringify(schedule),
    });
    return response.json();
  },

  async updateSchedule(id: string, schedule: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/schedule/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(schedule),
    });
    return response.json();
  },

  async deleteSchedule(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/schedule/${id}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  // Donations
  async getDonations() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/donations`, { headers });
    return response.json();
  },

  async createDonation(donation: any) {
    const response = await fetch(`${API_BASE}/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donation),
    });
    return response.json();
  },

  async getDonationStats() {
    const response = await fetch(`${API_BASE}/donations/stats`);
    return response.json();
  },

  // News
  async getNews(category?: string) {
    const params = category ? `?category=${category}` : '';
    const response = await fetch(`${API_BASE}/news${params}`);
    return response.json();
  },

  async getNewsItem(id: string) {
    const response = await fetch(`${API_BASE}/news/${id}`);
    return response.json();
  },

  async createNews(news: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/news`, {
      method: 'POST',
      headers,
      body: JSON.stringify(news),
    });
    return response.json();
  },

  // Analytics
  async getAnalytics() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/analytics`, { headers });
    return response.json();
  },
};