import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { sampleTracks, sampleShows, sampleSchedule, sampleNews } from '../../lib/initData';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

export function InitDataButton() {
  const [loading, setLoading] = useState(false);
  const [seedingContent, setSeedingContent] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [assigningAdmin, setAssigningAdmin] = useState(false);

  const assignSuperAdmin = async () => {
    setAssigningAdmin(true);
    toast.info(`Assigning super_admin role to ${adminEmail}...`);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/admin/assign-super-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email: adminEmail }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(`✅ Super Admin assigned: ${data.user.email}`);
      } else {
        toast.error(data.error || 'Failed to assign super admin');
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setAssigningAdmin(false);
    }
  };

  const initializeData = async () => {
    setLoading(true);
    toast.info('Initializing sample data...');

    try {
      // Create sample tracks
      for (const track of sampleTracks) {
        await api.createTrack(track);
      }
      toast.success(`Created ${sampleTracks.length} sample tracks`);

      // Create sample shows
      for (const show of sampleShows) {
        await api.createShow(show);
      }
      toast.success(`Created ${sampleShows.length} sample shows`);

      // Create sample schedule
      for (const schedule of sampleSchedule) {
        await api.createSchedule({
          ...schedule,
          utcOffsetMinutes: new Date().getTimezoneOffset(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }
      toast.success(`Created ${sampleSchedule.length} schedule entries`);

      // Create sample news
      for (const news of sampleNews) {
        await api.createNewsItem(news);
      }
      toast.success(`Created ${sampleNews.length} news articles`);

      // Set initial now playing
      await api.updateNowPlaying(
        {
          id: '1',
          title: sampleTracks[0].title,
          artist: sampleTracks[0].artist,
          album: sampleTracks[0].album,
          cover: sampleTracks[0].cover,
        },
        {
          id: '1',
          name: sampleSchedule[0].name,
          host: sampleSchedule[0].host,
          isLive: sampleSchedule[0].type === 'live',
        }
      );

      // Set stream status
      await api.updateStreamStatus({
        status: 'online',
        listeners: Math.floor(Math.random() * 200) + 50,
        bitrate: '128kbps',
        uptime: 99.8,
      });

      toast.success('All sample data initialized successfully!');
    } catch (error: any) {
      console.error('Error initializing data:', error);
      toast.error(`Failed to initialize data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const seedShowsAndPodcasts = async () => {
    setSeedingContent(true);
    toast.info('Seeding shows, podcasts & profiles from server...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/seed-all`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success('Shows, podcasts & profiles seeded successfully!');
      } else {
        toast.error(data.error || 'Failed to seed content');
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setSeedingContent(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Admin Assignment Card */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-2">
            🔐 Assign Super Admin Role
          </h3>
          <p className="text-white/70 text-sm mb-4">
            Assign super_admin role to a registered user. User must sign up first.
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="email"
              placeholder="admin@example.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              disabled={assigningAdmin}
              className="flex-1 bg-white/5 border-white/20 text-white"
            />
            <Button
              onClick={assignSuperAdmin}
              disabled={assigningAdmin || !adminEmail}
              className="bg-gradient-to-r from-cyan-500 to-blue-500"
            >
              {assigningAdmin ? 'Assigning...' : 'Assign Admin'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Sample Data Initialization Card */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">
              Initialize Sample Data
            </h3>
            <p className="text-white/70 text-sm">
              Click to populate the database with sample tracks, shows, schedule, and news.
              This is useful for testing and demonstration purposes.
            </p>
          </div>
          <Button
            onClick={initializeData}
            disabled={loading}
            className="bg-gradient-to-r from-orange-500 to-pink-500"
          >
            {loading ? 'Initializing...' : 'Initialize Data'}
          </Button>
        </div>
      </Card>

      {/* Seed Shows & Podcasts Card */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">
              Seed Shows, Podcasts & Profiles
            </h3>
            <p className="text-white/70 text-sm">
              Seed rich show/podcast data with episodes and DJ profiles from the server.
              Uses the dedicated <code className="text-[#00d9ff]">/seed-all</code> endpoint.
            </p>
          </div>
          <Button
            onClick={seedShowsAndPodcasts}
            disabled={seedingContent}
            className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold"
          >
            {seedingContent ? 'Seeding...' : 'Seed Content'}
          </Button>
        </div>
      </Card>
    </div>
  );
}