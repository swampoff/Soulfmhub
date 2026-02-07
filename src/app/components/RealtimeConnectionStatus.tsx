import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wifi, WifiOff, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Badge } from './ui/badge';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeConnectionStatusProps {
  showLabel?: boolean;
  compact?: boolean;
}

export function RealtimeConnectionStatus({ 
  showLabel = true, 
  compact = false 
}: RealtimeConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    // Create test channel to monitor connection
    channel = supabase.channel('connection-status-monitor', {
      config: {
        broadcast: { self: false }
      }
    });

    // Listen for any track-changed events
    channel.on('broadcast', { event: 'track-changed' }, () => {
      setEventCount(prev => prev + 1);
    });

    channel.subscribe((status) => {
      console.log('📡 [ConnectionStatus] Channel status:', status);
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setIsConnected(false);
      }
    });

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="relative"
      >
        {isConnected ? (
          <motion.div
            className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(34, 197, 94, 0.4)',
                '0 0 0 8px rgba(34, 197, 94, 0)',
                '0 0 0 0 rgba(34, 197, 94, 0)',
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Wifi className="w-4 h-4 text-green-500" />
          </motion.div>
        ) : (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20">
            <WifiOff className="w-4 h-4 text-red-500" />
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <Badge 
      className={`gap-2 px-3 py-1.5 ${
        isConnected 
          ? 'bg-green-500/10 text-green-400 border-green-500/30' 
          : 'bg-red-500/10 text-red-400 border-red-500/30'
      }`}
    >
      {isConnected ? (
        <>
          <motion.div
            className="relative flex items-center justify-center"
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Wifi className="w-4 h-4" />
            <motion.div
              className="absolute inset-0"
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(34, 197, 94, 0.4)',
                  '0 0 0 6px rgba(34, 197, 94, 0)',
                  '0 0 0 0 rgba(34, 197, 94, 0)',
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ borderRadius: '50%' }}
            />
          </motion.div>
          {showLabel && (
            <>
              <span className="text-xs font-semibold">Realtime Connected</span>
              {eventCount > 0 && (
                <motion.span 
                  key={eventCount}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-xs bg-green-500/20 rounded-full px-1.5 py-0.5"
                >
                  {eventCount}
                </motion.span>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          {showLabel && <span className="text-xs font-semibold">Disconnected</span>}
        </>
      )}
    </Badge>
  );
}

interface RealtimeActivityIndicatorProps {
  className?: string;
}

export function RealtimeActivityIndicator({ className = '' }: RealtimeActivityIndicatorProps) {
  const [lastActivity, setLastActivity] = useState<Date | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    channel = supabase.channel('activity-monitor', {
      config: {
        broadcast: { self: false }
      }
    });

    channel.on('broadcast', { event: 'track-changed' }, () => {
      setLastActivity(new Date());
    });

    channel.subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  if (!lastActivity) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex items-center gap-2 text-xs text-[#00d9ff] ${className}`}
    >
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Activity className="w-3 h-3" />
      </motion.div>
      <span>Last update: {lastActivity.toLocaleTimeString()}</span>
    </motion.div>
  );
}
