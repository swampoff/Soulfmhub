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
  { label: 'Broadcast Team',  icon: Radio,          path: '/admin/broadcast-team',  color: '#ef4444', desc: 'On-air staff & DJs' },
];