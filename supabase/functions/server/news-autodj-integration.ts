/**
 * Soul FM - News Integration for Auto-DJ
 * Handles news injection between tracks
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ==================== CHECK FOR SCHEDULED NEWS ====================

export async function checkForScheduledNews(): Promise<any | null> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    // Get next news to play (scheduled within next 5 minutes and not played yet)
    const { data: queueItems, error } = await supabase
      .from('news_queue_06086aa3')
      .select(`
        *,
        news_voice_over:news_voice_overs_06086aa3!inner(*)
      `)
      .eq('status', 'pending')
      .gte('scheduled_time', now.toISOString())
      .lte('scheduled_time', fiveMinutesFromNow.toISOString())
      .order('scheduled_time', { ascending: true })
      .limit(1);
    
    if (error) {
      console.error('Error checking news queue:', error);
      return null;
    }
    
    if (!queueItems || queueItems.length === 0) {
      return null;
    }
    
    const newsItem = queueItems[0];
    
    console.log(`📰 Found scheduled news: "${newsItem.news_voice_over.news_title}" at ${newsItem.scheduled_time}`);
    
    return {
      queueId: newsItem.id,
      voiceOverId: newsItem.news_voice_over_id,
      newsId: newsItem.news_voice_over.news_id,
      title: newsItem.news_voice_over.news_title,
      content: newsItem.news_voice_over.news_content,
      audioUrl: newsItem.news_voice_over.audio_url,
      duration: newsItem.news_voice_over.duration,
      voiceName: newsItem.news_voice_over.voice_name,
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error } = await supabase
      .from('news_queue_06086aa3')
      .update({
        status: 'playing',
        played_at: new Date().toISOString()
      })
      .eq('id', queueId);
    
    if (error) {
      console.error('Error marking news as playing:', error);
    } else {
      console.log(`✅ Marked news queue item ${queueId} as playing`);
    }
  } catch (error: any) {
    console.error('Error in markNewsAsPlaying:', error);
  }
}

export async function markNewsAsCompleted(queueId: string, voiceOverId: string): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Update queue item
    const { error: queueError } = await supabase
      .from('news_queue_06086aa3')
      .update({
        status: 'completed'
      })
      .eq('id', queueId);
    
    if (queueError) {
      console.error('Error marking news as completed:', queueError);
    }
    
    // Increment play count on voice-over
    const { error: voError } = await supabase.rpc(
      'increment_news_play_count',
      { voice_over_id: voiceOverId }
    );
    
    if (voError) {
      console.error('Error incrementing news play count:', voError);
    }
    
    console.log(`✅ Marked news ${queueId} as completed and incremented play count`);
  } catch (error: any) {
    console.error('Error in markNewsAsCompleted:', error);
  }
}

// ==================== GET ANNOUNCEMENT ====================

export async function checkForScheduledAnnouncement(type?: string): Promise<any | null> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let query = supabase
      .from('content_announcements_06086aa3')
      .select('*')
      .eq('is_active', true);
    
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data, error } = await query;
    
    if (error || !data || data.length === 0) {
      return null;
    }
    
    // Simple rotation: pick random announcement
    const announcement = data[Math.floor(Math.random() * data.length)];
    
    console.log(`📻 Selected ${announcement.type} announcement: "${announcement.content.substring(0, 50)}..."`);
    
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error } = await supabase.rpc(
      'increment_announcement_play_count',
      { announcement_id: announcementId }
    );
    
    if (error) {
      console.error('Error marking announcement as played:', error);
    } else {
      console.log(`✅ Marked announcement ${announcementId} as played`);
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

/**
 * Check what should be injected next (news or announcement)
 * Priority: News > Station ID > Weather/Time
 */
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
  // Rotate between station IDs and weather/time
  const random = Math.random();
  let announcementType: string | undefined;
  
  if (random < 0.4) {
    announcementType = 'station_id';
  } else if (random < 0.7) {
    announcementType = 'weather';
  } else if (random < 0.9) {
    announcementType = 'time';
  } else {
    announcementType = undefined; // Any type
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
  
  // Nothing to inject
  return {
    hasNews: false,
    hasAnnouncement: false,
    news: null,
    announcement: null
  };
}

// ==================== INJECTION DECISION LOGIC ====================

/**
 * Decides when to inject content based on tracks played counter
 */
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

/**
 * Should we inject content now?
 * Rules:
 * - News: Always inject when scheduled (within 5 min window)
 * - Announcements: Every 3-5 tracks
 */
export async function shouldInjectContent(): Promise<boolean> {
  // Check for scheduled news (always inject if available)
  const news = await checkForScheduledNews();
  if (news) {
    return true;
  }
  
  // Check for announcements (every 3-5 tracks)
  if (tracksPlayedSinceLastInjection >= 3) {
    return true;
  }
  
  return false;
}
