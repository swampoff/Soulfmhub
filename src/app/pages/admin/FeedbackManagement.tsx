import React, { useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  Search,
  Filter,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Eye,
  MailOpen,
  Trash2,
  TrendingUp,
  Smile,
  Frown,
  Meh,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

type FeedbackStatus = 'all' | 'new' | 'reviewed' | 'responded';
type FeedbackSentiment = 'positive' | 'neutral' | 'negative';

interface FeedbackItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  rating: number;
  sentiment: FeedbackSentiment;
  status: 'new' | 'reviewed' | 'responded';
  date: string;
  category: string;
}

const MOCK_FEEDBACK: FeedbackItem[] = [
  {
    id: '1', name: 'Maria Gonzalez', email: 'maria@example.com', subject: 'Love the midnight sessions!',
    message: 'DJ SoulWave\'s midnight groove sessions are the highlight of my week. The music selection is always on point!',
    rating: 5, sentiment: 'positive', status: 'new', date: '2026-02-17T08:30:00Z', category: 'Shows',
  },
  {
    id: '2', name: 'James Wilson', email: 'james@example.com', subject: 'Stream quality issue on mobile',
    message: 'I\'ve been experiencing buffering on my iPhone when using Safari. Works fine on Chrome though.',
    rating: 3, sentiment: 'neutral', status: 'new', date: '2026-02-16T14:20:00Z', category: 'Technical',
  },
  {
    id: '3', name: 'Ayumi Tanaka', email: 'ayumi@example.com', subject: 'Great station, needs more jazz',
    message: 'Really enjoying the station overall. Would love to hear more jazz fusion and contemporary jazz in the rotation.',
    rating: 4, sentiment: 'positive', status: 'reviewed', date: '2026-02-15T19:45:00Z', category: 'Music',
  },
  {
    id: '4', name: 'David Chen', email: 'david@example.com', subject: 'Song request feature is amazing',
    message: 'Just used the song request feature for the first time. My song was played within 30 minutes! Great experience.',
    rating: 5, sentiment: 'positive', status: 'responded', date: '2026-02-14T11:10:00Z', category: 'Features',
  },
  {
    id: '5', name: 'Anonymous', email: '', subject: 'Too many ads',
    message: 'There seem to be too many ad breaks between songs. It disrupts the flow of the music.',
    rating: 2, sentiment: 'negative', status: 'reviewed', date: '2026-02-13T22:30:00Z', category: 'General',
  },
  {
    id: '6', name: 'Sophie Anderson', email: 'sophie@example.com', subject: 'Podcast suggestion',
    message: 'Would be amazing to have a podcast about the history of soul music in different cities. Like a "Soul Cities" series!',
    rating: 4, sentiment: 'positive', status: 'new', date: '2026-02-13T09:15:00Z', category: 'Shows',
  },
  {
    id: '7', name: 'Marcus Brown', email: 'marcus@example.com', subject: 'Love the community vibe',
    message: 'The community chat is such a great addition. Really makes you feel connected with other listeners.',
    rating: 5, sentiment: 'positive', status: 'responded', date: '2026-02-12T16:00:00Z', category: 'Features',
  },
  {
    id: '8', name: 'Lisa Park', email: 'lisa@example.com', subject: 'Schedule page confusing',
    message: 'The schedule page layout is a bit confusing. Hard to tell what\'s playing when. Could use better time indicators.',
    rating: 3, sentiment: 'neutral', status: 'new', date: '2026-02-12T10:30:00Z', category: 'Technical',
  },
];

const SENTIMENT_CONFIG = {
  positive: { icon: Smile, color: '#00ffaa', label: 'Positive' },
  neutral: { icon: Meh, color: '#FFD700', label: 'Neutral' },
  negative: { icon: Frown, color: '#EF4444', label: 'Negative' },
};

const STATUS_CONFIG = {
  new: { color: '#00d9ff', label: 'New', bg: 'bg-[#00d9ff]/10' },
  reviewed: { color: '#FFD700', label: 'Reviewed', bg: 'bg-[#FFD700]/10' },
  responded: { color: '#00ffaa', label: 'Responded', bg: 'bg-[#00ffaa]/10' },
};

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function FeedbackManagement() {
  const [feedback, setFeedback] = useState(MOCK_FEEDBACK);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = feedback.filter((f) => {
    const matchesSearch = !search || f.message.toLowerCase().includes(search.toLowerCase()) || f.name.toLowerCase().includes(search.toLowerCase()) || f.subject.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const avgRating = feedback.length > 0 ? (feedback.reduce((a, f) => a + f.rating, 0) / feedback.length).toFixed(1) : '0';
  const sentimentCounts = {
    positive: feedback.filter((f) => f.sentiment === 'positive').length,
    neutral: feedback.filter((f) => f.sentiment === 'neutral').length,
    negative: feedback.filter((f) => f.sentiment === 'negative').length,
  };

  const markAsReviewed = (id: string) => {
    setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'reviewed' as const } : f)));
    toast.success('Marked as reviewed');
  };

  const markAsResponded = (id: string) => {
    setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'responded' as const } : f)));
    toast.success('Marked as responded');
  };

  const deleteFeedback = (id: string) => {
    setFeedback((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
    toast.success('Feedback deleted');
  };

  const selected = feedback.find((f) => f.id === selectedId);

  return (
    <AdminLayout maxWidth="wide">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#00d9ff]" />
            Listener Feedback
          </h1>
          <p className="text-sm text-white/40 mt-1">Review and respond to listener feedback and suggestions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-white/5 border-white/10 p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{feedback.length}</div>
                <div className="text-[10px] text-white/40 uppercase">Total</div>
              </div>
            </div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 flex items-center justify-center">
                <Star className="w-4 h-4 text-[#FFD700]" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{avgRating}</div>
                <div className="text-[10px] text-white/40 uppercase">Avg Rating</div>
              </div>
            </div>
          </Card>
          {(Object.entries(sentimentCounts) as [FeedbackSentiment, number][]).map(([key, count]) => {
            const cfg = SENTIMENT_CONFIG[key];
            const Icon = cfg.icon;
            return (
              <Card key={key} className="bg-white/5 border-white/10 p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cfg.color}15` }}>
                    <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{count}</div>
                    <div className="text-[10px] text-white/40 uppercase">{cfg.label}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search feedback..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'new', 'reviewed', 'responded'] as FeedbackStatus[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => setStatusFilter(s)}
                className={statusFilter === s ? 'bg-[#00d9ff] text-slate-900 font-bold' : 'border-white/10 text-white/50 hover:text-white'}
              >
                {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
                {s === 'new' && <Badge className="ml-1 bg-[#00d9ff]/20 text-[#00d9ff] text-[10px] px-1.5 border-0">{feedback.filter((f) => f.status === 'new').length}</Badge>}
              </Button>
            ))}
          </div>
        </div>

        {/* Feedback List + Detail */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* List */}
          <div className="lg:col-span-3 space-y-3">
            {filtered.map((f, i) => {
              const sentCfg = SENTIMENT_CONFIG[f.sentiment];
              const SentIcon = sentCfg.icon;
              const stCfg = STATUS_CONFIG[f.status];
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card
                    onClick={() => setSelectedId(f.id)}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedId === f.id ? 'bg-white/10 border-[#00d9ff]/30' : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <SentIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: sentCfg.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-white truncate">{f.subject}</span>
                          <Badge className={`${stCfg.bg} text-[10px] border-0`} style={{ color: stCfg.color }}>{stCfg.label}</Badge>
                        </div>
                        <p className="text-xs text-white/40 line-clamp-2">{f.message}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-white/30">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {f.name}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(f.date)}</span>
                          <span className="flex items-center gap-1">
                            {[...Array(5)].map((_, si) => (
                              <Star key={si} className={`w-2.5 h-2.5 ${si < f.rating ? 'text-[#FFD700] fill-[#FFD700]' : 'text-white/15'}`} />
                            ))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-10 h-10 text-white/15 mx-auto mb-3" />
                <p className="text-white/30 text-sm">No feedback matching your criteria</p>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-2">
            {selected ? (
              <Card className="bg-white/5 border-white/10 p-6 sticky top-24">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className={`${STATUS_CONFIG[selected.status].bg} border-0 text-xs`} style={{ color: STATUS_CONFIG[selected.status].color }}>
                      {STATUS_CONFIG[selected.status].label}
                    </Badge>
                    <span className="text-xs text-white/30">{formatDate(selected.date)}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{selected.subject}</h3>
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <User className="w-4 h-4" />
                    <span>{selected.name}</span>
                    {selected.email && <span className="text-white/25">({selected.email})</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, si) => (
                      <Star key={si} className={`w-4 h-4 ${si < selected.rating ? 'text-[#FFD700] fill-[#FFD700]' : 'text-white/15'}`} />
                    ))}
                    <span className="text-xs text-white/30 ml-2">{selected.rating}/5</span>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-sm text-white/70 leading-relaxed">{selected.message}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/30">
                    <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">{selected.category}</Badge>
                    {(() => { const cfg = SENTIMENT_CONFIG[selected.sentiment]; const I = cfg.icon; return <span className="flex items-center gap-1" style={{ color: cfg.color }}><I className="w-3 h-3" /> {cfg.label}</span>; })()}
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-white/10">
                    {selected.status === 'new' && (
                      <Button size="sm" variant="outline" onClick={() => markAsReviewed(selected.id)} className="border-white/10 text-white/60 gap-1 flex-1">
                        <Eye className="w-3 h-3" /> Mark Reviewed
                      </Button>
                    )}
                    {selected.status !== 'responded' && (
                      <Button size="sm" onClick={() => markAsResponded(selected.id)} className="bg-[#00d9ff] text-slate-900 gap-1 flex-1">
                        <MailOpen className="w-3 h-3" /> Mark Responded
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteFeedback(selected.id)} className="text-red-400/60 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="bg-white/5 border-white/10 p-8 text-center">
                <MessageSquare className="w-10 h-10 text-white/15 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Select feedback to view details</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
