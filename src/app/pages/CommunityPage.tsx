import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  MessageCircle,
  Users,
  Send,
  Hash,
  Heart,
  Music,
  Headphones,
  Star,
  TrendingUp,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../../lib/api';

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

const CHANNELS = [
  { id: 'general', label: 'General', icon: Hash, color: '#00d9ff' },
  { id: 'music-talk', label: 'Music Talk', icon: Music, color: '#00ffaa' },
  { id: 'dj-chat', label: 'DJ Chat', icon: Headphones, color: '#FF8C42' },
  { id: 'events', label: 'Events', icon: Star, color: '#E91E63' },
];

// Generate a persistent anonymous ID for likes
function getAnonymousId(): string {
  let id = localStorage.getItem('soul-fm-anon-id');
  if (!id) {
    id = 'anon_' + Math.random().toString(36).substr(2, 12);
    localStorage.setItem('soul-fm-anon-id', id);
  }
  return id;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function CommunityPage() {
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState<{ totalMessages: number; todayMessages: number; channels: Record<string, number> } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const anonId = useRef(getAnonymousId());

  const loadMessages = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [msgRes, statsRes] = await Promise.all([
        api.getCommunityMessages(undefined, 100),
        api.getCommunityStats(),
      ]);
      const data = Array.isArray(msgRes?.messages) ? msgRes.messages : [];
      if (data.length === 0 && showSpinner) {
        // Auto-seed
        console.log('[Community] No messages — seeding defaults...');
        try {
          await api.seedCommunity();
          const retry = await api.getCommunityMessages(undefined, 100);
          setMessages(Array.isArray(retry?.messages) ? retry.messages : []);
        } catch (seedErr) {
          console.error('[Community] Seed error:', seedErr);
        }
      } else {
        setMessages(data);
      }
      if (statsRes && !statsRes.error) {
        setStats(statsRes);
      }
    } catch (error) {
      console.error('[Community] Load error:', error);
      if (showSpinner) toast.error('Failed to load community messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages(true);
    // Poll every 10 seconds for new messages
    pollRef.current = setInterval(() => loadMessages(false), 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadMessages]);

  const filteredMessages = messages.filter((m) => m.channel === activeChannel);

  const channelCounts = messages.reduce((acc, m) => {
    const ch = m.channel || 'general';
    acc[ch] = (acc[ch] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const result = await api.postCommunityMessage({
        user: 'You',
        color: '#00d9ff',
        message: newMessage.trim(),
        channel: activeChannel,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        // Optimistic add
        if (result.message) {
          setMessages((prev) => [result.message, ...prev]);
        }
        setNewMessage('');
        toast.success('Message sent!');
      }
    } catch (err) {
      console.error('[Community] Send error:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const toggleLike = async (msgId: string) => {
    try {
      const result = await api.likeCommunityMessage(msgId, anonId.current);
      if (result.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, likes: result.message.likes, likedBy: result.message.likedBy } : m))
        );
      }
    } catch (err) {
      console.error('[Community] Like error:', err);
    }
  };

  const isLiked = (msg: ChatMessage): boolean => {
    return Array.isArray(msg.likedBy) && msg.likedBy.includes(anonId.current);
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ffaa]/10 border border-[#00ffaa]/30 mb-6">
            <Users className="w-4 h-4 text-[#00ffaa]" />
            <span className="text-sm text-[#00ffaa] font-medium">Community Hub</span>
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: 'Righteous, cursive' }}
          >
            Soul FM <span className="text-[#00ffaa]">Community</span>
          </h1>
          <p className="text-cyan-100/60 text-lg max-w-2xl mx-auto">
            Connect with fellow soul music lovers. Share your thoughts, discover new music, and be part of the wave.
          </p>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="bg-white/5 border-white/10 p-3">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-white/60">
                <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
                <Users className="w-4 h-4" />
                <span><strong className="text-white">Live</strong> chat</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <MessageCircle className="w-4 h-4" />
                <span><strong className="text-white">{stats?.todayMessages ?? messages.length}</strong> messages today</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <TrendingUp className="w-4 h-4" />
                <span><strong className="text-white">{stats?.totalMessages ?? messages.length}</strong> total</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadMessages(true)}
                disabled={loading}
                className="text-white/30 hover:text-white h-7 px-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar: Channels */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-1 space-y-4"
          >
            <Card className="bg-white/5 border-white/10 p-4">
              <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">Channels</h3>
              <div className="space-y-1">
                {CHANNELS.map((ch) => {
                  const Icon = ch.icon;
                  const msgCount = channelCounts[ch.id] || 0;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChannel(ch.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all text-sm ${
                        activeChannel === ch.id
                          ? 'bg-white/10 text-white'
                          : 'text-white/50 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color: ch.color }} />
                        <span>{ch.label}</span>
                      </div>
                      <span className="text-xs text-white/30">{msgCount}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </motion.div>

          {/* Chat Area */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <Card className="bg-white/5 border-white/10 flex flex-col h-[600px]">
              {/* Channel Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-[#00d9ff]" />
                  <span className="font-bold text-white">
                    {CHANNELS.find((c) => c.id === activeChannel)?.label}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs text-white/40 border-white/10">
                  {filteredMessages.length} messages
                </Badge>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse">
                <div ref={chatEndRef} />
                {loading && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="size-8 text-cyan-400 animate-spin" />
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-white/30 text-sm">
                    No messages yet in this channel. Be the first!
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {filteredMessages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex gap-3 group"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: `${msg.color || '#00d9ff'}30`, color: msg.color || '#00d9ff' }}
                        >
                          {msg.initial || (msg.user || 'A')[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium" style={{ color: msg.color || '#00d9ff' }}>
                              {msg.user}
                            </span>
                            <span className="text-[10px] text-white/25">
                              {msg.createdAt ? timeAgo(msg.createdAt) : ''}
                            </span>
                          </div>
                          <p className="text-sm text-white/70 break-words">{msg.message}</p>
                          <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => toggleLike(msg.id)}
                              className={`flex items-center gap-1 text-xs transition-colors ${
                                isLiked(msg) ? 'text-red-400' : 'text-white/30 hover:text-red-400'
                              }`}
                            >
                              <Heart className={`w-3 h-3 ${isLiked(msg) ? 'fill-red-400' : ''}`} />
                              {(msg.likes || 0) > 0 && msg.likes}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={`Message #${CHANNELS.find((c) => c.id === activeChannel)?.label.toLowerCase()}...`}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    maxLength={500}
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold px-4"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
