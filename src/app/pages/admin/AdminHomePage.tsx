import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
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
  Loader2,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
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
  MessageSquare,
  Palette,
  FileText,
  Archive,
  ShoppingBag,
  Pencil,
  Save,
  Wifi,
  Database,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../../../lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AutoDJControl } from '../../components/AutoDJControl';

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
  { label: 'Merch Store',      icon: ShoppingBag,    path: '/admin/merch',           color: '#E91E63', desc: 'Products & catalog' },
  { label: 'Community',        icon: Users,          path: '/admin/community',       color: '#00ffaa', desc: 'Moderate chat & messages' },
  { label: 'Automation',       icon: Sparkles,       path: '/admin/automation',      color: '#e67e22', desc: 'Jingles, rules, content' },
  { label: 'News Injection',   icon: Globe,          path: '/admin/news-injection',  color: '#16a085', desc: 'Voiceovers & inject rules' },
  { label: 'Live DJ Console',  icon: Headphones,     path: '/admin/live-dj-console', color: '#e74c3c', desc: 'Go live on air' },
  { label: 'Song Requests',    icon: MessageCircle,  path: '/admin/song-requests',   color: '#3498db', desc: 'Listener requests' },
  { label: 'Shoutouts',        icon: Heart,          path: '/admin/shoutouts',       color: '#e91e63', desc: 'Listener shoutouts' },
  { label: 'Call Queue',       icon: Phone,          path: '/admin/call-queue',      color: '#00bcd4', desc: 'Incoming caller queue' },
  { label: 'Feedback',         icon: MessageSquare,  path: '/admin/feedback',        color: '#FF6B6B', desc: 'Listener feedback & ratings' },
  { label: 'Stream Settings',  icon: Settings,       path: '/admin/stream-settings', color: '#95a5a6', desc: 'AzuraCast & encoding' },
  { label: 'Branding',         icon: Palette,        path: '/admin/branding',        color: '#E040FB', desc: 'Colors, fonts, identity' },
  { label: 'Analytics',        icon: BarChart3,      path: '/admin/analytics',       color: '#8e44ad', desc: 'Listeners, stats, reports' },
  { label: 'Donations',        icon: DollarSign,     path: '/admin/donations',       color: '#f39c12', desc: 'Supporter contributions' },
  { label: 'Logs & Audit',     icon: FileText,       path: '/admin/logs',            color: '#78909C', desc: 'System events & activity' },
  { label: 'Backup & Export',  icon: Archive,        path: '/admin/backup',          color: '#26A69A', desc: 'Download station data' },
  { label: 'System Test',      icon: TestTube,       path: '/admin/system-test',     color: '#00d9ff', desc: '68 endpoint tests' },
  { label: 'Upload Test',      icon: Upload,         path: '/admin/upload-test',     color: '#1abc9c', desc: 'File upload debugging' },
  { label: 'Broadcast Team',   icon: Radio,          path: '/admin/broadcast-team',  color: '#ef4444', desc: 'On-air staff & DJs' },
];

// ── Stat card items ─────────────────────────────────────────────────
const STAT_CARDS = [
  { key: 'totalTracks',   label: 'Total Tracks',   icon: Music,       color: '#00d9ff' },
  { key: 'totalShows',    label: 'Shows',           icon: Tv,          color: '#9b59b6' },
  { key: 'totalPodcasts', label: 'Podcasts',        icon: Podcast,     color: '#e67e22' },
  { key: 'peakListeners', label: 'Peak Listeners',  icon: Users,       color: '#00ffaa' },
];

// ═════════════════════════════════════════════════════════════════════
// AdminHomePage — main admin dashboard
// ═════════════════════════════════════════════════════════════════════
export function AdminHomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('[AdminHome] Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClearCache() {
    setClearingCache(true);
    try {
      await api.clearServerCache();
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 3000);
    } catch (err) {
      console.error('[AdminHome] Cache clear failed:', err);
    } finally {
      setClearingCache(false);
    }
  }

  return (
    <AdminLayout title="Dashboard" subtitle="Soul FM Hub Control Center">
      <div className="space-y-8">
        {/* ── Header actions ──────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Station Overview
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
            >
              {clearingCache ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : cacheCleared ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {cacheCleared ? 'Cache Cleared' : 'Clear Cache'}
            </button>
            <button
              onClick={loadStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Stat cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STAT_CARDS.map((card, i) => {
            const Icon = card.icon;
            const value = stats ? (stats as any)[card.key] ?? 0 : '—';
            return (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                  {loading && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
                </div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-gray-400 mt-1">{card.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Auto DJ Control ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AutoDJControl />
        </motion.div>

        {/* ── Quick links grid ────────────────────────────────────── */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            Quick Access
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {QUICK_LINKS.map((link, i) => {
              const Icon = link.icon;
              return (
                <motion.button
                  key={link.path}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.02 }}
                  onClick={() => navigate(link.path)}
                  className="group flex flex-col items-start gap-2 p-4 bg-gray-800/40 border border-gray-700/40 rounded-xl hover:border-gray-600 hover:bg-gray-800/70 transition-all text-left"
                >
                  <Icon
                    className="w-5 h-5 transition-colors"
                    style={{ color: link.color }}
                  />
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">
                      {link.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{link.desc}</div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Storage & Bandwidth info ────────────────────────────── */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* Storage */}
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-gray-300">Storage</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-xl font-bold text-white">
                  {stats.storageUsed > 0
                    ? `${(stats.storageUsed / 1024).toFixed(1)} GB`
                    : '—'}
                </span>
                {stats.storageTotal > 0 && (
                  <span className="text-xs text-gray-500 mb-0.5">
                    / {(stats.storageTotal / 1024).toFixed(0)} GB
                  </span>
                )}
              </div>
              {stats.storageTotal > 0 && (
                <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (stats.storageUsed / stats.storageTotal) * 100,
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Bandwidth */}
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-gray-300">Bandwidth</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-xl font-bold text-white">
                  {stats.bandwidthUsed > 0
                    ? `${(stats.bandwidthUsed / 1024).toFixed(1)} GB`
                    : '—'}
                </span>
                {stats.bandwidthTotal > 0 && (
                  <span className="text-xs text-gray-500 mb-0.5">
                    / {(stats.bandwidthTotal / 1024).toFixed(0)} GB
                  </span>
                )}
              </div>
              {stats.bandwidthTotal > 0 && (
                <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (stats.bandwidthUsed / stats.bandwidthTotal) * 100,
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminHomePage;
