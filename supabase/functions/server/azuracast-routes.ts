// ==================== AZURACAST INTEGRATION ====================
// AzuraCast REST API proxy for Soul FM Hub
// Provides now-playing, listeners, history, queue, station status

import { Hono } from "npm:hono@4";
import * as kv from "./kv_store.tsx";

const AZURACAST_CONFIG_KEY = 'azuracast:config';

export interface AzuraCastConfig {
  enabled: boolean;
  baseUrl: string;           // e.g. http://187.77.85.42
  stationId: number;         // e.g. 1
  stationShortName: string;  // e.g. soul_fm_
  streamUrlHttps: string;    // e.g. https://stream.soul-fm.com/soulfm
  streamUrlHttp: string;     // e.g. http://187.77.85.42:8000/soulfm
  updatedAt?: string;
}

export function getDefaultAzuraCastConfig(): AzuraCastConfig {
  return {
    enabled: false,
    baseUrl: '',
    stationId: 1,
    stationShortName: '',
    streamUrlHttps: '',
    streamUrlHttp: '',
  };
}

// ── API helper ──────────────────────────────────────────────────
async function azuraFetch(path: string, config: AzuraCastConfig, options?: { timeout?: number; requireAuth?: boolean }): Promise<any> {
  const apiKey = Deno.env.get('AZURACAST_API_KEY') || '';
  const url = `${config.baseUrl.replace(/\/$/, '')}/api${path}`;
  const timeoutMs = options?.timeout ?? 10000;

  console.log(`[AzuraCast] Fetching: ${url}`);

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (apiKey && options?.requireAuth !== false) {
      headers['X-API-Key'] = apiKey;
    }

    const resp = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(tid);

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`HTTP ${resp.status}: ${body.slice(0, 200)}`);
    }
    return await resp.json();
  } catch (e: any) {
    clearTimeout(tid);
    throw e;
  }
}

async function azuraPost(path: string, config: AzuraCastConfig, body?: any): Promise<any> {
  const apiKey = Deno.env.get('AZURACAST_API_KEY') || '';
  const url = `${config.baseUrl.replace(/\/$/, '')}/api${path}`;

  console.log(`[AzuraCast] POST: ${url}`);

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 15000);

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (apiKey) headers['X-API-Key'] = apiKey;

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(tid);

    if (!resp.ok) {
      const respBody = await resp.text().catch(() => '');
      throw new Error(`HTTP ${resp.status}: ${respBody.slice(0, 200)}`);
    }
    // Some AzuraCast endpoints return empty body on success
    const text = await resp.text();
    return text ? JSON.parse(text) : { success: true };
  } catch (e: any) {
    clearTimeout(tid);
    throw e;
  }
}

// ── Helper: get config from KV ──────────────────────────────────
export async function getAzuraCastConfig(): Promise<AzuraCastConfig | null> {
  try {
    return await kv.get(AZURACAST_CONFIG_KEY);
  } catch {
    return null;
  }
}

// ── Setup routes ────────────────────────────────────────────────
export function setupAzuraCastRoutes(app: any, requireAuth: any) {
  const PREFIX = '/make-server-06086aa3/azuracast';

  // GET config (admin)
  app.get(`${PREFIX}/config`, requireAuth, async (c: any) => {
    try {
      const config = await kv.get(AZURACAST_CONFIG_KEY);
      return c.json({ config: config || getDefaultAzuraCastConfig() });
    } catch (error: any) {
      console.error('[AzuraCast] Get config error:', error);
      return c.json({ error: `Failed to get AzuraCast config: ${error.message}` }, 500);
    }
  });

  // POST save config (admin)
  app.post(`${PREFIX}/config`, requireAuth, async (c: any) => {
    try {
      const body = await c.req.json();
      const existing: AzuraCastConfig | null = await kv.get(AZURACAST_CONFIG_KEY);

      const config: AzuraCastConfig = {
        enabled: body.enabled ?? existing?.enabled ?? false,
        baseUrl: body.baseUrl ?? existing?.baseUrl ?? '',
        stationId: body.stationId ?? existing?.stationId ?? 1,
        stationShortName: body.stationShortName ?? existing?.stationShortName ?? '',
        streamUrlHttps: body.streamUrlHttps ?? existing?.streamUrlHttps ?? '',
        streamUrlHttp: body.streamUrlHttp ?? existing?.streamUrlHttp ?? '',
        updatedAt: new Date().toISOString(),
      };

      await kv.set(AZURACAST_CONFIG_KEY, config);
      console.log(`[AzuraCast] Config saved — enabled: ${config.enabled}, baseUrl: ${config.baseUrl}, station: ${config.stationId}`);
      return c.json({ success: true, config });
    } catch (error: any) {
      console.error('[AzuraCast] Save config error:', error);
      return c.json({ error: `Failed to save AzuraCast config: ${error.message}` }, 500);
    }
  });

  // GET now playing (public — no auth required)
  app.get(`${PREFIX}/nowplaying`, async (c: any) => {
    try {
      const config = await getAzuraCastConfig();
      if (!config?.enabled || !config.baseUrl) {
        return c.json({ error: 'AzuraCast not configured', enabled: false });
      }

      const data = await azuraFetch(`/nowplaying/${config.stationId}`, config, { requireAuth: false });

      // Cache it
      await kv.set('azuracast:nowplaying-cache', {
        ...data,
        cachedAt: new Date().toISOString(),
      }).catch(() => {});

      return c.json(data);
    } catch (error: any) {
      console.error('[AzuraCast] Now playing error:', error);
      // Try cache
      const cached = await kv.get('azuracast:nowplaying-cache').catch(() => null);
      if (cached) return c.json({ ...cached, fromCache: true });
      return c.json({ error: `Now playing error: ${error.message}` }, 500);
    }
  });

  // GET station status (public)
  app.get(`${PREFIX}/status`, async (c: any) => {
    try {
      const config = await getAzuraCastConfig();
      if (!config?.enabled || !config.baseUrl) {
        return c.json({
          status: 'not_configured',
          configured: false,
          message: 'AzuraCast is not configured',
        });
      }

      // Use nowplaying endpoint — it gives us everything
      const np = await azuraFetch(`/nowplaying/${config.stationId}`, config, { requireAuth: false, timeout: 8000 });

      const station = np?.station || {};
      const live = np?.live || {};
      const listeners = np?.listeners || {};
      const nowPlaying = np?.now_playing || {};
      const playingNext = np?.playing_next || {};

      const result = {
        status: station.is_public !== false ? 'online' : 'offline',
        configured: true,
        station: {
          id: station.id,
          name: station.name,
          shortcode: station.shortcode,
          description: station.description,
          frontend: station.frontend,
          backend: station.backend,
          listenUrl: station.listen_url,
          publicUrl: station.public_player_url,
          isPublic: station.is_public,
        },
        live: {
          isLive: live.is_live,
          streamerName: live.streamer_name,
          broadcastStart: live.broadcast_start,
        },
        listeners: {
          total: listeners.total ?? 0,
          unique: listeners.unique ?? 0,
          current: listeners.current ?? 0,
        },
        nowPlaying: nowPlaying?.song ? {
          title: nowPlaying.song.title,
          artist: nowPlaying.song.artist,
          album: nowPlaying.song.album,
          art: nowPlaying.song.art,
          duration: nowPlaying.duration,
          elapsed: nowPlaying.elapsed,
          remaining: nowPlaying.remaining,
          playlist: nowPlaying.playlist,
          streamer: nowPlaying.streamer,
        } : null,
        playingNext: playingNext?.song ? {
          title: playingNext.song.title,
          artist: playingNext.song.artist,
          art: playingNext.song.art,
        } : null,
        streamUrls: {
          https: config.streamUrlHttps,
          http: config.streamUrlHttp,
        },
      };

      await kv.set('azuracast:status-cache', { ...result, cachedAt: new Date().toISOString() }).catch(() => {});
      return c.json(result);
    } catch (error: any) {
      console.error('[AzuraCast] Status error:', error);
      const cached = await kv.get('azuracast:status-cache').catch(() => null);
      if (cached) return c.json({ ...cached, status: 'unreachable', error: error.message });
      return c.json({ status: 'unreachable', configured: true, error: error.message }, 500);
    }
  });

  // GET listeners (admin — requires API key)
  app.get(`${PREFIX}/listeners`, requireAuth, async (c: any) => {
    try {
      const config = await getAzuraCastConfig();
      if (!config?.enabled || !config.baseUrl) {
        return c.json({ listeners: [], total: 0 });
      }

      const data = await azuraFetch(`/station/${config.stationId}/listeners`, config, { requireAuth: true });

      // data is an array of listener objects
      const listeners = Array.isArray(data) ? data : [];
      return c.json({
        listeners: listeners.map((l: any) => ({
          ip: l.ip,
          userAgent: l.user_agent,
          connectedSeconds: l.connected_seconds,
          connectedTime: l.connected_time,
          location: l.location ? {
            city: l.location.city,
            region: l.location.region,
            country: l.location.country,
            lat: l.location.lat,
            lon: l.location.lon,
          } : null,
          mountName: l.mount_name,
          mountIsDefault: l.mount_is_default,
        })),
        total: listeners.length,
      });
    } catch (error: any) {
      console.error('[AzuraCast] Listeners error:', error);
      return c.json({ error: `Listeners error: ${error.message}`, listeners: [], total: 0 }, 500);
    }
  });

  // GET song history (public)
  app.get(`${PREFIX}/history`, async (c: any) => {
    try {
      const config = await getAzuraCastConfig();
      if (!config?.enabled || !config.baseUrl) {
        return c.json({ history: [] });
      }

      const data = await azuraFetch(`/station/${config.stationId}/history`, config, { requireAuth: false });

      const history = Array.isArray(data) ? data : [];
      return c.json({
        history: history.slice(0, 50).map((h: any) => ({
          id: h.sh_id,
          playedAt: h.played_at,
          duration: h.duration,
          playlist: h.playlist,
          streamer: h.streamer,
          isRequest: h.is_request,
          song: h.song ? {
            title: h.song.title,
            artist: h.song.artist,
            album: h.song.album,
            genre: h.song.genre,
            art: h.song.art,
            customFields: h.song.custom_fields,
          } : null,
        })),
      });
    } catch (error: any) {
      console.error('[AzuraCast] History error:', error);
      return c.json({ error: `History error: ${error.message}`, history: [] }, 500);
    }
  });

  // GET upcoming queue (admin)
  app.get(`${PREFIX}/queue`, requireAuth, async (c: any) => {
    try {
      const config = await getAzuraCastConfig();
      if (!config?.enabled || !config.baseUrl) {
        return c.json({ queue: [] });
      }

      const data = await azuraFetch(`/station/${config.stationId}/queue`, config, { requireAuth: true });

      const queue = Array.isArray(data) ? data : [];
      return c.json({
        queue: queue.map((q: any) => ({
          cuedAt: q.cued_at,
          playedAt: q.played_at,
          duration: q.duration,
          playlist: q.playlist,
          isRequest: q.is_request,
          song: q.song ? {
            title: q.song.title,
            artist: q.song.artist,
            album: q.song.album,
            art: q.song.art,
          } : null,
        })),
      });
    } catch (error: any) {
      console.error('[AzuraCast] Queue error:', error);
      return c.json({ error: `Queue error: ${error.message}`, queue: [] }, 500);
    }
  });

  // GET station info (admin)
  app.get(`${PREFIX}/station`, requireAuth, async (c: any) => {
    try {
      const config = await getAzuraCastConfig();
      if (!config?.enabled || !config.baseUrl) {
        return c.json({ error: 'AzuraCast not configured' });
      }

      const data = await azuraFetch(`/station/${config.stationId}`, config, { requireAuth: true });
      return c.json({ station: data });
    } catch (error: any) {
      console.error('[AzuraCast] Station info error:', error);
      return c.json({ error: `Station info error: ${error.message}` }, 500);
    }
  });

  // POST restart station (admin)
  app.post(`${PREFIX}/restart`, requireAuth, async (c: any) => {
    try {
      const config = await getAzuraCastConfig();
      if (!config?.enabled || !config.baseUrl) {
        return c.json({ error: 'AzuraCast not configured' }, 400);
      }

      // AzuraCast uses POST to /station/{id}/restart
      const apiKey = Deno.env.get('AZURACAST_API_KEY') || '';
      const url = `${config.baseUrl.replace(/\/$/, '')}/api/station/${config.stationId}/restart`;

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(`Restart failed: HTTP ${resp.status} — ${body.slice(0, 200)}`);
      }

      console.log('[AzuraCast] Station restart triggered');
      return c.json({ success: true, message: 'Station restart initiated' });
    } catch (error: any) {
      console.error('[AzuraCast] Restart error:', error);
      return c.json({ error: `Restart error: ${error.message}` }, 500);
    }
  });

  // POST test connection (admin)
  app.post(`${PREFIX}/test`, requireAuth, async (c: any) => {
    try {
      const config = await getAzuraCastConfig();
      if (!config?.enabled || !config.baseUrl) {
        return c.json({ success: false, error: 'AzuraCast not configured — save config first' }, 400);
      }

      // Test 1: Public API (no auth)
      let npData: any;
      try {
        npData = await azuraFetch(`/nowplaying/${config.stationId}`, config, { requireAuth: false, timeout: 8000 });
      } catch (e: any) {
        return c.json({
          success: false,
          error: `Cannot reach AzuraCast at ${config.baseUrl} — ${e?.message || e}`,
          step: 'nowplaying',
        });
      }

      // Test 2: Authenticated API
      let stationData: any;
      let authOk = false;
      try {
        stationData = await azuraFetch(`/station/${config.stationId}`, config, { requireAuth: true, timeout: 8000 });
        authOk = true;
      } catch (e: any) {
        console.warn('[AzuraCast] Auth test failed:', e?.message);
      }

      // Test 3: Check stream URL accessibility
      let streamOk = false;
      const streamUrl = config.streamUrlHttps || config.streamUrlHttp;
      if (streamUrl) {
        try {
          const sr = await fetch(streamUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000),
          });
          streamOk = sr.ok || sr.status === 200 || sr.status === 302;
        } catch {
          // Stream HEAD may fail for audio streams, try GET with range
          try {
            const sr2 = await fetch(streamUrl, {
              headers: { Range: 'bytes=0-0' },
              signal: AbortSignal.timeout(5000),
            });
            streamOk = sr2.status >= 200 && sr2.status < 400;
          } catch { /* stream not reachable */ }
        }
      }

      const station = npData?.station || {};
      const listeners = npData?.listeners || {};
      const np = npData?.now_playing || {};

      return c.json({
        success: true,
        station: {
          id: station.id,
          name: station.name,
          shortcode: station.shortcode,
          frontend: station.frontend,
          backend: station.backend,
        },
        nowPlaying: np?.song ? {
          title: np.song.title,
          artist: np.song.artist,
          art: np.song.art,
        } : null,
        listeners: {
          total: listeners.total ?? 0,
          unique: listeners.unique ?? 0,
        },
        authOk,
        streamOk,
        streamUrl: streamUrl || null,
        stationDetails: authOk && stationData ? {
          name: stationData.name,
          description: stationData.description,
          mounts: stationData.mounts?.map((m: any) => ({
            name: m.name,
            url: m.url,
            bitrate: m.bitrate,
            format: m.format,
            listeners: m.listeners?.total ?? 0,
            isDefault: m.is_default,
          })) || [],
        } : null,
      });
    } catch (error: any) {
      console.error('[AzuraCast] Test error:', error);
      return c.json({ success: false, error: `Test failed: ${error.message}` }, 500);
    }
  });

  // GET stream URL for the player (public)
  app.get(`${PREFIX}/stream-url`, async (c: any) => {
    try {
      const config = await getAzuraCastConfig();
      if (!config?.enabled) {
        return c.json({ enabled: false, url: null });
      }
      return c.json({
        enabled: true,
        url: config.streamUrlHttps || config.streamUrlHttp || null,
        httpsUrl: config.streamUrlHttps || null,
        httpUrl: config.streamUrlHttp || null,
      });
    } catch (error: any) {
      return c.json({ enabled: false, url: null, error: error.message }, 500);
    }
  });

  console.log('✅ AzuraCast routes registered');
}
