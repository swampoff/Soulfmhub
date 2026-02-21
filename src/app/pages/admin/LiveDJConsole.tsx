import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../components/ui/button';
import {
  Radio, Square, Music, PhoneCall, Clock, Activity,
  Copy, Check, Settings, ChevronDown, ChevronUp,
  Loader2, RefreshCw, ExternalLink, Headphones, Disc3,
  Smartphone, Monitor, Mic2, History, Signal,
  Volume2, Zap, Eye, EyeOff, Save, Trash2, UserPlus, Wifi, WifiOff, ShieldCheck,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { AdminLayout } from '../../components/admin/AdminLayout';

interface DJSession {
  id: string;
  dj_name: string;
  title: string;
  session_type: string;
  source_app: string;
  started_at: string;
  status: string;
  tracks_played: number;
  callers_taken: number;
  requests_played: number;
}

interface ConnectionConfig {
  server: string;
  port: number;
  mountPoint: string;
  protocol: string;
  username: string;
  password: string;
  streamFormat: string;
  bitrate: number;
  sampleRate: number;
  edjingGuide: boolean;
  customApps: string[];
}

const SOURCE_APPS = [
  { id: 'edjing', label: 'edjing Mix', icon: '🎛️', color: '#FF2D55', desc: 'DJ mixing + streaming' },
  { id: 'butt', label: 'BUTT', icon: '📡', color: '#00d9ff', desc: 'Broadcast Using This Tool' },
  { id: 'mixxx', label: 'Mixxx', icon: '🎚️', color: '#00ffaa', desc: 'Open-source DJ software' },
  { id: 'traktor', label: 'Traktor', icon: '🔊', color: '#ff6b35', desc: 'NI Traktor Pro' },
  { id: 'serato', label: 'Serato DJ', icon: '💿', color: '#a855f7', desc: 'Serato DJ Pro/Lite' },
  { id: 'obs', label: 'OBS Studio', icon: '🎬', color: '#3b82f6', desc: 'Open Broadcaster' },
  { id: 'direct', label: 'Direct', icon: '🎤', color: '#94a3b8', desc: 'Browser / mic input' },
];

const DEFAULT_CONFIG: ConnectionConfig = {
  server: '187.77.85.42',
  port: 8005,
  mountPoint: '/live',
  protocol: 'icecast',
  username: 'dj',
  password: '',
  streamFormat: 'mp3',
  bitrate: 128,
  sampleRate: 44100,
  edjingGuide: true,
  customApps: [],
};

export function LiveDJConsole() {
  const [isLive, setIsLive] = useState(false);
  const [currentSession, setCurrentSession] = useState<DJSession | null>(null);
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [showStartModal, setShowStartModal] = useState(false);
  const [djName, setDjName] = useState('');
  const [showTitle, setShowTitle] = useState('');
  const [selectedApp, setSelectedApp] = useState('edjing');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Connection config
  const [connConfig, setConnConfig] = useState<ConnectionConfig>(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // edjing setup panel
  const [showEdjingGuide, setShowEdjingGuide] = useState(false);
  const [edjingStep, setEdjingStep] = useState(0);

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // AzuraCast live status
  const [azuraLive, setAzuraLive] = useState<any>(null);

  // AzuraCast DJ accounts (streamers)
  const [streamers, setStreamers] = useState<any[]>([]);
  const [loadingStreamers, setLoadingStreamers] = useState(false);
  const [showCreateStreamer, setShowCreateStreamer] = useState(false);
  const [newStreamerUser, setNewStreamerUser] = useState('');
  const [newStreamerPass, setNewStreamerPass] = useState('');
  const [newStreamerName, setNewStreamerName] = useState('');
  const [creatingStreamer, setCreatingStreamer] = useState(false);

  // Port check
  const [portStatus, setPortStatus] = useState<any>(null);
  const [checkingPort, setCheckingPort] = useState(false);

  // Check DJ status
  const checkStatus = useCallback(async () => {
    try {
      const data = await api.getDJSessionCurrent();
      setIsLive(data.isLive);
      setCurrentSession(data.session);
    } catch (err) {
      console.error('DJ status check error:', err);
    }
  }, []);

  // Load connection config
  const loadConfig = useCallback(async () => {
    try {
      const data = await api.getDJConnectionConfig();
      if (data.config) setConnConfig(data.config);
    } catch (err) {
      console.error('Connection config load error:', err);
    }
  }, []);

  // Check AzuraCast live status
  const checkAzuraLive = useCallback(async () => {
    try {
      const data = await api.getAzuraCastStatus();
      if (data?.live) setAzuraLive(data.live);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.allSettled([checkStatus(), loadConfig(), checkAzuraLive()]);
      setInitialLoading(false);
    };
    init();
    const interval = setInterval(() => {
      checkStatus();
      checkAzuraLive();
    }, 5000);
    return () => clearInterval(interval);
  }, [checkStatus, loadConfig, checkAzuraLive]);

  // Update session duration
  useEffect(() => {
    if (!currentSession || !isLive) return;
    const interval = setInterval(() => {
      const startTime = new Date(currentSession.started_at).getTime();
      const diff = Date.now() - startTime;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setSessionDuration(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentSession, isLive]);

  async function startDJSession() {
    if (!djName.trim() || !showTitle.trim()) {
      toast.error('Заполните имя DJ и название шоу');
      return;
    }
    setLoading(true);
    try {
      const data = await api.startDJSession({
        dj_name: djName.trim(),
        title: showTitle.trim(),
        session_type: 'live_show',
        source_app: selectedApp,
      });
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setIsLive(true);
      setCurrentSession(data.session);
      setShowStartModal(false);
      toast.success(`LIVE! ${djName} в эфире!`, {
        description: `Auto-DJ на паузе. Источник: ${SOURCE_APPS.find(a => a.id === selectedApp)?.label || selectedApp}`,
      });
    } catch (err: any) {
      toast.error('Ошибка старта: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function endDJSession() {
    if (!currentSession) return;
    if (!confirm('Завершить сессию? Auto-DJ будет возобновлён.')) return;
    setLoading(true);
    try {
      const data = await api.endDJSession(currentSession.id);
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setIsLive(false);
      setCurrentSession(null);
      toast.success('Сессия завершена', { description: 'Auto-DJ снова в эфире' });
    } catch (err: any) {
      toast.error('Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function incrementStat(field: 'tracks_played' | 'callers_taken' | 'requests_played') {
    try {
      const data = await api.updateDJSessionStats({ [field]: 1 });
      if (data.session) setCurrentSession(data.session);
    } catch { /* silent */ }
  }

  async function saveConfig() {
    setSavingConfig(true);
    try {
      const data = await api.saveDJConnectionConfig(connConfig);
      if (data.success) {
        toast.success('Конфигурация подключения сохранена');
        if (data.config) setConnConfig(data.config);
      }
    } catch (err: any) {
      toast.error('Ошибка сохранения: ' + err.message);
    } finally {
      setSavingConfig(false);
    }
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const data = await api.getDJSessionHistory();
      setSessionHistory(data.sessions || []);
    } catch { /* silent */ }
    finally { setLoadingHistory(false); }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success('Скопировано!');
  }

  async function loadStreamers() {
    setLoadingStreamers(true);
    try {
      const data = await api.getAzuraCastStreamers();
      setStreamers(data.streamers || []);
    } catch { /* silent */ }
    finally { setLoadingStreamers(false); }
  }

  async function createStreamer() {
    if (!newStreamerUser.trim() || !newStreamerPass.trim()) {
      toast.error('Username и пароль обязательны'); return;
    }
    if (newStreamerPass.length < 6) {
      toast.error('Пароль должен быть минимум 6 символов'); return;
    }
    setCreatingStreamer(true);
    try {
      const data = await api.createAzuraCastStreamer({
        username: newStreamerUser.trim(),
        password: newStreamerPass.trim(),
        displayName: newStreamerName.trim() || newStreamerUser.trim(),
      });
      if (data.error) { toast.error(data.error); return; }
      toast.success(`DJ-аккаунт "${newStreamerUser}" создан в AzuraCast!`, {
        description: 'Credentials автоматически обновлены в настройках подключения',
      });
      setShowCreateStreamer(false);
      setNewStreamerUser('');
      setNewStreamerPass('');
      setNewStreamerName('');
      // Refresh config (server auto-updates it) and streamers list
      await Promise.allSettled([loadConfig(), loadStreamers()]);
    } catch (err: any) {
      toast.error('Ошибка создания: ' + err.message);
    } finally {
      setCreatingStreamer(false);
    }
  }

  async function deleteStreamer(id: number, username: string) {
    if (!confirm(`Удалить DJ-аккаунт "${username}"?`)) return;
    try {
      const data = await api.deleteAzuraCastStreamer(id);
      if (data.error) { toast.error(data.error); return; }
      toast.success(`DJ-аккаунт "${username}" удалён`);
      setStreamers(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      toast.error('Ошибка удаления: ' + err.message);
    }
  }

  async function runPortCheck() {
    setCheckingPort(true);
    setPortStatus(null);
    try {
      const data = await api.checkDJPort();
      setPortStatus(data);
      if (data.open === true) {
        toast.success(`Порт ${data.port} открыт!`);
      } else if (data.open === false) {
        toast.error(`Порт ${data.port} недоступен`, { description: data.message });
      } else {
        toast.info(data.message);
      }
    } catch (err: any) {
      toast.error('Ошибка проверки порта: ' + err.message);
    } finally {
      setCheckingPort(false);
    }
  }

  const streamUrl = `${connConfig.protocol === 'shoutcast' ? 'http' : 'http'}://${connConfig.server}:${connConfig.port}${connConfig.mountPoint}`;
  const appInfo = SOURCE_APPS.find(a => a.id === (currentSession?.source_app || selectedApp));

  if (initialLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="size-10 animate-spin text-[#00d9ff]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout maxWidth="wide">
      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-[#00d9ff]/20">
                <Headphones className="size-6 sm:size-7 text-[#00d9ff]" />
              </div>
              <span className="bg-gradient-to-r from-[#00d9ff] via-[#00ffaa] to-[#00d9ff] bg-clip-text text-transparent font-['Righteous']">
                Live DJ Console
              </span>
              {isLive && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30"
                >
                  LIVE
                </motion.span>
              )}
            </h1>
            <p className="text-white/40 text-xs mt-1 ml-[52px]">
              {isLive ? `${currentSession?.dj_name} — ${currentSession?.title}` : 'Подключитесь через edjing Mix или другой DJ-софт'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(); }}
              className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-[#00d9ff]/20 text-[#00d9ff]' : 'bg-white/5 hover:bg-white/10 text-white/40'}`}
              title="История сессий"
            >
              <History className="size-4" />
            </button>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`p-2 rounded-lg transition-colors ${showConfig ? 'bg-[#00ffaa]/20 text-[#00ffaa]' : 'bg-white/5 hover:bg-white/10 text-white/40'}`}
              title="Настройки подключения"
            >
              <Settings className="size-4" />
            </button>
            <button onClick={checkStatus} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 transition-colors">
              <RefreshCw className="size-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── AzuraCast Live Indicator ───────────────────────── */}
      {azuraLive?.isLive && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
            <Signal className="size-4 text-green-400" />
            <span className="text-xs text-green-400 font-bold">AzuraCast: Live-источник подключён</span>
            {azuraLive.streamerName && (
              <span className="text-xs text-white/40">— {azuraLive.streamerName}</span>
            )}
          </div>
        </motion.div>
      )}

      {/* ── LIVE Session Banner ────────────────────────────── */}
      <AnimatePresence>
        {isLive && currentSession && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="mb-6"
          >
            <div className="relative bg-gradient-to-r from-red-500/15 via-[#00d9ff]/10 to-[#00ffaa]/10 rounded-2xl border border-red-500/30 overflow-hidden">
              {/* Animated pulse */}
              <motion.div
                className="absolute inset-0 bg-red-500/5"
                animate={{ opacity: [0, 0.1, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              />
              <div className="relative p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="w-5 h-5 bg-red-500 rounded-full shadow-lg shadow-red-500/50 flex-shrink-0"
                    />
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold font-['Righteous'] text-white">
                        {currentSession.title || 'Live Session'}
                      </h2>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-white/60 text-sm">DJ {currentSession.dj_name}</span>
                        <span className="text-white/30">|</span>
                        <span className="text-[#00d9ff] text-sm font-mono font-bold">{sessionDuration}</span>
                        {appInfo && (
                          <>
                            <span className="text-white/30">|</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${appInfo.color}20`, color: appInfo.color }}>
                              {appInfo.icon} {appInfo.label}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={endDJSession}
                    disabled={loading}
                    variant="destructive"
                    size="lg"
                    className="gap-2 shadow-lg"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />}
                    Завершить
                  </Button>
                </div>

                {/* Live Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                  {[
                    { label: 'Треки', value: currentSession.tracks_played, icon: Music, color: '#00d9ff', field: 'tracks_played' as const },
                    { label: 'Реквесты', value: currentSession.requests_played, icon: Headphones, color: '#ff69b4', field: 'requests_played' as const },
                    { label: 'Звонки', value: currentSession.callers_taken, icon: PhoneCall, color: '#00ffaa', field: 'callers_taken' as const },
                    { label: 'Время', value: sessionDuration, icon: Clock, color: '#a855f7', field: null },
                  ].map((stat) => (
                    <button
                      key={stat.label}
                      onClick={() => stat.field && incrementStat(stat.field)}
                      disabled={!stat.field}
                      className={`p-3 rounded-xl bg-white/5 border border-white/5 text-left transition-all ${stat.field ? 'hover:bg-white/10 hover:border-white/15 cursor-pointer active:scale-95' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <stat.icon className="size-3.5" style={{ color: stat.color }} />
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">{stat.label}</span>
                        {stat.field && <span className="text-[8px] text-white/20 ml-auto">+1</span>}
                      </div>
                      <span className="text-lg font-bold font-mono" style={{ color: stat.color }}>{stat.value}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Connection Config Panel ────────────────────────── */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-[#141414] rounded-2xl border border-white/5 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white/70 flex items-center gap-2">
                  <Settings className="size-4 text-[#00ffaa]" />
                  Настройки подключения (AzuraCast DJ Source)
                </h3>
                <button
                  onClick={saveConfig}
                  disabled={savingConfig}
                  className="px-3 py-1.5 rounded-lg bg-[#00ffaa]/15 text-[#00ffaa] text-[11px] font-bold hover:bg-[#00ffaa]/25 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingConfig ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                  Сохранить
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Сервер</label>
                  <input
                    value={connConfig.server}
                    onChange={e => setConnConfig(p => ({ ...p, server: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-[#00d9ff]/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Порт</label>
                  <input
                    type="number"
                    value={connConfig.port}
                    onChange={e => setConnConfig(p => ({ ...p, port: parseInt(e.target.value) || 8005 }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#00d9ff]/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Mount Point</label>
                  <input
                    value={connConfig.mountPoint}
                    onChange={e => setConnConfig(p => ({ ...p, mountPoint: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#00d9ff]/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Протокол</label>
                  <select
                    value={connConfig.protocol}
                    onChange={e => setConnConfig(p => ({ ...p, protocol: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#00d9ff]/40"
                  >
                    <option value="icecast" className="bg-[#1a1a1a]">Icecast</option>
                    <option value="shoutcast" className="bg-[#1a1a1a]">SHOUTcast</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Username</label>
                  <input
                    value={connConfig.username}
                    onChange={e => setConnConfig(p => ({ ...p, username: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#00d9ff]/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={connConfig.password}
                      onChange={e => setConnConfig(p => ({ ...p, password: e.target.value }))}
                      placeholder="DJ password"
                      className="w-full px-3 py-2 pr-8 rounded-lg bg-white/5 border border-white/10 text-xs text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-[#00d9ff]/40"
                    />
                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Формат</label>
                  <select
                    value={connConfig.streamFormat}
                    onChange={e => setConnConfig(p => ({ ...p, streamFormat: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#00d9ff]/40"
                  >
                    <option value="mp3" className="bg-[#1a1a1a]">MP3</option>
                    <option value="aac" className="bg-[#1a1a1a]">AAC</option>
                    <option value="ogg" className="bg-[#1a1a1a]">OGG Vorbis</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Битрейт (kbps)</label>
                  <select
                    value={connConfig.bitrate}
                    onChange={e => setConnConfig(p => ({ ...p, bitrate: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#00d9ff]/40"
                  >
                    {[64, 96, 128, 192, 256, 320].map(b => (
                      <option key={b} value={b} className="bg-[#1a1a1a]">{b} kbps</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick-copy connection string */}
              <div className="mt-4 p-3 rounded-xl bg-white/3 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">Строка подключения</span>
                  <button onClick={() => copyToClipboard(streamUrl, 'url')} className="text-[10px] text-[#00d9ff] hover:underline flex items-center gap-1">
                    {copiedField === 'url' ? <Check className="size-3" /> : <Copy className="size-3" />}
                    {copiedField === 'url' ? 'Скопировано' : 'Копировать'}
                  </button>
                </div>
                <code className="text-xs text-[#00ffaa] font-mono break-all">{streamUrl}</code>
              </div>

              {/* Port Check + DJ Accounts */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Port Check */}
                <div className="p-3 rounded-xl bg-white/3 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                      {portStatus?.open === true ? <Wifi className="size-3 text-green-400" /> :
                       portStatus?.open === false ? <WifiOff className="size-3 text-red-400" /> :
                       <Wifi className="size-3 text-white/30" />}
                      DJ Port Check
                    </span>
                    <button
                      onClick={runPortCheck}
                      disabled={checkingPort}
                      className="text-[10px] text-[#00d9ff] hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      {checkingPort ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                      {checkingPort ? 'Проверка...' : 'Проверить'}
                    </button>
                  </div>
                  {portStatus ? (
                    <p className={`text-[10px] leading-relaxed ${portStatus.open === true ? 'text-green-400' : portStatus.open === false ? 'text-red-400' : 'text-yellow-400'}`}>
                      {portStatus.message || `${connConfig.server}:${connConfig.port}`}
                    </p>
                  ) : (
                    <p className="text-[10px] text-white/25">{connConfig.server}:{connConfig.port} — нажмите «Проверить»</p>
                  )}
                </div>

                {/* DJ Accounts summary */}
                <div className="p-3 rounded-xl bg-white/3 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="size-3" />
                      DJ-аккаунты AzuraCast
                    </span>
                    <button
                      onClick={() => { loadStreamers(); setShowCreateStreamer(!showCreateStreamer); }}
                      className="text-[10px] text-[#00ffaa] hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="size-3" />
                      {showCreateStreamer ? 'Скрыть' : 'Создать'}
                    </button>
                  </div>
                  {loadingStreamers ? (
                    <Loader2 className="size-3 animate-spin text-white/30" />
                  ) : streamers.length > 0 ? (
                    <div className="space-y-1">
                      {streamers.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between">
                          <span className="text-[10px] text-white/60 font-mono">
                            {s.display_name || s.streamer_username}
                            <span className={`ml-1 ${s.is_active ? 'text-green-400' : 'text-red-400'}`}>
                              {s.is_active ? 'active' : 'disabled'}
                            </span>
                          </span>
                          <button onClick={() => deleteStreamer(s.id, s.streamer_username)} className="text-red-400/50 hover:text-red-400 p-0.5">
                            <Trash2 className="size-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-white/25">Нет DJ-аккаунтов. Нажмите «Создать»</p>
                  )}
                </div>
              </div>

              {/* Create Streamer Form */}
              <AnimatePresence>
                {showCreateStreamer && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-3 p-3 rounded-xl bg-[#00ffaa]/5 border border-[#00ffaa]/15">
                      <h4 className="text-[10px] text-[#00ffaa] font-bold uppercase mb-2 flex items-center gap-1.5">
                        <UserPlus className="size-3" /> Новый DJ-аккаунт в AzuraCast
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                        <input
                          value={newStreamerUser}
                          onChange={e => setNewStreamerUser(e.target.value)}
                          placeholder="Username (login)"
                          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-[#00ffaa]/40"
                        />
                        <input
                          type="password"
                          value={newStreamerPass}
                          onChange={e => setNewStreamerPass(e.target.value)}
                          placeholder="Password (min 6)"
                          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-[#00ffaa]/40"
                        />
                        <input
                          value={newStreamerName}
                          onChange={e => setNewStreamerName(e.target.value)}
                          placeholder="Display name (opt)"
                          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#00ffaa]/40"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[8px] text-white/30">Аккаунт будет создан в AzuraCast и credentials обновятся автоматически</p>
                        <button
                          onClick={createStreamer}
                          disabled={creatingStreamer || !newStreamerUser.trim() || newStreamerPass.length < 6}
                          className="px-3 py-1.5 rounded-lg bg-[#00ffaa]/15 text-[#00ffaa] text-[10px] font-bold hover:bg-[#00ffaa]/25 disabled:opacity-40 flex items-center gap-1"
                        >
                          {creatingStreamer ? <Loader2 className="size-3 animate-spin" /> : <UserPlus className="size-3" />}
                          Создать
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Session History Panel ──────────────────────────── */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-[#141414] rounded-2xl border border-white/5 p-5">
              <h3 className="text-sm font-bold text-white/70 flex items-center gap-2 mb-4">
                <History className="size-4 text-[#00d9ff]" />
                История сессий
                {loadingHistory && <Loader2 className="size-3 animate-spin text-white/30" />}
              </h3>
              {sessionHistory.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-6">Нет записей</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {sessionHistory.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">{SOURCE_APPS.find(a => a.id === s.source_app)?.icon || '🎤'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-white truncate block">{s.title || 'Untitled'}</span>
                        <span className="text-[10px] text-white/40">
                          {s.dj_name} · {new Date(s.started_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} {new Date(s.started_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          {s.duration_seconds && ` · ${Math.floor(s.duration_seconds / 60)} мин`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-white/30 flex-shrink-0">
                        <span>{s.tracks_played || 0} <Music className="size-3 inline" /></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ═══ GO LIVE Card ═══ */}
        {!isLive && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-[#141414] rounded-2xl border border-[#00d9ff]/20 overflow-hidden">
              <div className="p-6 sm:p-8 text-center">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                  className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20"
                >
                  <Disc3 className="size-8 text-[#00d9ff]" />
                </motion.div>
                <h3 className="text-2xl font-bold mb-2 font-['Righteous'] bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent">
                  Готов к эфиру?
                </h3>
                <p className="text-white/40 text-sm mb-6 max-w-md mx-auto">
                  Подключитесь через edjing Mix, BUTT, Mixxx или любой другой DJ-софт. Auto-DJ будет приостановлен.
                </p>
                <Button
                  onClick={() => setShowStartModal(true)}
                  size="lg"
                  className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black font-bold text-sm gap-2 px-8 hover:opacity-90 transition-all"
                >
                  <Radio className="size-5" />
                  НАЧАТЬ СЕССИЮ
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ edjing Mix Integration Card ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden h-full">
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF2D55]/20 to-[#FF2D55]/5 flex items-center justify-center text-xl">
                    🎛️
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">edjing Mix</h3>
                    <p className="text-[10px] text-white/40">DJ mixing + live streaming</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEdjingGuide(!showEdjingGuide)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 transition-colors"
                >
                  {showEdjingGuide ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
              </div>
            </div>

            <div className="p-4">
              {/* Quick credentials */}
              <div className="space-y-2 mb-4">
                {[
                  { label: 'Server', value: connConfig.server, key: 'server' },
                  { label: 'Port', value: String(connConfig.port), key: 'port' },
                  { label: 'Mount', value: connConfig.mountPoint, key: 'mount' },
                  { label: 'User', value: connConfig.username, key: 'user' },
                  { label: 'Pass', value: connConfig.password || '(не задан)', key: 'pass', masked: !showPassword && !!connConfig.password },
                ].map(row => (
                  <div key={row.key} className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30 w-12 flex-shrink-0">{row.label}</span>
                    <code className="flex-1 text-[11px] text-[#00ffaa] font-mono truncate">
                      {row.masked ? '••••••••' : row.value}
                    </code>
                    <button
                      onClick={() => copyToClipboard(row.masked ? connConfig.password : row.value, row.key)}
                      className="p-1 rounded hover:bg-white/10 text-white/20 hover:text-white/50 transition-colors"
                    >
                      {copiedField === row.key ? <Check className="size-3 text-[#00ffaa]" /> : <Copy className="size-3" />}
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] text-white/30 hover:text-white/50 flex items-center gap-1 mb-3"
              >
                {showPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                {showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              </button>

              {/* Download links */}
              <div className="flex gap-2">
                <a
                  href="https://apps.apple.com/app/edjing-mix-dj-music-mixer/id493226494"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Smartphone className="size-3" /> iOS
                  <ExternalLink className="size-2.5 ml-auto" />
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.edjing.edjingdjturntable"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Smartphone className="size-3" /> Android
                  <ExternalLink className="size-2.5 ml-auto" />
                </a>
                <a
                  href="https://www.edjing.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Monitor className="size-3" /> Web
                  <ExternalLink className="size-2.5 ml-auto" />
                </a>
              </div>
            </div>

            {/* edjing Setup Guide (expandable) */}
            <AnimatePresence>
              {showEdjingGuide && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-white/5 p-4">
                    <h4 className="text-xs font-bold text-[#FF2D55] mb-3 flex items-center gap-2">
                      <Zap className="size-3" /> Настройка edjing Mix для Soul FM
                    </h4>
                    <div className="space-y-3">
                      {[
                        {
                          step: 1,
                          title: 'Откройте edjing Mix',
                          desc: 'Установите приложение из App Store / Google Play. Откройте его и перейдите в Settings.',
                        },
                        {
                          step: 2,
                          title: 'Перейдите в Live Broadcasting',
                          desc: 'Settings → Live Broadcasting → Custom Server. Выберите протокол Icecast.',
                        },
                        {
                          step: 3,
                          title: 'Введите данные подключения',
                          desc: `Server: ${connConfig.server}\nPort: ${connConfig.port}\nMount: ${connConfig.mountPoint}\nUsername: ${connConfig.username}\nPassword: (ваш DJ-пароль из AzuraCast)`,
                        },
                        {
                          step: 4,
                          title: 'Начните трансляцию',
                          desc: 'Нажмите "Go Live" в edjing. AzuraCast автоматически переключится с Auto-DJ на ваш live-поток.',
                        },
                        {
                          step: 5,
                          title: 'Зарегистрируйте сессию',
                          desc: 'Нажмите "НАЧАТЬ СЕССИЮ" здесь для отслеживания статистики. Когда закончите — нажмите "Завершить".',
                        },
                      ].map((item) => (
                        <div
                          key={item.step}
                          className={`flex gap-3 p-3 rounded-xl transition-colors ${edjingStep === item.step - 1 ? 'bg-[#FF2D55]/10 border border-[#FF2D55]/20' : 'bg-white/2 border border-transparent'}`}
                          onClick={() => setEdjingStep(item.step - 1)}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                              edjingStep >= item.step - 1 ? 'bg-[#FF2D55] text-white' : 'bg-white/10 text-white/40'
                            }`}
                          >
                            {item.step}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white/80 block">{item.title}</span>
                            <p className="text-[10px] text-white/40 mt-0.5 whitespace-pre-line leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ═══ Other DJ Apps Card ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden h-full">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Volume2 className="size-4 text-[#00ffaa]" />
                Совместимые DJ-приложения
              </h3>
              <p className="text-[10px] text-white/40 mt-0.5">
                Любое приложение с Icecast/SHOUTcast source-подключением
              </p>
            </div>
            <div className="p-4 space-y-2">
              {SOURCE_APPS.filter(a => a.id !== 'direct').map(app => (
                <div
                  key={app.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/5 hover:bg-white/4 hover:border-white/10 transition-all"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: `${app.color}15` }}
                  >
                    {app.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-white block">{app.label}</span>
                    <span className="text-[10px] text-white/40">{app.desc}</span>
                  </div>
                  {app.id === 'edjing' && (
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-[#FF2D55]/15 text-[#FF2D55]">
                      RECOMMENDED
                    </span>
                  )}
                </div>
              ))}

              {/* Connection summary */}
              <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-[#00d9ff]/5 to-[#00ffaa]/5 border border-[#00d9ff]/10">
                <p className="text-[10px] text-white/50 leading-relaxed">
                  <span className="text-[#00d9ff] font-bold">Как это работает:</span> DJ-софт подключается к AzuraCast как live-источник по Icecast.
                  AzuraCast автоматически переключает слушателей с Auto-DJ на live-стрим.
                  Когда DJ отключается — Auto-DJ возобновляется.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══ Info Cards (when not live) ═══ */}
        {!isLive && (
          <>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <div className="bg-[#141414] rounded-2xl border border-white/5 p-5 h-full">
                <Activity className="size-7 text-[#00d9ff] mb-3" />
                <h3 className="font-bold mb-1 text-sm">Полный контроль</h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  Auto-DJ ставится на паузу, пока вы в эфире. Управляйте треками вручную через edjing или другой DJ-софт.
                </p>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="bg-[#141414] rounded-2xl border border-white/5 p-5 h-full">
                <Mic2 className="size-7 text-[#ff69b4] mb-3" />
                <h3 className="font-bold mb-1 text-sm">Реквесты и звонки</h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  Во время live-сессии принимайте реквесты и звонки от слушателей. Статистика отслеживается автоматически.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* ═══ START SESSION MODAL ═══ */}
      <AnimatePresence>
        {showStartModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowStartModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0d0d0d] rounded-2xl border border-[#00d9ff]/20 w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold mb-1 font-['Righteous'] bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent">
                  Новая Live-сессия
                </h2>
                <p className="text-xs text-white/40 mb-5">
                  Auto-DJ будет приостановлен на время сессии
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-white/60">
                      Имя DJ <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={djName}
                      onChange={(e) => setDjName(e.target.value)}
                      placeholder="DJ NIQ"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/25 focus:border-[#00d9ff]/50 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-white/60">
                      Название шоу <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={showTitle}
                      onChange={(e) => setShowTitle(e.target.value)}
                      placeholder="Friday Night Soul Mix"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/25 focus:border-[#00d9ff]/50 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-2 text-white/60">
                      Источник
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {SOURCE_APPS.slice(0, 4).map(app => (
                        <button
                          key={app.id}
                          onClick={() => setSelectedApp(app.id)}
                          className={`p-2.5 rounded-xl text-center transition-all ${
                            selectedApp === app.id
                              ? 'border-2 bg-white/5'
                              : 'border border-white/5 hover:bg-white/3'
                          }`}
                          style={{
                            borderColor: selectedApp === app.id ? app.color : undefined,
                          }}
                        >
                          <span className="text-lg block mb-0.5">{app.icon}</span>
                          <span className="text-[9px] font-bold text-white/60 block">{app.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {SOURCE_APPS.slice(4).map(app => (
                        <button
                          key={app.id}
                          onClick={() => setSelectedApp(app.id)}
                          className={`p-2 rounded-xl text-center transition-all ${
                            selectedApp === app.id
                              ? 'border-2 bg-white/5'
                              : 'border border-white/5 hover:bg-white/3'
                          }`}
                          style={{
                            borderColor: selectedApp === app.id ? app.color : undefined,
                          }}
                        >
                          <span className="text-sm block">{app.icon}</span>
                          <span className="text-[8px] text-white/50 block">{app.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-6 pt-0">
                <Button
                  onClick={() => setShowStartModal(false)}
                  variant="outline"
                  className="flex-1 border-white/10 text-white/60 hover:bg-white/5"
                >
                  Отмена
                </Button>
                <Button
                  onClick={startDJSession}
                  disabled={loading || !djName.trim() || !showTitle.trim()}
                  className="flex-1 bg-gradient-to-r from-red-500 to-[#FF2D55] hover:opacity-90 text-white font-bold gap-2 disabled:opacity-40"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Radio className="size-4" />}
                  {loading ? 'Запуск...' : 'GO LIVE'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}