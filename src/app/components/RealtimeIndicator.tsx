import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wifi, WifiOff, Radio, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function RealtimeIndicator() {
  const [isConnected, setIsConnected] = useState(false);
  const [showIndicator, setShowIndicator] = useState(true);
  const [connectionCount, setConnectionCount] = useState(0);

  useEffect(() => {
    console.log('🔌 RealtimeIndicator: Checking connection status');
    
    // Simple check - no subscription, just get status
    const channels = supabase.getChannels();
    console.log('📡 Active channels:', channels.length);
    
    const hasActiveChannels = channels.some(ch => ch.state === 'joined');
    setIsConnected(hasActiveChannels);
    setConnectionCount(channels.length);

    // Check periodically
    const interval = setInterval(() => {
      const currentChannels = supabase.getChannels();
      const isActive = currentChannels.some(ch => ch.state === 'joined');
      setIsConnected(isActive);
      setConnectionCount(currentChannels.length);
    }, 2000);

    // Auto-hide after 5 seconds if connected
    const timer = setTimeout(() => {
      if (isConnected) {
        setShowIndicator(false);
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isConnected]);

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50"
          onClick={() => setShowIndicator(false)}
        >
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-xl border cursor-pointer ${
              isConnected
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
            }`}
          >
            <motion.div
              animate={{
                scale: isConnected ? [1, 1.2, 1] : 1,
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {isConnected ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
            </motion.div>
            <span className="text-sm font-medium">
              {isConnected ? `Live Sync Active (${connectionCount})` : 'Connecting...'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}