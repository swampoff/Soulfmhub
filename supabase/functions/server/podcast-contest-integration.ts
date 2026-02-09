/**
 * Soul FM - Podcast Auto-Scheduling & Contest Announcements Integration
 * Uses KV store instead of direct table queries.
 */

import * as kv from './kv_store.tsx';

// ==================== PODCAST AUTO-SCHEDULING ====================

export async function checkForScheduledPodcast(): Promise<any | null> {
  try {
    const now = new Date();
    const allSchedules = await kv.getByPrefix('podcast_schedule:');
    const activeSchedules = allSchedules.filter((s: any) => s.is_active);

    if (activeSchedules.length === 0) return null;

    // Find a schedule that should play now
    for (const schedule of activeSchedules) {
      const dayOfWeek = now.getDay();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (schedule.day_of_week !== undefined && schedule.day_of_week !== dayOfWeek) continue;
      if (schedule.time_of_day && currentTime < schedule.time_of_day) continue;

      // Check if already played recently
      const allHistory = await kv.getByPrefix('podcast_play_history:');
      const recentPlay = allHistory.find((h: any) =>
        h.schedule_id === schedule.id &&
        new Date(h.played_at).getTime() > now.getTime() - (schedule.min_days_between_plays || 7) * 24 * 60 * 60 * 1000
      );

      if (recentPlay) continue;

      // Get podcast data from KV store
      const podcastData = schedule.episode_id
        ? await kv.get(`episode:${schedule.episode_id}`)
        : await kv.get(`podcast:${schedule.podcast_id}`);

      console.log(`🎙️ Found scheduled podcast: "${schedule.title}"`);

      return {
        scheduleId: schedule.id,
        podcastId: schedule.podcast_id,
        episodeId: schedule.episode_id,
        title: schedule.title,
        duration: schedule.duration,
        scheduledTime: schedule.time_of_day,
        scheduleType: schedule.schedule_type,
        audioUrl: podcastData?.audioUrl,
        coverUrl: podcastData?.coverUrl,
        description: podcastData?.description
      };
    }

    return null;
  } catch (error: any) {
    console.error('Error in checkForScheduledPodcast:', error);
    return null;
  }
}

export async function markPodcastAsPlaying(scheduleId: string): Promise<void> {
  try {
    const historyId = crypto.randomUUID();
    await kv.set(`podcast_play_history:${historyId}`, {
      id: historyId,
      schedule_id: scheduleId,
      played_at: new Date().toISOString(),
      actual_play_time: new Date().toISOString(),
      completed: false
    });

    console.log(`✅ Started podcast playback for schedule ${scheduleId}`);
  } catch (error: any) {
    console.error('Error in markPodcastAsPlaying:', error);
  }
}

export async function markPodcastAsCompleted(scheduleId: string, podcastId: string, episodeId?: string): Promise<void> {
  try {
    const allHistory = await kv.getByPrefix('podcast_play_history:');
    const historyItem = allHistory.find((h: any) =>
      h.schedule_id === scheduleId && !h.completed
    );

    if (historyItem) {
      historyItem.completed = true;
      await kv.set(`podcast_play_history:${historyItem.id}`, historyItem);
    }

    console.log(`✅ Marked podcast ${scheduleId} as completed`);
  } catch (error: any) {
    console.error('Error in markPodcastAsCompleted:', error);
  }
}

// ==================== CONTEST ANNOUNCEMENTS ====================

export async function checkForContestAnnouncement(): Promise<any | null> {
  try {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Check for scheduled contest announcements in queue
    const allQueue = await kv.getByPrefix('contest_queue:');
    const pendingAnnouncements = allQueue
      .filter((q: any) => {
        if (q.status !== 'pending') return false;
        const scheduled = new Date(q.scheduled_time);
        return scheduled >= now && scheduled <= fiveMinutesFromNow;
      })
      .sort((a: any, b: any) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

    if (pendingAnnouncements.length > 0) {
      const item = pendingAnnouncements[0];
      const contest = await kv.get(`contest:${item.contest_id}`);

      if (contest) {
        console.log(`🎁 Found scheduled contest announcement: "${contest.title}"`);

        return {
          queueId: item.id,
          contestId: contest.id,
          title: contest.title,
          announcementType: item.announcement_type,
          audioUrl: contest.announcement_audio_url,
          script: contest.announcement_script,
          duration: contest.announcement_duration || 30,
          scheduledTime: item.scheduled_time
        };
      }
    }

    // No queue item, check if we should auto-announce active contests
    const allContests = await kv.getByPrefix('contest:');
    const activeContests = allContests.filter((c: any) =>
      c.status === 'active' &&
      c.is_featured &&
      new Date(c.end_date) >= now
    );

    if (activeContests.length === 0) return null;

    const contest = activeContests[Math.floor(Math.random() * activeContests.length)];

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
    if (queueId) {
      const item = await kv.get(`contest_queue:${queueId}`);
      if (item) {
        item.status = 'playing';
        item.played_at = new Date().toISOString();
        await kv.set(`contest_queue:${queueId}`, item);
      }
    }

    console.log(`✅ Playing contest announcement for contest ${contestId}`);
  } catch (error: any) {
    console.error('Error in markContestAnnouncementPlaying:', error);
  }
}

export async function markContestAnnouncementCompleted(queueId: string | null, contestId: string): Promise<void> {
  try {
    if (queueId) {
      const item = await kv.get(`contest_queue:${queueId}`);
      if (item) {
        item.status = 'completed';
        await kv.set(`contest_queue:${queueId}`, item);
      }
    }

    // Increment announcement count on contest
    const contest = await kv.get(`contest:${contestId}`);
    if (contest) {
      contest.announcement_count = (contest.announcement_count || 0) + 1;
      await kv.set(`contest:${contestId}`, contest);
    }

    console.log(`✅ Marked contest announcement completed for contest ${contestId}`);
  } catch (error: any) {
    console.error('Error in markContestAnnouncementCompleted:', error);
  }
}

// ==================== CONTEST ANNOUNCEMENT SCHEDULER ====================

export async function scheduleContestAnnouncements(contestId: string): Promise<void> {
  try {
    const contest = await kv.get(`contest:${contestId}`);
    if (!contest) {
      console.error('Contest not found:', contestId);
      return;
    }

    const startDate = new Date(contest.start_date);
    const endDate = new Date(contest.end_date);
    const now = new Date();

    // Clear existing pending queue items for this contest
    const allQueue = await kv.getByPrefix('contest_queue:');
    const toDelete = allQueue.filter((q: any) => q.contest_id === contestId && q.status === 'pending');
    if (toDelete.length > 0) {
      await kv.mdel(toDelete.map((q: any) => `contest_queue:${q.id}`));
    }

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

      const queueId = crypto.randomUUID();
      schedules.push({
        key: `contest_queue:${queueId}`,
        value: {
          id: queueId,
          contest_id: contestId,
          scheduled_time: nextTime.toISOString(),
          announcement_type: 'promo',
          status: 'pending',
          created_at: new Date().toISOString()
        }
      });

      currentTime = nextTime;
      if (schedules.length >= 100) break;
    }

    // Add "last chance" announcement
    const lastChanceTime = new Date(endDate.getTime() - 60 * 60 * 1000);
    if (lastChanceTime > now) {
      const queueId = crypto.randomUUID();
      schedules.push({
        key: `contest_queue:${queueId}`,
        value: {
          id: queueId,
          contest_id: contestId,
          scheduled_time: lastChanceTime.toISOString(),
          announcement_type: 'last_chance',
          status: 'pending',
          created_at: new Date().toISOString()
        }
      });
    }

    // Insert all schedules
    if (schedules.length > 0) {
      const keys = schedules.map(s => s.key);
      const values = schedules.map(s => s.value);
      await kv.mset(keys, values);

      console.log(`✅ Scheduled ${schedules.length} announcements for contest "${contest.title}"`);
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

export function shouldAnnounceContest(): boolean {
  return contestAnnouncementCounter >= 8;
}
