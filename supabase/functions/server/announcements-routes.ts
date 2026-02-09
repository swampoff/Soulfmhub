/**
 * Soul FM - Content Announcements API Routes
 * Uses KV store instead of direct table queries.
 */

import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import {
  getWeatherData,
  generateWeatherScript,
  generateTimeAnnouncement,
  generateTrafficScript,
  generateStationId,
  generatePromoScript,
  generateAnnouncementAudio,
  autoGenerateWeatherAnnouncement,
  autoGenerateTimeAnnouncement,
  autoGenerateStationId,
  getNextAnnouncement
} from './content-announcements.ts';

export const announcementsRoutes = new Hono();

const weatherApiKey = Deno.env.get('OPENWEATHER_API_KEY') || '';
const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY') || '';

// ==================== WEATHER ====================

announcementsRoutes.get('/weather/current', async (c) => {
  try {
    const location = c.req.query('location') || 'Miami';
    const weather = await getWeatherData(location, weatherApiKey);
    return c.json({ success: true, weather });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

announcementsRoutes.post('/weather/generate', async (c) => {
  try {
    const { location, voiceId, voiceName } = await c.req.json();

    if (!location || !voiceId || !voiceName) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const announcement = await autoGenerateWeatherAnnouncement(
      location, voiceId, voiceName, weatherApiKey, elevenLabsApiKey
    );

    return c.json({ success: true, announcement });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== TIME ====================

announcementsRoutes.get('/time/current', async (c) => {
  try {
    const timeInfo = generateTimeAnnouncement();
    return c.json({ success: true, time: timeInfo });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

announcementsRoutes.post('/time/generate', async (c) => {
  try {
    const { voiceId, voiceName } = await c.req.json();

    if (!voiceId || !voiceName) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const announcement = await autoGenerateTimeAnnouncement(
      voiceId, voiceName, elevenLabsApiKey
    );

    return c.json({ success: true, announcement });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== STATION ID ====================

announcementsRoutes.post('/station-id/generate', async (c) => {
  try {
    const { voiceId, voiceName } = await c.req.json();

    if (!voiceId || !voiceName) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const announcement = await autoGenerateStationId(
      voiceId, voiceName, elevenLabsApiKey
    );

    return c.json({ success: true, announcement });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== TRAFFIC ====================

announcementsRoutes.post('/traffic/generate', async (c) => {
  try {
    const { location, voiceId, voiceName } = await c.req.json();

    if (!location || !voiceId || !voiceName) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const script = generateTrafficScript(location);

    let audioUrl, duration;
    if (elevenLabsApiKey) {
      const audio = await generateAnnouncementAudio(script, voiceId, elevenLabsApiKey);
      audioUrl = audio.audioUrl;
      duration = audio.duration;
    }

    const announcementId = crypto.randomUUID();
    const announcement = {
      id: announcementId,
      type: 'traffic',
      content: script,
      audio_url: audioUrl,
      voice_id: voiceId,
      voice_name: voiceName,
      duration,
      is_active: true,
      created_at: new Date().toISOString()
    };

    await kv.set(`announcement:${announcementId}`, announcement);

    return c.json({ success: true, announcement });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== PROMO ====================

announcementsRoutes.post('/promo/generate', async (c) => {
  try {
    const { eventName, date, details, voiceId, voiceName } = await c.req.json();

    if (!eventName || !date || !details || !voiceId || !voiceName) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const script = generatePromoScript(eventName, date, details);

    let audioUrl, duration;
    if (elevenLabsApiKey) {
      const audio = await generateAnnouncementAudio(script, voiceId, elevenLabsApiKey);
      audioUrl = audio.audioUrl;
      duration = audio.duration;
    }

    const announcementId = crypto.randomUUID();
    const announcement = {
      id: announcementId,
      type: 'promo',
      content: script,
      audio_url: audioUrl,
      voice_id: voiceId,
      voice_name: voiceName,
      duration,
      is_active: true,
      created_at: new Date().toISOString()
    };

    await kv.set(`announcement:${announcementId}`, announcement);

    return c.json({ success: true, announcement });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== GET ALL ANNOUNCEMENTS ====================

announcementsRoutes.get('/', async (c) => {
  try {
    const type = c.req.query('type');
    let allAnnouncements = await kv.getByPrefix('announcement:');

    if (type) {
      allAnnouncements = allAnnouncements.filter((a: any) => a.type === type);
    }

    const announcements = allAnnouncements
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return c.json({ success: true, announcements });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== GET NEXT ANNOUNCEMENT (for Auto-DJ) ====================

announcementsRoutes.get('/next', async (c) => {
  try {
    const type = c.req.query('type') as any;
    const announcement = await getNextAnnouncement(type);

    return c.json({ success: true, announcement });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== UPDATE ANNOUNCEMENT ====================

announcementsRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const announcement = await kv.get(`announcement:${id}`);
    if (!announcement) {
      return c.json({ success: false, error: 'Announcement not found' }, 404);
    }

    const updated = { ...announcement, ...body, updated_at: new Date().toISOString() };
    await kv.set(`announcement:${id}`, updated);

    return c.json({ success: true, announcement: updated });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== DELETE ANNOUNCEMENT ====================

announcementsRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`announcement:${id}`);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== STATS ====================

announcementsRoutes.get('/stats', async (c) => {
  try {
    const allAnnouncements = await kv.getByPrefix('announcement:');

    const stats = {
      total: allAnnouncements.length,
      active: allAnnouncements.filter((a: any) => a.is_active).length,
      byType: {
        weather: allAnnouncements.filter((a: any) => a.type === 'weather').length,
        time: allAnnouncements.filter((a: any) => a.type === 'time').length,
        traffic: allAnnouncements.filter((a: any) => a.type === 'traffic').length,
        station_id: allAnnouncements.filter((a: any) => a.type === 'station_id').length,
        promo: allAnnouncements.filter((a: any) => a.type === 'promo').length
      }
    };

    return c.json({ success: true, stats });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== BATCH GENERATE ====================

announcementsRoutes.post('/batch-generate', async (c) => {
  try {
    const { types, location, voiceId, voiceName } = await c.req.json();

    if (!types || !Array.isArray(types) || !voiceId || !voiceName) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const results = [];

    for (const type of types) {
      try {
        let announcement;

        switch (type) {
          case 'weather':
            announcement = await autoGenerateWeatherAnnouncement(
              location || 'Miami', voiceId, voiceName, weatherApiKey, elevenLabsApiKey
            );
            break;
          case 'time':
            announcement = await autoGenerateTimeAnnouncement(
              voiceId, voiceName, elevenLabsApiKey
            );
            break;
          case 'station_id':
            announcement = await autoGenerateStationId(
              voiceId, voiceName, elevenLabsApiKey
            );
            break;
        }

        if (announcement) {
          results.push({ type, success: true, announcement });
        }
      } catch (error: any) {
        results.push({ type, success: false, error: error.message });
      }
    }

    return c.json({ success: true, results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
