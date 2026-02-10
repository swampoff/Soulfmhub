import React, { useState, useRef, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
// Card components available if needed
// import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  TestTube, Loader2, CheckCircle2, XCircle, Play, AlertTriangle,
  ChevronDown, ChevronRight, Zap, Shield,
  Radio, Music, List, Calendar, Users, Newspaper, Mic2, Headphones,
  MessageCircle, Trophy, Settings, BarChart3, Globe,
  Copy, Filter, Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { getAuthHeaders, getPublicHeaders } from '../../../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────
interface TestResult {
  id: string;
  name: string;
  category: string;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error' | 'skipped';
  message?: string;
  duration?: number;
  responseData?: any;
  httpStatus?: number;
}

interface TestDef {
  id: string;
  name: string;
  category: string;
  method: string;
  authRequired: boolean;
  run: () => Promise<{ ok: boolean; message: string; data?: any; httpStatus?: number; warning?: boolean }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────
const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3`;

async function apiCall(
  path: string,
  options: { method?: string; body?: any; auth?: boolean } = {}
) {
  const { method = 'GET', body, auth = false } = options;
  const headers: Record<string, string> = auth
    ? await getAuthHeaders()
    : await getPublicHeaders();

  const init: RequestInit = { method, headers };
  if (body) {
    init.body = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(`${BASE}${path}`, { ...init, signal: controller.signal });
    clearTimeout(timeout);
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = text; }
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    clearTimeout(timeout);
    throw err;
  }
}

function ok(msg: string, data?: any, httpStatus?: number) {
  return { ok: true, message: msg, data, httpStatus };
}
function warn(msg: string, data?: any) {
  return { ok: true, message: msg, data, warning: true };
}
function fail(msg: string) {
  return { ok: false, message: msg };
}

// ─── Category config ─────────────────────────────────────────────────────
const CATEGORIES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  'core':        { label: 'Core / Health',         icon: Zap,           color: '#00d9ff' },
  'auth':        { label: 'Auth & Users',          icon: Shield,        color: '#ff6b6b' },
  'tracks':      { label: 'Tracks',                icon: Music,         color: '#00ffaa' },
  'playlists':   { label: 'Playlists',             icon: List,          color: '#ffd700' },
  'schedule':    { label: 'Schedule',              icon: Calendar,      color: '#ff8c00' },
  'shows':       { label: 'Shows',                 icon: Radio,         color: '#9b59b6' },
  'profiles':    { label: 'DJ Profiles',           icon: Users,         color: '#e74c3c' },
  'podcasts':    { label: 'Podcasts & Episodes',   icon: Headphones,    color: '#3498db' },
  'news':        { label: 'News',                  icon: Newspaper,     color: '#2ecc71' },
  'radio':       { label: 'Radio / Auto DJ',       icon: Radio,         color: '#00d9ff' },
  'jingles':     { label: 'Jingles & Rules',       icon: Mic2,          color: '#e67e22' },
  'interactive': { label: 'Interactive Features',  icon: MessageCircle, color: '#1abc9c' },
  'contests':    { label: 'Podcast & Contests',    icon: Trophy,        color: '#f39c12' },
  'analytics':   { label: 'Analytics',             icon: BarChart3,     color: '#8e44ad' },
  'settings':    { label: 'Settings & Upload',     icon: Settings,      color: '#95a5a6' },
  'announcements': { label: 'News Injection & Announcements', icon: Globe, color: '#16a085' },
};

// ─── Build test definitions ──────────────────────────────────────────────
function buildTests(): TestDef[] {
  // We'll store created IDs for cleanup / chaining
  let createdTrackId = '';
  let createdShowId = '';
  let createdProfileId = '';
  let createdPodcastId = '';
  let createdEpisodeId = '';
  let createdPlaylistId = '';
  let createdScheduleId = '';
  let createdNewsId = '';

  return [
    // ══════════════ CORE ══════════════
    {
      id: 'health', name: 'GET /health', category: 'core', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/health');
        if (!r.ok) return fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        return ok('Server healthy', r.data, r.status);
      }
    },
    {
      id: 'stream-nowplaying', name: 'GET /stream/nowplaying', category: 'core', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/stream/nowplaying');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok(`Now playing: ${r.data?.track?.title || 'nothing'}`, r.data, r.status);
      }
    },
    {
      id: 'stream-history', name: 'GET /stream/history', category: 'core', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/stream/history?limit=5');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.history?.length ?? 0;
        return ok(`${count} history entries`, r.data, r.status);
      }
    },

    // ══════════════ AUTH ══════════════
    {
      id: 'auth-profile', name: 'GET /auth/profile', category: 'auth', method: 'GET', authRequired: true,
      run: async () => {
        const r = await apiCall('/auth/profile', { auth: true });
        if (!r.ok) return r.status === 401 ? warn('No active session (expected if not logged in)', r.data) : fail(`HTTP ${r.status}`);
        return ok(`Profile: ${r.data?.email || r.data?.name || 'found'}`, r.data, r.status);
      }
    },
    {
      id: 'users-list', name: 'GET /users', category: 'auth', method: 'GET', authRequired: true,
      run: async () => {
        const r = await apiCall('/users', { auth: true });
        if (!r.ok) return r.status === 401 ? warn('Auth required', r.data) : fail(`HTTP ${r.status}`);
        const count = r.data?.users?.length ?? 0;
        return ok(`${count} users`, r.data, r.status);
      }
    },

    // ══════════════ TRACKS ══════════════
    {
      id: 'tracks-list', name: 'GET /tracks', category: 'tracks', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/tracks');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.tracks?.length ?? 0;
        return ok(`${count} tracks`, r.data, r.status);
      }
    },
    {
      id: 'tracks-create', name: 'POST /tracks (create)', category: 'tracks', method: 'POST', authRequired: true,
      run: async () => {
        const r = await apiCall('/tracks', {
          method: 'POST', auth: true,
          body: { title: '__TEST_TRACK__', artist: 'Test Artist', genre: 'Test', duration: 180 }
        });
        if (!r.ok) return r.status === 401 ? warn('Auth required') : fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        createdTrackId = r.data?.track?.id || r.data?.id || '';
        return ok(`Created track: ${createdTrackId}`, r.data, r.status);
      }
    },
    {
      id: 'tracks-get', name: 'GET /tracks/:id', category: 'tracks', method: 'GET', authRequired: false,
      run: async () => {
        if (!createdTrackId) return warn('Skipped: no track created');
        const r = await apiCall(`/tracks/${createdTrackId}`);
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok(`Got track: ${r.data?.track?.title || r.data?.title}`, r.data, r.status);
      }
    },
    {
      id: 'tracks-update', name: 'PUT /tracks/:id', category: 'tracks', method: 'PUT', authRequired: true,
      run: async () => {
        if (!createdTrackId) return warn('Skipped: no track');
        const r = await apiCall(`/tracks/${createdTrackId}`, {
          method: 'PUT', auth: true,
          body: { title: '__TEST_TRACK_UPDATED__' }
        });
        if (!r.ok) return fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        return ok('Track updated', r.data, r.status);
      }
    },
    {
      id: 'tracks-delete', name: 'DELETE /tracks/:id', category: 'tracks', method: 'DELETE', authRequired: true,
      run: async () => {
        if (!createdTrackId) return warn('Skipped: no track');
        const r = await apiCall(`/tracks/${createdTrackId}`, { method: 'DELETE', auth: true });
        if (!r.ok) return fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        createdTrackId = '';
        return ok('Track deleted', r.data, r.status);
      }
    },

    // ══════════════ PLAYLISTS ══════════════
    {
      id: 'playlists-list', name: 'GET /playlists', category: 'playlists', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/playlists');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.playlists?.length ?? 0;
        return ok(`${count} playlists`, r.data, r.status);
      }
    },
    {
      id: 'playlists-create', name: 'POST /playlists (create)', category: 'playlists', method: 'POST', authRequired: true,
      run: async () => {
        const r = await apiCall('/playlists', {
          method: 'POST', auth: true,
          body: { name: '__TEST_PLAYLIST__', description: 'Test playlist' }
        });
        if (!r.ok) return r.status === 401 ? warn('Auth required') : fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        createdPlaylistId = r.data?.playlist?.id || r.data?.id || '';
        return ok(`Created playlist: ${createdPlaylistId}`, r.data, r.status);
      }
    },
    {
      id: 'playlists-update', name: 'PUT /playlists/:id', category: 'playlists', method: 'PUT', authRequired: true,
      run: async () => {
        if (!createdPlaylistId) return warn('Skipped: no playlist');
        const r = await apiCall(`/playlists/${createdPlaylistId}`, {
          method: 'PUT', auth: true,
          body: { name: '__TEST_PLAYLIST_UPD__' }
        });
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('Playlist updated', r.data, r.status);
      }
    },
    {
      id: 'playlists-add-track', name: 'POST /playlists/:id/tracks', category: 'playlists', method: 'POST', authRequired: true,
      run: async () => {
        if (!createdPlaylistId) return warn('Skipped: no playlist');
        const r = await apiCall(`/playlists/${createdPlaylistId}/tracks`, {
          method: 'POST', auth: true,
          body: { trackId: 'test-track-999', position: 'end' }
        });
        if (!r.ok) return fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        return ok('Track added to playlist', r.data, r.status);
      }
    },
    {
      id: 'playlists-remove-track', name: 'DELETE /playlists/:id/tracks/:trackId', category: 'playlists', method: 'DELETE', authRequired: true,
      run: async () => {
        if (!createdPlaylistId) return warn('Skipped: no playlist');
        const r = await apiCall(`/playlists/${createdPlaylistId}/tracks/test-track-999`, {
          method: 'DELETE', auth: true
        });
        if (!r.ok) return fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        return ok('Track removed from playlist', r.data, r.status);
      }
    },
    {
      id: 'playlists-delete', name: 'DELETE /playlists/:id', category: 'playlists', method: 'DELETE', authRequired: true,
      run: async () => {
        if (!createdPlaylistId) return warn('Skipped: no playlist');
        const r = await apiCall(`/playlists/${createdPlaylistId}`, { method: 'DELETE', auth: true });
        if (!r.ok) return fail(`HTTP ${r.status}`);
        createdPlaylistId = '';
        return ok('Playlist deleted', r.data, r.status);
      }
    },

    // ══════════════ SCHEDULE ══════════════
    {
      id: 'schedule-list', name: 'GET /schedule', category: 'schedule', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/schedule');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.schedules?.length ?? 0;
        return ok(`${count} schedules`, r.data, r.status);
      }
    },
    {
      id: 'schedule-create', name: 'POST /schedule (create)', category: 'schedule', method: 'POST', authRequired: true,
      run: async () => {
        const r = await apiCall('/schedule', {
          method: 'POST', auth: true,
          body: { title: '__TEST_SCHEDULE__', dayOfWeek: 1, startTime: '00:00', endTime: '01:00', playlistId: 'test' }
        });
        if (!r.ok) return r.status === 401 ? warn('Auth required') : fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        createdScheduleId = r.data?.schedule?.id || r.data?.id || '';
        return ok(`Created schedule: ${createdScheduleId}`, r.data, r.status);
      }
    },
    {
      id: 'schedule-update', name: 'PUT /schedule/:id', category: 'schedule', method: 'PUT', authRequired: true,
      run: async () => {
        if (!createdScheduleId) return warn('Skipped: no schedule');
        const r = await apiCall(`/schedule/${createdScheduleId}`, {
          method: 'PUT', auth: true,
          body: { title: '__TEST_SCHEDULE_UPD__' }
        });
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('Schedule updated', r.data, r.status);
      }
    },
    {
      id: 'schedule-slots-create', name: 'POST /schedule/slots', category: 'schedule', method: 'POST', authRequired: true,
      run: async () => {
        const r = await apiCall('/schedule/slots', {
          method: 'POST', auth: true,
          body: { title: '__TEST_SLOT__', dayOfWeek: 2, startTime: '02:00', endTime: '03:00', playlistId: 'test' }
        });
        if (!r.ok) return r.status === 401 ? warn('Auth required') : fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        return ok('Slot created', r.data, r.status);
      }
    },
    {
      id: 'schedule-jingle-map', name: 'GET /schedule/jingle-map', category: 'schedule', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/schedule/jingle-map');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('Jingle map loaded', r.data, r.status);
      }
    },
    {
      id: 'schedule-delete', name: 'DELETE /schedule/:id', category: 'schedule', method: 'DELETE', authRequired: true,
      run: async () => {
        if (!createdScheduleId) return warn('Skipped: no schedule');
        const r = await apiCall(`/schedule/${createdScheduleId}`, { method: 'DELETE', auth: true });
        if (!r.ok) return fail(`HTTP ${r.status}`);
        createdScheduleId = '';
        return ok('Schedule deleted', r.data, r.status);
      }
    },

    // ══════════════ SHOWS ══════════════
    {
      id: 'shows-list', name: 'GET /shows', category: 'shows', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/shows');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.shows?.length ?? 0;
        return ok(`${count} shows`, r.data, r.status);
      }
    },
    {
      id: 'shows-create', name: 'POST /shows (create)', category: 'shows', method: 'POST', authRequired: true,
      run: async () => {
        const r = await apiCall('/shows', {
          method: 'POST', auth: true,
          body: { title: '__TEST_SHOW__', description: 'Test show', host: 'Tester' }
        });
        if (!r.ok) return r.status === 401 ? warn('Auth required') : fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        createdShowId = r.data?.show?.id || r.data?.id || '';
        return ok(`Created show: ${createdShowId}`, r.data, r.status);
      }
    },
    {
      id: 'shows-get', name: 'GET /shows/:id', category: 'shows', method: 'GET', authRequired: false,
      run: async () => {
        if (!createdShowId) return warn('Skipped: no show');
        const r = await apiCall(`/shows/${createdShowId}`);
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok(`Got show: ${r.data?.show?.title || r.data?.title}`, r.data, r.status);
      }
    },
    {
      id: 'shows-delete', name: 'DELETE /shows/:id', category: 'shows', method: 'DELETE', authRequired: true,
      run: async () => {
        if (!createdShowId) return warn('Skipped: no show');
        const r = await apiCall(`/shows/${createdShowId}`, { method: 'DELETE', auth: true });
        if (!r.ok) return fail(`HTTP ${r.status}`);
        createdShowId = '';
        return ok('Show deleted', r.data, r.status);
      }
    },

    // ══════════════ DJ PROFILES ══════════════
    {
      id: 'profiles-list', name: 'GET /profiles', category: 'profiles', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/profiles');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.profiles?.length ?? 0;
        return ok(`${count} profiles`, r.data, r.status);
      }
    },
    {
      id: 'profiles-create', name: 'POST /profiles (create)', category: 'profiles', method: 'POST', authRequired: true,
      run: async () => {
        const r = await apiCall('/profiles', {
          method: 'POST', auth: true,
          body: { name: '__TEST_PROFILE__', role: 'dj', bio: 'Test profile' }
        });
        if (!r.ok) return r.status === 401 ? warn('Auth required') : fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        createdProfileId = r.data?.profile?.id || r.data?.id || '';
        return ok(`Created profile: ${createdProfileId}`, r.data, r.status);
      }
    },
    {
      id: 'profiles-get', name: 'GET /profiles/:id', category: 'profiles', method: 'GET', authRequired: false,
      run: async () => {
        if (!createdProfileId) return warn('Skipped: no profile');
        const r = await apiCall(`/profiles/${createdProfileId}`);
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok(`Got profile: ${r.data?.profile?.name || r.data?.name}`, r.data, r.status);
      }
    },
    {
      id: 'profiles-update', name: 'PUT /profiles/:id', category: 'profiles', method: 'PUT', authRequired: true,
      run: async () => {
        if (!createdProfileId) return warn('Skipped: no profile');
        const r = await apiCall(`/profiles/${createdProfileId}`, {
          method: 'PUT', auth: true,
          body: { bio: 'Updated test bio' }
        });
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('Profile updated', r.data, r.status);
      }
    },
    {
      id: 'profiles-delete', name: 'DELETE /profiles/:id', category: 'profiles', method: 'DELETE', authRequired: true,
      run: async () => {
        if (!createdProfileId) return warn('Skipped: no profile');
        const r = await apiCall(`/profiles/${createdProfileId}`, { method: 'DELETE', auth: true });
        if (!r.ok) return fail(`HTTP ${r.status}`);
        createdProfileId = '';
        return ok('Profile deleted', r.data, r.status);
      }
    },

    // ══════════════ PODCASTS & EPISODES ══════════════
    {
      id: 'podcasts-list', name: 'GET /podcasts', category: 'podcasts', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/podcasts');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.podcasts?.length ?? 0;
        return ok(`${count} podcasts`, r.data, r.status);
      }
    },
    {
      id: 'podcasts-create', name: 'POST /podcasts (create)', category: 'podcasts', method: 'POST', authRequired: true,
      run: async () => {
        const r = await apiCall('/podcasts', {
          method: 'POST', auth: true,
          body: { title: '__TEST_PODCAST__', description: 'Test podcast', host: 'Tester', category: 'test' }
        });
        if (!r.ok) return r.status === 401 ? warn('Auth required') : fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        createdPodcastId = r.data?.podcast?.id || r.data?.id || '';
        return ok(`Created podcast: ${createdPodcastId}`, r.data, r.status);
      }
    },
    {
      id: 'podcasts-get', name: 'GET /podcasts/:id', category: 'podcasts', method: 'GET', authRequired: false,
      run: async () => {
        if (!createdPodcastId) return warn('Skipped: no podcast');
        const r = await apiCall(`/podcasts/${createdPodcastId}`);
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('Podcast retrieved', r.data, r.status);
      }
    },
    {
      id: 'podcasts-update', name: 'PUT /podcasts/:id', category: 'podcasts', method: 'PUT', authRequired: true,
      run: async () => {
        if (!createdPodcastId) return warn('Skipped: no podcast');
        const r = await apiCall(`/podcasts/${createdPodcastId}`, {
          method: 'PUT', auth: true,
          body: { description: 'Updated description' }
        });
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('Podcast updated', r.data, r.status);
      }
    },
    {
      id: 'episodes-create', name: 'POST /podcasts/:id/episodes', category: 'podcasts', method: 'POST', authRequired: true,
      run: async () => {
        if (!createdPodcastId) return warn('Skipped: no podcast');
        const r = await apiCall(`/podcasts/${createdPodcastId}/episodes`, {
          method: 'POST', auth: true,
          body: { title: '__TEST_EPISODE__', description: 'Test ep', episodeNumber: 1, podcastId: createdPodcastId }
        });
        if (!r.ok) return fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        createdEpisodeId = r.data?.episode?.id || r.data?.id || '';
        return ok(`Created episode: ${createdEpisodeId}`, r.data, r.status);
      }
    },
    {
      id: 'episodes-list', name: 'GET /podcasts/:id/episodes', category: 'podcasts', method: 'GET', authRequired: false,
      run: async () => {
        if (!createdPodcastId) return warn('Skipped: no podcast');
        const r = await apiCall(`/podcasts/${createdPodcastId}/episodes`);
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.episodes?.length ?? 0;
        return ok(`${count} episodes`, r.data, r.status);
      }
    },
    {
      id: 'episodes-update', name: 'PUT /episodes/:id', category: 'podcasts', method: 'PUT', authRequired: true,
      run: async () => {
        if (!createdEpisodeId) return warn('Skipped: no episode');
        const r = await apiCall(`/episodes/${createdEpisodeId}`, {
          method: 'PUT', auth: true,
          body: { title: '__TEST_EPISODE_UPD__', podcastId: createdPodcastId }
        });
        if (!r.ok) return fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        return ok('Episode updated', r.data, r.status);
      }
    },
    {
      id: 'episodes-delete', name: 'DELETE /episodes/:id', category: 'podcasts', method: 'DELETE', authRequired: true,
      run: async () => {
        if (!createdEpisodeId) return warn('Skipped: no episode');
        const r = await apiCall(`/episodes/${createdEpisodeId}?podcastId=${createdPodcastId}`, {
          method: 'DELETE', auth: true
        });
        if (!r.ok) return fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        createdEpisodeId = '';
        return ok('Episode deleted', r.data, r.status);
      }
    },
    {
      id: 'podcasts-delete', name: 'DELETE /podcasts/:id', category: 'podcasts', method: 'DELETE', authRequired: true,
      run: async () => {
        if (!createdPodcastId) return warn('Skipped: no podcast');
        const r = await apiCall(`/podcasts/${createdPodcastId}`, { method: 'DELETE', auth: true });
        if (!r.ok) return fail(`HTTP ${r.status}`);
        createdPodcastId = '';
        return ok('Podcast deleted', r.data, r.status);
      }
    },

    // ══════════════ NEWS ══════════════
    {
      id: 'news-list', name: 'GET /news', category: 'news', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/news');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.news?.length ?? 0;
        return ok(`${count} news articles`, r.data, r.status);
      }
    },
    {
      id: 'news-create', name: 'POST /news (create)', category: 'news', method: 'POST', authRequired: true,
      run: async () => {
        const r = await apiCall('/news', {
          method: 'POST', auth: true,
          body: { title: '__TEST_NEWS__', content: 'Test content', category: 'test', author: 'Tester' }
        });
        if (!r.ok) return r.status === 401 ? warn('Auth required') : fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        createdNewsId = r.data?.article?.id || r.data?.id || '';
        return ok(`Created news: ${createdNewsId}`, r.data, r.status);
      }
    },
    {
      id: 'news-get', name: 'GET /news/:id', category: 'news', method: 'GET', authRequired: false,
      run: async () => {
        if (!createdNewsId) return warn('Skipped: no news article');
        const r = await apiCall(`/news/${createdNewsId}`);
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('News article retrieved', r.data, r.status);
      }
    },

    // ══════════════ RADIO / AUTO DJ ══════════════
    {
      id: 'radio-status', name: 'GET /radio/status', category: 'radio', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/radio/status');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const playing = r.data?.autoDJ?.isPlaying;
        const trackCount = r.data?.autoDJ?.totalTracks ?? 0;
        const schedule = r.data?.autoDJ?.currentSchedule?.title;
        return ok(
          `Radio ${playing ? 'PLAYING' : 'stopped'}, tracks: ${trackCount}${schedule ? `, schedule: ${schedule}` : ''}`,
          r.data, r.status
        );
      }
    },
    {
      id: 'radio-current-stream', name: 'GET /radio/current-stream', category: 'radio', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/radio/current-stream');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        // Server returns { playing, audioUrl, track: { title, ... }, seekPosition, ... }
        if (!r.data?.playing) {
          return warn('Auto DJ is not running (start via /radio/start)', r.data);
        }
        const hasUrl = !!r.data?.audioUrl;
        const trackTitle = r.data?.track?.title || 'unknown';
        return hasUrl
          ? ok(`Stream URL available, track: ${trackTitle}, seek: ${r.data?.seekPosition ?? 0}s`, r.data, r.status)
          : warn(`Playing but no audio file for: ${trackTitle}`, r.data);
      }
    },

    // ══════════════ JINGLES ══════════════
    {
      id: 'jingles-list', name: 'GET /jingles', category: 'jingles', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/jingles');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.jingles?.length ?? 0;
        return ok(`${count} jingles`, r.data, r.status);
      }
    },
    {
      id: 'jingle-rules-list', name: 'GET /jingle-rules', category: 'jingles', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/jingle-rules');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.rules?.length ?? 0;
        return ok(`${count} jingle rules`, r.data, r.status);
      }
    },

    // ══════════════ INTERACTIVE ══════════════
    {
      id: 'dj-sessions', name: 'GET /dj-sessions', category: 'interactive', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/dj-sessions');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.sessions?.length ?? 0;
        return ok(`${count} DJ sessions`, r.data, r.status);
      }
    },
    {
      id: 'dj-sessions-current', name: 'GET /dj-sessions/current', category: 'interactive', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/dj-sessions/current');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok(r.data?.session ? `Active: ${r.data.session.title}` : 'No active session', r.data, r.status);
      }
    },
    {
      id: 'song-requests', name: 'GET /song-requests', category: 'interactive', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/song-requests');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.requests?.length ?? 0;
        return ok(`${count} song requests`, r.data, r.status);
      }
    },
    {
      id: 'song-requests-submit', name: 'POST /song-requests/submit', category: 'interactive', method: 'POST', authRequired: false,
      run: async () => {
        const r = await apiCall('/song-requests/submit', {
          method: 'POST',
          body: { song_title: '__TEST_REQUEST__', artist: 'Test', requester_name: 'SystemTest' }
        });
        if (!r.ok) return fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        return ok('Song request submitted', r.data, r.status);
      }
    },
    {
      id: 'song-requests-stats', name: 'GET /song-requests/stats', category: 'interactive', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/song-requests/stats');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('Stats retrieved', r.data, r.status);
      }
    },
    {
      id: 'shoutouts', name: 'GET /shoutouts', category: 'interactive', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/shoutouts');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.shoutouts?.length ?? 0;
        return ok(`${count} shoutouts`, r.data, r.status);
      }
    },
    {
      id: 'shoutouts-submit', name: 'POST /shoutouts/submit', category: 'interactive', method: 'POST', authRequired: false,
      run: async () => {
        const r = await apiCall('/shoutouts/submit', {
          method: 'POST',
          body: { from_name: 'SystemTest', to_name: 'Everyone', message: '__TEST_SHOUTOUT__' }
        });
        if (!r.ok) return fail(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
        return ok('Shoutout submitted', r.data, r.status);
      }
    },
    {
      id: 'shoutouts-stats', name: 'GET /shoutouts/stats', category: 'interactive', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/shoutouts/stats');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('Stats retrieved', r.data, r.status);
      }
    },
    {
      id: 'call-queue', name: 'GET /call-queue', category: 'interactive', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/call-queue');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.queue?.length ?? 0;
        return ok(`${count} calls in queue`, r.data, r.status);
      }
    },

    // ══════════════ CONTESTS ══════════════
    {
      id: 'contests-list', name: 'GET /contests', category: 'contests', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/contests');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.contests?.length ?? 0;
        return ok(`${count} contests`, r.data, r.status);
      }
    },
    {
      id: 'podcast-schedules', name: 'GET /podcast-schedules', category: 'contests', method: 'GET', authRequired: true,
      run: async () => {
        const r = await apiCall('/podcast-schedules', { auth: true });
        if (!r.ok) return r.status === 401 ? warn('Auth required') : fail(`HTTP ${r.status}`);
        const count = r.data?.schedules?.length ?? 0;
        return ok(`${count} podcast schedules`, r.data, r.status);
      }
    },

    // ══════════════ ANALYTICS ══════════════
    {
      id: 'analytics', name: 'GET /analytics', category: 'analytics', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/analytics');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('Analytics data received', r.data, r.status);
      }
    },
    {
      id: 'analytics-listeners', name: 'GET /analytics/listeners', category: 'analytics', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/analytics/listeners');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok(`Listener stats received`, r.data, r.status);
      }
    },
    {
      id: 'analytics-tracks', name: 'GET /analytics/tracks', category: 'analytics', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/analytics/tracks');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('Track stats received', r.data, r.status);
      }
    },
    {
      id: 'analytics-shows', name: 'GET /analytics/shows', category: 'analytics', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/analytics/shows');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('Show stats received', r.data, r.status);
      }
    },
    {
      id: 'analytics-active', name: 'GET /analytics/active-listeners', category: 'analytics', method: 'GET', authRequired: true,
      run: async () => {
        const r = await apiCall('/analytics/active-listeners', { auth: true });
        if (!r.ok) return r.status === 401 ? warn('Auth required') : fail(`HTTP ${r.status}`);
        const count = r.data?.activeListeners?.length ?? r.data?.listeners?.length ?? 0;
        return ok(`${count} active listeners`, r.data, r.status);
      }
    },
    {
      id: 'analytics-usage', name: 'GET /analytics/usage', category: 'analytics', method: 'GET', authRequired: true,
      run: async () => {
        const r = await apiCall('/analytics/usage', { auth: true });
        if (!r.ok) return r.status === 401 ? warn('Auth required') : fail(`HTTP ${r.status}`);
        return ok('Usage stats received', r.data, r.status);
      }
    },
    {
      id: 'donations', name: 'GET /donations', category: 'analytics', method: 'GET', authRequired: true,
      run: async () => {
        const r = await apiCall('/donations', { auth: true });
        if (!r.ok) return r.status === 401 ? warn('Auth required') : fail(`HTTP ${r.status}`);
        const count = r.data?.donations?.length ?? 0;
        return ok(`${count} donations`, r.data, r.status);
      }
    },
    {
      id: 'donations-stats', name: 'GET /donations/stats', category: 'analytics', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/donations/stats');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('Donation stats received', r.data, r.status);
      }
    },

    // ══════════════ SETTINGS ══════════════
    {
      id: 'settings-stream', name: 'GET /settings/stream', category: 'settings', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/settings/stream');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('Stream settings loaded', r.data, r.status);
      }
    },
    {
      id: 'icecast-status', name: 'GET /icecast/status', category: 'settings', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/icecast/status');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('Icecast status received', r.data, r.status);
      }
    },

    // ══════════════ NEWS INJECTION & ANNOUNCEMENTS ══════════════
    {
      id: 'ni-stats', name: 'GET /news-injection/stats', category: 'announcements', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/news-injection/stats');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('News injection stats received', r.data, r.status);
      }
    },
    {
      id: 'ni-voiceovers', name: 'GET /news-injection/news-voiceovers', category: 'announcements', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/news-injection/news-voiceovers');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.voiceovers?.length ?? 0;
        return ok(`${count} voiceovers`, r.data, r.status);
      }
    },
    {
      id: 'ni-rules', name: 'GET /news-injection/injection-rules', category: 'announcements', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/news-injection/injection-rules');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.rules?.length ?? 0;
        return ok(`${count} injection rules`, r.data, r.status);
      }
    },
    {
      id: 'ni-queue', name: 'GET /news-injection/queue', category: 'announcements', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/news-injection/queue');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.queue?.length ?? 0;
        return ok(`${count} queued injections`, r.data, r.status);
      }
    },
    {
      id: 'ann-list', name: 'GET /announcements', category: 'announcements', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/announcements');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        const count = r.data?.announcements?.length ?? 0;
        return ok(`${count} announcements`, r.data, r.status);
      }
    },
    {
      id: 'ann-stats', name: 'GET /announcements/stats', category: 'announcements', method: 'GET', authRequired: false,
      run: async () => {
        const r = await apiCall('/announcements/stats');
        if (!r.ok) return fail(`HTTP ${r.status}`);
        return ok('Announcement stats received', r.data, r.status);
      }
    },
  ];
}

// ─── Component ───────────────────────────────────────────────────────────
// Pre-compute test metadata for badge rendering (avoids calling buildTests() in render)
const TEST_META = (() => {
  const map = new Map<string, { method: string; authRequired: boolean }>();
  for (const t of buildTests()) {
    map.set(t.id, { method: t.method, authRequired: t.authRequired });
  }
  return map;
})();
const TOTAL_TESTS = TEST_META.size;

export function SystemTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDetail, setSelectedDetail] = useState<TestResult | null>(null);
  const abortRef = useRef(false);
  const testsRef = useRef<TestDef[]>([]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const expandAll = () => setExpandedCategories(new Set(Object.keys(CATEGORIES)));
  const collapseAll = () => setExpandedCategories(new Set());

  const runAllTests = useCallback(async () => {
    abortRef.current = false;
    setTesting(true);
    setResults([]);
    setSelectedDetail(null);

    const tests = buildTests();
    testsRef.current = tests;

    // Expand all categories
    setExpandedCategories(new Set(Object.keys(CATEGORIES)));

    const allResults: TestResult[] = tests.map(t => ({
      id: t.id, name: t.name, category: t.category, status: 'pending' as const
    }));
    setResults([...allResults]);

    for (let i = 0; i < tests.length; i++) {
      if (abortRef.current) {
        for (let j = i; j < tests.length; j++) {
          allResults[j] = { ...allResults[j], status: 'skipped', message: 'Aborted by user' };
        }
        setResults([...allResults]);
        break;
      }

      const test = tests[i];
      allResults[i] = { ...allResults[i], status: 'running' };
      setResults([...allResults]);

      const start = Date.now();
      try {
        const result = await test.run();
        allResults[i] = {
          ...allResults[i],
          status: result.warning ? 'warning' : result.ok ? 'success' : 'error',
          message: result.message,
          duration: Date.now() - start,
          responseData: result.data,
          httpStatus: result.httpStatus,
        };
      } catch (err: any) {
        allResults[i] = {
          ...allResults[i],
          status: 'error',
          message: err?.name === 'AbortError' ? 'Timeout (20s)' : (err?.message || 'Unknown error'),
          duration: Date.now() - start,
        };
      }
      setResults([...allResults]);
    }

    setTesting(false);

    const success = allResults.filter(r => r.status === 'success').length;
    const warnings = allResults.filter(r => r.status === 'warning').length;
    const errors = allResults.filter(r => r.status === 'error').length;
    const skipped = allResults.filter(r => r.status === 'skipped').length;

    if (errors === 0) {
      toast.success(`All ${success} tests passed! ${warnings > 0 ? `(${warnings} warnings)` : ''}`);
    } else {
      toast.error(`${errors} failed, ${success} passed, ${warnings} warnings`);
    }
  }, []);

  const runCategory = useCallback(async (category: string) => {
    abortRef.current = false;
    setTesting(true);

    const tests = buildTests();
    testsRef.current = tests;
    const catTests = tests.filter(t => t.category === category);
    
    setExpandedCategories(prev => new Set([...prev, category]));

    // Preserve existing results for other categories, reset this one
    setResults(prev => {
      const other = prev.filter(r => r.category !== category);
      const catResults = catTests.map(t => ({
        id: t.id, name: t.name, category: t.category, status: 'pending' as const
      }));
      return [...other, ...catResults];
    });

    for (let i = 0; i < catTests.length; i++) {
      if (abortRef.current) break;
      const test = catTests[i];

      setResults(prev => prev.map(r => r.id === test.id ? { ...r, status: 'running' as const } : r));

      const start = Date.now();
      try {
        const result = await test.run();
        setResults(prev => prev.map(r => r.id === test.id ? {
          ...r,
          status: (result.warning ? 'warning' : result.ok ? 'success' : 'error') as any,
          message: result.message,
          duration: Date.now() - start,
          responseData: result.data,
          httpStatus: result.httpStatus,
        } : r));
      } catch (err: any) {
        setResults(prev => prev.map(r => r.id === test.id ? {
          ...r,
          status: 'error' as const,
          message: err?.name === 'AbortError' ? 'Timeout' : (err?.message || 'Unknown'),
          duration: Date.now() - start,
        } : r));
      }
    }
    setTesting(false);
  }, []);

  const stopTests = () => { abortRef.current = true; };

  // ─── Stats ────────────────────────────────────────────────────────────
  const total = results.length;
  const success = results.filter(r => r.status === 'success').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  const errors = results.filter(r => r.status === 'error').length;
  const running = results.filter(r => r.status === 'running').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  // Group results by category
  const categoryOrder = Object.keys(CATEGORIES);
  const groupedResults = categoryOrder.map(cat => ({
    category: cat,
    ...CATEGORIES[cat],
    results: results.filter(r => r.category === cat),
  })).filter(g => g.results.length > 0 || !testing);

  const filteredGrouped = groupedResults.map(g => ({
    ...g,
    results: filterStatus === 'all' ? g.results : g.results.filter(r => r.status === filterStatus),
  }));

  const statusColor = (s: string) => {
    switch (s) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'running': return 'text-blue-400';
      case 'skipped': return 'text-gray-500';
      default: return 'text-gray-600';
    }
  };

  const statusBg = (s: string) => {
    switch (s) {
      case 'success': return 'bg-green-500/15 border-green-500/30';
      case 'warning': return 'bg-yellow-500/15 border-yellow-500/30';
      case 'error': return 'bg-red-500/15 border-red-500/30';
      case 'running': return 'bg-blue-500/15 border-blue-500/30';
      default: return 'bg-white/5 border-white/10';
    }
  };

  const methodBadge = (m: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-emerald-500/20 text-emerald-400',
      POST: 'bg-blue-500/20 text-blue-400',
      PUT: 'bg-orange-500/20 text-orange-400',
      DELETE: 'bg-red-500/20 text-red-400',
    };
    return colors[m] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <AdminLayout>
      <div className="space-y-4 pb-8 max-w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <TestTube className="w-7 h-7 text-[#00d9ff]" />
              Full System Test Suite
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Tests all {TOTAL_TESTS} backend endpoints: CRUD cycles, auth, radio, interactive, analytics
            </p>
          </div>

          <div className="flex items-center gap-2">
            {testing && (
              <Button onClick={stopTests} variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                <Square className="w-4 h-4 mr-1" /> Stop
              </Button>
            )}
            <Button
              onClick={runAllTests}
              disabled={testing}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black font-semibold"
            >
              {testing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running... ({running}/{total})</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Run All Tests</>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Stats Bar */}
        {total > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap items-center gap-3 bg-[#141414] border border-gray-800 rounded-lg px-4 py-3"
          >
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <span className="text-gray-400">Total: <span className="text-white font-semibold">{total}</span></span>
              <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{success}</span>
              <span className="text-yellow-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{warnings}</span>
              <span className="text-red-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{errors}</span>
              {skipped > 0 && <span className="text-gray-500">Skipped: {skipped}</span>}
            </div>

            {/* Progress bar */}
            <div className="flex-1 min-w-[120px]">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
                {success > 0 && <div className="bg-green-500 transition-all" style={{ width: `${(success / total) * 100}%` }} />}
                {warnings > 0 && <div className="bg-yellow-500 transition-all" style={{ width: `${(warnings / total) * 100}%` }} />}
                {errors > 0 && <div className="bg-red-500 transition-all" style={{ width: `${(errors / total) * 100}%` }} />}
                {running > 0 && <div className="bg-blue-500 animate-pulse transition-all" style={{ width: `${(running / total) * 100}%` }} />}
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              {['all', 'success', 'warning', 'error'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    filterStatus === s
                      ? 'bg-[#00d9ff]/20 text-[#00d9ff]'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <button onClick={expandAll} className="text-xs text-gray-500 hover:text-gray-300 px-1">Expand all</button>
              <span className="text-gray-700">|</span>
              <button onClick={collapseAll} className="text-xs text-gray-500 hover:text-gray-300 px-1">Collapse</button>
            </div>
          </motion.div>
        )}

        {/* Results by Category */}
        {total > 0 && <div className="space-y-2">
          {filteredGrouped.map((group) => {
            const catConf = CATEGORIES[group.category];
            if (!catConf) return null;
            const Icon = catConf.icon;
            const isExpanded = expandedCategories.has(group.category);
            const catSuccess = group.results.filter(r => r.status === 'success').length;
            const catWarnings = group.results.filter(r => r.status === 'warning').length;
            const catErrors = group.results.filter(r => r.status === 'error').length;
            const catTotal = group.results.length;

            return (
              <div key={group.category} className="bg-[#141414] border border-gray-800 rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(group.category)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${catConf.color}20` }}>
                    <Icon className="w-4 h-4" style={{ color: catConf.color }} />
                  </div>
                  <span className="font-medium text-white text-sm flex-1 text-left">{catConf.label}</span>
                  
                  {catTotal > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      {catSuccess > 0 && <span className="text-green-400">{catSuccess} ok</span>}
                      {catWarnings > 0 && <span className="text-yellow-400">{catWarnings} warn</span>}
                      {catErrors > 0 && <span className="text-red-400">{catErrors} fail</span>}
                    </div>
                  )}

                  {!testing && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); runCategory(group.category); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); runCategory(group.category); } }}
                      className="text-xs text-[#00d9ff] hover:text-[#00ffaa] px-2 py-1 rounded hover:bg-white/5 cursor-pointer"
                    >
                      Run
                    </span>
                  )}

                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                </button>

                {/* Tests */}
                <AnimatePresence>
                  {isExpanded && group.results.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-gray-800 divide-y divide-gray-800/50">
                        {group.results.map((result) => (
                          <div
                            key={result.id}
                            className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer transition-colors ${statusBg(result.status)} border-l-2`}
                            onClick={() => setSelectedDetail(selectedDetail?.id === result.id ? null : result)}
                          >
                            {/* Status icon */}
                            <div className="w-5 flex-shrink-0">
                              {result.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                              {result.status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                              {result.status === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                              {result.status === 'running' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                              {result.status === 'pending' && <div className="w-4 h-4 rounded-full border border-gray-600" />}
                              {result.status === 'skipped' && <div className="w-4 h-4 rounded-full bg-gray-700" />}
                            </div>

                            {/* Method badge */}
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${methodBadge(
                              TEST_META.get(result.id)?.method || 'GET'
                            )}`}>
                              {TEST_META.get(result.id)?.method || 'GET'}
                            </span>

                            {/* Name */}
                            <span className="text-sm text-gray-300 flex-1 truncate font-mono">{result.name}</span>

                            {/* Auth badge */}
                            {TEST_META.get(result.id)?.authRequired && (
                              <Shield className="w-3 h-3 text-yellow-500/60 flex-shrink-0" />
                            )}

                            {/* Message */}
                            {result.message && (
                              <span className={`text-xs truncate max-w-[250px] ${statusColor(result.status)}`}>
                                {result.message}
                              </span>
                            )}

                            {/* Duration */}
                            {result.duration !== undefined && (
                              <span className="text-[10px] text-gray-600 flex-shrink-0 font-mono">
                                {result.duration}ms
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>}

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedDetail && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-[#0d0d0d] border border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white font-mono">{selectedDetail.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={statusColor(selectedDetail.status)}>
                    {selectedDetail.status} {selectedDetail.httpStatus ? `(${selectedDetail.httpStatus})` : ''}
                  </Badge>
                  {selectedDetail.responseData && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(selectedDetail.responseData, null, 2));
                        toast.success('Copied to clipboard');
                      }}
                      className="text-gray-500 hover:text-gray-300"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => setSelectedDetail(null)} className="text-gray-500 hover:text-white">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {selectedDetail.message && (
                <p className={`text-sm mb-2 ${statusColor(selectedDetail.status)}`}>{selectedDetail.message}</p>
              )}
              {selectedDetail.responseData && (
                <pre className="text-xs text-gray-400 bg-black/50 rounded p-3 overflow-auto max-h-[300px] font-mono">
                  {JSON.stringify(selectedDetail.responseData, null, 2)}
                </pre>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {total === 0 && !testing && (
          <div className="text-center py-16 text-gray-400">
            <TestTube className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="text-lg">No tests run yet</p>
            <p className="text-sm mt-1">Click "Run All Tests" to start the comprehensive system check</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
