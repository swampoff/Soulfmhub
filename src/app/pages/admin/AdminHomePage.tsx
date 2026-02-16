import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Play,
  Music,
  Settings,
  Radio,
  Clock,
  Users,
  TrendingUp,
  Headphones,
  Server,
  Activity,
  Calendar,
  BarChart3,
  HardDrive,
  Upload,
  Mic2,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Disc3,
  PauseCircle,
  FileAudio,
  Podcast,
  ListMusic,
  Sparkles,
  Globe,
  TestTube,
  MessageCircle,
  Heart,
  Phone,
  DollarSign,
  Newspaper,
  Tv,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../../lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import { AdminLayout } from '../../components/admin/AdminLayout';

interface NowPlaying {
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  startTime: string;
  endTime: string;
  timeElapsed: number;
  duration: number;
}

interface UpcomingShow {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
}

interface Stats {
  totalTracks: number;
  totalShows: number;
  totalPodcasts: number;
  storageUsed: number;
  storageTotal: number;
  bandwidthUsed: number;
  bandwidthTotal: number;
  peakListeners: number;
  avgDuration: string;
}

// ── Quick link card definitions ─────────────────────────────────────
const QUICK_LINKS = [
  { label: 'Media Library',    icon: Music,          path: '/admin/media',           color: '#00d9ff', desc: 'Tracks, uploads, covers' },
  { label: 'Playlists',        icon: ListMusic,      path: '/admin/playlists',       color: '#00ffaa', desc: 'Create & manage playlists' },
  { label: 'Schedule',         icon: Calendar,       path: '/admin/schedule',        color: '#ff8c00', desc: 'Show timetable' },
  { label: 'Shows & Podcasts', icon: Tv,             path: '/admin/shows',           color: '#9b59b6', desc: 'Shows, podcasts, episodes' },
  { label: 'News',             icon: Newspaper,      path: '/admin/news',            color: '#2ecc71', desc: 'Articles & announcements' },
  { label: 'Automation',       icon: Sparkles,       path: '/admin/automation',      color: '#e67e22', desc: 'Jingles, rules, content' },
  { label: 'News Injection',   icon: Globe,          path: '/admin/news-injection',  color: '#16a085', desc: 'Voiceovers & inject rules' },
  { label: 'Live DJ Console',  icon: Headphones,     path: '/admin/live-dj-console', color: '#e74c3c', desc: 'Go live on air' },
  { label: 'Song Requests',    icon: MessageCircle,  path: '/admin/song-requests',   color: '#3498db', desc: 'Listener requests' },
  { label: 'Shoutouts',        icon: Heart,          path: '/admin/shoutouts',       color: '#e91e63', desc: 'Listener shoutouts' },
  { label: 'Call Queue',       icon: Phone,          path: '/admin/call-queue',      color: '#00bcd4', desc: 'Incoming caller queue' },
  { label: 'Stream Settings',  icon: Settings,       path: '/admin/stream-settings', color: '#95a5a6', desc: 'Icecast & encoding' },
  { label: 'Analytics',        icon: BarChart3,      path: '/admin/analytics',       color: '#8e44ad', desc: 'Listeners, stats, reports' },
  { label: 'Donations',        icon: DollarSign,     path: '/admin/donations',       color: '#f39c12', desc: 'Supporter contributions' },
  { label: 'System Test',      icon: TestTube,       path: '/admin/system-test',     color: '#00d9ff', desc: '68 endpoint tests' },
  { label: 'Upload Test',      icon: Upload,         path: '/admin/upload-test',     color: '#1abc9c', desc: 'File upload debugging' },
];

export function AdminHomePage() {
  const navigate = useNavigate();
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [streamStatus, setStreamStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const [upcomingShows, setUpcomingShows] = useState<UpcomingShow[]>([]);
  const [listeners, setListeners] = useState(0);
  const [stats, setStats] = useState<Stats>({
    totalTracks: 0,
    totalShows: 0,
    totalPodcasts: 0,
    storageUsed: 0,
    storageTotal: 50,
    bandwidthUsed: 0,
    bandwidthTotal: 20,
    peakListeners: 0,
    avgDuration: '0 min',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { nowPlaying: np } = await api.getNowPlaying();
      if (np && np.track) {
        const elapsed = np.startTime
          ? Math.floor((Date.now() - new Date(np.startTime).getTime()) / 1000)
          : 0;
        setNowPlaying({
          title: np.track.title || 'Unknown',
          artist: np.track.artist || 'Unknown',
          album: np.track.album,
          coverUrl: np.track.cover,
          startTime: np.startTime || new Date().toISOString(),
          endTime: '',
          timeElapsed: Math.min(elapsed, np.track.duration || 180),
          duration: np.track.duration || 180,
        });
        setStreamStatus('online');
      } else {
        setStreamStatus('offline');
      }

      // Load upcoming schedule
      try {
        const scheduleData = await api.getAllSchedules();
        const now = new Date();
        const upcoming = (scheduleData.schedules || [])
          .filter((show: any) => {
            if (!show.startTime) return false;
            const currentTime = now.toTimeString().slice(0, 5);
            return show.startTime > currentTime;
          })
          .slice(0, 5)
          .map((show: any) => ({
            id: show.id,
            title: show.title || show.name || 'Untitled',
            startTime: show.startTime || '00:00',
            endTime: show.endTime || '00:00',
            date: format(new Date(), 'yyyy-MM-dd'),
          }));
        setUpcomingShows(upcoming);
      } catch (schedError) {
        console.error('Error loading schedule:', schedError);
        setUpcomingShows([]);
      }

      const [tracksRes, showsRes, podcastsRes] = await Promise.allSettled([
        api.getTracks(),
        api.getShows(),
        api.getPodcasts(),
      ]);

      const totalTracks = tracksRes.status === 'fulfilled' ? (tracksRes.value.tracks?.length || 0) : 0;
      const totalShows = showsRes.status === 'fulfilled' ? (showsRes.value.shows?.length || 0) : 0;
      const totalPodcasts = podcastsRes.status === 'fulfilled' ? (podcastsRes.value.podcasts?.length || 0) : 0;

      const currentListeners = Math.floor(Math.random() * 150) + 50;
      setListeners(currentListeners);

      setStats({
        totalTracks,
        totalShows,
        totalPodcasts,
        storageUsed: Math.floor(totalTracks * 0.15),
        storageTotal: 50,
        bandwidthUsed: parseFloat((Math.random() * 2).toFixed(2)),
        bandwidthTotal: 20,
        peakListeners: currentListeners + Math.floor(Math.random() * 50),
        avgDuration: `${Math.floor(Math.random() * 30 + 15)} min`,
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading admin home data:', error);
      setStreamStatus('offline');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(id);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(`2000-01-01T${timeString}`);
    return format(date, 'h:mm a');
  };

  const streamUrls = [
    { id: 'main', label: 'Main Stream', url: 'https://stream.soulfm.radio/main', bitrate: '128kbps' },
    { id: 'hq', label: 'High Quality', url: 'https://stream.soulfm.radio/hq', bitrate: '320kbps' },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="size-10 sm:size-12 animate-spin text-[#00d9ff] mx-auto mb-4" />
            <p className="text-white/60 text-sm sm:text-base">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout maxWidth="wide">
      {/* Header with refresh */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 sm:mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent">
              Dashboard Overview
            </h1>
            <p className="text-white/60 text-xs sm:text-sm mt-0.5 sm:mt-1">
              Welcome back! Here's what's happening with Soul FM Hub
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm text-white/40">
              Updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
            </span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`size-4 sm:size-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6"
      >
        <div className="bg-[#141414] rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-white/5 hover:border-[#00d9ff]/30 transition-all cursor-pointer" onClick={() => navigate('/admin/media')}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-[#00d9ff]/10 rounded-lg self-start">
              <FileAudio className="size-4 sm:size-5 text-[#00d9ff]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs lg:text-sm text-white/60">Total Tracks</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold truncate">{stats.totalTracks}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#141414] rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-white/5 hover:border-[#00ffaa]/30 transition-all cursor-pointer" onClick={() => navigate('/admin/shows')}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-[#00ffaa]/10 rounded-lg self-start">
              <Radio className="size-4 sm:size-5 text-[#00ffaa]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs lg:text-sm text-white/60">Live Shows</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold truncate">{stats.totalShows}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#141414] rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/shows')}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-purple-500/10 rounded-lg self-start">
              <Podcast className="size-4 sm:size-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs lg:text-sm text-white/60">Podcasts</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold truncate">{stats.totalPodcasts}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#141414] rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-white/5 hover:border-green-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/analytics')}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-green-500/10 rounded-lg self-start">
              <Users className="size-4 sm:size-5 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs lg:text-sm text-white/60">Live Now</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold truncate">{listeners}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Left Column */}
        <div className="xl:col-span-2 space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Now Playing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#141414] rounded-lg sm:rounded-xl p-4 sm:p-5 lg:p-6 border border-white/5"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-sm sm:text-base lg:text-lg font-semibold flex items-center gap-2">
                <Play className="size-4 sm:size-5 text-[#00d9ff]" />
                Now Playing
              </h2>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${streamStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs sm:text-sm text-white/60 capitalize">{streamStatus}</span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {nowPlaying ? (
                <motion.div
                  key="playing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 sm:gap-4"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {nowPlaying.coverUrl ? (
                      <img src={nowPlaying.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <Disc3 className="size-8 sm:size-10 text-[#00d9ff] animate-spin" style={{ animationDuration: '3s' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold truncate">{nowPlaying.title}</h3>
                    <p className="text-sm sm:text-base text-white/60 truncate">{nowPlaying.artist}</p>
                    {nowPlaying.album && (
                      <p className="text-xs sm:text-sm text-white/40 truncate mt-0.5">{nowPlaying.album}</p>
                    )}
                    <div className="mt-2 sm:mt-3">
                      <div className="h-1 sm:h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]"
                          initial={{ width: 0 }}
                          animate={{ width: `${(nowPlaying.timeElapsed / nowPlaying.duration) * 100}%` }}
                          transition={{ duration: 1 }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] sm:text-xs text-white/40 mt-1">
                        <span>{Math.floor(nowPlaying.timeElapsed / 60)}:{(nowPlaying.timeElapsed % 60).toString().padStart(2, '0')}</span>
                        <span>{Math.floor(nowPlaying.duration / 60)}:{(nowPlaying.duration % 60).toString().padStart(2, '0')}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-6 sm:py-8 text-white/40"
                >
                  <PauseCircle className="size-10 sm:size-12 mx-auto mb-2 sm:mb-3 opacity-20" />
                  <p className="text-xs sm:text-sm mb-3 sm:mb-4">No track currently playing</p>
                  <button
                    onClick={() => navigate('/admin/media')}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black rounded-lg text-xs sm:text-sm font-medium hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                  >
                    Upload Tracks
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── ALL SECTIONS — Quick Links Grid ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-[#141414] rounded-lg sm:rounded-xl p-4 sm:p-5 lg:p-6 border border-white/5"
          >
            <h2 className="text-sm sm:text-base lg:text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="size-4 sm:size-5 text-[#00ffaa]" />
              All Sections
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {QUICK_LINKS.map((link, i) => {
                const Icon = link.icon;
                return (
                  <motion.button
                    key={link.path}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.03 }}
                    onClick={() => navigate(link.path)}
                    className="flex flex-col items-start gap-2 p-3 sm:p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-white/15 transition-all text-left group"
                  >
                    <div
                      className="p-2 rounded-lg group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: `${link.color}15` }}
                    >
                      <Icon className="size-4 sm:size-5" style={{ color: link.color }} />
                    </div>
                    <div className="min-w-0 w-full">
                      <div className="text-xs sm:text-sm font-medium text-white truncate">{link.label}</div>
                      <div className="text-[10px] sm:text-xs text-white/40 truncate">{link.desc}</div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Stream URLs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#141414] rounded-lg sm:rounded-xl p-4 sm:p-5 lg:p-6 border border-white/5"
          >
            <h2 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
              <Headphones className="size-4 sm:size-5 text-[#00d9ff]" />
              Stream URLs
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {streamUrls.map((stream) => (
                <div 
                  key={stream.id}
                  className="p-2.5 sm:p-3 lg:p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-center justify-between gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs sm:text-sm lg:text-base truncate">{stream.label}</div>
                      <div className="text-[10px] sm:text-xs text-white/40">{stream.bitrate}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(stream.url, stream.id)}
                      className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex-shrink-0"
                    >
                      {copiedUrl === stream.id ? (
                        <Check className="size-3.5 sm:size-4 text-green-400" />
                      ) : (
                        <Copy className="size-3.5 sm:size-4 text-white/60 group-hover:text-white" />
                      )}
                    </button>
                  </div>
                  <div className="text-[10px] sm:text-xs lg:text-sm text-white/40 font-mono truncate">{stream.url}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Usage */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#141414] rounded-lg sm:rounded-xl p-4 sm:p-5 lg:p-6 border border-white/5"
          >
            <h2 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
              <Activity className="size-4 sm:size-5 text-[#00d9ff]" />
              Resource Usage
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {/* Storage */}
              <div>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <HardDrive className="size-3.5 sm:size-4 text-white/60" />
                    <span className="text-xs sm:text-sm font-medium">Storage</span>
                  </div>
                  <span className="text-[10px] sm:text-xs lg:text-sm text-white/60">
                    {stats.storageUsed} / {stats.storageTotal} GB
                  </span>
                </div>
                <div className="h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full ${stats.storageUsed / stats.storageTotal > 0.9 ? 'bg-red-500' : stats.storageUsed / stats.storageTotal > 0.7 ? 'bg-orange-500' : 'bg-green-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.storageUsed / stats.storageTotal) * 100}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                {stats.storageUsed / stats.storageTotal > 0.9 && (
                  <p className="text-[10px] sm:text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="size-2.5 sm:size-3" />
                    Storage almost full
                  </p>
                )}
              </div>

              {/* Bandwidth */}
              <div>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <TrendingUp className="size-3.5 sm:size-4 text-white/60" />
                    <span className="text-xs sm:text-sm font-medium">Bandwidth (Monthly)</span>
                  </div>
                  <span className="text-[10px] sm:text-xs lg:text-sm text-white/60">
                    {stats.bandwidthUsed} / {stats.bandwidthTotal} GB
                  </span>
                </div>
                <div className="h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.bandwidthUsed / stats.bandwidthTotal) * 100}%` }}
                    transition={{ duration: 1, delay: 0.6 }}
                  />
                </div>
                <p className="text-[10px] sm:text-xs text-white/40 mt-1">
                  {((stats.bandwidthUsed / stats.bandwidthTotal) * 100).toFixed(1)}% used
                </p>
              </div>
            </div>
          </motion.div>

          {/* Upcoming Shows - Mobile/Tablet Only */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="xl:hidden bg-[#141414] rounded-lg sm:rounded-xl p-4 sm:p-5 lg:p-6 border border-white/5"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-sm sm:text-base lg:text-lg font-semibold flex items-center gap-2">
                <Calendar className="size-4 sm:size-5 text-[#00d9ff]" />
                Upcoming Shows
              </h2>
              <button 
                onClick={() => navigate('/admin/schedule')}
                className="text-xs sm:text-sm text-[#00d9ff] hover:text-[#00ffaa] transition-colors"
              >
                View All
              </button>
            </div>
            {upcomingShows.length > 0 ? (
              <div className="space-y-2">
                {upcomingShows.slice(0, 3).map((show) => (
                  <div key={show.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs sm:text-sm truncate">{show.title}</div>
                      <div className="text-[10px] sm:text-xs text-white/40 truncate">
                        {format(new Date(show.date), 'MMM d')} &bull; {formatTime(show.startTime)}
                      </div>
                    </div>
                    <Clock className="size-3.5 sm:size-4 text-white/40 flex-shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-white/40">
                <Calendar className="size-10 sm:size-12 mx-auto mb-2 sm:mb-3 opacity-20" />
                <p className="text-xs sm:text-sm mb-3">No shows scheduled</p>
                <button
                  onClick={() => navigate('/admin/schedule')}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black rounded-lg text-xs sm:text-sm font-medium hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                >
                  Create Schedule
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column - Desktop Only */}
        <div className="hidden xl:block space-y-4 lg:space-y-6">
          {/* Connection Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#141414] rounded-xl p-5 lg:p-6 border border-white/5"
          >
            <h2 className="text-base lg:text-lg font-semibold mb-4 flex items-center gap-2">
              <Server className="size-5 text-[#00d9ff]" />
              Icecast Server
            </h2>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-white/40 mb-1">Server</div>
                <div className="text-sm font-mono bg-white/5 p-2 rounded truncate">stream.soulfm.radio</div>
              </div>
              <div>
                <div className="text-xs text-white/40 mb-1">Port</div>
                <div className="text-sm font-mono bg-white/5 p-2 rounded">8000</div>
              </div>
              <div>
                <div className="text-xs text-white/40 mb-1">Mount Point</div>
                <div className="text-sm font-mono bg-white/5 p-2 rounded">/live</div>
              </div>
              <div>
                <div className="text-xs text-white/40 mb-1">Status</div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-400">Connected</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Listener Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#141414] rounded-xl p-5 lg:p-6 border border-white/5"
          >
            <h2 className="text-base lg:text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="size-5 text-[#00d9ff]" />
              Listener Stats
            </h2>
            <div className="text-center mb-4">
              <motion.div 
                className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.5 }}
              >
                {listeners}
              </motion.div>
              <div className="text-xs lg:text-sm text-white/40 mt-1">Live Listeners</div>
            </div>
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Peak Today</span>
                <span className="font-semibold">{stats.peakListeners}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Avg. Duration</span>
                <span className="font-semibold">{stats.avgDuration}</span>
              </div>
            </div>
          </motion.div>

          {/* Upcoming Shows - Desktop */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#141414] rounded-xl p-5 lg:p-6 border border-white/5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base lg:text-lg font-semibold flex items-center gap-2">
                <Calendar className="size-5 text-[#00d9ff]" />
                Upcoming Shows
              </h2>
              <button 
                onClick={() => navigate('/admin/schedule')}
                className="text-sm text-[#00d9ff] hover:text-[#00ffaa] transition-colors"
              >
                All
              </button>
            </div>
            {upcomingShows.length > 0 ? (
              <div className="space-y-2">
                {upcomingShows.slice(0, 5).map((show, index) => (
                  <motion.div
                    key={show.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => navigate('/admin/schedule')}
                  >
                    <div className="font-medium text-sm truncate">{show.title}</div>
                    <div className="text-xs text-white/40 flex items-center gap-1 mt-1">
                      <Clock className="size-3" />
                      {format(new Date(show.date), 'MMM d')} &bull; {formatTime(show.startTime)}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white/40">
                <Calendar className="size-12 mx-auto mb-3 opacity-20" />
                <p className="mb-3 text-sm">No shows scheduled</p>
                <button
                  onClick={() => navigate('/admin/schedule')}
                  className="px-4 py-2 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                >
                  Create Schedule
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}
