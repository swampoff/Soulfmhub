import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Square, Clock, CheckCircle2, XCircle, AlertTriangle,
  Bot, Loader2, Sparkles, Activity, Trash2, ChevronDown, ChevronUp,
  Zap, Shield, Server, Code2, Palette, Crown, GitBranch,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../../../lib/api';

interface AutopilotLog {
  id: string;
  timestamp: string;
  memberId: string;
  memberName: string;
  memberRole: string;
  memberAvatar: string;
  memberColor: string;
  title: string;
  description: string;
  details: string;
  category: string;
  status: 'success' | 'error' | 'warning';
  taskId: string;
  fixTaskId: string | null;
  metrics?: Record<string, any>;
}

interface AutopilotSession {
  id: string;
  status: 'running' | 'stopped' | 'completed';
  startedAt: string;
  endsAt: string;
  durationMinutes: number;
  cyclesCompleted: number;
  successCount: number;
  errorCount: number;
  warningCount: number;
}

const STATUS_ICON: Record<string, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
};

const STATUS_COLOR: Record<string, string> = {
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  'Team Lead': Crown,
  'Frontend Developer': Code2,
  'Backend Developer': Server,
  'DevOps Engineer': GitBranch,
  'QA Engineer': Shield,
  'UX Designer': Palette,
};

export function AutopilotPanel() {
  const [session, setSession] = useState<AutopilotSession | null>(null);
  const [logs, setLogs] = useState<AutopilotLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [cycleRunning, setCycleRunning] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load initial status
  const loadStatus = useCallback(async () => {
    try {
      const res = await api.getAutopilotStatus();
      if (res.session) setSession(res.session);
      if (res.logs) setLogs(res.logs);
    } catch (err) {
      console.error('Load autopilot status error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Countdown timer
  useEffect(() => {
    if (session?.status === 'running') {
      const updateTimer = () => {
        const end = new Date(session.endsAt).getTime();
        const now = Date.now();
        const diff = Math.max(0, end - now);

        if (diff <= 0) {
          setTimeLeft('00:00:00');
          setSession(prev => prev ? { ...prev, status: 'completed' } : null);
          return;
        }

        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(
          `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        );
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [session?.status, session?.endsAt]);

  // Autopilot cycle interval (every 25 seconds when running)
  useEffect(() => {
    if (session?.status === 'running') {
      const runCycle = async () => {
        if (cycleRunning) return;
        setCycleRunning(true);
        try {
          const res = await api.runAutopilotCycle();
          if (res.error) {
            if (res.error.includes('has ended')) {
              setSession(prev => prev ? { ...prev, status: 'completed' } : null);
            } else {
              console.error('Cycle error:', res.error);
            }
          } else {
            if (res.log) {
              setLogs(prev => [res.log, ...prev]);
              // Toast for errors
              if (res.log.status === 'error') {
                toast.error(`[${res.log.memberName}] ${res.log.title}`, {
                  description: res.log.description,
                });
              }
            }
            if (res.session) setSession(res.session);
          }
        } catch (err) {
          console.error('Autopilot cycle error:', err);
        } finally {
          setCycleRunning(false);
        }
      };

      // Run first cycle immediately
      runCycle();
      intervalRef.current = setInterval(runCycle, 25000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [session?.status]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length]);

  const startAutopilot = async () => {
    setStarting(true);
    try {
      const res = await api.startAutopilot(60);
      if (res.error) {
        toast.error(res.error);
      } else {
        setSession(res.session);
        setLogs([]);
        toast.success('Autopilot started! AI team is now working autonomously.');
      }
    } catch (err) {
      toast.error('Failed to start autopilot');
    } finally {
      setStarting(false);
    }
  };

  const stopAutopilot = async () => {
    setStopping(true);
    try {
      const res = await api.stopAutopilot();
      setSession(res.session);
      if (intervalRef.current) clearInterval(intervalRef.current);
      toast.success('Autopilot stopped');
    } catch (err) {
      toast.error('Failed to stop autopilot');
    } finally {
      setStopping(false);
    }
  };

  const clearLogs = async () => {
    try {
      await api.clearAutopilotLogs();
      setLogs([]);
      toast.success('Logs cleared');
    } catch (err) {
      toast.error('Failed to clear logs');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-[#00d9ff]" />
      </div>
    );
  }

  const isRunning = session?.status === 'running';
  const totalCycles = session?.cyclesCompleted || 0;
  const successRate = totalCycles > 0
    ? Math.round(((session?.successCount || 0) / totalCycles) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* ── Control Panel ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border overflow-hidden ${
          isRunning
            ? 'bg-gradient-to-br from-[#0a1a1f] to-[#0f1a0f] border-[#00ffaa]/20'
            : 'bg-[#141414] border-white/5'
        }`}
      >
        {/* Animated top bar when running */}
        {isRunning && (
          <div className="h-1 bg-gradient-to-r from-[#00d9ff] via-[#00ffaa] to-[#00d9ff] animate-pulse" />
        )}

        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Status icon + title */}
            <div className="flex items-center gap-4 flex-1">
              <div className={`relative p-3 rounded-2xl ${
                isRunning
                  ? 'bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20'
                  : 'bg-white/5'
              }`}>
                <Bot className={`size-8 ${isRunning ? 'text-[#00ffaa]' : 'text-white/30'}`} />
                {isRunning && (
                  <div className="absolute -top-1 -right-1">
                    <span className="relative flex size-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ffaa] opacity-75" />
                      <span className="relative inline-flex rounded-full size-3 bg-[#00ffaa]" />
                    </span>
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-bold">
                  {isRunning ? (
                    <span className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent">
                      Autopilot Active
                    </span>
                  ) : session?.status === 'completed' ? (
                    <span className="text-white/70">Session Completed</span>
                  ) : (
                    <span className="text-white/50">Autopilot Mode</span>
                  )}
                </h2>
                <p className="text-xs text-white/40 mt-0.5">
                  {isRunning
                    ? 'AI team is autonomously optimizing, testing, and improving the system'
                    : 'Start autonomous AI operations — checks, optimizations, and tests'}
                </p>
              </div>
            </div>

            {/* Timer + controls */}
            <div className="flex items-center gap-3">
              {isRunning && (
                <div className="text-right mr-2">
                  <div className="text-2xl font-mono font-bold text-[#00ffaa] tracking-wider">
                    {timeLeft}
                  </div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider">remaining</div>
                </div>
              )}

              {!isRunning ? (
                <button
                  onClick={startAutopilot}
                  disabled={starting}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black font-bold text-sm hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50"
                >
                  {starting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  Start Autopilot (1h)
                </button>
              ) : (
                <button
                  onClick={stopAutopilot}
                  disabled={stopping}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/30 transition-all disabled:opacity-50"
                >
                  {stopping ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Square className="size-4" />
                  )}
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Stats row */}
          {totalCycles > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-5">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{totalCycles}</div>
                <div className="text-[10px] text-white/40">Cycles</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 text-center border border-green-500/10">
                <div className="text-lg font-bold text-green-400">{session?.successCount || 0}</div>
                <div className="text-[10px] text-green-400/50">Success</div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/10">
                <div className="text-lg font-bold text-red-400">{session?.errorCount || 0}</div>
                <div className="text-[10px] text-red-400/50">Errors</div>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-3 text-center border border-yellow-500/10">
                <div className="text-lg font-bold text-yellow-400">{session?.warningCount || 0}</div>
                <div className="text-[10px] text-yellow-400/50">Warnings</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-lg font-bold" style={{ color: successRate >= 80 ? '#22c55e' : successRate >= 50 ? '#f59e0b' : '#ef4444' }}>
                  {successRate}%
                </div>
                <div className="text-[10px] text-white/40">Health</div>
              </div>
            </div>
          )}

          {/* Running indicator */}
          {isRunning && cycleRunning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/15"
            >
              <Sparkles className="size-4 text-purple-400 animate-pulse" />
              <span className="text-xs text-purple-300">Running system check...</span>
              <Loader2 className="size-3 animate-spin text-purple-400 ml-auto" />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ── Activity Feed ─────────────────────────────────────── */}
      <div className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-[#00d9ff]" />
            <h3 className="text-sm font-semibold">Activity Feed</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/50">
              {logs.length}
            </span>
          </div>
          {logs.length > 0 && (
            <button
              onClick={clearLogs}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-white/40 hover:bg-white/5 transition-colors"
            >
              <Trash2 className="size-3" />
              Clear
            </button>
          )}
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/20">
              <Bot className="size-12 mb-3 opacity-20" />
              <p className="text-sm">No activity yet</p>
              <p className="text-xs mt-1">Start autopilot to see real-time system operations</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              <AnimatePresence initial={false}>
                {logs.map((log) => {
                  const StatusIcon = STATUS_ICON[log.status];
                  const RoleIcon = ROLE_ICONS[log.memberRole] || Bot;
                  const isExpanded = expandedLog === log.id;

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <button
                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                        className="w-full text-left p-4 flex items-start gap-3"
                      >
                        {/* Member avatar */}
                        <div className="relative flex-shrink-0">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
                            style={{ backgroundColor: `${log.memberColor}20`, color: log.memberColor }}
                          >
                            {log.memberAvatar}
                          </div>
                          <div
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: STATUS_COLOR[log.status] + '30' }}
                          >
                            <StatusIcon className="size-2.5" style={{ color: STATUS_COLOR[log.status] }} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold" style={{ color: log.memberColor }}>
                              {log.memberName}
                            </span>
                            <span className="text-[10px] text-white/30 flex items-center gap-1">
                              <RoleIcon className="size-3" />
                              {log.memberRole}
                            </span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{
                                backgroundColor: STATUS_COLOR[log.status] + '15',
                                color: STATUS_COLOR[log.status],
                              }}
                            >
                              {log.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-white/80 mt-1 font-medium">{log.title}</p>
                          <p className="text-xs text-white/40 mt-0.5">{log.description}</p>
                          {log.fixTaskId && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Zap className="size-3 text-red-400" />
                              <span className="text-[10px] text-red-400/70">
                                Fix task auto-created and assigned for rework
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Time + expand */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] text-white/25">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="size-3.5 text-white/20" />
                          ) : (
                            <ChevronDown className="size-3.5 text-white/20" />
                          )}
                        </div>
                      </button>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-0 ml-12">
                              <pre className="text-[11px] text-white/50 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed border border-white/5">
                                {log.details}
                              </pre>
                              {log.metrics && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {Object.entries(log.metrics).map(([key, val]) => (
                                    <span
                                      key={key}
                                      className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40"
                                    >
                                      {key}: <span className="text-white/60 font-medium">{String(val)}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
