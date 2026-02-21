import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  MessageCircle,
  Users,
  Trash2,
  Loader2,
  RefreshCw,
  Hash,
  Heart,
  Search,
  TrendingUp,
  Eraser,
  AlertTriangle,
  Package,
  Music,
  Headphones,
  Star,
  Clock,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../../lib/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  user: string;
  initial: string;
  color: string;
  message: string;
  createdAt: string;
  likes: number;
  likedBy?: string[];
  channel: string;
}

interface CommunityStats {
  totalMessages: number;
  todayMessages: number;
  channels: Record<string, number>;
}

const CHANNELS = [
  { id: 'all', label: 'All Channels', icon: MessageCircle, color: '#ffffff' },
  { id: 'general', label: 'General', icon: Hash, color: '#00d9ff' },
  { id: 'music-talk', label: 'Music Talk', icon: Music, color: '#00ffaa' },
  { id: 'dj-chat', label: 'DJ Chat', icon: Headphones, color: '#FF8C42' },
  { id: 'events', label: 'Events', icon: Star, color: '#E91E63' },
];

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function CommunityManagement() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [msgRes, statsRes] = await Promise.all([
        api.getCommunityMessages(undefined, 200),
        api.getCommunityStats(),
      ]);
      setMessages(Array.isArray(msgRes?.messages) ? msgRes.messages : []);
      if (statsRes && !statsRes.error) {
        setStats(statsRes);
      }
    } catch (error) {
      console.error('[CommunityAdmin] Load error:', error);
      if (showSpinner) toast.error('Failed to load community data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteCommunityMessage(id);
      setMessages(prev => prev.filter(m => m.id !== id));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      toast.success('Message deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete message');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected message(s)?`)) return;
    try {
      for (const id of selectedIds) {
        await api.deleteCommunityMessage(id);
      }
      setMessages(prev => prev.filter(m => !selectedIds.has(m.id)));
      toast.success(`${selectedIds.size} message(s) deleted`);
      setSelectedIds(new Set());
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete messages');
    }
  };

  const handlePurgeAll = async () => {
    try {
      for (const msg of messages) {
        await api.deleteCommunityMessage(msg.id);
      }
      setMessages([]);
      setConfirmPurge(false);
      setSelectedIds(new Set());
      toast.success('All community messages purged');
    } catch (error: any) {
      toast.error(error.message || 'Failed to purge');
    }
  };

  const handleSeed = async () => {
    try {
      const res = await api.seedCommunity();
      toast.success(res.message || 'Community seeded');
      await loadData(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to seed');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(m => m.id)));
    }
  };

  const filtered = messages
    .filter(m => activeChannel === 'all' || m.channel === activeChannel)
    .filter(m => !search || (m.message || '').toLowerCase().includes(search.toLowerCase()) || (m.user || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'popular') return (b.likes || 0) - (a.likes || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const channelCounts = messages.reduce((acc, m) => {
    const ch = m.channel || 'general';
    acc[ch] = (acc[ch] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Righteous, cursive' }}>
              <Users className="size-7 text-[#00ffaa]" />
              Community Management
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Moderate messages and manage community channels
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => loadData(true)} disabled={loading} className="text-white/40 hover:text-white">
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleSeed} className="border-white/10 text-white/60 hover:text-white text-xs">
              <Package className="size-3.5 mr-1" /> Seed
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmPurge(true)} className="border-red-500/20 text-red-400/70 hover:text-red-400 text-xs">
              <Eraser className="size-3.5 mr-1" /> Purge All
            </Button>
          </div>
        </div>

        {/* Purge Confirmation */}
        <AnimatePresence>
          {confirmPurge && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="bg-red-500/10 border-red-500/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="size-5" />
                  <span className="text-sm font-medium">Delete ALL {messages.length} messages? This cannot be undone.</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setConfirmPurge(false)} className="text-white/50">Cancel</Button>
                  <Button size="sm" onClick={handlePurgeAll} className="bg-red-500 text-white hover:bg-red-600">Confirm Purge</Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-white/5 border-white/10 p-4 text-center">
            <MessageCircle className="size-5 text-[#00d9ff] mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{stats?.totalMessages ?? messages.length}</div>
            <div className="text-xs text-white/40">Total Messages</div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4 text-center">
            <TrendingUp className="size-5 text-[#00ffaa] mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{stats?.todayMessages ?? 0}</div>
            <div className="text-xs text-white/40">Today</div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4 text-center">
            <Hash className="size-5 text-[#FF8C42] mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{Object.keys(channelCounts).length}</div>
            <div className="text-xs text-white/40">Active Channels</div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4 text-center">
            <Heart className="size-5 text-[#E91E63] mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{messages.reduce((sum, m) => sum + (m.likes || 0), 0)}</div>
            <div className="text-xs text-white/40">Total Likes</div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
            <Input
              placeholder="Search messages or users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-9"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {CHANNELS.map(ch => {
              const Icon = ch.icon;
              const count = ch.id === 'all' ? messages.length : (channelCounts[ch.id] || 0);
              return (
                <Button
                  key={ch.id}
                  variant={activeChannel === ch.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveChannel(ch.id)}
                  className={activeChannel === ch.id
                    ? 'bg-[#00d9ff] text-slate-900 font-bold text-xs'
                    : 'border-white/10 text-white/50 text-xs'
                  }
                >
                  <Icon className="size-3 mr-1" style={{ color: activeChannel === ch.id ? undefined : ch.color }} />
                  {ch.label}
                  <span className="ml-1 text-[10px] opacity-60">({count})</span>
                </Button>
              );
            })}
          </div>
          <div className="flex gap-1">
            <Button
              variant={sortBy === 'newest' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('newest')}
              className={sortBy === 'newest' ? 'bg-white/10 text-white text-xs' : 'border-white/10 text-white/50 text-xs'}
            >
              <Clock className="size-3 mr-1" /> Newest
            </Button>
            <Button
              variant={sortBy === 'popular' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('popular')}
              className={sortBy === 'popular' ? 'bg-white/10 text-white text-xs' : 'border-white/10 text-white/50 text-xs'}
            >
              <Heart className="size-3 mr-1" /> Popular
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-[#00d9ff]/5 border-[#00d9ff]/20 p-3 flex items-center justify-between">
              <span className="text-sm text-[#00d9ff]">
                {selectedIds.size} message{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="text-white/40 text-xs">
                  Deselect
                </Button>
                <Button size="sm" onClick={handleBulkDelete} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs">
                  <Trash2 className="size-3 mr-1" /> Delete Selected
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Messages List */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="size-8 text-cyan-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 bg-white/5 border-white/10 text-center">
            <MessageCircle className="size-16 text-white/10 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Messages</h3>
            <p className="text-white/40 mb-4">
              {messages.length === 0 ? 'Community is empty. Use Seed to populate sample messages.' : 'No messages match the current filter.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-1">
            {/* Select All */}
            <div className="flex items-center gap-2 px-3 py-1.5">
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-white/20"
              />
              <span className="text-xs text-white/30">Select all ({filtered.length})</span>
            </div>

            <AnimatePresence initial={false}>
              {filtered.map((msg) => {
                const channelInfo = CHANNELS.find(c => c.id === msg.channel) || CHANNELS[1];
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 5, height: 0 }}
                    layout
                  >
                    <Card className={`bg-white/[0.02] border-white/[0.06] hover:border-white/15 transition-all p-3 ${
                      selectedIds.has(msg.id) ? 'ring-1 ring-[#00d9ff]/30 bg-[#00d9ff]/5' : ''
                    }`}>
                      <div className="flex gap-3">
                        {/* Checkbox */}
                        <div className="flex items-start pt-0.5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(msg.id)}
                            onChange={() => toggleSelect(msg.id)}
                            className="rounded border-white/20"
                          />
                        </div>

                        {/* Avatar */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: `${msg.color || '#00d9ff'}20`, color: msg.color || '#00d9ff' }}
                        >
                          {msg.initial || (msg.user || 'A')[0]}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-sm font-medium" style={{ color: msg.color || '#00d9ff' }}>
                              {msg.user || 'Anonymous'}
                            </span>
                            <Badge variant="outline" className="text-[9px] py-0 h-4 border-white/10 text-white/30">
                              #{(msg.channel || 'general')}
                            </Badge>
                            <span className="text-[10px] text-white/20">{timeAgo(msg.createdAt)}</span>
                          </div>
                          <p className="text-sm text-white/60 break-words">{msg.message}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {(msg.likes || 0) > 0 && (
                              <span className="flex items-center gap-1 text-xs text-red-400/60">
                                <Heart className="size-3 fill-red-400/40" /> {msg.likes}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-start gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(msg.id)}
                            className="h-7 w-7 p-0 text-white/20 hover:text-red-400"
                            title="Delete message"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
