import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import {
  Play,
  Pause,
  SkipForward,
  Radio,
  Music,
  Users,
  Clock,
  Loader2,
  Copy,
  ExternalLink
} from 'lucide-react';

interface AutoDJStatus {
  autoDJ: {
    isPlaying: boolean;
    currentTrack: any;
    currentTrackIndex: number;
    totalTracks: number;
    startTime: string | null;
  };
  nowPlaying: any;
  streamStatus: any;
}

export function AutoDJControl() {
  const [status, setStatus] = useState<AutoDJStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [startingDJ, setStartingDJ] = useState(false);
  const [stoppingDJ, setStoppingDJ] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const liveStreamURL = api.getLiveRadioURL();

  useEffect(() => {
    loadStatus();
    
    // Refresh status every 10 seconds
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await api.getRadioStatus();
      setStatus(response);
    } catch (error) {
      console.error('Error loading Auto DJ status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDJ = async () => {
    try {
      setStartingDJ(true);
      const response = await api.startAutoDJ();
      
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success('🎵 Auto DJ started!');
        await loadStatus();
      }
    } catch (error: any) {
      console.error('Error starting Auto DJ:', error);
      toast.error(error.message || 'Failed to start Auto DJ');
    } finally {
      setStartingDJ(false);
    }
  };

  const handleStopDJ = async () => {
    if (!confirm('Stop the Auto DJ? This will end the live broadcast.')) return;

    try {
      setStoppingDJ(true);
      const response = await api.stopAutoDJ();
      
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success('Auto DJ stopped');
        await loadStatus();
      }
    } catch (error: any) {
      console.error('Error stopping Auto DJ:', error);
      toast.error(error.message || 'Failed to stop Auto DJ');
    } finally {
      setStoppingDJ(false);
    }
  };

  const handleSkipTrack = async () => {
    try {
      setSkipping(true);
      const response = await api.skipToNextTrack();
      
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success(`⏭️ Skipped to: ${response.currentTrack.title}`);
        await loadStatus();
      }
    } catch (error: any) {
      console.error('Error skipping track:', error);
      toast.error(error.message || 'Failed to skip track');
    } finally {
      setSkipping(false);
    }
  };

  const copyStreamURL = () => {
    navigator.clipboard.writeText(liveStreamURL);
    toast.success('Stream URL copied to clipboard!');
  };

  const isPlaying = status?.autoDJ?.isPlaying || false;
  const currentTrack = status?.autoDJ?.currentTrack;
  const listeners = status?.streamStatus?.listeners || 0;

  return (
    <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] rounded-xl">
            <Radio className="w-6 h-6 text-[#0a1628]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
              Auto DJ Control
            </h2>
            <p className="text-sm text-white/70">Manage live broadcast</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={isPlaying 
              ? 'border-[#00ffaa] text-[#00ffaa] bg-[#00ffaa]/10'
              : 'border-white/30 text-white/50'
            }
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${isPlaying ? 'bg-[#00ffaa] animate-pulse' : 'bg-white/30'}`} />
            {isPlaying ? 'ON AIR' : 'OFFLINE'}
          </Badge>
        </div>
      </div>

      {/* Current Track */}
      {currentTrack && isPlaying && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-[#0a1628]/50 rounded-lg border border-[#00d9ff]/20"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] rounded-lg flex items-center justify-center flex-shrink-0">
              <Music className="w-8 h-8 text-[#0a1628]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Now Playing</p>
              <h3 className="text-xl font-bold text-white truncate">{currentTrack.title}</h3>
              <p className="text-white/70 truncate">{currentTrack.artist}</p>
            </div>
          </div>

          {status?.autoDJ && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-white/50 mb-2">
                <span>Track {status.autoDJ.currentTrackIndex + 1} of {status.autoDJ.totalTracks}</span>
                <span>{currentTrack.duration ? `${Math.floor(currentTrack.duration / 60)}:${String(currentTrack.duration % 60).padStart(2, '0')}` : '--:--'}</span>
              </div>
              <Progress
                value={((status.autoDJ.currentTrackIndex + 1) / status.autoDJ.totalTracks) * 100}
                className="h-1"
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-[#0a1628]/30 border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#00d9ff]" />
            <div>
              <p className="text-xs text-white/50">Listeners</p>
              <p className="text-2xl font-bold text-white">{listeners}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-[#0a1628]/30 border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Music className="w-5 h-5 text-[#00ffaa]" />
            <div>
              <p className="text-xs text-white/50">Tracks</p>
              <p className="text-2xl font-bold text-white">{status?.autoDJ?.totalTracks || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-[#0a1628]/30 border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#FF8C42]" />
            <div>
              <p className="text-xs text-white/50">Uptime</p>
              <p className="text-2xl font-bold text-white">
                {status?.autoDJ?.startTime 
                  ? Math.floor((new Date().getTime() - new Date(status.autoDJ.startTime).getTime()) / 60000) + 'm'
                  : '0m'
                }
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {!isPlaying ? (
          <Button
            onClick={handleStartDJ}
            disabled={startingDJ || loading}
            className="w-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628] h-12 text-lg font-semibold"
          >
            {startingDJ ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Starting Auto DJ...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Start Auto DJ
              </>
            )}
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleSkipTrack}
              disabled={skipping}
              className="bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628] h-12"
            >
              {skipping ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Skipping...
                </>
              ) : (
                <>
                  <SkipForward className="w-5 h-5 mr-2" />
                  Skip Track
                </>
              )}
            </Button>

            <Button
              onClick={handleStopDJ}
              disabled={stoppingDJ}
              variant="outline"
              className="border-[#FF8C42]/30 text-[#FF8C42] hover:bg-[#FF8C42]/10 h-12"
            >
              {stoppingDJ ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Stop Auto DJ
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Stream URL */}
      <div className="mt-6 p-4 bg-[#00d9ff]/5 border border-[#00d9ff]/20 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-white">Live Radio Stream URL</p>
          <Badge variant="outline" className="border-[#00ffaa]/30 text-[#00ffaa] text-xs">
            Public Link
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm bg-[#0a1628]/80 px-3 py-2 rounded border border-[#00d9ff]/10 text-[#00d9ff] font-mono truncate">
            {liveStreamURL}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={copyStreamURL}
            className="border-[#00d9ff]/30 text-[#00d9ff] hover:bg-[#00d9ff]/10 flex-shrink-0"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(liveStreamURL, '_blank')}
            className="border-[#00ffaa]/30 text-[#00ffaa] hover:bg-[#00ffaa]/10 flex-shrink-0"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Test
          </Button>
        </div>
        <p className="text-xs text-white/50 mt-2">
          Share this URL with your listeners to stream the live radio
        </p>
      </div>
    </Card>
  );
}
