/**
 * Soul FM - Podcast & Contest Management Routes
 */

import { Hono } from "npm:hono@4";
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as podcastContestIntegration from "./podcast-contest-integration.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export function setupPodcastContestRoutes(app: Hono, requireAuth: any) {
  
  // ==================== PODCAST SCHEDULING ====================
  
  // Get all podcast schedules
  app.get("/make-server-06086aa3/podcast-schedules", requireAuth, async (c) => {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from('podcast_schedule_06086aa3')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return c.json({ schedules: data || [] });
    } catch (error: any) {
      console.error('Get podcast schedules error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Create podcast schedule
  app.post("/make-server-06086aa3/podcast-schedules", requireAuth, async (c) => {
    try {
      const body = await c.req.json();
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from('podcast_schedule_06086aa3')
        .insert({
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
          is_active: body.is_active !== false
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log(`✅ Created podcast schedule: "${body.title}"`);
      return c.json({ schedule: data });
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
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from('podcast_schedule_06086aa3')
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return c.json({ schedule: data });
    } catch (error: any) {
      console.error('Update podcast schedule error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Delete podcast schedule
  app.delete("/make-server-06086aa3/podcast-schedules/:id", requireAuth, async (c) => {
    try {
      const id = c.req.param('id');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { error } = await supabase
        .from('podcast_schedule_06086aa3')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return c.json({ message: 'Podcast schedule deleted' });
    } catch (error: any) {
      console.error('Delete podcast schedule error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Get podcast play history
  app.get("/make-server-06086aa3/podcast-play-history", requireAuth, async (c) => {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from('podcast_play_history_06086aa3')
        .select(`
          *,
          schedule:podcast_schedule_06086aa3(*)
        `)
        .order('played_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      return c.json({ history: data || [] });
    } catch (error: any) {
      console.error('Get podcast play history error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // ==================== CONTESTS ====================
  
  // Get all contests
  app.get("/make-server-06086aa3/contests", async (c) => {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const status = c.req.query('status');
      
      let query = supabase
        .from('contests_06086aa3')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return c.json({ contests: data || [] });
    } catch (error: any) {
      console.error('Get contests error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Get contest by ID
  app.get("/make-server-06086aa3/contests/:id", async (c) => {
    try {
      const id = c.req.param('id');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from('contests_06086aa3')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return c.json({ contest: data });
    } catch (error: any) {
      console.error('Get contest error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Create contest
  app.post("/make-server-06086aa3/contests", requireAuth, async (c) => {
    try {
      const body = await c.req.json();
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from('contests_06086aa3')
        .insert({
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
          announcement_script: body.announcement_script
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log(`✅ Created contest: "${body.title}"`);
      return c.json({ contest: data });
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
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from('contests_06086aa3')
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return c.json({ contest: data });
    } catch (error: any) {
      console.error('Update contest error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Delete contest
  app.delete("/make-server-06086aa3/contests/:id", requireAuth, async (c) => {
    try {
      const id = c.req.param('id');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { error } = await supabase
        .from('contests_06086aa3')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
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
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from('contest_announcements_queue_06086aa3')
        .select('*')
        .eq('contest_id', contestId)
        .order('scheduled_time', { ascending: true });
      
      if (error) throw error;
      
      return c.json({ queue: data || [] });
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
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Verify contest is active
      const { data: contest, error: contestError } = await supabase
        .from('contests_06086aa3')
        .select('*')
        .eq('id', contestId)
        .eq('status', 'active')
        .single();
      
      if (contestError || !contest) {
        return c.json({ error: 'Contest not found or not active' }, 404);
      }
      
      // Check if contest hasn't ended
      if (new Date(contest.end_date) < new Date()) {
        return c.json({ error: 'Contest has ended' }, 400);
      }
      
      // Create entry
      const { data, error } = await supabase
        .from('contest_entries_06086aa3')
        .insert({
          contest_id: contestId,
          entry_method: body.entry_method,
          contact_info: body.contact_info,
          entry_data: body.entry_data
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Increment total entries count
      await supabase
        .from('contests_06086aa3')
        .update({ total_entries: (contest.total_entries || 0) + 1 })
        .eq('id', contestId);
      
      console.log(`✅ New entry for contest "${contest.title}"`);
      return c.json({ entry: data, message: 'Entry submitted successfully!' });
    } catch (error: any) {
      console.error('Submit contest entry error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
  
  // Get contest stats
  app.get("/make-server-06086aa3/contests/stats", requireAuth, async (c) => {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: contests, error } = await supabase
        .from('contests_06086aa3')
        .select('status, COUNT(*)')
        .group('status');
      
      if (error) throw error;
      
      return c.json({ stats: contests || [] });
    } catch (error: any) {
      console.error('Get contest stats error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
}
