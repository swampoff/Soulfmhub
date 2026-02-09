/**
 * Soul FM - News Injection System
 * Automatic voice-over generation and news injection into the stream
 * 
 * IMPORTANT: All interfaces use snake_case to match Supabase/Postgres column names.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { generateAudioWithElevenLabs } from './content-automation-api.ts';

// ==================== TYPES (snake_case to match DB) ====================

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
  custom_times?: string[]; // ['08:00', '12:00', '18:00']
  days_of_week?: number[]; // [1,2,3,4,5] = Mon-Fri
  news_categories?: string[]; // ['breaking', 'music', 'local']
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
  
  // Prepare the script for TTS
  const script = prepareNewsScript(newsTitle, newsContent);
  
  // Generate audio with ElevenLabs
  const audioData = await generateAudioWithElevenLabs(script, voiceId, elevenLabsApiKey);
  
  // Upload to Supabase Storage
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const fileName = `news_${newsId}_${Date.now()}.mp3`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('make-06086aa3-news-voiceovers')
    .upload(fileName, audioData, {
      contentType: 'audio/mpeg',
      upsert: false
    });
  
  if (uploadError) {
    throw new Error(`Failed to upload news audio to storage: ${uploadError.message}`);
  }
  
  // Get signed URL (valid for 1 year)
  const { data: urlData, error: urlError } = await supabase.storage
    .from('make-06086aa3-news-voiceovers')
    .createSignedUrl(fileName, 365 * 24 * 60 * 60);
  
  if (urlError || !urlData?.signedUrl) {
    throw new Error(`Failed to create signed URL for news audio: ${urlError?.message || 'no URL returned'}`);
  }
  
  // Estimate duration (rough calculation: ~150 words per minute)
  const wordCount = script.split(/\s+/).length;
  const duration = Math.ceil((wordCount / 150) * 60); // in seconds
  
  console.log(`Voice-over generated: ${fileName} (${duration}s)`);
  
  return {
    audioUrl: urlData.signedUrl,
    duration
  };
}

function prepareNewsScript(title: string, content: string): string {
  // Create a natural-sounding news script
  const intro = "Here's the latest from Soul FM News.";
  const headline = title;
  
  // Clean and shorten content for voice-over (max 200 words)
  let body = content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Limit to ~200 words for reasonable length
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
  
  // Calculate for next 24 hours
  const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  // Use snake_case fields from DB
  const daysOfWeek = rule.days_of_week;
  const customTimes = rule.custom_times;
  
  switch (rule.frequency) {
    case 'hourly': {
      // Every hour on the hour
      let currentHour = new Date(now);
      currentHour.setMinutes(0, 0, 0);
      currentHour.setHours(currentHour.getHours() + 1); // Next hour
      
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
        for (let day = 0; day < 2; day++) { // Today and tomorrow
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
  
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  return daysOfWeek.includes(dayOfWeek);
}

// ==================== SELECT NEWS FOR INJECTION ====================

export async function selectNewsForInjection(
  rule: InjectionRule,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<NewsVoiceOver[]> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const maxPerSlot = rule.max_news_per_slot || 1;
  
  // Build query
  let query = supabase
    .from('news_voice_overs_06086aa3')
    .select('*')
    .eq('is_active', true);
  
  // Filter by categories if specified
  if (rule.news_categories && rule.news_categories.length > 0) {
    // This would need a join with news table to filter by category
    // For now, we'll get all active voice-overs
  }
  
  // Order by priority
  switch (rule.priority_order) {
    case 'latest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'priority':
      query = query.order('play_count', { ascending: true }); // Least played first
      break;
    case 'random':
      // Will shuffle after fetching
      break;
  }
  
  const { data: newsVoiceOvers, error } = await query.limit(maxPerSlot * 3); // Fetch extra for random selection
  
  if (error) {
    console.error('Error fetching news voice-overs for injection:', error);
    return [];
  }
  
  if (rule.priority_order === 'random' && newsVoiceOvers) {
    // Fisher-Yates shuffle
    for (let i = newsVoiceOvers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newsVoiceOvers[i], newsVoiceOvers[j]] = [newsVoiceOvers[j], newsVoiceOvers[i]];
    }
  }
  
  return (newsVoiceOvers || []).slice(0, maxPerSlot);
}

// ==================== QUEUE NEWS FOR PLAYBACK ====================

export async function queueNewsForPlayback(
  ruleId: string,
  newsVoiceOverId: string,
  scheduledTime: Date,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { error } = await supabase
    .from('news_queue_06086aa3')
    .insert({
      news_voice_over_id: newsVoiceOverId,
      scheduled_time: scheduledTime.toISOString(),
      status: 'pending',
      rule_id: ruleId
    });
  
  if (error) {
    console.error('Error queueing news:', error);
    throw new Error(`Failed to queue news for playback: ${error.message}`);
  }
  
  console.log(`News queued for ${scheduledTime.toISOString()}`);
}

// ==================== GET NEXT NEWS TO PLAY ====================

export async function getNextNewsToPlay(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<NewsQueueItem | null> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  
  const { data, error } = await supabase
    .from('news_queue_06086aa3')
    .select('*')
    .eq('status', 'pending')
    .gte('scheduled_time', fiveMinutesAgo.toISOString())
    .lte('scheduled_time', now.toISOString())
    .order('scheduled_time', { ascending: true })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Error fetching next news to play:', error);
    return null;
  }
  
  return data;
}

// ==================== MARK NEWS AS PLAYED ====================

export async function markNewsAsPlayed(
  queueItemId: string,
  newsVoiceOverId: string,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Update queue item
  const { error: queueError } = await supabase
    .from('news_queue_06086aa3')
    .update({
      status: 'completed',
      played_at: new Date().toISOString()
    })
    .eq('id', queueItemId);
  
  if (queueError) {
    console.error(`Error marking news queue item ${queueItemId} as completed:`, queueError);
  }
  
  // Increment play count - use direct update as fallback if RPC doesn't exist
  const { error: rpcError } = await supabase.rpc('increment_news_play_count', {
    voice_over_id: newsVoiceOverId
  });
  
  if (rpcError) {
    console.error('RPC increment_news_play_count failed, trying direct update:', rpcError);
    // Fallback: direct increment
    try {
      const { data: vo } = await supabase
        .from('news_voice_overs_06086aa3')
        .select('play_count')
        .eq('id', newsVoiceOverId)
        .single();
      
      if (vo) {
        await supabase
          .from('news_voice_overs_06086aa3')
          .update({ 
            play_count: (vo.play_count || 0) + 1,
            last_played: new Date().toISOString()
          })
          .eq('id', newsVoiceOverId);
      }
    } catch (fallbackError) {
      console.error('Fallback play count increment also failed:', fallbackError);
    }
  }
  
  console.log(`News marked as played: queue=${queueItemId}, voiceOver=${newsVoiceOverId}`);
}

// ==================== SCHEDULE MANAGER ====================

export async function scheduleNewsInjections(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<number> {
  console.log('Scheduling news injections...');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get all active injection rules
  const { data: rules, error: rulesError } = await supabase
    .from('news_injection_rules_06086aa3')
    .select('*')
    .eq('is_active', true);
  
  if (rulesError) {
    console.error('Error fetching injection rules:', rulesError);
    return 0;
  }
  
  if (!rules || rules.length === 0) {
    console.log('No active injection rules found');
    return 0;
  }
  
  let scheduledCount = 0;
  
  for (const rule of rules) {
    try {
      // Calculate next injection times (rule comes from DB with snake_case fields)
      const times = await calculateNextInjectionTimes(rule as InjectionRule);
      
      // Select news for each time slot
      for (const time of times) {
        const newsItems = await selectNewsForInjection(rule as InjectionRule, supabaseUrl, supabaseServiceKey);
        
        for (const newsItem of newsItems) {
          // Check if already queued
          const { data: existing } = await supabase
            .from('news_queue_06086aa3')
            .select('id')
            .eq('news_voice_over_id', newsItem.id)
            .eq('scheduled_time', time.toISOString())
            .single();
          
          if (!existing) {
            await queueNewsForPlayback(rule.id, newsItem.id, time, supabaseUrl, supabaseServiceKey);
            scheduledCount++;
          }
        }
      }
    } catch (ruleError) {
      console.error(`Error scheduling for rule "${rule.name}":`, ruleError);
      // Continue with other rules
    }
  }
  
  console.log(`Scheduled ${scheduledCount} news injections`);
  return scheduledCount;
}
