import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  MessageCircle,
  Users,
  ThumbsUp,
  Send,
  Hash,
  Heart,
  Music,
  Radio,
  Headphones,
  Star,
  Smile,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  user: string;
  initial: string;
  color: string;
  message: string;
  time: string;
  likes: number;
  isLiked: boolean;
  channel: string;
}

const CHANNELS = [
  { id: 'general', label: 'General', icon: Hash, color: '#00d9ff' },
  { id: 'music-talk', label: 'Music Talk', icon: Music, color: '#00ffaa' },
  { id: 'dj-chat', label: 'DJ Chat', icon: Headphones, color: '#FF8C42' },
  { id: 'events', label: 'Events', icon: Star, color: '#E91E63' },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: '1', user: 'SoulSeeker42', initial: 'S', color: '#00d9ff', message: 'That last track was absolutely fire! Anyone know the artist?', time: '2 min ago', likes: 5, isLiked: false, channel: 'general' },
  { id: '2', user: 'FunkMaster', initial: 'F', color: '#00ffaa', message: 'DJ SoulWave is killing it tonight! Best midnight groove session yet.', time: '5 min ago', likes: 12, isLiked: false, channel: 'general' },
  { id: '3', user: 'VinylLover', initial: 'V', color: '#FF8C42', message: 'Just discovered this station yesterday and I\'m already hooked. The music selection is incredible!', time: '8 min ago', likes: 8, isLiked: false, channel: 'general' },
  { id: '4', user: 'NeoSoulFan', initial: 'N', color: '#E91E63', message: 'Has anyone checked out the new Erykah Badu remix? It\'s giving me all the vibes.', time: '12 min ago', likes: 15, isLiked: false, channel: 'music-talk' },
  { id: '5', user: 'GrooveRider', initial: 'G', color: '#9C27B0', message: 'The funk university episode about Parliament was educational and funky at the same time. Professor Funk is a legend!', time: '15 min ago', likes: 20, isLiked: false, channel: 'music-talk' },
  { id: '6', user: 'BeatDropper', initial: 'B', color: '#FFD700', message: 'Anyone going to the Soul FM Summer Festival? I just got my tickets!', time: '20 min ago', likes: 7, isLiked: false, channel: 'events' },
  { id: '7', user: 'MidnightJazz', initial: 'M', color: '#00BCD4', message: 'Late night jazz vibes hitting different. Perfect for coding at 2am.', time: '25 min ago', likes: 11, isLiked: false, channel: 'general' },
  { id: '8', user: 'DJ Heritage', initial: 'D', color: '#00ffaa', message: 'Hey everyone! Thanks for tuning in to tonight\'s Vinyl Vault. Next week we\'re diving into rare Northern Soul 45s.', time: '30 min ago', likes: 32, isLiked: false, channel: 'dj-chat' },
];

const ONLINE_USERS = [
  { name: 'SoulSeeker42', color: '#00d9ff' },
  { name: 'FunkMaster', color: '#00ffaa' },
  { name: 'VinylLover', color: '#FF8C42' },
  { name: 'NeoSoulFan', color: '#E91E63' },
  { name: 'GrooveRider', color: '#9C27B0' },
  { name: 'BeatDropper', color: '#FFD700' },
  { name: 'MidnightJazz', color: '#00BCD4' },
  { name: 'DJ Heritage', color: '#00ffaa' },
  { name: 'ChillWave', color: '#607D8B' },
  { name: 'SoulSister', color: '#E91E63' },
  { name: 'BasslineKing', color: '#FF8C42' },
];

export function CommunityPage() {
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const filteredMessages = messages.filter((m) => m.channel === activeChannel);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      user: 'You',
      initial: 'Y',
      color: '#00d9ff',
      message: newMessage.trim(),
      time: 'Just now',
      likes: 0,
      isLiked: false,
      channel: activeChannel,
    };
    setMessages((prev) => [msg, ...prev]);
    setNewMessage('');
    toast.success('Message sent!');
  };

  const toggleLike = (id: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, isLiked: !m.isLiked, likes: m.isLiked ? m.likes - 1 : m.likes + 1 }
          : m
      )
    );
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
                <span><strong className="text-white">{ONLINE_USERS.length}</strong> online</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <MessageCircle className="w-4 h-4" />
                <span><strong className="text-white">{messages.length}</strong> messages today</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <TrendingUp className="w-4 h-4" />
                <span><strong className="text-white">2.4K</strong> members</span>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar: Channels + Online */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-1 space-y-4"
          >
            {/* Channels */}
            <Card className="bg-white/5 border-white/10 p-4">
              <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">Channels</h3>
              <div className="space-y-1">
                {CHANNELS.map((ch) => {
                  const Icon = ch.icon;
                  const msgCount = messages.filter((m) => m.channel === ch.id).length;
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

            {/* Online Users */}
            <Card className="bg-white/5 border-white/10 p-4 hidden lg:block">
              <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">
                Online — {ONLINE_USERS.length}
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {ONLINE_USERS.map((u) => (
                  <div key={u.name} className="flex items-center gap-2">
                    <div className="relative">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: `${u.color}30` }}
                      >
                        {u.name[0]}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00ff88] border-2 border-[#0a1628]" />
                    </div>
                    <span className="text-xs text-white/60 truncate">{u.name}</span>
                  </div>
                ))}
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
                {filteredMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-3 group"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: `${msg.color}30`, color: msg.color }}
                    >
                      {msg.initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium" style={{ color: msg.color }}>{msg.user}</span>
                        <span className="text-[10px] text-white/25">{msg.time}</span>
                      </div>
                      <p className="text-sm text-white/70 break-words">{msg.message}</p>
                      <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleLike(msg.id)}
                          className={`flex items-center gap-1 text-xs transition-colors ${
                            msg.isLiked ? 'text-red-400' : 'text-white/30 hover:text-red-400'
                          }`}
                        >
                          <Heart className={`w-3 h-3 ${msg.isLiked ? 'fill-red-400' : ''}`} />
                          {msg.likes > 0 && msg.likes}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {filteredMessages.length === 0 && (
                  <div className="flex items-center justify-center h-full text-white/30 text-sm">
                    No messages yet in this channel. Be the first!
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={`Message #${CHANNELS.find((c) => c.id === activeChannel)?.label.toLowerCase()}...`}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold px-4"
                  >
                    <Send className="w-4 h-4" />
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
