import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, ChevronUp, ChevronDown, Radio, Heart, Share2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import soulFmLogo from 'figma:asset/7dc3be36ef413fc4dd597274a640ba655b20ab3d.png';
import { RealtimeIndicator } from './RealtimeIndicator';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface TrackMeta {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  coverUrl?: string | null;
  isJingle?: boolean;
}

interface StreamState {
  playing: boolean;
  track: TrackMeta | null;
  nextTrack: TrackMeta | null;
  listeners: number;
  seekPosition: number; // Server-reported seconds elapsed
}

const STREAM_URL = 'https://stream.soul-fm.com/listen/soul_fm_/radio.mp3';

export function RadioPlayer() {
  const { nowPlaying, isPlaying, setIsPlaying, volume, setVolume } = useApp();

  // Audio elements & Web Audio API graph
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Canvas / Animation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // UI State
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'error' | 'offline'
  >('offline');

  // Metadata State from API (Supabase)
  const [streamState, setStreamState] = useState<StreamState | null>(null);
  const [simulatedElapsed, setSimulatedElapsed] = useState(0);

  // Initialize Web Audio API for visualizer
  const initAudioData = useCallback(() => {
    if (!audioRef.current) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;

      // We only want to create the media source once per audio element
      if (!mediaSourceRef.current) {
        mediaSourceRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
        mediaSourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioCtxRef.current.destination);
      }
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Fetch current metadata from Supabase
  const loadStreamMetadata = useCallback(async () => {
    try {
      const state = (await api.getCurrentStream()) as StreamState;
      if (state) {
        setStreamState(state);
        // Resync local elapsed time to what the server reports
        setSimulatedElapsed(state.seekPosition || 0);
      }
    } catch (err) {
      console.error('[RadioPlayer] Failed to load metadata:', err);
    }
  }, []);

  // Poll metadata & simulate progress bar
  useEffect(() => {
    if (!isPlaying) return;

    // Tick every second to push progress bar forward
    const progressTimer = setInterval(() => {
      setSimulatedElapsed(prev => prev + 1);
    }, 1000);

    // Poll server every 10 seconds just in case we miss a Realtime event (fallback)
    const pollTimer = setInterval(loadStreamMetadata, 10000);

    return () => {
      clearInterval(progressTimer);
      clearInterval(pollTimer);
    };
  }, [isPlaying, loadStreamMetadata]);

  // Listen to Supabase Realtime for instant track change notifications
  useEffect(() => {
    const channel = supabase.channel('radio-player-metadata', {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'track-changed' }, () => {
      console.log('[RadioPlayer] Realtime: Track changed! Reloading metadata...');
      // Give the backend a tiny gap to write the new track
      setTimeout(loadStreamMetadata, 1000);
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadStreamMetadata]);

  // Main playback engine
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      // Setup audio source if not already created
      if (!audioRef.current.src) {
        // Append timestamp to break browser cache and force live connection
        audioRef.current.src = `${STREAM_URL}?t=${Date.now()}`;
        audioRef.current.crossOrigin = 'anonymous';
      }

      setConnectionStatus('connecting');
      setIsBuffering(true);

      audioRef.current.play().then(() => {
        initAudioData();
        setConnectionStatus('connected');
        setIsBuffering(false);
        // Load metadata once playing starts
        loadStreamMetadata();
      }).catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('[RadioPlayer] Playback failed:', err);
          setConnectionStatus('error');
          setIsBuffering(false);
          setIsPlaying(false);
        }
      });
    } else {
      audioRef.current.pause();
      // Remove source to completely disconnect the stream and save bandwidth
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      setConnectionStatus('offline');
      setIsBuffering(false);
    }
  }, [isPlaying, initAudioData, loadStreamMetadata, setIsPlaying]);

  // Visualizer drawing
  useEffect(() => {
    if (!isPlaying || !analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const bufLen = analyserRef.current.frequencyBinCount;
    const data = new Uint8Array(bufLen);

    const draw = () => {
      if (!analyserRef.current) return;
      animFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(data);

      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      const barW = (canvas.width / bufLen) * 2;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        // Prevent flatlining when purely silent by adding tiny baseline
        const val = data[i] > 0 ? data[i] : 2;
        const h = (val / 255) * canvas.height * 0.8;
        const g = ctx2d.createLinearGradient(0, canvas.height - h, 0, canvas.height);
        g.addColorStop(0, '#00ffaa');
        g.addColorStop(0.5, '#00d9ff');
        g.addColorStop(1, '#0099cc');
        ctx2d.fillStyle = g;
        ctx2d.fillRect(x, canvas.height - h, barW - 1, h);
        x += barW;
      }
    };
    draw();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  // Handlers
  const togglePlay = () => setIsPlaying(!isPlaying);
  const handleVolumeChange = (v: number[]) => { setVolume(v[0]); setIsMuted(false); };
  const toggleMute = () => setIsMuted(!isMuted);
  const toggleLike = () => setIsLiked(!isLiked);

  const handleShare = () => {
    const t = displayTrack?.title || 'Soul FM Hub';
    if (navigator.share) {
      navigator.share({ title: 'Soul FM Hub', text: `Listening to ${t} on Soul FM!`, url: window.location.href }).catch(() => { });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const fmt = (s: number) => {
    if (isNaN(s) || !isFinite(s)) return '0:00';
    const m = Math.floor(Math.max(0, s) / 60);
    const sec = Math.floor(Math.max(0, s) % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Determine what to display
  const displayTrack = streamState?.track || nowPlaying?.track;
  const displayCover = streamState?.track?.coverUrl || nowPlaying?.track?.cover;
  const isJingle = streamState?.track?.isJingle || false;
  const trackDuration = streamState?.track?.duration || displayTrack?.duration || 0;

  // Progress computation
  const trackProgress = trackDuration > 0 ? Math.min(100, (simulatedElapsed / trackDuration) * 100) : 0;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 22, mass: 1 }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      {/* Invisible Single Audio Element */}
      <audio
        ref={audioRef}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onError={() => {
          setConnectionStatus('error');
          setIsBuffering(false);
          setIsPlaying(false);
        }}
        preload="none"
      />

      <div className="relative bg-gradient-to-r from-[#0a1628]/95 via-[#0d1a2d]/95 to-[#0a1628]/95 backdrop-blur-xl border-t border-[#00d9ff]/30 shadow-2xl">
        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d9ff]/50 to-transparent" />

        {/* Pseudo-Progress bar for current track */}
        {isPlaying && trackDuration > 0 && (
          <div className="absolute top-0 left-0 right-0 h-0.5">
            <div
              className="h-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]"
              style={{
                width: `${trackProgress}%`,
                transition: 'width 1s linear',
              }}
            />
          </div>
        )}

        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Album Art & Track Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Album Art with visualizer ring */}
              <div className="relative flex-shrink-0">
                <motion.div
                  className="absolute inset-0 -m-2"
                  animate={{ rotate: isPlaying ? 360 : 0 }}
                  transition={{ duration: 12, repeat: isPlaying ? Infinity : 0, ease: 'linear' }}
                >
                  <svg className="w-20 h-20" viewBox="0 0 80 80">
                    <circle
                      cx="40" cy="40" r="38" fill="none"
                      stroke="url(#playerGradient)" strokeWidth="2"
                      strokeDasharray="4 4" opacity="0.5"
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

                <motion.div
                  className="relative w-16 h-16 rounded-full overflow-hidden shadow-lg border-2 border-[#00d9ff]/40"
                  animate={{
                    boxShadow: isPlaying
                      ? [
                        '0 0 15px rgba(0,217,255,.3)',
                        '0 0 25px rgba(0,255,170,.5)',
                        '0 0 15px rgba(0,217,255,.3)',
                      ]
                      : '0 0 8px rgba(0,217,255,.15)',
                  }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {displayCover ? (
                    <img src={displayCover} alt={displayTrack?.title || ''} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#0a1628] to-[#0d2435] flex items-center justify-center p-2">
                      <img
                        src={soulFmLogo}
                        alt="Soul FM"
                        className="w-full h-full object-cover rounded-full"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(0,217,255,.6))' }}
                      />
                    </div>
                  )}

                  {isBuffering && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        className="w-6 h-6 border-2 border-[#00d9ff] border-t-transparent rounded-full"
                      />
                    </div>
                  )}
                </motion.div>

                {/* Status dot */}
                <motion.div
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a1628]"
                  style={{
                    backgroundColor:
                      connectionStatus === 'connected' ? '#00ff88' :
                        connectionStatus === 'error' ? '#ff4444' :
                          connectionStatus === 'offline' ? '#666' : '#ffaa00',
                  }}
                  animate={{ scale: connectionStatus === 'connected' ? [1, 1.15, 1] : 1 }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Radio className="w-3 h-3 text-[#00d9ff]" />
                  <span className="text-xs text-[#00d9ff] font-semibold uppercase tracking-wider">
                    {connectionStatus === 'offline' ? 'Offline' :
                      connectionStatus === 'error' ? 'Error' :
                        isJingle ? 'Jingle' : 'Live Broadcaster'}
                  </span>
                  {isPlaying && trackDuration > 0 && (
                    <span className="text-[10px] text-white/30 tabular-nums">
                      {fmt(simulatedElapsed)} / {fmt(trackDuration)}
                    </span>
                  )}
                </div>
                <div className="text-base font-bold text-white truncate mb-0.5">
                  {displayTrack?.title || 'Soul FM Live'}
                </div>
                <div className="text-sm text-gray-400 truncate">
                  {displayTrack?.artist || 'Press play to enter the stream'}
                </div>
              </div>

              {/* Visualizer */}
              <div className="hidden lg:block">
                <canvas ref={canvasRef} width="200" height="50" className="opacity-80" />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <Button
                size="icon" variant="ghost" onClick={toggleLike}
                className="text-gray-400 hover:text-[#ff4444] hover:bg-white/10 w-9 h-9 hidden sm:flex"
              >
                <Heart className="w-4 h-4" fill={isLiked ? '#ff4444' : 'none'} style={{ color: isLiked ? '#ff4444' : 'currentColor' }} />
              </Button>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                <Button
                  size="icon" onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628] shadow-lg shadow-[#00d9ff]/40 relative overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 bg-white/20"
                    animate={{ scale: isPlaying ? [1, 1.8, 1.8] : 1, opacity: isPlaying ? [0.4, 0, 0] : 0 }}
                    transition={{ duration: 2.2, repeat: isPlaying ? Infinity : 0, ease: 'easeOut' }}
                  />
                  {isBuffering ? (
                    <Loader2 className="w-5 h-5 relative z-10 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 relative z-10" fill="currentColor" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5 relative z-10" fill="currentColor" />
                  )}
                </Button>
              </motion.div>

              <div className="hidden md:flex items-center gap-3 bg-white/5 rounded-full px-3 py-2 border border-white/10">
                <Button size="icon" variant="ghost" onClick={toggleMute} className="text-[#00d9ff] hover:bg-white/10 w-8 h-8">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <div className="w-24">
                  <Slider value={[isMuted ? 0 : volume]} onValueChange={handleVolumeChange} max={1} step={0.01} className="cursor-pointer" />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
              </div>

              <Button size="icon" variant="ghost" onClick={handleShare} className="text-gray-400 hover:text-[#00d9ff] hover:bg-white/10 w-9 h-9 hidden sm:flex">
                <Share2 className="w-4 h-4" />
              </Button>

              <Button size="icon" variant="ghost" onClick={() => setIsExpanded(!isExpanded)} className="text-gray-400 hover:text-white hover:bg-white/10 w-9 h-9 hidden sm:flex">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Expanded info */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t border-[#00d9ff]/20 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-xs text-gray-400 mb-1">Current Show</div>
                      <div className="text-sm font-semibold text-[#00d9ff]">
                        {nowPlaying?.show?.name || 'Auto DJ Live'}
                      </div>
                      {nowPlaying?.show?.host && (
                        <div className="text-xs text-gray-400 mt-1">with {nowPlaying.show.host}</div>
                      )}
                    </div>

                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-xs text-gray-400 mb-1">Album</div>
                      <div className="text-sm font-semibold text-white">
                        {displayTrack?.album || 'Soul FM Hub Exclusive'}
                      </div>
                    </div>

                    {/* Next Up */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-xs text-gray-400 mb-1">Next Up</div>
                      {streamState?.nextTrack ? (
                        <>
                          <div className="text-sm font-semibold text-[#00ffaa] truncate">
                            {streamState.nextTrack.title}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {streamState.nextTrack.artist}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500 italic">Curating next track...</div>
                      )}
                    </div>

                    {/* Stream info */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-gray-400">Signal</div>
                        <RealtimeIndicator size="sm" />
                      </div>
                      <div className="text-sm font-semibold text-[#00ffaa]">
                        Icecast Native Stream &middot; {streamState?.listeners ?? 0} listeners
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Status:{' '}
                        <span
                          className={
                            connectionStatus === 'connected' ? 'text-[#00ff88]' :
                              connectionStatus === 'offline' ? 'text-white/30' :
                                connectionStatus === 'error' ? 'text-red-400' : 'text-yellow-400'
                          }
                        >
                          {connectionStatus === 'connected' ? 'Direct Hub Connection' :
                            connectionStatus === 'error' ? 'Stream Lost' :
                              connectionStatus === 'offline' ? 'Offline' : 'Establishing Secure Link...'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:hidden mt-4 flex justify-center">
                    <canvas ref={canvasRef} width="300" height="60" className="opacity-80" />
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