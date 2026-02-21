import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { useRealtimeNowPlaying } from '../../hooks/useRealtimeNowPlaying';
import {
  Play,
  Square,
  SkipForward,
  Radio,
  Music,
  Users,
  Clock,
  Loader2,
  Volume2,
  VolumeX,
  Calendar,
  Zap,
  AlertCircle,
  Bug,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Database,
  Wifi,
  WifiOff,
  ListMusic,
  Disc3,
} from 'lucide-react';

export function AutoDJControl() {
  const navigate = useNavigate();

  // ── audio engine ───────────────────────────────────────────────────
  const audioRef        = useRef<HTMLAudioElement | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingAudio  = useRef(false);   // guard against concurrent loads
  const isAdvancingRef  = useRef(false);   // mutex: prevents double-skip from timer+onended race

  // ── ui state ───────────────────────────────────────────────────────
  const [startingDJ, setStartingDJ] = useState(false);
  const [stoppingDJ, setStoppingDJ] = useState(false);
  const [skipping,   setSkipping]   = useState(false);
  const [volume,     setVolume]      = useState(0.8);
  const [muted,      setMuted]       = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioError,   setAudioError]   = useState<string | null>(null);
  const [streamInfo,   setStreamInfo]   = useState<any>(null);
  const [showDebug,    setShowDebug]    = useState(false);
  const [debugInfo,    setDebugInfo]    = useState<any>(null);
  const [kvDump,       setKvDump]       = useState<any>(null);
  const [kvDumpLoading, setKvDumpLoading] = useState(false);
  const [migrating,    setMigrating]    = useState(false);
  const [migrateResult, setMigrateResult] = useState<any>(null);

  // ── queue state ───────────────────────────────────────────────────
  const [queueTracks,   setQueueTracks]   = useState<any[]>([]);
  const [showQueue,     setShowQueue]     = useState(false);
  const [loadingQueue,  setLoadingQueue]  = useState(false);

  // ── schedule status (detailed, auto-refreshes every 30s) ──────────
  const [scheduleStatus, setScheduleStatus] = useState<any>(null);
  const [isScheduleRefreshing, setIsScheduleRefreshing] = useState(false);
  const scheduleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs so advanceToNext always sees latest values without re-creating its closure
  const fetchQueueRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const showQueueRef  = useRef(false);

  const { autoDJStatus, streamStatus, loading, refresh } = useRealtimeNowPlaying();

  const isPlaying  = autoDJStatus?.isPlaying || false;
  const currentTrack = autoDJStatus?.currentTrack || streamInfo?.track;
  const listeners  = streamStatus?.listeners || 0;

  // ── clear advance timer ────────────────────────────────────────────
  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  // ── core: fetch signed URL + play from seek position ──────────────
  // `initialStreamData` — optional stream object returned inline by /radio/start.
  // When provided, we skip the getCurrentStream() polling and play immediately,
  // avoiding KV read-after-write latency issues on cold-start Edge Functions.
  const loadAndPlay = useCallback(async (isSkip = false, initialStreamData?: any) => {
    if (isLoadingAudio.current) return;
    isLoadingAudio.current = true;
    clearAdvanceTimer();
    setAudioError(null);

    try {
      let stream: any = initialStreamData || null;

      // Only poll getCurrentStream if we don't have inline data from start
      if (!stream) {
        for (let attempt = 0; attempt < 4; attempt++) {
          // First attempt after a short delay to let KV propagate
          if (attempt > 0) {
            const delay = attempt === 1 ? 1500 : 2000;
            console.log(`[AutoDJ] Stream not playing yet, retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
          }
          stream = await api.getCurrentStream();
          console.log(`[AutoDJ] stream info (attempt ${attempt + 1}):`, stream);
          if (stream.playing) break;
        }
      } else {
        console.log('[AutoDJ] Using inline stream data from start response:', stream.track?.title);
      }

      if (!stream?.playing) {
        console.warn('[AutoDJ] Stream still not playing after retries');
        setAudioPlaying(false);
        isLoadingAudio.current = false;
        return;
      }

      setStreamInfo(stream);

      if (!stream.audioUrl) {
        // Track exists but has no audio file in storage
        setAudioError('У трека нет аудиофайла. Загрузите MP3/FLAC файлы через Track Upload, затем добавьте треки в плейлист.');
        isLoadingAudio.current = false;
        return;
      }

      // Create or reuse audio element
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.preload = 'auto';
      }
      const audio = audioRef.current;

      audio.volume = muted ? 0 : volume;
      audio.src    = stream.audioUrl;

      // Seek to sync position (so all listeners hear the same moment)
      const seek = isSkip ? 0 : (stream.seekPosition || 0);
      audio.currentTime = seek;

      // Play!
      try {
        await audio.play();
        setAudioPlaying(true);
        console.log(`[AutoDJ] ▶ playing from ${seek}s — "${stream.track?.title}"`);
      } catch (playErr: any) {
        console.error('[AutoDJ] play() failed:', playErr);
        setAudioError(`Browser blocked autoplay: click Play to resume. (${playErr.message})`);
        setAudioPlaying(false);
        isLoadingAudio.current = false;
        return;
      }

      // ── schedule auto-advance ─────────────────────────────────────
      // Both timer and onended use the shared advanceToNext() with a mutex
      // to prevent the double-skip race condition.
      const remaining = stream.remainingSeconds ?? (stream.track?.duration ?? 180) - seek;
      if (remaining > 0) {
        console.log(`[AutoDJ] next advance in ${remaining}s`);
        advanceTimerRef.current = setTimeout(() => {
          console.log('[AutoDJ] ⏭ timer fired — auto-advancing track…');
          advanceToNextRef.current();
        }, remaining * 1000);
      }

      // ended event as safety net (timer should fire first in most cases)
      audio.onended = () => {
        console.log('[AutoDJ] track ended naturally — advancing');
        advanceToNextRef.current();
      };

    } catch (err: any) {
      console.error('[AutoDJ] loadAndPlay error:', err);
      setAudioError(err.message || 'Stream error');
      setAudioPlaying(false);
    } finally {
      isLoadingAudio.current = false;
    }
  }, [volume, muted, clearAdvanceTimer, refresh]);

  // ── queue fetch (must be defined before advanceToNext) ─────────────
  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const data = await api.getRadioQueue();
      setQueueTracks(data.queue || []);
    } catch (e: any) {
      console.error('[AutoDJ] fetchQueue error:', e);
      setQueueTracks([]);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  // Keep ref in sync so timer/onended closures always call latest version
  useEffect(() => {
    fetchQueueRef.current = fetchQueue;
  }, [fetchQueue]);

  // ── unified advance-to-next with mutex (prevents timer+onended double-skip) ──
  const advanceToNextRef = useRef<() => Promise<void>>(async () => {});
  
  const advanceToNext = useCallback(async () => {
    // Mutex: if already advancing or loading, bail out
    if (isAdvancingRef.current || isLoadingAudio.current) {
      console.log('[AutoDJ] advanceToNext skipped — already in progress');
      return;
    }
    isAdvancingRef.current = true;
    
    // Immediately disable both fire sources to prevent the other from racing
    clearAdvanceTimer();
    if (audioRef.current) audioRef.current.onended = null;
    
    try {
      const skipRes = await api.skipToNextTrack();
      // If the backend returned an error (e.g. empty playlist), stop gracefully
      if (skipRes?.error) {
        console.warn('[AutoDJ] advanceToNext — server error:', skipRes.error);
        setAudioError(skipRes.error);
        return;
      }
      refresh().catch(() => {});
      // Refresh queue if panel is open
      if (showQueueRef.current) fetchQueueRef.current();
      await loadAndPlay(true, skipRes?.stream?.audioUrl ? skipRes.stream : undefined);
    } catch (advErr) {
      console.error('[AutoDJ] advanceToNext error:', advErr);
    } finally {
      isAdvancingRef.current = false;
    }
  }, [loadAndPlay, clearAdvanceTimer, refresh]);
  
  // Keep ref in sync so timer/onended closures always call latest version
  useEffect(() => {
    advanceToNextRef.current = advanceToNext;
  }, [advanceToNext]);

  // ── stop audio locally ─────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    clearAdvanceTimer();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.src = '';
    }
    setAudioPlaying(false);
    setStreamInfo(null);
    setAudioError(null);
  }, [clearAdvanceTimer]);

  // ── on mount: if already playing, join the stream ─────────────────
  useEffect(() => {
    if (!loading && isPlaying && !audioPlaying) {
      loadAndPlay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isPlaying]);

  // ── sync volume / mute live ────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  // ── cleanup on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearAdvanceTimer();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (scheduleIntervalRef.current) {
        clearInterval(scheduleIntervalRef.current);
      }
    };
  }, [clearAdvanceTimer]);

  // ── schedule status: initial fetch + 30s auto-refresh ─────────────
  // Fetches detailed schedule info (current slot, upcoming slots, total count)
  // independently from the 8s useRealtimeNowPlaying polling.
  useEffect(() => {
    const fetchScheduleStatus = async () => {
      setIsScheduleRefreshing(true);
      try {
        const data = await api.getRadioScheduleStatus();
        setScheduleStatus(data);
      } catch (e: any) {
        console.error('[AutoDJ] schedule status error:', e);
      } finally {
        setIsScheduleRefreshing(false);
      }
    };

    fetchScheduleStatus();

    scheduleIntervalRef.current = setInterval(fetchScheduleStatus, 30_000);

    return () => {
      if (scheduleIntervalRef.current) {
        clearInterval(scheduleIntervalRef.current);
      }
    };
  }, []);

  // ── handlers ──────────────────────────────────────────────────────
  const handleStart = async () => {
    setStartingDJ(true);
    setAudioError(null);
    try {
      console.log('[AutoDJ UI] Starting Auto DJ...');
      const res = await api.startAutoDJ();
      console.log('[AutoDJ UI] Start response:', res);
      if (res.error) {
        toast.error(res.error, { duration: 8000 });
        // Show audio error banner with Track Upload link if it's an audio file issue
        if (res.hasAudioFile === false || res.tracksWithAudio === 0) {
          setAudioError(res.error);
        }
        setStartingDJ(false);
        return;
      }
      
      // Refresh hook state so UI updates (non-blocking)
      refresh().catch(() => {});

      if (!res.hasAudioFile) {
        // NO audio files at all — critical error
        const withAudio = res.tracksWithAudio || 0;
        if (withAudio === 0) {
          toast.error(
            `❌ Ни один трек (${res.totalTracks}) не имеет аудиофайла. Загрузите аудио через Track Upload.`,
            { duration: 8000 }
          );
          setAudioError('Треки без аудиофайлов. Перейдите в Track Upload и загрузите MP3/FLAC файлы.');
          setStartingDJ(false);
          return;
        } else {
          toast.warning(
            `⚠️ Первый трек без аудио. ${withAudio} из ${res.totalTracks} треков с аудио — они будут воспроизведены.`,
            { duration: 6000 }
          );
        }
      } else {
        toast.success(`🎵 Auto DJ started! ${res.totalTracks} tracks from "${res.source}"`);
      }

      // ── Use inline stream data from start response (bypasses KV latency) ──
      if (res.stream?.audioUrl) {
        console.log('[AutoDJ UI] Using inline stream data — skipping KV polling');
        await loadAndPlay(true, res.stream);
      } else {
        // Fallback: no inline stream data (track has no audio or URL generation failed)
        console.log('[AutoDJ UI] No inline audio URL — falling back to getCurrentStream polling');
        await new Promise(r => setTimeout(r, 1200));
        await loadAndPlay(true);
      }
    } catch (e: any) {
      console.error('[AutoDJ UI] Start error:', e);
      toast.error(e.message || 'Failed to start Auto DJ');
    } finally {
      setStartingDJ(false);
    }
  };

  const handleStop = async () => {
    if (!confirm('Stop the Auto DJ? Broadcast will go offline.')) return;
    setStoppingDJ(true);
    try {
      stopAudio();
      await api.stopAutoDJ();
      await refresh();
      toast.success('Auto DJ stopped');
    } catch (e: any) {
      toast.error(e.message || 'Failed to stop');
    } finally {
      setStoppingDJ(false);
    }
  };

  const handleSkip = async () => {
    // ── Mutex: prevent race with advanceToNext (timer/onended) ──
    if (isAdvancingRef.current || isLoadingAudio.current) {
      console.log('[AutoDJ] handleSkip skipped — advance already in progress');
      return;
    }
    isAdvancingRef.current = true;
    setSkipping(true);
    clearAdvanceTimer();
    // Neutralize onended to prevent race with manual skip
    if (audioRef.current) audioRef.current.onended = null;
    try {
      const res = await api.skipToNextTrack();
      if (res.error) { toast.error(res.error); return; }
      toast.success(`⏭️ ${res.currentTrack?.title || 'Next track'}`);
      refresh().catch(() => {});
      // Refresh queue if it's open
      if (showQueueRef.current) fetchQueueRef.current();
      // Use inline stream data from skip response if available
      if (res.stream?.audioUrl) {
        await loadAndPlay(true, res.stream);
      } else {
        await loadAndPlay(true);
      }
    } catch (e: any) {
      toast.error(e.message || 'Skip failed');
    } finally {
      isAdvancingRef.current = false;
      setSkipping(false);
    }
  };

  const handleResumeAfterBlock = async () => {
    setAudioError(null);
    await loadAndPlay();
  };

  const fetchDebugInfo = async () => {
    try {
      const data = await api.getDebugInfo();
      setDebugInfo(data);
    } catch (e: any) {
      setDebugInfo({ error: e.message });
    }
  };

  const fetchKVDump = async () => {
    setKvDumpLoading(true);
    try {
      const data = await api.getKVScheduleDump();
      setKvDump(data);
    } catch (e: any) {
      setKvDump({ error: e.message });
    } finally {
      setKvDumpLoading(false);
    }
  };

  const handleForceRefresh = async () => {
    await refresh();
    toast.success('Status refreshed');
  };

  const handleMigrate = async () => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!confirm(`Migrate all schedule slots to IANA timezone "${tz}"?\nThis patches old slots (without timezone) for DST-correct matching.`)) return;
    setMigrating(true);
    setMigrateResult(null);
    try {
      const res = await api.migrateTimezone(tz);
      setMigrateResult(res);
      if (res.migrated > 0) {
        toast.success(`Migrated ${res.migrated} slot(s) to ${tz}`);
      } else {
        toast.info('All slots already have correct timezone');
      }
      // Refresh KV dump to verify
      fetchKVDump();
    } catch (e: any) {
      setMigrateResult({ error: e.message });
      toast.error(e.message || 'Migration failed');
    } finally {
      setMigrating(false);
    }
  };

  // Auto-refresh queue when it's open and the current track changes
  useEffect(() => {
    showQueueRef.current = showQueue;
    if (showQueue && isPlaying) {
      fetchQueue();
    }
    if (!isPlaying) {
      setQueueTracks([]);
      setShowQueue(false);
      showQueueRef.current = false;
    }
  }, [showQueue, isPlaying, currentTrack?.id, fetchQueue]);

  // ── computed ──────────────────────────────────────────────────────
  const elapsed   = autoDJStatus?.elapsedSeconds  ?? 0;
  const duration  = currentTrack?.duration        ?? 180;
  const progress  = autoDJStatus?.trackProgress   ?? Math.min((elapsed / duration) * 100, 100);

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

  // ── render ────────────────────────────────────────────────────────
  return (
    <div className="bg-[#0f1c2e]/90 backdrop-blur-sm border border-[#00d9ff]/30 rounded-xl p-5 lg:p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] rounded-xl">
            <Radio className="w-5 h-5 text-[#0a1628]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
              Auto DJ
            </h2>
            <p className="text-xs text-white/50">Continuous broadcast engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* ON AIR / OFFLINE badge */}
          <Badge
            variant="outline"
            className={isPlaying
              ? 'border-[#00ffaa] text-[#00ffaa] bg-[#00ffaa]/10'
              : 'border-white/20 text-white/40'}
          >
            <div className={`w-2 h-2 rounded-full mr-1.5 ${isPlaying ? 'bg-[#00ffaa] animate-pulse' : 'bg-white/20'}`} />
            {isPlaying ? 'ON AIR' : 'OFFLINE'}
          </Badge>

          {/* Audio playing indicator */}
          {isPlaying && (
            <Badge
              variant="outline"
              className={audioPlaying
                ? 'border-cyan-400 text-cyan-300 bg-cyan-400/10'
                : 'border-orange-400 text-orange-300 bg-orange-400/10'}
            >
              {audioPlaying ? '🔊 Playing' : '🔇 Syncing…'}
            </Badge>
          )}
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {audioError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-orange-300">{audioError}</p>
              {audioError.includes('autoplay') && (
                <button
                  onClick={handleResumeAfterBlock}
                  className="mt-1.5 text-xs text-cyan-400 underline hover:text-cyan-300"
                >
                  Click to resume playback
                </button>
              )}
              {(audioError.includes('audio file') || audioError.includes('аудио')) && (
                <button
                  onClick={() => navigate('/admin/track-upload')}
                  className="mt-1.5 px-3 py-1 rounded-md text-xs text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-colors inline-flex items-center gap-1.5"
                >
                  📁 Перейти в Track Upload
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Now Playing */}
      <AnimatePresence mode="wait">
        {isPlaying && currentTrack ? (
          <motion.div
            key="playing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-5 p-4 bg-[#0a1628]/60 rounded-xl border border-[#00d9ff]/15"
          >
            <div className="flex items-center gap-4">
              {/* Album art / animation */}
              <div className="relative w-16 h-16 flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] rounded-xl flex items-center justify-center overflow-hidden">
                  {currentTrack.coverUrl ? (
                    <img src={currentTrack.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-8 h-8 text-[#0a1628]" />
                  )}
                </div>
                {/* spinning ring when audio is actually playing */}
                {audioPlaying && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-[#00ffaa]/60"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Now Playing</p>
                <h3 className="text-base font-bold text-white truncate">{currentTrack.title}</h3>
                <p className="text-sm text-white/60 truncate">{currentTrack.artist}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/40 mb-1.5">
                <span>{fmtTime(elapsed)}</span>
                <span>{fmtTime(duration)}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <div className="flex items-center justify-between mt-2">
                {autoDJStatus?.autoAdvance && (
                  <div className="flex items-center gap-1.5 text-[10px] text-[#00ffaa]/70">
                    <Zap className="w-3 h-3" />
                    <span>Auto-advance on</span>
                  </div>
                )}
                {autoDJStatus?.currentTrackIndex != null && (
                  <span className="text-[10px] text-white/30 ml-auto">
                    {autoDJStatus.currentTrackIndex + 1} / {autoDJStatus.totalTracks}
                  </span>
                )}
              </div>
            </div>

            {/* Current schedule slot */}
            {autoDJStatus?.currentSchedule && (
              <div className="mt-3 p-2.5 bg-[#00d9ff]/5 border border-[#00d9ff]/15 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#00d9ff] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{autoDJStatus.currentSchedule.title}</p>
                    <p className="text-[10px] text-white/40 truncate">
                      {autoDJStatus.currentSchedule.playlistName} · {autoDJStatus.currentSchedule.startTime}–{autoDJStatus.currentSchedule.endTime}
                    </p>
                  </div>
                  <RefreshCw className={`w-2.5 h-2.5 text-white/15 flex-shrink-0 ${isScheduleRefreshing ? 'animate-spin text-[#00d9ff]/40' : ''}`} />
                </div>
              </div>
            )}

            {/* Upcoming schedule slots (from dedicated schedule-status endpoint) */}
            {scheduleStatus?.upcomingSlots?.length > 0 && isPlaying && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap px-0.5">
                <span className="text-[9px] text-white/25 uppercase tracking-wider">Next:</span>
                {scheduleStatus.upcomingSlots.slice(0, 2).map((slot: any) => (
                  <Badge
                    key={slot.id}
                    variant="outline"
                    className="border-white/8 text-white/40 text-[9px] font-normal px-1.5 py-0"
                  >
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][slot.dayOfWeek ?? 0]} {slot.startTime} — {slot.title}
                  </Badge>
                ))}
                <span className="text-[8px] text-white/15 ml-auto">30s sync</span>
              </div>
            )}
          </motion.div>
        ) : !isPlaying ? (
          <motion.div
            key="offline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-5 py-8 text-center text-white/30"
          >
            <Radio className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Auto DJ is offline</p>
            <p className="text-xs mt-1 text-white/20">Press Start to go live non-stop</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#0a1628]/40 rounded-lg p-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#00d9ff] flex-shrink-0" />
          <div>
            <p className="text-[10px] text-white/40">Listeners</p>
            <p className="text-lg font-bold text-white">{listeners}</p>
          </div>
        </div>
        <div className="bg-[#0a1628]/40 rounded-lg p-3 flex items-center gap-2">
          <Music className="w-4 h-4 text-[#00ffaa] flex-shrink-0" />
          <div>
            <p className="text-[10px] text-white/40">Tracks</p>
            <p className="text-lg font-bold text-white">{autoDJStatus?.totalTracks || 0}</p>
          </div>
        </div>
        <div className="bg-[#0a1628]/40 rounded-lg p-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#FF8C42] flex-shrink-0" />
          <div>
            <p className="text-[10px] text-white/40">Uptime</p>
            <p className="text-lg font-bold text-white">
              {autoDJStatus?.startTime
                ? Math.floor((Date.now() - new Date(autoDJStatus.startTime).getTime()) / 60000) + 'm'
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      {!isPlaying ? (
        <Button
          onClick={handleStart}
          disabled={startingDJ || loading}
          className="w-full h-12 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628] font-bold text-base"
        >
          {startingDJ ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Starting…</>
          ) : (
            <><Play className="w-5 h-5 mr-2 fill-current" />Start Auto DJ</>
          )}
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleSkip}
              disabled={skipping}
              className="bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628] font-semibold h-11"
            >
              {skipping ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Skipping…</>
              ) : (
                <><SkipForward className="w-4 h-4 mr-1.5" />Skip Track</>
              )}
            </Button>
            <Button
              onClick={handleStop}
              disabled={stoppingDJ}
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-11 font-semibold"
            >
              {stoppingDJ ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Stopping…</>
              ) : (
                <><Square className="w-4 h-4 mr-1.5 fill-current" />Stop DJ</>
              )}
            </Button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 px-1 pt-1">
            <button
              onClick={() => setMuted(m => !m)}
              className="text-white/50 hover:text-white transition-colors flex-shrink-0"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0} max={1} step={0.02}
              value={muted ? 0 : volume}
              onChange={e => { setVolume(+e.target.value); setMuted(false); }}
              className="flex-1 h-1.5 accent-[#00d9ff] cursor-pointer"
            />
            <span className="text-[10px] text-white/30 w-8 text-right">
              {muted ? '0' : Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* ── Playlist Queue ────────────────────────────────────────── */}
      {isPlaying && (
        <div className="mt-4">
          <button
            onClick={() => {
              const next = !showQueue;
              setShowQueue(next);
              showQueueRef.current = next;
              if (next) fetchQueueRef.current();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-[#0a1628]/50 hover:bg-[#0a1628]/70 border border-[#00d9ff]/15 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-[#00d9ff]" />
              <span className="text-xs font-semibold text-white/70 group-hover:text-white transition-colors">
                Playlist Queue
              </span>
              {queueTracks.length > 0 && (
                <Badge variant="outline" className="border-[#00d9ff]/30 text-[#00d9ff] text-[9px] px-1.5 py-0">
                  {queueTracks.length}
                </Badge>
              )}
            </div>
            {showQueue ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
          </button>

          <AnimatePresence>
            {showQueue && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 bg-[#0a1628]/40 rounded-lg border border-[#00d9ff]/10 max-h-[320px] overflow-y-auto scrollbar-thin">
                  {loadingQueue ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-white/30">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Loading queue...</span>
                    </div>
                  ) : queueTracks.length === 0 ? (
                    <div className="py-6 text-center text-white/30">
                      <Music className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                      <p className="text-xs">No tracks in queue</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {queueTracks.map((track, idx) => (
                        <div
                          key={track.id || idx}
                          className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                            track.isCurrentTrack
                              ? 'bg-[#00d9ff]/8 border-l-2 border-l-[#00d9ff]'
                              : 'hover:bg-white/3'
                          }`}
                        >
                          {/* Index / Now Playing indicator */}
                          <div className="w-5 text-center flex-shrink-0">
                            {track.isCurrentTrack ? (
                              <motion.div
                                className="flex items-center justify-center gap-[2px]"
                                title="Now Playing"
                              >
                                {[0, 1, 2].map(i => (
                                  <motion.div
                                    key={i}
                                    className="w-[3px] bg-[#00ffaa] rounded-full"
                                    animate={{ height: [4, 12, 4] }}
                                    transition={{
                                      duration: 0.8,
                                      repeat: Infinity,
                                      delay: i * 0.15,
                                      ease: 'easeInOut',
                                    }}
                                  />
                                ))}
                              </motion.div>
                            ) : (
                              <span className="text-[10px] text-white/25 font-mono">{idx + 1}</span>
                            )}
                          </div>

                          {/* Cover art */}
                          <div className="w-9 h-9 flex-shrink-0 rounded-md overflow-hidden bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center">
                            {track.coverUrl ? (
                              <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Disc3 className={`w-4 h-4 ${track.isCurrentTrack ? 'text-[#00ffaa]' : 'text-white/20'}`} />
                            )}
                          </div>

                          {/* Title & Artist */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${
                              track.isCurrentTrack ? 'text-[#00ffaa]' : 'text-white/80'
                            }`}>
                              {track.title}
                            </p>
                            <p className="text-[10px] text-white/40 truncate">{track.artist}</p>
                          </div>

                          {/* Duration */}
                          <span className="text-[10px] text-white/30 font-mono flex-shrink-0 tabular-nums">
                            {track.duration > 0 ? fmtTime(track.duration) : '--:--'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Queue footer */}
                {queueTracks.length > 0 && (
                  <div className="flex items-center justify-between mt-1.5 px-1">
                    <span className="text-[9px] text-white/20">
                      {queueTracks.length} tracks · {fmtTime(queueTracks.reduce((sum, t) => sum + (t.duration || 0), 0))} total
                    </span>
                    <button
                      onClick={fetchQueueRef.current}
                      className="text-[9px] text-[#00d9ff]/50 hover:text-[#00d9ff] flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Refresh
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Toolbar: Refresh + Debug toggle ───────────────────────── */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
        <button
          onClick={handleForceRefresh}
          className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/70 transition-colors"
          title="Force refresh status from server"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
        </button>

        <div className="flex-1" />

        <button
          onClick={() => {
            const next = !showDebug;
            setShowDebug(next);
            if (next) fetchDebugInfo();
          }}
          className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors"
          title="Toggle debug panel"
        >
          <Bug className="w-3 h-3" />
          <span>Debug</span>
          {showDebug ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* ── Debug Panel ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showDebug && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-3 bg-[#0a1628]/80 rounded-lg border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-white/60 flex items-center gap-1.5">
                  <Database className="w-3 h-3" />
                  KV State Inspector
                </h4>
                <button
                  onClick={fetchDebugInfo}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  Reload
                </button>
              </div>

              {debugInfo ? (
                debugInfo.error ? (
                  <p className="text-xs text-red-400">Error: {debugInfo.error}</p>
                ) : (
                  <div className="space-y-2">
                    {/* Server Time vs Local Time — critical for schedule matching */}
                    <div className="text-[10px] space-y-0.5 p-2 bg-[#00d9ff]/5 border border-[#00d9ff]/10 rounded-md">
                      <div className="flex items-center gap-2 text-white/50">
                        <Clock className="w-3 h-3 text-[#00d9ff]" />
                        <span>Server (UTC): <span className="text-[#00d9ff] font-bold">{debugInfo.serverTime || '—'}</span></span>
                        <span className="text-white/20">·</span>
                        <span>Day: <span className="text-[#00d9ff] font-bold">{debugInfo.serverDay !== undefined ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][debugInfo.serverDay] + ` (${debugInfo.serverDay})` : '—'}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-white/50">
                        <Clock className="w-3 h-3 text-[#00ffaa]" />
                        <span>Local: <span className="text-[#00ffaa] font-bold">{new Date().toTimeString().slice(0, 8)}</span></span>
                        <span className="text-white/20">·</span>
                        <span>Day: <span className="text-[#00ffaa] font-bold">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()]} ({new Date().getDay()})</span></span>
                      </div>
                      {debugInfo.serverTime && (() => {
                        const localH = new Date().getHours();
                        const serverH = parseInt((debugInfo.serverTime || '00').split(':')[0]);
                        const diff = localH - serverH;
                        if (diff !== 0) {
                          return (
                            <p className="text-yellow-400 text-[9px] mt-1">
                              ⚠️ Timezone offset: your local time is {diff > 0 ? `+${diff}` : diff}h vs server UTC.
                              Schedule slots now auto-convert to UTC (offset stored per slot).
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Stream Status */}
                    <div className="flex items-center gap-2">
                      {debugInfo.kvState?.['stream:status']?.status === 'online' ? (
                        <Wifi className="w-3 h-3 text-[#00ffaa]" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-red-400" />
                      )}
                      <span className="text-[10px] text-white/50">
                        stream:status = <span className={debugInfo.kvState?.['stream:status']?.status === 'online' ? 'text-[#00ffaa] font-bold' : 'text-red-400 font-bold'}>
                          {debugInfo.kvState?.['stream:status']?.status ?? 'null'}
                        </span>
                      </span>
                    </div>

                    {/* AutoDJ State */}
                    <div className="text-[10px] text-white/50 space-y-1">
                      <p>
                        autodj:state.isPlaying ={' '}
                        <span className={debugInfo.kvState?.['autodj:state']?.isPlaying ? 'text-[#00ffaa] font-bold' : 'text-red-400 font-bold'}>
                          {String(debugInfo.kvState?.['autodj:state']?.isPlaying ?? 'null')}
                        </span>
                      </p>
                      <p>
                        currentTrack ={' '}
                        <span className="text-white/70">
                          {debugInfo.kvState?.['autodj:state']?.currentTrack?.title ?? 'none'}
                        </span>
                      </p>
                      <p>
                        storageFilename ={' '}
                        <span className={debugInfo.kvState?.['autodj:state']?.currentTrack?.storageFilename && debugInfo.kvState?.['autodj:state']?.currentTrack?.storageFilename !== 'MISSING' ? 'text-[#00ffaa]' : 'text-red-400'}>
                          {debugInfo.kvState?.['autodj:state']?.currentTrack?.storageFilename ?? 'N/A'}
                        </span>
                      </p>
                      <p>
                        playlistTrackIds ={' '}
                        <span className="text-white/70">
                          {debugInfo.kvState?.['autodj:state']?.playlistTrackIds ?? 0} tracks
                        </span>
                      </p>
                      {debugInfo.kvState?.['autodj:state']?.activeScheduleSlot && (
                        <p>
                          activeScheduleSlot ={' '}
                          <span className="text-[#00d9ff]">
                            {debugInfo.kvState['autodj:state'].activeScheduleSlot.title} ({debugInfo.kvState['autodj:state'].activeScheduleSlot.startTime}–{debugInfo.kvState['autodj:state'].activeScheduleSlot.endTime})
                          </span>
                        </p>
                      )}
                    </div>

                    {/* In-Memory State */}
                    <div className="text-[10px] text-white/50 pt-1 border-t border-white/5">
                      <p className="text-white/30 mb-1">In-Memory (this invocation):</p>
                      <p>isPlaying = <span className="text-white/70">{String(debugInfo.inMemory?.isPlaying)}</span></p>
                      <p>currentTrack = <span className="text-white/70">{debugInfo.inMemory?.currentTrack ?? 'null'}</span></p>
                      <p>playlistLength = <span className="text-white/70">{debugInfo.inMemory?.playlistLength}</span></p>
                    </div>

                    {/* Counts Summary */}
                    <div className="text-[10px] text-white/50 pt-1 border-t border-white/5 space-y-1">
                      <p className="text-white/30 mb-1">Database Inventory:</p>
                      <p>
                        Tracks: <span className="text-white/70">{debugInfo.counts?.tracks ?? 0}</span>
                        {' · '}
                        <span className="text-[#00ffaa]">{debugInfo.counts?.tracksWithAudio ?? 0} with audio</span>
                        {(debugInfo.counts?.tracksWithoutAudio ?? 0) > 0 && (
                          <>{' · '}<span className="text-yellow-400">{debugInfo.counts.tracksWithoutAudio} no file</span></>
                        )}
                      </p>
                      <p>
                        Playlists: <span className="text-white/70">{debugInfo.counts?.playlists ?? 0}</span>
                        {' · '}
                        Schedules: <span className="text-white/70">{debugInfo.counts?.schedules ?? 0}</span>
                      </p>
                    </div>

                    {/* Playlists Detail */}
                    {debugInfo.playlists?.length > 0 && (
                      <div className="text-[10px] text-white/50 pt-1 border-t border-white/5">
                        <p className="text-white/30 mb-1">Playlists:</p>
                        {debugInfo.playlists.map((pl: any) => (
                          <p key={pl.id} className="flex items-center gap-1.5">
                            <ListMusic className="w-2.5 h-2.5 text-white/30 flex-shrink-0" />
                            <span className={pl.isLiveStream ? 'text-[#00d9ff]' : 'text-white/70'}>{pl.name}</span>
                            <span className="text-white/30">·</span>
                            <span className={pl.trackCount > 0 ? 'text-[#00ffaa]' : 'text-red-400'}>{pl.trackCount} tracks</span>
                            {pl.isLiveStream && <span className="text-[#00d9ff]/50 text-[9px]">(fallback)</span>}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Schedule Slots Detail */}
                    {debugInfo.schedules?.length > 0 && (
                      <div className="text-[10px] text-white/50 pt-1 border-t border-white/5">
                        <p className="text-white/30 mb-1">Schedule Slots:</p>
                        {debugInfo.schedules.map((s: any) => (
                          <p key={s.id} className="flex items-center gap-1.5">
                            <Calendar className="w-2.5 h-2.5 text-white/30 flex-shrink-0" />
                            <span className="text-white/70">{s.title}</span>
                            <span className="text-white/30">·</span>
                            <span className="text-white/50">
                              {s.dayOfWeek !== null && s.dayOfWeek !== undefined
                                ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][s.dayOfWeek]
                                : 'Daily'} {s.startTime}–{s.endTime}
                            </span>
                            {s.scheduleMode === 'one-time' && (
                              <span className="text-amber-400/70 text-[9px]">1x</span>
                            )}
                            <span className={s.isActive ? 'text-[#00ffaa]' : 'text-red-400'}>
                              {s.isActive ? 'active' : 'off'}
                            </span>
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Current Schedule Match (real-time) */}
                    <div className="text-[10px] text-white/50 pt-1 border-t border-white/5">
                      <p>
                        getCurrentScheduledPlaylist() ={' '}
                        {debugInfo.currentScheduleSlot ? (
                          <span className="text-[#00ffaa] font-bold">
                            "{debugInfo.currentScheduleSlot.title}" → {debugInfo.currentScheduleSlot.playlistName}
                          </span>
                        ) : (
                          <span className="text-yellow-400">null (no slot matches now)</span>
                        )}
                      </p>
                    </div>

                    {/* Storage Buckets */}
                    {debugInfo.storageBuckets?.length > 0 && (
                      <div className="text-[10px] text-white/50 pt-1 border-t border-white/5">
                        <p className="text-white/30 mb-0.5">Storage Buckets:</p>
                        <p className="text-white/50">{debugInfo.storageBuckets.join(', ')}</p>
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-[9px] text-white/20 pt-1">
                      Snapshot: {debugInfo.timestamp ? new Date(debugInfo.timestamp).toLocaleTimeString() : '—'}
                    </p>

                    {/* KV Schedule Dump — raw persistence check */}
                    <div className="text-[10px] text-white/50 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white/30 font-semibold">KV Schedule Dump (raw):</p>
                        <button
                          onClick={fetchKVDump}
                          disabled={kvDumpLoading}
                          className="text-[9px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          {kvDumpLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Database className="w-2.5 h-2.5" />}
                          {kvDumpLoading ? 'Loading...' : 'Fetch Raw KV'}
                        </button>
                      </div>
                      {kvDump && (
                        kvDump.error ? (
                          <p className="text-red-400">Error: {kvDump.error}</p>
                        ) : (
                          <div className="space-y-1 mt-1">
                            <p>
                              Server UTC: <span className="text-[#00d9ff] font-bold">{kvDump.serverTimeUTC}</span>
                              {' · '}Day: <span className="text-[#00d9ff] font-bold">{kvDump.serverDayUTC}</span>
                              {' · '}Schedules in KV: <span className={kvDump.scheduleCount > 0 ? 'text-[#00ffaa] font-bold' : 'text-red-400 font-bold'}>{kvDump.scheduleCount}</span>
                            </p>
                            {kvDump.scheduleEntries?.length > 0 ? (
                              kvDump.scheduleEntries.map((e: any) => (
                                <div key={e.id} className="p-1.5 bg-white/3 rounded border border-white/5 space-y-0.5">
                                  <p className="text-white/70 font-medium">{e.title} <span className="text-white/30">({e.id})</span></p>
                                  <p className="text-white/40">
                                    day={e.dayOfWeek} {e.startTime}–{e.endTime}
                                    <span className={e.dstAware ? 'text-[#00ffaa]' : e.timezone ? 'text-amber-400' : 'text-red-400/70'}>
                                      {' '}→ UTC {e.startTimeUTC}–{e.endTimeUTC}
                                      {e.dstAware
                                        ? ` (DST: ${e.timezone}, live=${e.liveOffsetMinutes}min)`
                                        : e.utcOffsetMinutes !== 0
                                          ? ` (fixed ${e.utcOffsetMinutes}min)`
                                          : ' (no TZ!)'}
                                    </span>
                                    {' · '}mode={e.scheduleMode || 'recurring'}
                                    {e.scheduledDate && <> · date={e.scheduledDate}</>}
                                    {' · '}<span className={e.isActive ? 'text-[#00ffaa]' : 'text-red-400'}>{e.isActive ? 'active' : 'off'}</span>
                                  </p>
                                  <p className="text-white/25">created: {e.createdAt}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-red-400 font-bold">No schedule entries found in KV!</p>
                            )}
                            <p className="text-white/30 mt-1">
                              Playlists in KV: {kvDump.playlistCount}
                              {kvDump.playlistIds?.map((p: any) => ` · ${p.name}`).join('')}
                            </p>
                          </div>
                        )
                      )}
                    </div>

                    {/* Timezone Migration Tool */}
                    <div className="text-[10px] text-white/50 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-white/30 font-semibold">Timezone Migration (DST-correct):</p>
                          <p className="text-white/20 text-[9px]">
                            Your TZ: {Intl.DateTimeFormat().resolvedOptions().timeZone} (offset {new Date().getTimezoneOffset()}min)
                          </p>
                        </div>
                        <button
                          onClick={handleMigrate}
                          disabled={migrating}
                          className="text-[9px] text-[#00ffaa] hover:text-[#00ffaa]/80 flex items-center gap-1 bg-[#00ffaa]/10 px-2 py-1 rounded"
                        >
                          {migrating ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Zap className="w-2.5 h-2.5" />}
                          {migrating ? 'Migrating...' : 'Migrate All Slots'}
                        </button>
                      </div>
                      {migrateResult && (
                        migrateResult.error ? (
                          <p className="text-red-400 mt-1">Error: {migrateResult.error}</p>
                        ) : (
                          <div className="mt-1 p-1.5 bg-[#00ffaa]/5 border border-[#00ffaa]/15 rounded space-y-0.5">
                            <p>
                              <span className="text-[#00ffaa] font-bold">{migrateResult.migrated}</span> migrated
                              {' · '}<span className="text-white/50">{migrateResult.alreadyOk}</span> already OK
                              {' · '}<span className="text-white/30">total: {migrateResult.totalSlots}</span>
                            </p>
                            <p className="text-white/30">
                              TZ: {migrateResult.timezone} · offset: {migrateResult.currentOffset}min
                            </p>
                            {migrateResult.details?.filter((d: any) => d.action === 'migrated').map((d: any) => (
                              <p key={d.id} className="text-[#00ffaa]/70">
                                ✓ {d.title}: {d.previousTimezone || 'none'} → {d.newTimezone}
                              </p>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading debug info…
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}