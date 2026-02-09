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

// =====================================================================
//  INTERNAL AUTO DJ STREAM PLAYER  —  Crossfade Engine
// =====================================================================
//
//  Architecture:
//    Deck A ──► GainNode A ──┐
//                            ├──► AudioContext.destination
//    Deck B ──► GainNode B ──┘
//
//  - Two Audio elements ("decks") alternate.
//  - 5 s before current deck ends, the next deck starts playing
//    and we ramp gains (current 1→0, next 0→1) using
//    linearRampToValueAtTime for sample-accurate crossfade.
//  - The analyser is connected to the destination so the visualizer
//    always reflects the mixed output.
// =====================================================================

const CROSSFADE_SECONDS = 5;

interface TrackMeta {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  coverUrl?: string | null;
  isJingle?: boolean;
  audioUrl?: string;
}

interface StreamState {
  playing: boolean;
  track: TrackMeta | null;
  audioUrl: string | null;
  seekPosition: number;
  remainingSeconds: number;
  startedAt: string | null;
  jingleUrl: string | null;
  nextTrack: TrackMeta | null;
  crossfadeDuration: number;
  listeners: number;
  error?: string;
}

// ─── Deck abstraction ────────────────────────────────────────────────
interface Deck {
  audio: HTMLAudioElement;
  gain: GainNode | null;
  source: MediaElementAudioSourceNode | null;
  trackId: string | null;
}

function createDeck(): Deck {
  const audio = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.preload = 'auto';
  return { audio, gain: null, source: null, trackId: null };
}

// ─── Component ───────────────────────────────────────────────────────
export function RadioPlayer() {
  const { nowPlaying, isPlaying, setIsPlaying, volume, setVolume } = useApp();

  // Audio engine refs (survive re-renders)
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const deckARef = useRef<Deck | null>(null);
  const deckBRef = useRef<Deck | null>(null);
  const activeDeckRef = useRef<'A' | 'B'>('A');
  const crossfadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preloadedNextRef = useRef<TrackMeta | null>(null);
  const crossfadingRef = useRef(false);

  // Canvas / animation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Current track id (fast access without state re-render)
  const currentTrackIdRef = useRef<string | null>(null);

  // Stable ref for hardLoadNext (breaks circular dep with startPlayback)
  const hardLoadNextRef = useRef<() => Promise<void>>(async () => {});

  // UI state
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'error' | 'offline'
  >('offline');
  const [streamState, setStreamState] = useState<StreamState | null>(null);
  const [trackProgress, setTrackProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [crossfadeActive, setCrossfadeActive] = useState(false);

  // ─── Helpers ─────────────────────────────────────────────────────
  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = ctxRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
      analyserRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const ensureDecks = useCallback(() => {
    if (!deckARef.current) deckARef.current = createDeck();
    if (!deckBRef.current) deckBRef.current = createDeck();
  }, []);

  /** Wire a deck's audio into the AudioContext graph if not already. */
  const wireDeck = useCallback(
    (deck: Deck) => {
      const ctx = getCtx();
      if (!deck.source) {
        try {
          deck.source = ctx.createMediaElementSource(deck.audio);
          deck.gain = ctx.createGain();
          deck.gain.gain.value = 0;
          deck.source.connect(deck.gain);
          deck.gain.connect(analyserRef.current!);
        } catch {
          // already connected — ignore (happens on HMR)
        }
      }
    },
    [getCtx],
  );

  const activeDeck = useCallback(
    (): Deck => (activeDeckRef.current === 'A' ? deckARef.current! : deckBRef.current!),
    [],
  );
  const inactiveDeck = useCallback(
    (): Deck => (activeDeckRef.current === 'A' ? deckBRef.current! : deckARef.current!),
    [],
  );
  const swapDecks = useCallback(() => {
    activeDeckRef.current = activeDeckRef.current === 'A' ? 'B' : 'A';
  }, []);

  // ─── Volume management ──────────────────────────────────────────
  const masterVolume = useRef(0.7);
  masterVolume.current = isMuted ? 0 : volume;

  // Apply master volume to the active deck's gain (unless mid-crossfade)
  const applyVolume = useCallback(() => {
    if (!ctxRef.current) return;
    const deck = deckARef.current && deckBRef.current ? activeDeck() : null;
    if (deck?.gain && !crossfadingRef.current) {
      deck.gain.gain.cancelScheduledValues(ctxRef.current.currentTime);
      deck.gain.gain.setValueAtTime(masterVolume.current, ctxRef.current.currentTime);
    }
  }, [activeDeck]);

  useEffect(() => {
    applyVolume();
  }, [volume, isMuted, applyVolume]);

  // ─── Fetch stream info ──────────────────────────────────────────
  const fetchCurrentStream = useCallback(async (): Promise<StreamState | null> => {
    try {
      return (await api.getCurrentStream()) as StreamState;
    } catch (err) {
      console.error('[Player] fetch stream error:', err);
      return null;
    }
  }, []);

  // ─── Crossfade engine ──────────────────────────────────────────
  /**
   *  Start crossfade: fade out active deck, fade in inactive deck
   *  which should already have its src loaded.
   */
  const executeCrossfade = useCallback(
    async (nextAudioUrl: string, nextMeta: TrackMeta) => {
      if (crossfadingRef.current) return;
      crossfadingRef.current = true;
      setCrossfadeActive(true);

      ensureDecks();
      const current = activeDeck();
      const next = inactiveDeck();
      const ctx = getCtx();
      wireDeck(next);

      // Prepare next deck
      next.audio.src = nextAudioUrl;
      next.trackId = nextMeta.id;

      // Set initial gain
      next.gain!.gain.cancelScheduledValues(ctx.currentTime);
      next.gain!.gain.setValueAtTime(0, ctx.currentTime);

      try {
        await next.audio.play();
      } catch (e: any) {
        if (e.name !== 'AbortError') console.error('[Crossfade] next.play failed:', e);
        crossfadingRef.current = false;
        setCrossfadeActive(false);
        return;
      }

      const now = ctx.currentTime;
      const end = now + CROSSFADE_SECONDS;
      const vol = masterVolume.current;

      // Ramp current deck down
      current.gain!.gain.cancelScheduledValues(now);
      current.gain!.gain.setValueAtTime(vol, now);
      current.gain!.gain.linearRampToValueAtTime(0, end);

      // Ramp next deck up
      next.gain!.gain.setValueAtTime(0, now);
      next.gain!.gain.linearRampToValueAtTime(vol, end);

      console.log(`[Crossfade] ${current.trackId} → ${next.trackId}  (${CROSSFADE_SECONDS}s)`);

      // After crossfade completes, clean up old deck
      crossfadeTimerRef.current = setTimeout(() => {
        current.audio.pause();
        current.audio.src = '';
        current.trackId = null;

        swapDecks();
        currentTrackIdRef.current = nextMeta.id;

        crossfadingRef.current = false;
        setCrossfadeActive(false);
        preloadedNextRef.current = null;

        // Update display
        setStreamState((prev) =>
          prev ? { ...prev, track: nextMeta, audioUrl: nextAudioUrl, nextTrack: null } : prev,
        );

        // Schedule preload for the *new* next track
        scheduleNextTrackPreload();
      }, CROSSFADE_SECONDS * 1000 + 200);
    },
    [ensureDecks, activeDeck, inactiveDeck, getCtx, wireDeck, swapDecks],
  );

  // ─── Preload & schedule crossfade trigger ───────────────────────
  const preloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleNextTrackPreload = useCallback(async () => {
    // Clean previous timer
    if (preloadTimerRef.current) {
      clearTimeout(preloadTimerRef.current);
      preloadTimerRef.current = null;
    }

    // Fetch stream to get nextTrack info
    const stream = await fetchCurrentStream();
    if (!stream?.playing || !stream.nextTrack?.audioUrl) return;

    const remaining = stream.remainingSeconds;
    const preloadAt = Math.max(remaining - CROSSFADE_SECONDS - 3, 0); // preload 3s before crossfade

    if (preloadAt <= 0) {
      // Already in crossfade zone — immediate
      preloadedNextRef.current = stream.nextTrack;
      return;
    }

    preloadedNextRef.current = stream.nextTrack;

    console.log(`[Player] Next track "${stream.nextTrack.title}" will crossfade in ${preloadAt + 3}s`);
  }, [fetchCurrentStream]);

  // ─── Playback tick (progress + crossfade trigger) ───────────────
  useEffect(() => {
    if (!isPlaying) return;

    const tick = () => {
      const deck = deckARef.current && deckBRef.current ? activeDeck() : null;
      if (!deck?.audio || deck.audio.paused || !deck.audio.duration) return;

      const cur = deck.audio.currentTime;
      const dur = deck.audio.duration;
      setElapsed(Math.floor(cur));
      setTrackProgress((cur / dur) * 100);

      // ── Crossfade trigger ──
      const remaining = dur - cur;
      if (
        remaining <= CROSSFADE_SECONDS &&
        remaining > 0.5 &&
        !crossfadingRef.current &&
        preloadedNextRef.current?.audioUrl
      ) {
        const next = preloadedNextRef.current;
        executeCrossfade(next.audioUrl!, next);
      }
    };

    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [isPlaying, activeDeck, executeCrossfade]);

  // ─── Main play action ──────────────────────────────────────────
  const startPlayback = useCallback(
    async (state: StreamState) => {
      if (!state.audioUrl || !state.track) return;

      // Same track already playing
      if (currentTrackIdRef.current === state.track.id) {
        const deck = activeDeck();
        if (deck && !deck.audio.paused) return;
      }

      setIsBuffering(true);
      setConnectionStatus('connecting');

      ensureDecks();
      const deck = activeDeck();
      const ctx = getCtx();
      wireDeck(deck);

      // Stop inactive deck
      const other = inactiveDeck();
      other.audio.pause();
      other.audio.src = '';
      other.trackId = null;

      // Clear any pending crossfade
      if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
      crossfadingRef.current = false;
      setCrossfadeActive(false);

      // Handlers
      const onCanPlay = () => {
        setIsBuffering(false);
        setConnectionStatus('connected');
        // Seek to sync position
        if (state.seekPosition > 2 && deck.audio.duration && state.seekPosition < deck.audio.duration) {
          deck.audio.currentTime = state.seekPosition;
        }
      };
      const onPlaying = () => {
        setIsBuffering(false);
        setConnectionStatus('connected');
      };
      const onWaiting = () => setIsBuffering(true);
      const onError = () => {
        setConnectionStatus('error');
        setIsBuffering(false);
      };
      const onEnded = () => {
        console.log('[Player] Track ended naturally');
        currentTrackIdRef.current = null;
        hardLoadNextRef.current();
      };

      // Reattach listeners
      const a = deck.audio;
      a.oncanplay = onCanPlay;
      a.onplaying = onPlaying;
      a.onwaiting = onWaiting;
      a.onerror = onError;
      a.onended = onEnded;

      a.src = state.audioUrl;
      deck.trackId = state.track.id;
      currentTrackIdRef.current = state.track.id;

      // Set gain to full
      deck.gain!.gain.cancelScheduledValues(ctx.currentTime);
      deck.gain!.gain.setValueAtTime(masterVolume.current, ctx.currentTime);

      setStreamState(state);

      try {
        await a.play();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('[Player] play() failed:', err);
          setConnectionStatus('error');
          setIsBuffering(false);
        }
        return;
      }

      // Store preloaded next if available
      if (state.nextTrack?.audioUrl) {
        preloadedNextRef.current = state.nextTrack;
        console.log(`[Player] Next track preloaded: "${state.nextTrack.title}"`);
      }

      // Also start preload scheduling (will re-fetch when appropriate)
      scheduleNextTrackPreload();
    },
    [ensureDecks, activeDeck, inactiveDeck, getCtx, wireDeck, scheduleNextTrackPreload],
  );

  // Hard-load next (no crossfade — used as fallback when track ends abruptly)
  // Assigned to ref each render so startPlayback's onEnded closure always gets the latest version
  hardLoadNextRef.current = async () => {
    const stream = await fetchCurrentStream();
    if (!stream?.playing || !stream.audioUrl) {
      setConnectionStatus('offline');
      setIsPlaying(false);
      return;
    }
    await startPlayback(stream);
  };

  // ─── Play / Pause effect ────────────────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      (async () => {
        const state = await fetchCurrentStream();
        if (!state?.playing) {
          setConnectionStatus('offline');
          setStreamState(state);
          return;
        }
        await startPlayback(state);
      })();
    } else {
      // Pause both decks
      deckARef.current?.audio.pause();
      deckBRef.current?.audio.pause();
      if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
      if (preloadTimerRef.current) clearTimeout(preloadTimerRef.current);
      crossfadingRef.current = false;
      setCrossfadeActive(false);
      setConnectionStatus(streamState?.playing ? 'connecting' : 'offline');
      setIsBuffering(false);
    }
  }, [isPlaying]); // intentionally minimal deps — startPlayback is stable via refs

  // ─── Realtime track-changed ─────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;

    const channel = supabase.channel('radio-player-xfade', {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'track-changed' }, async () => {
      console.log('[Player] Realtime: track-changed');
      await new Promise((r) => setTimeout(r, 600));
      const stream = await fetchCurrentStream();
      if (!stream?.playing || !stream.audioUrl) return;

      if (stream.track && stream.track.id !== currentTrackIdRef.current && !crossfadingRef.current) {
        // Backend advanced to a track different from our preloaded one
        // → start crossfade if possible, otherwise hard-load
        if (preloadedNextRef.current?.id === stream.track.id && preloadedNextRef.current.audioUrl) {
          executeCrossfade(preloadedNextRef.current.audioUrl, preloadedNextRef.current);
        } else {
          await startPlayback(stream);
        }
      }

      // Always update nextTrack info
      if (stream.nextTrack) {
        preloadedNextRef.current = stream.nextTrack;
      }
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isPlaying, fetchCurrentStream, executeCrossfade, startPlayback]);

  // ─── Poll fallback (every 20 s) ─────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(async () => {
      try {
        const stream = await fetchCurrentStream();
        if (!stream?.playing) return;
        if (stream.track && stream.track.id !== currentTrackIdRef.current && !crossfadingRef.current) {
          console.log('[Player] Poll detected track change:', stream.track.title);
          await startPlayback(stream);
        }
        if (stream.nextTrack) preloadedNextRef.current = stream.nextTrack;
      } catch { /* silent */ }
    }, 20000);
    return () => clearInterval(id);
  }, [isPlaying, fetchCurrentStream, startPlayback]);

  // ─── Visualizer ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !analyserRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
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
        const h = (data[i] / 255) * canvas.height * 0.8;
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
  }, [isPlaying, streamState?.track?.id, crossfadeActive]);

  // ─── Cleanup ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      deckARef.current?.audio.pause();
      deckBRef.current?.audio.pause();
      if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
      if (preloadTimerRef.current) clearTimeout(preloadTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ─── Handlers ───────────────────────────────────────────────────
  const togglePlay = () => setIsPlaying(!isPlaying);
  const handleVolumeChange = (v: number[]) => { setVolume(v[0]); setIsMuted(false); };
  const toggleMute = () => setIsMuted(!isMuted);
  const toggleLike = () => setIsLiked(!isLiked);

  const handleShare = () => {
    const t = displayTrack?.title || 'Soul FM Hub';
    if (navigator.share) {
      navigator.share({ title: 'Soul FM Hub', text: `Listening to ${t} on Soul FM!`, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Display
  const displayTrack = streamState?.track || nowPlaying?.track;
  const displayCover = streamState?.track?.coverUrl || nowPlaying?.track?.cover;
  const isJingle = streamState?.track?.isJingle || false;
  const trackDuration = streamState?.track?.duration || displayTrack?.duration || 0;

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      <div className="relative bg-gradient-to-r from-[#0a1628]/95 via-[#0d1a2d]/95 to-[#0a1628]/95 backdrop-blur-xl border-t border-[#00d9ff]/30 shadow-2xl">
        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d9ff]/50 to-transparent" />

        {/* Progress bar */}
        {isPlaying && trackDuration > 0 && (
          <div className="absolute top-0 left-0 right-0 h-0.5">
            <div
              className="h-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] transition-all duration-300 ease-linear"
              style={{ width: `${trackProgress}%` }}
            />
            {/* Crossfade zone indicator */}
            {crossfadeActive && (
              <motion.div
                className="absolute right-0 top-0 h-full w-1 bg-[#00ffaa]"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
            )}
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
                  transition={{ duration: 8, repeat: isPlaying ? Infinity : 0, ease: 'linear' }}
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
                          '0 0 20px rgba(0,217,255,.4)',
                          '0 0 30px rgba(0,255,170,.6)',
                          '0 0 20px rgba(0,217,255,.4)',
                        ]
                      : '0 0 10px rgba(0,217,255,.2)',
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
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
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
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
                  animate={{ scale: connectionStatus === 'connected' ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Radio className="w-3 h-3 text-[#00d9ff]" />
                  <span className="text-xs text-[#00d9ff] font-semibold uppercase tracking-wider">
                    {connectionStatus === 'offline' ? 'Offline' :
                     connectionStatus === 'error' ? 'Error' :
                     isJingle ? 'Jingle' : 'Auto DJ'}
                  </span>
                  {crossfadeActive && (
                    <span className="text-[10px] text-[#00ffaa]/70 uppercase tracking-wider animate-pulse">
                      crossfade
                    </span>
                  )}
                  {isPlaying && trackDuration > 0 && (
                    <span className="text-[10px] text-white/30 tabular-nums">
                      {fmt(elapsed)} / {fmt(trackDuration)}
                    </span>
                  )}
                </div>
                <div className="text-base font-bold text-white truncate mb-0.5">
                  {displayTrack?.title || 'Soul FM Hub'}
                </div>
                <div className="text-sm text-gray-400 truncate">
                  {displayTrack?.artist || 'Press play to start listening'}
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

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="icon" onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628] shadow-lg shadow-[#00d9ff]/40 relative overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 bg-white/20"
                    animate={{ scale: isPlaying ? [1, 1.5, 1.5] : 1, opacity: isPlaying ? [0.5, 0, 0] : 0 }}
                    transition={{ duration: 1.5, repeat: isPlaying ? Infinity : 0 }}
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
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t border-[#00d9ff]/20 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-xs text-gray-400 mb-1">Current Show</div>
                      <div className="text-sm font-semibold text-[#00d9ff]">
                        {nowPlaying?.show?.name || 'Auto DJ'}
                      </div>
                      {nowPlaying?.show?.host && (
                        <div className="text-xs text-gray-400 mt-1">with {nowPlaying.show.host}</div>
                      )}
                    </div>

                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-xs text-gray-400 mb-1">Album</div>
                      <div className="text-sm font-semibold text-white">
                        {displayTrack?.album || 'Soul / Funk'}
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
                        <div className="text-sm text-gray-500 italic">Auto DJ decides...</div>
                      )}
                    </div>

                    {/* Stream info */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-gray-400">Stream</div>
                        <RealtimeIndicator size="sm" />
                      </div>
                      <div className="text-sm font-semibold text-[#00ffaa]">
                        Crossfade &middot; {streamState?.listeners ?? 0} listeners
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
                          {connectionStatus === 'connected' ? 'Connected' :
                           connectionStatus === 'error' ? 'Error' :
                           connectionStatus === 'offline' ? 'Offline' : 'Connecting...'}
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