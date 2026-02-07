import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { supabase } from '../../lib/supabase';
import { Radio, Wifi, Activity } from 'lucide-react';

export function RealtimeDebug() {
  const [status, setStatus] = useState<string>('disconnected');
  const [events, setEvents] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    console.log('🔍 RealtimeDebug: Mounting');
    
    const channel = supabase.channel('radio-updates-debug', {
      config: {
        broadcast: { self: false }
      }
    });

    // Track all events
    channel.on('broadcast', { event: 'track-changed' }, (payload) => {
      const msg = `Track changed: ${payload.payload?.track?.title || 'Unknown'}`;
      console.log('🎵', msg);
      setEvents(prev => [msg, ...prev].slice(0, 10));
      setLastUpdate(new Date());
    });

    channel.subscribe((channelStatus) => {
      console.log('📡 Debug channel status:', channelStatus);
      setStatus(channelStatus);
    });

    return () => {
      console.log('🔍 RealtimeDebug: Unmounting');
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="p-4 bg-[#0a1628]/80 border-[#00d9ff]/30">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#00d9ff]" />
            <h3 className="font-semibold text-white">Realtime Status</h3>
          </div>
          <Badge 
            variant={status === 'SUBSCRIBED' ? 'default' : 'secondary'}
            className={status === 'SUBSCRIBED' ? 'bg-green-500/20 text-green-400' : ''}
          >
            {status}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Activity className="w-4 h-4" />
          <span>
            Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
          </span>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-gray-500 uppercase font-semibold mb-2">
            Recent Events ({events.length})
          </div>
          {events.length === 0 ? (
            <div className="text-sm text-gray-500 italic">No events yet</div>
          ) : (
            events.map((event, i) => (
              <div key={i} className="text-xs text-gray-400 bg-white/5 p-2 rounded">
                {event}
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
