/**
 * Soul FM - News Injection System
 * Automatic voice-over generation and news injection into the stream
 * Uses KV store instead of direct table queries.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

// ==================== TYPES ====================

export interface NewsVoiceOver {
  id: string;
  news_id: string;
  news_title: string;
  news_content: string;
  audio_url: string;
  voice_id: string;
  voice_name: string;
  duration: number;
  is_active: boolean;
  play_count: number;
  last_played?: string;
  created_at: string;
}

export interface InjectionRule {
  id: string;
  name: string;
  frequency: 'hourly' | 'every2h' | 'every3h' | 'custom';
  custom_times?: string[];
  days_of_week?: number[];
  news_categories?: string[];
  max_news_per_slot: number;
  priority_order: 'latest' | 'random' | 'priority';
  intro_jingle_id?: string;
  outro_jingle_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface NewsQueueItem {
  id: string;
  news_voice_over_id: string;
  scheduled_time: string;
  status: 'pending' | 'playing' | 'completed' | 'skipped';
  played_at?: string;
  rule_id: string;
}

// ==================== GENERATE NEWS VOICE-OVER ====================

export async function generateNewsVoiceOver(
  newsId: string,
  newsTitle: string,
  newsContent: string,
  voiceId: string,
  voiceName: string,
  elevenLabsApiKey: string
): Promise<{ audioUrl: string; duration: number }> {
  console.log(`Generating voice-over for news: ${newsTitle}`);

  const script = prepareNewsScript(newsTitle, newsContent);

  // For now, generate a placeholder audio URL since ElevenLabs integration
  // requires the content-automation-api which may have its own dependencies
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Estimate duration
  const wordCount = script.split(/\s+/).length;
  const duration = Math.ceil((wordCount / 150) * 60);

  console.log(`Voice-over generated for: ${newsTitle} (${duration}s)`);

  return {
    audioUrl: `placeholder://news_${newsId}_${Date.now()}.mp3`,
    duration
  };
}

function prepareNewsScript(title: string, content: string): string {
  const intro = "Here's the latest from Soul FM News.";
  const headline = title;

  let body = content
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const words = body.split(/\s+/);
  if (words.length > 200) {
    body = words.slice(0, 200).join(' ') + '...';
  }

  return `${intro} ${headline}. ${body}`;
}

// ==================== INJECTION RULES ENGINE ====================

export async function calculateNextInjectionTimes(
  rule: InjectionRule,
  startDate: Date = new Date()
): Promise<Date[]> {
  const times: Date[] = [];
  const now = startDate;
  const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const daysOfWeek = rule.days_of_week;
  const customTimes = rule.custom_times;

  switch (rule.frequency) {
    case 'hourly': {
      let currentHour = new Date(now);
      currentHour.setMinutes(0, 0, 0);
      currentHour.setHours(currentHour.getHours() + 1);

      while (currentHour < endTime) {
        if (shouldPlayOnDay(currentHour, daysOfWeek)) {
          times.push(new Date(currentHour));
        }
        currentHour = new Date(currentHour.getTime() + 60 * 60 * 1000);
      }
      break;
    }

    case 'every2h': {
      let current2h = new Date(now);
      current2h.setMinutes(0, 0, 0);
      current2h.setHours(current2h.getHours() + 2 - (current2h.getHours() % 2));

      while (current2h < endTime) {
        if (shouldPlayOnDay(current2h, daysOfWeek)) {
          times.push(new Date(current2h));
        }
        current2h = new Date(current2h.getTime() + 2 * 60 * 60 * 1000);
      }
      break;
    }

    case 'every3h': {
      let current3h = new Date(now);
      current3h.setMinutes(0, 0, 0);
      current3h.setHours(current3h.getHours() + 3 - (current3h.getHours() % 3));

      while (current3h < endTime) {
        if (shouldPlayOnDay(current3h, daysOfWeek)) {
          times.push(new Date(current3h));
        }
        current3h = new Date(current3h.getTime() + 3 * 60 * 60 * 1000);
      }
      break;
    }

    case 'custom':
      if (customTimes && customTimes.length > 0) {
        for (let day = 0; day < 2; day++) {
          const date = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);

          if (!shouldPlayOnDay(date, daysOfWeek)) continue;

          for (const timeStr of customTimes) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const scheduleTime = new Date(date);
            scheduleTime.setHours(hours, minutes, 0, 0);

            if (scheduleTime > now && scheduleTime < endTime) {
              times.push(scheduleTime);
            }
          }
        }
      }
      break;
  }

  return times.sort((a, b) => a.getTime() - b.getTime());
}

function shouldPlayOnDay(date: Date, daysOfWeek?: number[]): boolean {
  if (!daysOfWeek || daysOfWeek.length === 0) return true;
  const dayOfWeek = date.getDay();
  return daysOfWeek.includes(dayOfWeek);
}

// ==================== SELECT NEWS FOR INJECTION ====================

export async function selectNewsForInjection(
  rule: InjectionRule
): Promise<NewsVoiceOver[]> {
  const maxPerSlot = rule.max_news_per_slot || 1;

  let newsVoiceOvers = await kv.getByPrefix('news_voiceover:');
  newsVoiceOvers = newsVoiceOvers.filter((v: any) => v.is_active);

  switch (rule.priority_order) {
    case 'latest':
      newsVoiceOvers.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
    case 'priority':
      newsVoiceOvers.sort((a: any, b: any) => (a.play_count || 0) - (b.play_count || 0));
      break;
    case 'random':
      for (let i = newsVoiceOvers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newsVoiceOvers[i], newsVoiceOvers[j]] = [newsVoiceOvers[j], newsVoiceOvers[i]];
      }
      break;
  }

  return newsVoiceOvers.slice(0, maxPerSlot);
}

// ==================== QUEUE NEWS FOR PLAYBACK ====================

export async function queueNewsForPlayback(
  ruleId: string,
  newsVoiceOverId: string,
  scheduledTime: Date
): Promise<void> {
  const queueId = crypto.randomUUID();
  await kv.set(`news_queue:${queueId}`, {
    id: queueId,
    news_voice_over_id: newsVoiceOverId,
    scheduled_time: scheduledTime.toISOString(),
    status: 'pending',
    rule_id: ruleId,
    created_at: new Date().toISOString()
  });

  console.log(`News queued for ${scheduledTime.toISOString()}`);
}

// ==================== GET NEXT NEWS TO PLAY ====================

export async function getNextNewsToPlay(): Promise<NewsQueueItem | null> {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  const allQueue = await kv.getByPrefix('news_queue:');
  const pending = allQueue
    .filter((q: any) => {
      if (q.status !== 'pending') return false;
      const scheduled = new Date(q.scheduled_time);
      return scheduled >= fiveMinutesAgo && scheduled <= now;
    })
    .sort((a: any, b: any) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

  return pending.length > 0 ? pending[0] : null;
}

// ==================== MARK NEWS AS PLAYED ====================

export async function markNewsAsPlayed(
  queueItemId: string,
  newsVoiceOverId: string
): Promise<void> {
  // Update queue item
  const queueItem = await kv.get(`news_queue:${queueItemId}`);
  if (queueItem) {
    queueItem.status = 'completed';
    queueItem.played_at = new Date().toISOString();
    await kv.set(`news_queue:${queueItemId}`, queueItem);
  }

  // Increment play count on voice-over
  const voiceOver = await kv.get(`news_voiceover:${newsVoiceOverId}`);
  if (voiceOver) {
    voiceOver.play_count = (voiceOver.play_count || 0) + 1;
    voiceOver.last_played = new Date().toISOString();
    await kv.set(`news_voiceover:${newsVoiceOverId}`, voiceOver);
  }

  console.log(`News marked as played: queue=${queueItemId}, voiceOver=${newsVoiceOverId}`);
}

// ==================== SCHEDULE MANAGER ====================

export async function scheduleNewsInjections(): Promise<number> {
  console.log('Scheduling news injections...');

  const allRules = await kv.getByPrefix('news_rule:');
  const activeRules = allRules.filter((r: any) => r.is_active);

  if (activeRules.length === 0) {
    console.log('No active injection rules found');
    return 0;
  }

  let scheduledCount = 0;

  for (const rule of activeRules) {
    try {
      const times = await calculateNextInjectionTimes(rule as InjectionRule);

      for (const time of times) {
        const newsItems = await selectNewsForInjection(rule as InjectionRule);

        for (const newsItem of newsItems) {
          // Check if already queued
          const allQueue = await kv.getByPrefix('news_queue:');
          const alreadyQueued = allQueue.some((q: any) =>
            q.news_voice_over_id === newsItem.id &&
            q.scheduled_time === time.toISOString()
          );

          if (!alreadyQueued) {
            await queueNewsForPlayback(rule.id, newsItem.id, time);
            scheduledCount++;
          }
        }
      }
    } catch (ruleError) {
      console.error(`Error scheduling for rule "${rule.name}":`, ruleError);
    }
  }

  console.log(`Scheduled ${scheduledCount} news injections`);
  return scheduledCount;
}
