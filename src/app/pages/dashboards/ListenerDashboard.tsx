import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { api } from '../../../lib/api';
import { motion } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Heart, History, Music, LogOut, User, Clock } from 'lucide-react';
import { useNavigate } from 'react-router';

export function ListenerDashboard() {
  const { user, signOut, nowPlaying } = useApp();
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await api.getHistory(10);
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    toast.success('Signed out successfully');
  };

  return (
    <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <User className="w-8 h-8 text-[#00d9ff]" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-family-display)' }}>
                  My Dashboard
                </h1>
              </div>
              <p className="text-white/70">Welcome back, <span className="text-[#00d9ff] font-semibold">{user?.name || 'Listener'}</span></p>
            </div>
            {user && (
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="border-[#FF8C42]/30 text-[#FF8C42] hover:bg-[#FF8C42]/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Now Playing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Music className="w-5 h-5 text-[#00d9ff]" />
                Now Playing
              </h2>
              {nowPlaying ? (
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] rounded-lg flex items-center justify-center">
                    <Music className="w-10 h-10 text-[#0a1628]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{nowPlaying.track.title}</h3>
                    <p className="text-white/70">{nowPlaying.track.artist}</p>
                  </div>
                </div>
              ) : (
                <p className="text-white/50">No track playing</p>
              )}
            </Card>
          </motion.div>

          {/* Favorites */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00ffaa]/30 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#00ffaa]" />
                Favorites
              </h2>
              <p className="text-white/50">You haven't favorited any tracks yet</p>
            </Card>
          </motion.div>

          {/* Listening History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-[#00d9ff]" />
                Recently Played
              </h2>
              <div className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-white/50">No listening history yet</p>
                ) : (
                  history.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-3 bg-[#0a1628]/50 rounded-lg"
                    >
                      <Clock className="w-4 h-4 text-white/50" />
                      <div className="flex-1">
                        <p className="text-white font-medium">{item.track?.title || 'Unknown'}</p>
                        <p className="text-sm text-white/70">{item.track?.artist || 'Unknown'}</p>
                      </div>
                      <Badge variant="outline" className="border-[#00d9ff]/30 text-[#00d9ff] text-xs">
                        {new Date(item.playedAt).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </motion.div>
        </div>
    </div>
  );
}