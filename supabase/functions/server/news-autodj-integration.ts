/**
 * Soul FM - News Integration for Auto-DJ
 * Handles news injection between tracks
 * Uses KV store instead of direct table queries.
 */

import * as kv from './kv_store.tsx';

// ==================== CHECK FOR SCHEDULED NEWS ====================

export async function checkForScheduledNews(): Promise<any | null> {
  try {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    const allQueue = await kv.getByPrefix('news_queue:');
    const pending = allQueue
      .filter((q: any) => {
        if (q.status !== 'pending') return false;
        const scheduled = new Date(q.scheduled_time);
        return scheduled >= now && scheduled <= fiveMinutesFromNow;
      })
      .sort((a: any, b: any) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

    if (pending.length === 0) return null;

    const newsItem = pending[0];
    const voiceOver = await kv.get(`news_voiceover:${newsItem.news_voice_over_id}`);

    if (!voiceOver) {
      console.error(`Voice-over not found for news queue item: ${newsItem.id}`);
      return null;
    }

    console.log(`Found scheduled news: "${voiceOver.news_title}" at ${newsItem.scheduled_time}`);

    return {
      queueId: newsItem.id,
      voiceOverId: newsItem.news_voice_over_id,
      newsId: voiceOver.news_id,
      title: voiceOver.news_title,
      content: voiceOver.news_content,
      audioUrl: voiceOver.audio_url,
      duration: voiceOver.duration,
      voiceName: voiceOver.voice_name,
      scheduledTime: newsItem.scheduled_time
    };
  } catch (error: any) {
    console.error('Error in checkForScheduledNews:', error);
    return null;
  }
}

// ==================== MARK NEWS AS PLAYING/COMPLETED ====================

export async function markNewsAsPlaying(queueId: string): Promise<void> {
  try {
    const item = await kv.get(`news_queue:${queueId}`);
    if (item) {
      item.status = 'playing';
      item.played_at = new Date().toISOString();
      await kv.set(`news_queue:${queueId}`, item);
      console.log(`Marked news queue item ${queueId} as playing`);
    }
  } catch (error: any) {
    console.error('Error in markNewsAsPlaying:', error);
  }
}

export async function markNewsAsCompleted(queueId: string, voiceOverId: string): Promise<void> {
  try {
    // Update queue item
    const item = await kv.get(`news_queue:${queueId}`);
    if (item) {
      item.status = 'completed';
      await kv.set(`news_queue:${queueId}`, item);
    }

    // Increment play count on voice-over
    const voiceOver = await kv.get(`news_voiceover:${voiceOverId}`);
    if (voiceOver) {
      voiceOver.play_count = (voiceOver.play_count || 0) + 1;
      voiceOver.last_played = new Date().toISOString();
      await kv.set(`news_voiceover:${voiceOverId}`, voiceOver);
    }

    console.log(`Marked news ${queueId} as completed and incremented play count`);
  } catch (error: any) {
    console.error('Error in markNewsAsCompleted:', error);
  }
}

// ==================== GET ANNOUNCEMENT ====================

export async function checkForScheduledAnnouncement(type?: string): Promise<any | null> {
  try {
    let allAnnouncements = await kv.getByPrefix('announcement:');
    allAnnouncements = allAnnouncements.filter((a: any) => a.is_active);

    if (type) {
      allAnnouncements = allAnnouncements.filter((a: any) => a.type === type);
    }

    if (allAnnouncements.length === 0) return null;

    // Simple rotation: pick random announcement
    const announcement = allAnnouncements[Math.floor(Math.random() * allAnnouncements.length)];

    console.log(`Selected ${announcement.type} announcement: "${(announcement.content || '').substring(0, 50)}..."`);

    return {
      id: announcement.id,
      type: announcement.type,
      content: announcement.content,
      audioUrl: announcement.audio_url,
      duration: announcement.duration || 30,
      voiceName: announcement.voice_name
    };
  } catch (error: any) {
    console.error('Error in checkForScheduledAnnouncement:', error);
    return null;
  }
}

export async function markAnnouncementPlayed(announcementId: string): Promise<void> {
  try {
    const announcement = await kv.get(`announcement:${announcementId}`);
    if (announcement) {
      announcement.play_count = (announcement.play_count || 0) + 1;
      announcement.last_played = new Date().toISOString();
      await kv.set(`announcement:${announcementId}`, announcement);
      console.log(`Marked announcement ${announcementId} as played`);
    }
  } catch (error: any) {
    console.error('Error in markAnnouncementPlayed:', error);
  }
}

// ==================== NEWS/ANNOUNCEMENT INJECTION LOGIC ====================

export interface InjectionPriority {
  hasNews: boolean;
  hasAnnouncement: boolean;
  news: any | null;
  announcement: any | null;
}

export async function checkInjectionPriority(): Promise<InjectionPriority> {
  // 1. Check for scheduled news (highest priority)
  const news = await checkForScheduledNews();

  if (news) {
    return {
      hasNews: true,
      hasAnnouncement: false,
      news,
      announcement: null
    };
  }

  // 2. No news, check for announcements
  const random = Math.random();
  let announcementType: string | undefined;

  if (random < 0.4) {
    announcementType = 'station_id';
  } else if (random < 0.7) {
    announcementType = 'weather';
  } else if (random < 0.9) {
    announcementType = 'time';
  } else {
    announcementType = undefined;
  }

  const announcement = await checkForScheduledAnnouncement(announcementType);

  if (announcement) {
    return {
      hasNews: false,
      hasAnnouncement: true,
      news: null,
      announcement
    };
  }

  return {
    hasNews: false,
    hasAnnouncement: false,
    news: null,
    announcement: null
  };
}

// ==================== INJECTION DECISION LOGIC ====================

let tracksPlayedSinceLastInjection = 0;

export function incrementTrackCounter(): void {
  tracksPlayedSinceLastInjection++;
}

export function resetTrackCounter(): void {
  tracksPlayedSinceLastInjection = 0;
}

export function getTrackCounter(): number {
  return tracksPlayedSinceLastInjection;
}

export async function shouldInjectContent(): Promise<boolean> {
  const news = await checkForScheduledNews();
  if (news) return true;

  if (tracksPlayedSinceLastInjection >= 3) return true;

  return false;
}
