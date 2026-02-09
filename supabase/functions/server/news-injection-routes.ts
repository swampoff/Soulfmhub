/**
 * Soul FM - News Injection API Routes
 * Uses KV store instead of direct table queries.
 */

import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
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
      newsId, newsTitle, newsContent, voiceId, voiceName, elevenLabsApiKey
    );

    // Save to KV store
    const voiceOverId = crypto.randomUUID();
    const voiceOver = {
      id: voiceOverId,
      news_id: newsId,
      news_title: newsTitle,
      news_content: newsContent,
      audio_url: audioUrl,
      voice_id: voiceId,
      voice_name: voiceName,
      duration,
      is_active: true,
      play_count: 0,
      created_at: new Date().toISOString()
    };

    await kv.set(`news_voiceover:${voiceOverId}`, voiceOver);

    return c.json({ success: true, voiceOver });
  } catch (error: any) {
    console.error('Error generating voice-over:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== GET ALL VOICE-OVERS ====================

newsInjectionRoutes.get('/news-voiceovers', async (c) => {
  try {
    const allVoiceOvers = await kv.getByPrefix('news_voiceover:');
    const voiceOvers = allVoiceOvers
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return c.json({ success: true, voiceOvers });
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

    const voiceOver = await kv.get(`news_voiceover:${id}`);
    if (!voiceOver) {
      return c.json({ success: false, error: 'Voice-over not found' }, 404);
    }

    const updated = { ...voiceOver, ...body, updated_at: new Date().toISOString() };
    await kv.set(`news_voiceover:${id}`, updated);

    return c.json({ success: true, voiceOver: updated });
  } catch (error: any) {
    console.error('Error updating voice-over:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== DELETE VOICE-OVER ====================

newsInjectionRoutes.delete('/news-voiceovers/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`news_voiceover:${id}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting voice-over:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== INJECTION RULES ====================

newsInjectionRoutes.get('/injection-rules', async (c) => {
  try {
    const allRules = await kv.getByPrefix('news_rule:');
    const rules = allRules
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return c.json({ success: true, rules });
  } catch (error: any) {
    console.error('Error fetching injection rules:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

newsInjectionRoutes.post('/injection-rules', async (c) => {
  try {
    const body = await c.req.json();
    const ruleId = crypto.randomUUID();
    const rule = {
      id: ruleId,
      ...body,
      created_at: new Date().toISOString()
    };

    await kv.set(`news_rule:${ruleId}`, rule);

    return c.json({ success: true, rule });
  } catch (error: any) {
    console.error('Error creating injection rule:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

newsInjectionRoutes.put('/injection-rules/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const rule = await kv.get(`news_rule:${id}`);
    if (!rule) {
      return c.json({ success: false, error: 'Rule not found' }, 404);
    }

    const updated = { ...rule, ...body, updated_at: new Date().toISOString() };
    await kv.set(`news_rule:${id}`, updated);

    return c.json({ success: true, rule: updated });
  } catch (error: any) {
    console.error('Error updating injection rule:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

newsInjectionRoutes.delete('/injection-rules/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`news_rule:${id}`);
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
    const rule = await kv.get(`news_rule:${id}`);
    if (!rule) {
      return c.json({ success: false, error: 'Rule not found' }, 404);
    }

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
    const count = await scheduleNewsInjections();

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
    const allQueue = await kv.getByPrefix('news_queue:');

    // Enrich with voice-over data
    const enriched = [];
    for (const item of allQueue) {
      const voiceOver = await kv.get(`news_voiceover:${item.news_voice_over_id}`);
      enriched.push({
        ...item,
        news_voice_over: voiceOver || null
      });
    }

    const queue = enriched
      .sort((a: any, b: any) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime())
      .slice(0, 50);

    return c.json({ success: true, queue });
  } catch (error: any) {
    console.error('Error fetching queue:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== GET NEXT NEWS (for Auto-DJ) ====================

newsInjectionRoutes.get('/next', async (c) => {
  try {
    const newsItem = await getNextNewsToPlay();

    if (!newsItem) {
      return c.json({ success: true, news: null });
    }

    const voiceOver = await kv.get(`news_voiceover:${newsItem.news_voice_over_id}`);

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

    await markNewsAsPlayed(id, newsVoiceOverId);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error marking news as played:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== STATS ====================

newsInjectionRoutes.get('/stats', async (c) => {
  try {
    const allVoiceOvers = await kv.getByPrefix('news_voiceover:');
    const allRules = await kv.getByPrefix('news_rule:');
    const allQueue = await kv.getByPrefix('news_queue:');

    const activeRules = allRules.filter((r: any) => r.is_active).length;
    const pendingQueue = allQueue.filter((q: any) => q.status === 'pending').length;

    const mostPlayed = allVoiceOvers
      .sort((a: any, b: any) => (b.play_count || 0) - (a.play_count || 0))
      .slice(0, 5)
      .map((v: any) => ({ news_title: v.news_title, play_count: v.play_count || 0 }));

    return c.json({
      success: true,
      stats: {
        totalVoiceOvers: allVoiceOvers.length,
        activeRules,
        pendingQueue,
        mostPlayed
      }
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
