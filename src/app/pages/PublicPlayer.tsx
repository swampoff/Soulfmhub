import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Slider } from '../components/ui/slider';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  Music,
  ExternalLink,
  Share2,
  Heart,
  Download,
  SkipBack,
  SkipForward,
  Loader2
} from 'lucide-react';

interface TrackData {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  coverUrl?: string;
  genre?: string;
  streamUrl: string;
}

export function PublicPlayer() {
  const { uniqueId } = useParams<{ uniqueId: string }>();
  const navigate = useNavigate();
  
  const [track, setTrack] = useState<TrackData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [radioStatus, setRadioStatus] = useState<any>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (uniqueId) {
      if (uniqueId === 'live') {
        loadLiveRadio();
      } else {
        loadTrack();
      }
    }

    // Load radio status
    loadRadioStatus();
    const interval = setInterval(loadRadioStatus, 10000);
    return () => clearInterval(interval);
  }, [uniqueId]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const loadTrack = async () => {
    try {
      setLoading(true);
      const response = await api.getStreamInfo(uniqueId!);
      
      if (response.error) {
        setError(response.error);
        return;
      }

      const streamUrl = `${api.getStreamURL()}/${uniqueId}`;
      
      setTrack({
        ...response.track,
        streamUrl
      });
      
    } catch (err: any) {
      console.error('Error loading track:', err);
      setError(err.message || 'Failed to load track');
    } finally {
      setLoading(false);
    }
  };

  const loadLiveRadio = async () => {
    try {
      setLoading(true);
      const streamUrl = api.getLiveRadioURL();
      const response = await api.getRadioStatus();
      
      if (!response.autoDJ?.isPlaying) {
        setError('Radio stream is offline. Please try again later.');
        return;
      }

      const currentTrack = response.autoDJ.currentTrack;
      
      setTrack({
        id: 'live',
        title: currentTrack?.title || 'Live Stream',
        artist: currentTrack?.artist || 'Soul FM Hub',
        album: currentTrack?.album,
        duration: currentTrack?.duration || 0,
        coverUrl: currentTrack?.coverUrl,
        genre: currentTrack?.genre,
        streamUrl
      });
      
    } catch (err: any) {
      console.error('Error loading live radio:', err);
      setError(err.message || 'Failed to load live radio');
    } finally {
      setLoading(false);
    }
  };

  const loadRadioStatus = async () => {
    try {
      const response = await api.getRadioStatus();
      setRadioStatus(response.streamStatus);
      setNowPlaying(response.nowPlaying);
    } catch (err) {
      console.error('Error loading radio status:', err);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !track) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Playback error:', err);
        toast.error('Failed to play audio');
      });
    }
    setIsPlaying(!isPlaying);
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

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    if (isMuted && value[0] > 0) {
      setIsMuted(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const goToHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#00d9ff] animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading player...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] flex items-center justify-center p-4">
        <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#FF8C42]/30 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-[#FF8C42]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Music className="w-8 h-8 text-[#FF8C42]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Track Not Found</h2>
          <p className="text-white/70 mb-6">{error}</p>
          <Button
            onClick={goToHome}
            className="bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628]"
          >
            Go to Soul FM Hub
          </Button>
        </Card>
      </div>
    );
  }

  if (!track) return null;

  const isLive = uniqueId === 'live';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-[#00d9ff] rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-[#00ffaa] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-[#FF8C42] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <Card className="bg-[#0f1c2e]/95 backdrop-blur-xl border-[#00d9ff]/30 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={goToHome}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] rounded-full flex items-center justify-center">
                    <Radio className="w-6 h-6 text-[#0a1628]" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
                      Soul FM Hub
                    </h1>
                    <p className="text-xs text-white/50">Your Groove Station</p>
                  </div>
                </div>

                {isLive && radioStatus?.status === 'online' && (
                  <Badge
                    variant="outline"
                    className="border-[#00ffaa] text-[#00ffaa] bg-[#00ffaa]/10 animate-pulse"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#00ffaa] mr-2" />
                    LIVE
                  </Badge>
                )}
              </div>
            </div>

            {/* Cover Art */}
            <div className="relative aspect-square bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20">
              {track.coverUrl ? (
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-32 h-32 text-[#00d9ff]/30" />
                </div>
              )}
              
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1c2e] via-transparent to-transparent" />
              
              {/* Track Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
                    {track.title}
                  </h2>
                  <p className="text-xl text-white/90 mb-3">{track.artist}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {track.album && (
                      <Badge variant="outline" className="border-white/30 text-white bg-black/30">
                        {track.album}
                      </Badge>
                    )}
                    {track.genre && (
                      <Badge variant="outline" className="border-[#00d9ff]/30 text-[#00d9ff] bg-[#00d9ff]/10">
                        {track.genre}
                      </Badge>
                    )}
                    {isLive && (
                      <Badge variant="outline" className="border-[#00ffaa]/30 text-[#00ffaa] bg-[#00ffaa]/10">
                        <Radio className="w-3 h-3 mr-1" />
                        Live Broadcast
                      </Badge>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Player Controls */}
            <div className="p-6 space-y-6">
              {/* Progress Bar */}
              {!isLive && duration > 0 && (
                <div className="space-y-2">
                  <Slider
                    value={[currentTime]}
                    max={duration}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-sm text-white/50">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              )}

              {/* Main Controls */}
              <div className="flex items-center justify-center gap-4">
                {!isLive && (
                  <Button
                    size="lg"
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/5 rounded-full w-12 h-12 p-0"
                    disabled
                  >
                    <SkipBack className="w-5 h-5" />
                  </Button>
                )}

                <Button
                  size="lg"
                  onClick={togglePlayPause}
                  className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628] rounded-full w-16 h-16 p-0 shadow-lg shadow-[#00d9ff]/30"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8" fill="currentColor" />
                  ) : (
                    <Play className="w-8 h-8 ml-1" fill="currentColor" />
                  )}
                </Button>

                {!isLive && (
                  <Button
                    size="lg"
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/5 rounded-full w-12 h-12 p-0"
                    disabled
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>
                )}
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleMute}
                  className="text-white/70 hover:text-white hover:bg-white/5 rounded-full w-10 h-10 p-0 flex-shrink-0"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="flex-1"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="border-[#00d9ff]/30 text-[#00d9ff] hover:bg-[#00d9ff]/10"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#00ffaa]/30 text-[#00ffaa] hover:bg-[#00ffaa]/10"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Like
                </Button>
                {isLive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToHome}
                    className="border-[#FF8C42]/30 text-[#FF8C42] hover:bg-[#FF8C42]/10"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/30 text-white/70 hover:bg-white/5"
                    disabled
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>

              {/* Now Playing on Radio (if not live) */}
              {!isLive && nowPlaying?.track && radioStatus?.status === 'online' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 bg-[#00d9ff]/5 border border-[#00d9ff]/20 rounded-lg"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Radio className="w-4 h-4 text-[#00d9ff]" />
                    <p className="text-sm font-semibold text-white">Now Playing on Live Radio</p>
                    <Badge
                      variant="outline"
                      className="border-[#00ffaa] text-[#00ffaa] bg-[#00ffaa]/10 text-xs ml-auto"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00ffaa] mr-1 animate-pulse" />
                      LIVE
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] rounded flex items-center justify-center flex-shrink-0">
                      <Music className="w-5 h-5 text-[#0a1628]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{nowPlaying.track.title}</p>
                      <p className="text-xs text-white/60 truncate">{nowPlaying.track.artist}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate('/play/live')}
                      className="bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628] text-xs h-8"
                    >
                      Listen Live
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </Card>

          {/* Embed Instructions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 text-center text-white/50 text-sm"
          >
            <p>Powered by Soul FM Hub • {isLive ? 'Live Broadcasting' : 'On-Demand Streaming'}</p>
          </motion.div>
        </motion.div>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={track.streamUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  );
}
