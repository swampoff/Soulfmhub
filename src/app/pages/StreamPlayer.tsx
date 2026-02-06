import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import { API_BASE } from '../../lib/supabase';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { motion } from 'motion/react';
import { Play, Pause, Volume2, VolumeX, Loader2, Music, AlertCircle } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  genre: string;
  year: number;
  coverUrl?: string;
  playCount: number;
  shortId: string;
  streamUrl: string;
}

export function StreamPlayer() {
  const { shortId } = useParams<{ shortId: string }>();
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadTrackInfo();
  }, [shortId]);

  const loadTrackInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/stream/info/${shortId}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTrack(data.track);
    } catch (err: any) {
      console.error('Load track error:', err);
      setError(err.message || 'Failed to load track');
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0d1a2d] to-[#0a1628] flex items-center justify-center p-4">
        <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-8 text-center">
          <Loader2 className="w-12 h-12 text-[#00d9ff] animate-spin mx-auto mb-4" />
          <p className="text-white">Loading track...</p>
        </Card>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0d1a2d] to-[#0a1628] flex items-center justify-center p-4">
        <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#FF8C42]/30 p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-[#FF8C42] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Track Not Found</h2>
          <p className="text-white/70 mb-4">{error || 'The requested track could not be found.'}</p>
          <p className="text-sm text-white/50">Short ID: {shortId}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0d1a2d] to-[#0a1628] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#00d9ff]/20 to-[#00ffaa]/20 border-b border-[#00d9ff]/30 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Music className="w-6 h-6 text-[#00d9ff]" />
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
                Soul FM Stream
              </h1>
            </div>
            <p className="text-white/70 text-sm">Now Playing</p>
          </div>

          {/* Cover Art / Placeholder */}
          <div className="relative aspect-square bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center">
            {track.coverUrl ? (
              <img
                src={track.coverUrl}
                alt={`${track.title} cover`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-8">
                <motion.div
                  animate={{
                    scale: isPlaying ? [1, 1.1, 1] : 1,
                    rotate: isPlaying ? 360 : 0,
                  }}
                  transition={{
                    scale: { duration: 2, repeat: Infinity },
                    rotate: { duration: 10, repeat: Infinity, ease: 'linear' },
                  }}
                >
                  <Music className="w-32 h-32 text-[#00d9ff]/50 mx-auto" />
                </motion.div>
              </div>
            )}

            {/* Animated playing indicator */}
            {isPlaying && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ transformOrigin: 'left' }}
              />
            )}
          </div>

          {/* Track Info */}
          <div className="p-6 space-y-4">
            {/* Title & Artist */}
            <div>
              <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
                {track.title}
              </h2>
              <p className="text-xl text-[#00d9ff] mb-3">{track.artist}</p>
              
              {/* Metadata */}
              <div className="flex items-center gap-3 flex-wrap">
                {track.album && (
                  <Badge variant="outline" className="border-white/20 text-white/70">
                    {track.album}
                  </Badge>
                )}
                <Badge variant="outline" className="border-[#00d9ff]/30 text-[#00d9ff]">
                  {track.genre}
                </Badge>
                {track.year && (
                  <Badge variant="outline" className="border-white/20 text-white/70">
                    {track.year}
                  </Badge>
                )}
                <Badge variant="outline" className="border-[#00ffaa]/30 text-[#00ffaa]">
                  {track.playCount} plays
                </Badge>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-white/10"
                style={{
                  background: `linear-gradient(to right, #00d9ff 0%, #00d9ff ${(currentTime / duration) * 100}%, rgba(255,255,255,0.1) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.1) 100%)`,
                }}
              />
              <div className="flex items-center justify-between text-sm text-white/50">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={togglePlay}
                className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] hover:opacity-90 transition-opacity w-20 h-20 rounded-full"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" fill="currentColor" />
                ) : (
                  <Play className="w-8 h-8" fill="currentColor" />
                )}
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={toggleMute}
                className="border-[#00d9ff]/30 text-white hover:bg-[#00d9ff]/10 w-14 h-14 rounded-full"
              >
                {isMuted ? (
                  <VolumeX className="w-6 h-6" />
                ) : (
                  <Volume2 className="w-6 h-6" />
                )}
              </Button>
            </div>

            {/* Short ID */}
            <div className="pt-4 border-t border-white/5 text-center">
              <p className="text-xs text-white/50">
                Stream ID: <span className="text-[#00d9ff] font-mono">{track.shortId}</span>
              </p>
            </div>
          </div>
        </Card>

        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={`${API_BASE}/stream/${shortId}`}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Branding */}
        <div className="text-center mt-6">
          <p className="text-white/50 text-sm">
            Powered by <span className="text-[#00d9ff] font-bold">Soul FM Hub</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
