/**
 * Soul FM - Podcast Auto-Scheduling & Contest Announcements Integration
 * Handles automated podcast playback and contest announcements
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ==================== PODCAST AUTO-SCHEDULING ====================

export async function checkForScheduledPodcast(): Promise<any | null> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const now = new Date();
    
    // Use RPC function to get next scheduled podcast
    const { data, error } = await supabase.rpc('get_next_scheduled_podcast', {
      check_time: now.toISOString()
    });
    
    if (error) {
      console.error('Error checking podcast schedule:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    const podcast = data[0];
    
    console.log(`🎙️ Found scheduled podcast: "${podcast.title}" at ${podcast.scheduled_time}`);
    
    // Get full podcast data from KV store
    const podcastData = await getPodcastData(podcast.podcast_id, podcast.episode_id);
    
    return {
      scheduleId: podcast.id,
      podcastId: podcast.podcast_id,
      episodeId: podcast.episode_id,
      title: podcast.title,
      duration: podcast.duration,
      scheduledTime: podcast.scheduled_time,
      scheduleType: podcast.schedule_type,
      audioUrl: podcastData?.audioUrl,
      coverUrl: podcastData?.coverUrl,
      description: podcastData?.description
    };
  } catch (error: any) {
    console.error('Error in checkForScheduledPodcast:', error);
    return null;
  }
}

async function getPodcastData(podcastId: string, episodeId?: string): Promise<any | null> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Try to get from KV store
    const { data: kvData } = await supabase
      .from('kv_store_06086aa3')
      .select('value')
      .eq('key', episodeId ? `episode:${episodeId}` : `podcast:${podcastId}`)
      .single();
    
    if (kvData?.value) {
      return kvData.value;
    }
    
    return null;
  } catch (error: any) {
    console.error('Error getting podcast data:', error);
    return null;
  }
}

export async function markPodcastAsPlaying(scheduleId: string): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create play history record
    const { error } = await supabase
      .from('podcast_play_history_06086aa3')
      .insert({
        schedule_id: scheduleId,
        played_at: new Date().toISOString(),
        actual_play_time: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error creating podcast play history:', error);
    } else {
      console.log(`✅ Started podcast playback for schedule ${scheduleId}`);
    }
  } catch (error: any) {
    console.error('Error in markPodcastAsPlaying:', error);
  }
}

export async function markPodcastAsCompleted(scheduleId: string, podcastId: string, episodeId?: string): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Update play history
    const { error: historyError } = await supabase
      .from('podcast_play_history_06086aa3')
      .update({ completed: true })
      .eq('schedule_id', scheduleId)
      .eq('completed', false);
    
    if (historyError) {
      console.error('Error updating podcast play history:', historyError);
    }
    
    // Increment play count
    const { error: countError } = await supabase.rpc(
      'increment_podcast_play_count',
      { schedule_id_param: scheduleId }
    );
    
    if (countError) {
      console.error('Error incrementing podcast play count:', countError);
    }
    
    console.log(`✅ Marked podcast ${scheduleId} as completed`);
  } catch (error: any) {
    console.error('Error in markPodcastAsCompleted:', error);
  }
}

// ==================== CONTEST ANNOUNCEMENTS ====================

export async function checkForContestAnnouncement(): Promise<any | null> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    // Check for scheduled contest announcements in queue
    const { data: queueData, error: queueError } = await supabase
      .from('contest_announcements_queue_06086aa3')
      .select(`
        *,
        contest:contests_06086aa3!inner(*)
      `)
      .eq('status', 'pending')
      .gte('scheduled_time', now.toISOString())
      .lte('scheduled_time', fiveMinutesFromNow.toISOString())
      .order('scheduled_time', { ascending: true })
      .limit(1);
    
    if (queueError) {
      console.error('Error checking contest queue:', queueError);
      return null;
    }
    
    if (queueData && queueData.length > 0) {
      const item = queueData[0];
      console.log(`🎁 Found scheduled contest announcement: "${item.contest.title}"`);
      
      return {
        queueId: item.id,
        contestId: item.contest.id,
        title: item.contest.title,
        announcementType: item.announcement_type,
        audioUrl: item.contest.announcement_audio_url,
        script: item.contest.announcement_script,
        duration: item.contest.announcement_duration || 30,
        scheduledTime: item.scheduled_time
      };
    }
    
    // No queue item, check if we should auto-announce active contests
    const { data: contests, error: contestsError } = await supabase
      .from('contests_06086aa3')
      .select('*')
      .eq('status', 'active')
      .eq('is_featured', true)
      .gte('end_date', now.toISOString());
    
    if (contestsError || !contests || contests.length === 0) {
      return null;
    }
    
    // Pick a random featured contest
    const contest = contests[Math.floor(Math.random() * contests.length)];
    
    console.log(`🎁 Selected active contest for announcement: "${contest.title}"`);
    
    return {
      queueId: null,
      contestId: contest.id,
      title: contest.title,
      announcementType: 'promo',
      audioUrl: contest.announcement_audio_url,
      script: contest.announcement_script,
      duration: contest.announcement_duration || 30,
      scheduledTime: null
    };
  } catch (error: any) {
    console.error('Error in checkForContestAnnouncement:', error);
    return null;
  }
}

export async function markContestAnnouncementPlaying(queueId: string | null, contestId: string): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    if (queueId) {
      // Update queue item
      const { error } = await supabase
        .from('contest_announcements_queue_06086aa3')
        .update({
          status: 'playing',
          played_at: new Date().toISOString()
        })
        .eq('id', queueId);
      
      if (error) {
        console.error('Error marking contest announcement as playing:', error);
      }
    }
    
    console.log(`✅ Playing contest announcement for contest ${contestId}`);
  } catch (error: any) {
    console.error('Error in markContestAnnouncementPlaying:', error);
  }
}

export async function markContestAnnouncementCompleted(queueId: string | null, contestId: string): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    if (queueId) {
      // Update queue item
      const { error: queueError } = await supabase
        .from('contest_announcements_queue_06086aa3')
        .update({ status: 'completed' })
        .eq('id', queueId);
      
      if (queueError) {
        console.error('Error marking contest announcement as completed:', queueError);
      }
    }
    
    // Increment announcement count
    const { error: countError } = await supabase.rpc(
      'increment_contest_announcement_count',
      { contest_id_param: contestId }
    );
    
    if (countError) {
      console.error('Error incrementing contest announcement count:', countError);
    }
    
    console.log(`✅ Marked contest announcement completed for contest ${contestId}`);
  } catch (error: any) {
    console.error('Error in markContestAnnouncementCompleted:', error);
  }
}

// ==================== CONTEST ANNOUNCEMENT SCHEDULER ====================

export async function scheduleContestAnnouncements(contestId: string): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get contest details
    const { data: contest, error } = await supabase
      .from('contests_06086aa3')
      .select('*')
      .eq('id', contestId)
      .single();
    
    if (error || !contest) {
      console.error('Error getting contest:', error);
      return;
    }
    
    const startDate = new Date(contest.start_date);
    const endDate = new Date(contest.end_date);
    const now = new Date();
    
    // Clear existing queue items for this contest
    await supabase
      .from('contest_announcements_queue_06086aa3')
      .delete()
      .eq('contest_id', contestId)
      .eq('status', 'pending');
    
    // Generate schedule based on frequency
    const schedules: any[] = [];
    let currentTime = now > startDate ? now : startDate;
    
    while (currentTime < endDate) {
      let nextTime: Date;
      
      switch (contest.announcement_frequency) {
        case 'every_15min':
          nextTime = new Date(currentTime.getTime() + 15 * 60 * 1000);
          break;
        case 'every_30min':
          nextTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
          break;
        case 'hourly':
          nextTime = new Date(currentTime.getTime() + 60 * 60 * 1000);
          break;
        case 'every_2hours':
          nextTime = new Date(currentTime.getTime() + 2 * 60 * 60 * 1000);
          break;
        case 'daily':
          nextTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
          break;
        default:
          nextTime = new Date(currentTime.getTime() + 60 * 60 * 1000);
      }
      
      if (nextTime >= endDate) break;
      
      schedules.push({
        contest_id: contestId,
        scheduled_time: nextTime.toISOString(),
        announcement_type: 'promo'
      });
      
      currentTime = nextTime;
      
      // Limit to next 100 announcements
      if (schedules.length >= 100) break;
    }
    
    // Add "last chance" announcement 1 hour before end
    const lastChanceTime = new Date(endDate.getTime() - 60 * 60 * 1000);
    if (lastChanceTime > now) {
      schedules.push({
        contest_id: contestId,
        scheduled_time: lastChanceTime.toISOString(),
        announcement_type: 'last_chance'
      });
    }
    
    // Insert all schedules
    if (schedules.length > 0) {
      const { error: insertError } = await supabase
        .from('contest_announcements_queue_06086aa3')
        .insert(schedules);
      
      if (insertError) {
        console.error('Error scheduling contest announcements:', insertError);
      } else {
        console.log(`✅ Scheduled ${schedules.length} announcements for contest "${contest.title}"`);
      }
    }
  } catch (error: any) {
    console.error('Error in scheduleContestAnnouncements:', error);
  }
}

// ==================== COUNTERS ====================

let contestAnnouncementCounter = 0;

export function incrementContestCounter(): void {
  contestAnnouncementCounter++;
}

export function resetContestCounter(): void {
  contestAnnouncementCounter = 0;
}

export function getContestCounter(): number {
  return contestAnnouncementCounter;
}

/**
 * Should we announce a contest now?
 * Rules:
 * - Scheduled: Always play if in queue
 * - Auto: Every 8-12 tracks (less frequent than news/announcements)
 */
export function shouldAnnounceContest(): boolean {
  return contestAnnouncementCounter >= 8;
}
