import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Radio, Clock } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { RealtimeChannel } from '@supabase/supabase-js';

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

export function PublicNowPlayingWidget() {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;
    let connectionTimeout: NodeJS.Timeout | null = null;
    let connected = false; // Local variable to track connection status

    console.log('🔌 [PublicNowPlaying] Setting up Realtime channel');

    // Initial load
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const response = await api.getRadioStatus();
        if (response.nowPlaying) {
          setNowPlaying(response.nowPlaying);
        }
      } catch (err) {
        console.error('[PublicNowPlaying] Error loading initial data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    // Start polling as default fallback (will be cleared if realtime connects)
    const startPolling = () => {
      if (!pollingInterval) {
        console.log('📊 [PublicNowPlaying] Starting polling mode');
        pollingInterval = setInterval(loadInitialData, 15000); // Poll every 15 seconds
      }
    };

    // Start connection timeout - if realtime doesn't connect in 5 seconds, use polling
    connectionTimeout = setTimeout(() => {
      if (!connected) {
        console.log('⏱️ [PublicNowPlaying] Using polling mode (realtime not connected)');
        startPolling();
      }
    }, 5000);

    // Subscribe to Realtime updates
    channel = supabase.channel('radio-updates-public', {
      config: {
        broadcast: { self: false }
      }
    });

    channel.on('broadcast', { event: 'track-changed' }, async (payload) => {
      console.log('🎵 [PublicNowPlaying] Track changed via Realtime:', payload);
      // Reload data
      await loadInitialData();
    });

    channel.subscribe((status) => {
      console.log('📡 [PublicNowPlaying] Realtime channel status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ [PublicNowPlaying] Connected to radio-updates-public channel');
        connected = true;
        setIsConnected(true);
        // Clear timeout and polling if realtime works
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        connected = false;
        setIsConnected(false);
        // Start polling as fallback
        startPolling();
      }
    });

    // Cleanup
    return () => {
      console.log('🔌 [PublicNowPlaying] Cleaning up Realtime channel');
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
    };
  }, []);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-[#00d9ff]/10 to-[#00ffaa]/10 border-[#00d9ff]/30 backdrop-blur-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-[#00d9ff]/20 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-[#00d9ff]/20 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-[#00d9ff]/20 rounded animate-pulse w-1/2" />
          </div>
        </div>
      </Card>
    );
  }

  if (!nowPlaying) {
    return (
      <Card className="bg-gradient-to-br from-[#00d9ff]/10 to-[#00ffaa]/10 border-[#00d9ff]/30 backdrop-blur-xl p-6">
        <div className="flex items-center gap-3 text-[#00d9ff]">
          <Radio className="w-5 h-5 animate-pulse" />
          <span className="text-sm font-medium">Connecting to stream...</span>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card className="bg-gradient-to-br from-[#00d9ff]/10 to-[#00ffaa]/10 border-[#00d9ff]/30 backdrop-blur-xl overflow-hidden relative group hover:shadow-2xl hover:shadow-[#00d9ff]/20 transition-all duration-500">
        {/* Live Indicator */}
        <div className="absolute top-4 right-4 z-10">
          <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 gap-2 backdrop-blur-sm">
            <motion.span 
              className="w-2 h-2 bg-red-500 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.55, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <span className="text-xs font-bold uppercase">Live</span>
          </Badge>
        </div>

        {/* Realtime Connection Status */}
        {isConnected && (
          <div className="absolute top-4 left-4 z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-1 backdrop-blur-sm"
            >
              <motion.span 
                className="w-1.5 h-1.5 bg-green-500 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.55, 1]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <span className="text-xs font-medium">Real-time</span>
            </motion.div>
          </div>
        )}

        <div className="p-6 pt-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={nowPlaying.track.id}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="flex items-center gap-4"
            >
              {/* Album Art */}
              <motion.div
                className="relative w-20 h-20 rounded-xl overflow-hidden shadow-2xl flex-shrink-0"
                whileHover={{ scale: 1.04 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {nowPlaying.track.cover ? (
                  <>
                    <img 
                      src={nowPlaying.track.cover} 
                      alt={nowPlaying.track.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#00d9ff]/30 to-transparent" />
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] flex items-center justify-center">
                    <Music className="w-8 h-8 text-[#0a1628]" />
                  </div>
                )}

                {/* Animated border */}
                <motion.div
                  className="absolute inset-0 border-2 border-[#00d9ff] rounded-xl"
                  animate={{
                    opacity: [0.25, 0.6, 0.25],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-lg font-bold text-[#00d9ff] truncate group-hover:text-[#00ffaa] transition-colors">
                    {nowPlaying.track.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-400 truncate mb-2">
                  {nowPlaying.track.artist}
                </p>
                {nowPlaying.track.album && (
                  <p className="text-xs text-gray-500 truncate">
                    {nowPlaying.track.album}
                  </p>
                )}

                {/* Track Duration */}
                {nowPlaying.track.duration && (
                  <div className="flex items-center gap-2 mt-3">
                    <Clock className="w-3 h-3 text-[#00d9ff]/60" />
                    <span className="text-xs text-gray-500">
                      {Math.floor(nowPlaying.track.duration / 60)}:{String(nowPlaying.track.duration % 60).padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Sound Wave Visualizer */}
          <div className="mt-4 flex items-end justify-center gap-1 h-8">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-gradient-to-t from-[#00d9ff] to-[#00ffaa] rounded-full"
                animate={{
                  height: ['20%', '100%', '20%'],
                }}
                transition={{
                  duration: 1.2 + (i * 0.12),
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.08
                }}
              />
            ))}
          </div>
        </div>

        {/* Animated Background Gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-[#00d9ff]/5 to-[#00ffaa]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          animate={{
            background: [
              'radial-gradient(circle at 0% 0%, rgba(0, 217, 255, 0.04) 0%, transparent 50%)',
              'radial-gradient(circle at 100% 100%, rgba(0, 255, 170, 0.04) 0%, transparent 50%)',
              'radial-gradient(circle at 0% 0%, rgba(0, 217, 255, 0.04) 0%, transparent 50%)',
            ]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </Card>
    </motion.div>
  );
}