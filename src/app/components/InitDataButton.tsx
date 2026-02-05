import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { sampleTracks, sampleShows, sampleSchedule, sampleNews } from '../../lib/initData';

export function InitDataButton() {
  const [loading, setLoading] = useState(false);

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
        await api.createSchedule(schedule);
      }
      toast.success(`Created ${sampleSchedule.length} schedule entries`);

      // Create sample news
      for (const news of sampleNews) {
        await api.createNews(news);
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

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 mb-6">
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
  );
}
