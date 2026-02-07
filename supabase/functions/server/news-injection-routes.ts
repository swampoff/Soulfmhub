/**
 * Soul FM - News Injection API Routes
 */

import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  generateNewsVoiceOver,
  calculateNextInjectionTimes,
  selectNewsForInjection,
  queueNewsForPlayback,
  getNextNewsToPlay,
  markNewsAsPlayed,
  scheduleNewsInjections,
  type InjectionRule
} from './news-injection.ts';

export const newsInjectionRoutes = new Hono();

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY') || '';

// ==================== GENERATE VOICE-OVER ====================

newsInjectionRoutes.post('/news-voiceovers/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { newsId, newsTitle, newsContent, voiceId, voiceName } = body;

    if (!newsId || !newsTitle || !newsContent || !voiceId || !voiceName) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    if (!elevenLabsApiKey) {
      return c.json({ success: false, error: 'ElevenLabs API key not configured' }, 500);
    }

    // Generate voice-over
    const { audioUrl, duration } = await generateNewsVoiceOver(
      newsId,
      newsTitle,
      newsContent,
      voiceId,
      voiceName,
      elevenLabsApiKey
    );

    // Save to database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('news_voice_overs_06086aa3')
      .insert({
        news_id: newsId,
        news_title: newsTitle,
        news_content: newsContent,
        audio_url: audioUrl,
        voice_id: voiceId,
        voice_name: voiceName,
        duration: duration,
        is_active: true,
        play_count: 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return c.json({
      success: true,
      voiceOver: data
    });
  } catch (error: any) {
    console.error('Error generating voice-over:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== GET ALL VOICE-OVERS ====================

newsInjectionRoutes.get('/news-voiceovers', async (c) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('news_voice_overs_06086aa3')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return c.json({ success: true, voiceOvers: data || [] });
  } catch (error: any) {
    console.error('Error fetching voice-overs:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== UPDATE VOICE-OVER ====================

newsInjectionRoutes.put('/news-voiceovers/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('news_voice_overs_06086aa3')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, voiceOver: data });
  } catch (error: any) {
    console.error('Error updating voice-over:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== DELETE VOICE-OVER ====================

newsInjectionRoutes.delete('/news-voiceovers/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error } = await supabase
      .from('news_voice_overs_06086aa3')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting voice-over:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== INJECTION RULES ====================

newsInjectionRoutes.get('/injection-rules', async (c) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('news_injection_rules_06086aa3')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return c.json({ success: true, rules: data || [] });
  } catch (error: any) {
    console.error('Error fetching injection rules:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

newsInjectionRoutes.post('/injection-rules', async (c) => {
  try {
    const body = await c.req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('news_injection_rules_06086aa3')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, rule: data });
  } catch (error: any) {
    console.error('Error creating injection rule:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

newsInjectionRoutes.put('/injection-rules/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('news_injection_rules_06086aa3')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, rule: data });
  } catch (error: any) {
    console.error('Error updating injection rule:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

newsInjectionRoutes.delete('/injection-rules/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error } = await supabase
      .from('news_injection_rules_06086aa3')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting injection rule:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== PREVIEW SCHEDULE ====================

newsInjectionRoutes.get('/injection-rules/:id/preview', async (c) => {
  try {
    const id = c.req.param('id');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: rule, error } = await supabase
      .from('news_injection_rules_06086aa3')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Calculate next injection times
    const times = await calculateNextInjectionTimes(rule as InjectionRule);

    return c.json({
      success: true,
      schedule: times.map(t => ({
        time: t.toISOString(),
        dayOfWeek: t.getDay(),
        hour: t.getHours(),
        minute: t.getMinutes()
      }))
    });
  } catch (error: any) {
    console.error('Error previewing schedule:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== MANUAL SCHEDULING ====================

newsInjectionRoutes.post('/schedule/run', async (c) => {
  try {
    const count = await scheduleNewsInjections(supabaseUrl, supabaseServiceKey);

    return c.json({
      success: true,
      message: `Scheduled ${count} news injections`,
      count
    });
  } catch (error: any) {
    console.error('Error scheduling news:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== GET QUEUE ====================

newsInjectionRoutes.get('/queue', async (c) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('news_queue_06086aa3')
      .select(`
        *,
        news_voice_over:news_voice_overs_06086aa3(*)
      `)
      .order('scheduled_time', { ascending: true })
      .limit(50);

    if (error) throw error;

    return c.json({ success: true, queue: data || [] });
  } catch (error: any) {
    console.error('Error fetching queue:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== GET NEXT NEWS (for Auto-DJ) ====================

newsInjectionRoutes.get('/next', async (c) => {
  try {
    const newsItem = await getNextNewsToPlay(supabaseUrl, supabaseServiceKey);

    if (!newsItem) {
      return c.json({ success: true, news: null });
    }

    // Get full voice-over data
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: voiceOver } = await supabase
      .from('news_voice_overs_06086aa3')
      .select('*')
      .eq('id', newsItem.newsVoiceOverId)
      .single();

    return c.json({
      success: true,
      news: {
        ...newsItem,
        voiceOver
      }
    });
  } catch (error: any) {
    console.error('Error getting next news:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== MARK AS PLAYED ====================

newsInjectionRoutes.post('/queue/:id/complete', async (c) => {
  try {
    const id = c.req.param('id');
    const { newsVoiceOverId } = await c.req.json();

    await markNewsAsPlayed(id, newsVoiceOverId, supabaseUrl, supabaseServiceKey);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error marking news as played:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== STATS ====================

newsInjectionRoutes.get('/stats', async (c) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get counts
    const [voiceOversResult, rulesResult, queueResult] = await Promise.all([
      supabase.from('news_voice_overs_06086aa3').select('*', { count: 'exact', head: true }),
      supabase.from('news_injection_rules_06086aa3').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('news_queue_06086aa3').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    // Get most played
    const { data: mostPlayed } = await supabase
      .from('news_voice_overs_06086aa3')
      .select('news_title, play_count')
      .order('play_count', { ascending: false })
      .limit(5);

    return c.json({
      success: true,
      stats: {
        totalVoiceOvers: voiceOversResult.count || 0,
        activeRules: rulesResult.count || 0,
        pendingQueue: queueResult.count || 0,
        mostPlayed: mostPlayed || []
      }
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
