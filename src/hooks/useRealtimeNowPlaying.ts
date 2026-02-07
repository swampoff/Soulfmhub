import { useState, useEffect, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

interface NowPlayingData {
  track: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    duration?: number;
    cover?: string;
  };
  startTime: string;
  updatedAt: string;
}

interface AutoDJStatusData {
  isPlaying: boolean;
  currentTrack: any;
  currentTrackIndex: number;
  totalTracks: number;
  startTime: string | null;
  currentTrackStartTime: string | null;
  trackProgress: number;
  elapsedSeconds: number;
  autoAdvance: boolean;
  currentSchedule: any;
}

// Singleton channel - создаётся только один раз для всего приложения
let sharedChannel: RealtimeChannel | null = null;
let subscriberCount = 0;
const listeners = new Set<(data: any) => void>();

function getOrCreateChannel() {
  if (!sharedChannel) {
    console.log('🔌 Creating shared Realtime channel');
    sharedChannel = supabase.channel('radio-updates', {
      config: {
        broadcast: { self: false }
      }
    });

    // Listen for track changes
    sharedChannel.on('broadcast', { event: 'track-changed' }, (payload) => {
      console.log('🎵 Realtime: Track changed', payload);
      listeners.forEach(listener => listener(payload));
    });

    // Subscribe to channel
    sharedChannel.subscribe((status) => {
      console.log('📡 Shared channel status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Connected to radio-updates channel');
      }
    });
  }
  return sharedChannel;
}

function cleanupChannel() {
  if (sharedChannel && subscriberCount === 0) {
    console.log('🔌 Removing shared channel (no subscribers)');
    supabase.removeChannel(sharedChannel);
    sharedChannel = null;
    listeners.clear();
  }
}

export function useRealtimeNowPlaying() {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [autoDJStatus, setAutoDJStatus] = useState<AutoDJStatusData | null>(null);
  const [streamStatus, setStreamStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getRadioStatus();
      setNowPlaying(response.nowPlaying);
      setAutoDJStatus(response.autoDJ);
      setStreamStatus(response.streamStatus);
      setError(null);
    } catch (err: any) {
      console.error('Error loading initial radio status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    // Subscribe to shared channel
    subscriberCount++;
    const channel = getOrCreateChannel();

    // Local listener
    const handleUpdate = (payload: any) => {
      loadInitialData();
    };
    
    listeners.add(handleUpdate);

    // Cleanup
    return () => {
      listeners.delete(handleUpdate);
      subscriberCount--;
      cleanupChannel();
    };
  }, [loadInitialData]);

  return {
    nowPlaying,
    autoDJStatus,
    streamStatus,
    loading,
    error,
    refresh: loadInitialData
  };
}
