/**
 * Soul FM - Content Announcements API Routes
 */

import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';
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

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
      location,
      voiceId,
      voiceName,
      weatherApiKey,
      elevenLabsApiKey
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
      voiceId,
      voiceName,
      elevenLabsApiKey
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
      voiceId,
      voiceName,
      elevenLabsApiKey
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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('content_announcements_06086aa3')
      .insert({
        type: 'traffic',
        content: script,
        audio_url: audioUrl,
        voice_id: voiceId,
        voice_name: voiceName,
        duration: duration,
        is_active: true
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return c.json({ success: true, announcement: data });
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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('content_announcements_06086aa3')
      .insert({
        type: 'promo',
        content: script,
        audio_url: audioUrl,
        voice_id: voiceId,
        voice_name: voiceName,
        duration: duration,
        is_active: true
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return c.json({ success: true, announcement: data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== GET ALL ANNOUNCEMENTS ====================

announcementsRoutes.get('/', async (c) => {
  try {
    const type = c.req.query('type');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let query = supabase
      .from('content_announcements_06086aa3')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return c.json({ success: true, announcements: data || [] });
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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('content_announcements_06086aa3')
      .update(body)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return c.json({ success: true, announcement: data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== DELETE ANNOUNCEMENT ====================

announcementsRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase
      .from('content_announcements_06086aa3')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== STATS ====================

announcementsRoutes.get('/stats', async (c) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('content_announcements_06086aa3')
      .select('type, is_active');
    
    if (error) throw error;
    
    const stats = {
      total: data?.length || 0,
      active: data?.filter(a => a.is_active).length || 0,
      byType: {
        weather: data?.filter(a => a.type === 'weather').length || 0,
        time: data?.filter(a => a.type === 'time').length || 0,
        traffic: data?.filter(a => a.type === 'traffic').length || 0,
        station_id: data?.filter(a => a.type === 'station_id').length || 0,
        promo: data?.filter(a => a.type === 'promo').length || 0
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
              location || 'Miami',
              voiceId,
              voiceName,
              weatherApiKey,
              elevenLabsApiKey
            );
            break;
          case 'time':
            announcement = await autoGenerateTimeAnnouncement(
              voiceId,
              voiceName,
              elevenLabsApiKey
            );
            break;
          case 'station_id':
            announcement = await autoGenerateStationId(
              voiceId,
              voiceName,
              elevenLabsApiKey
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
