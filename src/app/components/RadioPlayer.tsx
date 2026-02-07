import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, ChevronUp, ChevronDown, Radio, Heart, Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import soulFmLogo from 'figma:asset/7dc3be36ef413fc4dd597274a640ba655b20ab3d.png';
import { AnimatedWaves } from './AnimatedWaves';
import { RealtimeIndicator } from './RealtimeIndicator';

// Icecast stream configuration
// You can use any of these public soul/funk radio streams:
// Option 1: FIP Groove (French soul/funk station)
// Option 2: Exclusively Soul Radio
// Option 3: Your own Icecast server

// Get stream URL from environment variable or use default
const STREAM_URL = import.meta.env.VITE_STREAM_URL || 'https://stream.soulfm.radio/stream';
// For testing, you can use: 'https://icecast.streamserver24.com:8000/soul128.mp3'
// or 'http://stream.soulfunkradio.com:8000/soul.mp3'

export function RadioPlayer() {
  const { nowPlaying, isPlaying, setIsPlaying, volume, setVolume } = useApp();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');

  // Initialize audio and analyser
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(STREAM_URL);
      audioRef.current.preload = 'none';
      audioRef.current.crossOrigin = 'anonymous';

      // Audio event listeners
      audioRef.current.addEventListener('waiting', () => setIsBuffering(true));
      audioRef.current.addEventListener('playing', () => {
        setIsBuffering(false);
        setConnectionStatus('connected');
      });
      audioRef.current.addEventListener('error', () => {
        setConnectionStatus('error');
        setIsBuffering(false);
      });
      audioRef.current.addEventListener('canplay', () => {
        setIsBuffering(false);
      });
    }

    const audio = audioRef.current;
    audio.volume = volume;

    if (isPlaying) {
      setIsBuffering(true);
      setConnectionStatus('connecting');
      audio.play().catch((error) => {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
        setConnectionStatus('error');
        setIsBuffering(false);
      });
    } else {
      audio.pause();
      setConnectionStatus('connecting');
    }

    return () => {
      if (audio) {
        audio.pause();
      }
    };
  }, [isPlaying]);

  // Setup audio visualizer
  useEffect(() => {
    if (!audioRef.current || !isPlaying) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
      
      const source = audioContextRef.current.createMediaElementSource(audioRef.current);
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current || !canvas) return;

      animationFrameRef.current = requestAnimationFrame(draw);

      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

        // Gradient for bars
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#00ffaa');
        gradient.addColorStop(0.5, '#00d9ff');
        gradient.addColorStop(1, '#0099cc');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (values: number[]) => {
    setVolume(values[0]);
    setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
    // TODO: Save to favorites
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Soul FM Hub',
        text: `Listening to ${nowPlaying?.track?.title || 'Soul FM Hub'} on Soul FM!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      {/* Glass background with blur */}
      <div className="relative bg-gradient-to-r from-[#0a1628]/95 via-[#0d1a2d]/95 to-[#0a1628]/95 backdrop-blur-xl border-t border-[#00d9ff]/30 shadow-2xl">
        {/* Glow effect at top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d9ff]/50 to-transparent"></div>
        
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Album Art & Track Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Album Art with visualizer ring */}
              <div className="relative flex-shrink-0">
                {/* Rotating visualizer ring */}
                <motion.div
                  className="absolute inset-0 -m-2"
                  animate={{ rotate: isPlaying ? 360 : 0 }}
                  transition={{ duration: 8, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
                >
                  <svg className="w-20 h-20" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="38"
                      fill="none"
                      stroke="url(#playerGradient)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                    <defs>
                      <linearGradient id="playerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00d9ff" />
                        <stop offset="50%" stopColor="#00ffaa" />
                        <stop offset="100%" stopColor="#00d9ff" />
                      </linearGradient>
                    </defs>
                  </svg>
                </motion.div>

                {/* Album Art */}
                <motion.div 
                  className="relative w-16 h-16 rounded-full overflow-hidden shadow-lg border-2 border-[#00d9ff]/40"
                  animate={{
                    boxShadow: isPlaying 
                      ? ['0 0 20px rgba(0, 217, 255, 0.4)', '0 0 30px rgba(0, 255, 170, 0.6)', '0 0 20px rgba(0, 217, 255, 0.4)']
                      : '0 0 10px rgba(0, 217, 255, 0.2)'
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {nowPlaying?.track?.cover ? (
                    <img
                      src={nowPlaying.track.cover}
                      alt={nowPlaying.track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#0a1628] to-[#0d2435] flex items-center justify-center p-2">
                      <img 
                        src={soulFmLogo} 
                        alt="Soul FM" 
                        className="w-full h-full object-cover rounded-full"
                        style={{
                          filter: 'drop-shadow(0 0 8px rgba(0, 217, 255, 0.6))'
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Buffering spinner */}
                  {isBuffering && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-6 h-6 border-2 border-[#00d9ff] border-t-transparent rounded-full"
                      />
                    </div>
                  )}
                </motion.div>

                {/* Status indicator */}
                <motion.div
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a1628]"
                  style={{
                    backgroundColor: connectionStatus === 'connected' ? '#00ff88' : 
                                   connectionStatus === 'error' ? '#ff4444' : '#ffaa00'
                  }}
                  animate={{
                    scale: connectionStatus === 'connected' ? [1, 1.2, 1] : 1
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Radio className="w-3 h-3 text-[#00d9ff]" />
                  <span className="text-xs text-[#00d9ff] font-semibold uppercase tracking-wider">
                    Live Stream
                  </span>
                </div>
                <div className="text-base font-bold text-white truncate mb-0.5">
                  {nowPlaying?.track?.title || "What's Going On"}
                </div>
                <div className="text-sm text-gray-400 truncate">
                  {nowPlaying?.track?.artist || 'Marvin Gaye'}
                </div>
              </div>

              {/* Desktop Visualizer Canvas */}
              <div className="hidden lg:block">
                <canvas
                  ref={canvasRef}
                  width="200"
                  height="50"
                  className="opacity-80"
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Like Button */}
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleLike}
                className="text-gray-400 hover:text-[#ff4444] hover:bg-white/10 w-9 h-9 hidden sm:flex"
              >
                <Heart 
                  className="w-4 h-4" 
                  fill={isLiked ? '#ff4444' : 'none'}
                  style={{ color: isLiked ? '#ff4444' : 'currentColor' }}
                />
              </Button>

              {/* Play/Pause Button */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="icon"
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628] shadow-lg shadow-[#00d9ff]/40 relative overflow-hidden"
                  disabled={isBuffering && connectionStatus !== 'connected'}
                >
                  <motion.div
                    className="absolute inset-0 bg-white/20"
                    animate={{ scale: isPlaying ? [1, 1.5, 1.5] : 1, opacity: isPlaying ? [0.5, 0, 0] : 0 }}
                    transition={{ duration: 1.5, repeat: isPlaying ? Infinity : 0 }}
                  />
                  {isPlaying ? (
                    <Pause className="w-5 h-5 relative z-10" fill="currentColor" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5 relative z-10" fill="currentColor" />
                  )}
                </Button>
              </motion.div>

              {/* Volume Control */}
              <div className="hidden md:flex items-center gap-3 bg-white/5 rounded-full px-3 py-2 border border-white/10">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleMute}
                  className="text-[#00d9ff] hover:bg-white/10 w-8 h-8"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
                <div className="w-24">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    onValueChange={handleVolumeChange}
                    max={1}
                    step={0.01}
                    className="cursor-pointer"
                  />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>

              {/* Share Button */}
              <Button
                size="icon"
                variant="ghost"
                onClick={handleShare}
                className="text-gray-400 hover:text-[#00d9ff] hover:bg-white/10 w-9 h-9 hidden sm:flex"
              >
                <Share2 className="w-4 h-4" />
              </Button>

              {/* Expand/Collapse */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-400 hover:text-white hover:bg-white/10 w-9 h-9 hidden sm:flex"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Expanded Info */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t border-[#00d9ff]/20 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Show Info */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-xs text-gray-400 mb-1">Current Show</div>
                      <div className="text-sm font-semibold text-[#00d9ff]">
                        {nowPlaying?.show?.name || 'The Sunday Soul Session'}
                      </div>
                      {nowPlaying?.show?.host && (
                        <div className="text-xs text-gray-400 mt-1">
                          with {nowPlaying.show.host}
                        </div>
                      )}
                    </div>

                    {/* Genre */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-xs text-gray-400 mb-1">Genre</div>
                      <div className="text-sm font-semibold text-white">
                        {nowPlaying?.track?.genre || 'Soul / Funk'}
                      </div>
                    </div>

                    {/* Stream Info */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-gray-400">Stream Quality</div>
                        <RealtimeIndicator size="sm" />
                      </div>
                      <div className="text-sm font-semibold text-[#00ffaa]">
                        128 kbps MP3
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Status: <span className={connectionStatus === 'connected' ? 'text-[#00ff88]' : 'text-yellow-400'}>
                          {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'error' ? 'Error' : 'Connecting...'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Visualizer */}
                  <div className="lg:hidden mt-4 flex justify-center">
                    <canvas
                      ref={canvasRef}
                      width="300"
                      height="60"
                      className="opacity-80"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}