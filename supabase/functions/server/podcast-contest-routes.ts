/**
 * Soul FM - Podcast & Contest Management Routes
 * Uses KV store instead of direct table queries.
 */

import { Hono } from "npm:hono@4";
import * as kv from './kv_store.tsx';
import * as podcastContestIntegration from "./podcast-contest-integration.ts";

export function setupPodcastContestRoutes(app: Hono, requireAuth: any) {

  // ==================== PODCAST SCHEDULING ====================

  // Get all podcast schedules
  app.get("/make-server-06086aa3/podcast-schedules", requireAuth, async (c) => {
    try {
      const allSchedules = await kv.getByPrefix('podcast_schedule:');
      const schedules = allSchedules
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return c.json({ schedules });
    } catch (error: any) {
      console.error('Get podcast schedules error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Create podcast schedule
  app.post("/make-server-06086aa3/podcast-schedules", requireAuth, async (c) => {
    try {
      const body = await c.req.json();
      const scheduleId = crypto.randomUUID();
      const schedule = {
        id: scheduleId,
        podcast_id: body.podcast_id,
        episode_id: body.episode_id,
        schedule_type: body.schedule_type,
        day_of_week: body.day_of_week,
        time_of_day: body.time_of_day,
        date: body.date,
        title: body.title,
        description: body.description,
        duration: body.duration,
        min_days_between_plays: body.min_days_between_plays || 7,
        is_active: body.is_active !== false,
        created_at: new Date().toISOString()
      };

      await kv.set(`podcast_schedule:${scheduleId}`, schedule);

      console.log(`✅ Created podcast schedule: "${body.title}"`);
      return c.json({ schedule });
    } catch (error: any) {
      console.error('Create podcast schedule error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Update podcast schedule
  app.put("/make-server-06086aa3/podcast-schedules/:id", requireAuth, async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();

      const schedule = await kv.get(`podcast_schedule:${id}`);
      if (!schedule) {
        return c.json({ error: 'Schedule not found' }, 404);
      }

      const updated = { ...schedule, ...body, updated_at: new Date().toISOString() };
      await kv.set(`podcast_schedule:${id}`, updated);

      return c.json({ schedule: updated });
    } catch (error: any) {
      console.error('Update podcast schedule error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Delete podcast schedule
  app.delete("/make-server-06086aa3/podcast-schedules/:id", requireAuth, async (c) => {
    try {
      const id = c.req.param('id');
      await kv.del(`podcast_schedule:${id}`);

      return c.json({ message: 'Podcast schedule deleted' });
    } catch (error: any) {
      console.error('Delete podcast schedule error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Get podcast play history
  app.get("/make-server-06086aa3/podcast-play-history", requireAuth, async (c) => {
    try {
      const allHistory = await kv.getByPrefix('podcast_play_history:');
      const history = allHistory
        .sort((a: any, b: any) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())
        .slice(0, 50);

      // Enrich with schedule data
      const enriched = [];
      for (const item of history) {
        const schedule = item.schedule_id ? await kv.get(`podcast_schedule:${item.schedule_id}`) : null;
        enriched.push({ ...item, schedule });
      }

      return c.json({ history: enriched });
    } catch (error: any) {
      console.error('Get podcast play history error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // ==================== CONTESTS ====================

  // Get all contests
  app.get("/make-server-06086aa3/contests", async (c) => {
    try {
      const status = c.req.query('status');
      let allContests = await kv.getByPrefix('contest:');

      if (status) {
        allContests = allContests.filter((ct: any) => ct.status === status);
      }

      const contests = allContests
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return c.json({ contests });
    } catch (error: any) {
      console.error('Get contests error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Get contest by ID
  app.get("/make-server-06086aa3/contests/:id", async (c) => {
    try {
      const id = c.req.param('id');
      const contest = await kv.get(`contest:${id}`);

      if (!contest) {
        return c.json({ error: 'Contest not found' }, 404);
      }

      return c.json({ contest });
    } catch (error: any) {
      console.error('Get contest error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Create contest
  app.post("/make-server-06086aa3/contests", requireAuth, async (c) => {
    try {
      const body = await c.req.json();
      const contestId = crypto.randomUUID();
      const contest = {
        id: contestId,
        title: body.title,
        description: body.description,
        prize: body.prize,
        entry_method: body.entry_method,
        entry_details: body.entry_details,
        start_date: body.start_date,
        end_date: body.end_date,
        status: body.status || 'draft',
        is_featured: body.is_featured || false,
        announcement_frequency: body.announcement_frequency || 'hourly',
        announcement_times: body.announcement_times,
        announcement_days: body.announcement_days,
        voice_name: body.voice_name || 'Professional Announcer',
        announcement_script: body.announcement_script,
        total_entries: 0,
        created_at: new Date().toISOString()
      };

      await kv.set(`contest:${contestId}`, contest);

      console.log(`✅ Created contest: "${body.title}"`);
      return c.json({ contest });
    } catch (error: any) {
      console.error('Create contest error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Update contest
  app.put("/make-server-06086aa3/contests/:id", requireAuth, async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();

      const contest = await kv.get(`contest:${id}`);
      if (!contest) {
        return c.json({ error: 'Contest not found' }, 404);
      }

      const updated = { ...contest, ...body, updated_at: new Date().toISOString() };
      await kv.set(`contest:${id}`, updated);

      return c.json({ contest: updated });
    } catch (error: any) {
      console.error('Update contest error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Delete contest
  app.delete("/make-server-06086aa3/contests/:id", requireAuth, async (c) => {
    try {
      const id = c.req.param('id');
      await kv.del(`contest:${id}`);

      return c.json({ message: 'Contest deleted' });
    } catch (error: any) {
      console.error('Delete contest error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Schedule contest announcements
  app.post("/make-server-06086aa3/contests/:id/schedule", requireAuth, async (c) => {
    try {
      const contestId = c.req.param('id');

      await podcastContestIntegration.scheduleContestAnnouncements(contestId);

      return c.json({ message: 'Contest announcements scheduled successfully' });
    } catch (error: any) {
      console.error('Schedule contest announcements error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Get contest announcement queue
  app.get("/make-server-06086aa3/contests/:id/queue", requireAuth, async (c) => {
    try {
      const contestId = c.req.param('id');
      const allQueue = await kv.getByPrefix('contest_queue:');
      const queue = allQueue
        .filter((q: any) => q.contest_id === contestId)
        .sort((a: any, b: any) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

      return c.json({ queue });
    } catch (error: any) {
      console.error('Get contest queue error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Submit contest entry
  app.post("/make-server-06086aa3/contests/:id/enter", async (c) => {
    try {
      const contestId = c.req.param('id');
      const body = await c.req.json();

      const contest = await kv.get(`contest:${contestId}`);
      if (!contest || contest.status !== 'active') {
        return c.json({ error: 'Contest not found or not active' }, 404);
      }

      if (new Date(contest.end_date) < new Date()) {
        return c.json({ error: 'Contest has ended' }, 400);
      }

      const entryId = crypto.randomUUID();
      const entry = {
        id: entryId,
        contest_id: contestId,
        entry_method: body.entry_method,
        contact_info: body.contact_info,
        entry_data: body.entry_data,
        created_at: new Date().toISOString()
      };

      await kv.set(`contest_entry:${entryId}`, entry);

      // Increment total entries count
      contest.total_entries = (contest.total_entries || 0) + 1;
      await kv.set(`contest:${contestId}`, contest);

      console.log(`✅ New entry for contest "${contest.title}"`);
      return c.json({ entry, message: 'Entry submitted successfully!' });
    } catch (error: any) {
      console.error('Submit contest entry error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Get contest stats
  app.get("/make-server-06086aa3/contests/stats", requireAuth, async (c) => {
    try {
      const allContests = await kv.getByPrefix('contest:');

      // Group by status
      const statusCounts: Record<string, number> = {};
      for (const contest of allContests) {
        const status = contest.status || 'draft';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }

      const stats = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

      return c.json({ stats });
    } catch (error: any) {
      console.error('Get contest stats error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
}
