import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Mic2,
  Megaphone,
  Headphones,
  TrendingUp,
  Sliders,
  PenTool,
  Music,
  Volume2,
  Bell,
  Newspaper,
  Podcast,
  Wifi,
  Calendar,
  Circle,
  ChevronUp,
  ChevronDown,
  Loader2,
  RefreshCw,
  Clapperboard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../../../lib/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { TEAM_PHOTOS } from '../../../lib/assets';

// Static team photos from /public/assets/team/
const FIGMA_PHOTOS = TEAM_PHOTOS;

interface BroadcastMember {
  id: string;
  name: string;
  fullName: string;
  role: string;
  roleKey: string;
  color: string;
  emoji: string;
  bio: string;
  specialties: string[];
  photoType: 'figma' | 'url';
  photoId?: string;
  photoUrl?: string;
  status: 'on-air' | 'online' | 'idle' | 'offline';
  show: string | null;
  schedule: string;
  genres: string[];
}

const STATUS_CONFIG: Record<string, { color: string; label: string; bg: string; glow?: string }> = {
  'on-air': { color: '#ef4444', label: 'ON AIR', bg: 'bg-red-500/15', glow: 'shadow-red-500/30' },
  online: { color: '#22c55e', label: 'Online', bg: 'bg-green-500/15' },
  idle: { color: '#f59e0b', label: 'Idle', bg: 'bg-yellow-500/15' },
  offline: { color: '#6b7280', label: 'Offline', bg: 'bg-gray-500/15' },
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  'program-director': Clapperboard,
  singer: Mic2,
  announcer: Megaphone,
  dj: Headphones,
  'news-marketing': TrendingUp,
  'mix-engineer': Sliders,
  'dictor-editor': PenTool,
  'music-editor': Music,
  ads: Volume2,
  jingles: Bell,
  news: Newspaper,
  podcasts: Podcast,
};

export function BroadcastTeamPage() {
  const [members, setMembers] = useState<BroadcastMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const loadMembers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getBroadcastMembers();
      if (res.members) setMembers(res.members);
    } catch (err) {
      console.error('Load broadcast team error:', err);
      toast.error('Failed to load broadcast team');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const changeStatus = async (memberId: string, newStatus: string) => {
    setStatusUpdating(memberId);
    try {
      const res = await api.setBroadcastMemberStatus(memberId, newStatus);
      if (res.error) {
        toast.error(res.error);
      } else {
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: newStatus as any } : m));
        toast.success(`${res.member?.name || 'Member'} → ${STATUS_CONFIG[newStatus]?.label}`);
      }
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setStatusUpdating(null);
    }
  };

  const onAirCount = members.filter(m => m.status === 'on-air').length;
  const onlineCount = members.filter(m => m.status !== 'offline').length;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="size-10 animate-spin text-[#00d9ff] mx-auto mb-4" />
            <p className="text-white/60 text-sm">Loading Broadcast Team...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout maxWidth="wide">
      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-[#00d9ff]/20">
                <Radio className="size-6 sm:size-7 text-red-400" />
              </div>
              <span className="bg-gradient-to-r from-red-400 via-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent">
                Broadcast Team
              </span>
            </h1>
            <p className="text-white/50 text-xs sm:text-sm mt-1 ml-[52px] sm:ml-[60px]">
              On-air staff, DJs, hosts, and production crew
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setRefreshing(true); loadMembers(); }}
              disabled={refreshing}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Strip ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6"
      >
        <div className="bg-[#141414] rounded-xl p-3 sm:p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Radio className="size-4 text-red-400" />
            <span className="text-xs text-white/50">On Air</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-red-400">{onAirCount}</div>
          <div className="text-[10px] text-white/30">broadcasting now</div>
        </div>
        <div className="bg-[#141414] rounded-xl p-3 sm:p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Wifi className="size-4 text-green-400" />
            <span className="text-xs text-white/50">Online</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-green-400">{onlineCount}</div>
          <div className="text-[10px] text-white/30">of {members.length} members</div>
        </div>
        <div className="bg-[#141414] rounded-xl p-3 sm:p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Mic2 className="size-4 text-[#00d9ff]" />
            <span className="text-xs text-white/50">Crew</span>
          </div>
          <div className="text-lg sm:text-xl font-bold">{members.length}</div>
          <div className="text-[10px] text-white/30">total staff</div>
        </div>
        <div className="bg-[#141414] rounded-xl p-3 sm:p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Music className="size-4 text-[#00ffaa]" />
            <span className="text-xs text-white/50">Roles</span>
          </div>
          <div className="text-lg sm:text-xl font-bold">{new Set(members.map(m => m.roleKey)).size}</div>
          <div className="text-[10px] text-white/30">departments</div>
        </div>
      </motion.div>

      {/* ── On-Air Banner (when someone is live) ───────────────── */}
      <AnimatePresence>
        {onAirCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent rounded-2xl border border-red-500/20 p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <Radio className="size-5 text-red-400" />
                  <span className="absolute -top-0.5 -right-0.5 flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-red-500" />
                  </span>
                </div>
                <span className="text-sm font-bold text-red-400 uppercase tracking-wider">Live Now</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {members.filter(m => m.status === 'on-air').map(m => (
                  <div key={m.id} className="flex items-center gap-3 bg-black/30 rounded-xl px-4 py-2.5">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      {m.photoType === 'figma' && m.photoId && FIGMA_PHOTOS[m.photoId] ? (
                        <img src={FIGMA_PHOTOS[m.photoId]} alt={m.name} className="w-full h-full object-cover" />
                      ) : m.photoUrl ? (
                        <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg" style={{ backgroundColor: `${m.color}20` }}>
                          {m.emoji}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: m.color }}>{m.name}</div>
                      <div className="text-[10px] text-white/40">{m.show || m.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Member Cards Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {members.map((member, i) => {
          const statusConf = STATUS_CONFIG[member.status];
          const RoleIcon = ROLE_ICONS[member.roleKey] || Radio;
          const isExpanded = expandedId === member.id;
          const isOnAir = member.status === 'on-air';

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className={`relative bg-[#141414] rounded-2xl border overflow-hidden transition-all ${
                isOnAir
                  ? 'border-red-500/30 shadow-lg shadow-red-500/10'
                  : 'border-white/5 hover:border-white/15'
              }`}
            >
              {/* On-Air glow bar */}
              {isOnAir && (
                <div className="h-1 bg-gradient-to-r from-red-500 via-red-400 to-red-500 animate-pulse" />
              )}

              {/* Photo + overlay */}
              <div className="relative h-52 sm:h-56 overflow-hidden">
                {member.photoType === 'figma' && member.photoId && FIGMA_PHOTOS[member.photoId] ? (
                  <img
                    src={FIGMA_PHOTOS[member.photoId]}
                    alt={member.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-6xl"
                    style={{ backgroundColor: `${member.color}15` }}
                  >
                    {member.emoji}
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent" />

                {/* Status badge */}
                <div className="absolute top-3 right-3">
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${statusConf.bg}`}
                    style={{ color: statusConf.color }}
                  >
                    {isOnAir ? (
                      <>
                        <span className="relative flex size-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: statusConf.color }} />
                          <span className="relative inline-flex rounded-full size-2" style={{ backgroundColor: statusConf.color }} />
                        </span>
                        {statusConf.label}
                      </>
                    ) : (
                      <>
                        <Circle className="size-2" fill={statusConf.color} />
                        {statusConf.label}
                      </>
                    )}
                  </div>
                </div>

                {/* Role icon */}
                <div className="absolute top-3 left-3">
                  <div className="p-1.5 rounded-lg backdrop-blur-sm bg-black/40">
                    <RoleIcon className="size-4" style={{ color: member.color }} />
                  </div>
                </div>

                {/* Name overlay at bottom of photo */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-xl font-bold text-white drop-shadow-lg">{member.name}</h3>
                  <p className="text-xs text-white/70 drop-shadow-md">{member.fullName}</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Role */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold" style={{ color: member.color }}>
                    {member.role}
                  </span>
                </div>

                {/* Show & Schedule */}
                {member.show && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-xs text-white/50">
                    <Radio className="size-3 flex-shrink-0" />
                    <span className="truncate">{member.show}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 mb-3 text-xs text-white/40">
                  <Calendar className="size-3 flex-shrink-0" />
                  <span className="truncate">{member.schedule}</span>
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {member.genres.slice(0, 3).map(g => (
                    <span
                      key={g}
                      className="px-2 py-0.5 rounded-full text-[9px] font-medium"
                      style={{ backgroundColor: `${member.color}12`, color: `${member.color}cc`, border: `1px solid ${member.color}20` }}
                    >
                      {g}
                    </span>
                  ))}
                  {member.genres.length > 3 && (
                    <span className="px-1.5 py-0.5 text-[9px] text-white/30">+{member.genres.length - 3}</span>
                  )}
                </div>

                {/* Status control */}
                <div className="flex items-center gap-1.5 mb-3">
                  {(['on-air', 'online', 'idle', 'offline'] as const).map(s => {
                    const conf = STATUS_CONFIG[s];
                    const isActive = member.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => !isActive && changeStatus(member.id, s)}
                        disabled={statusUpdating === member.id}
                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-semibold uppercase tracking-wider transition-all ${
                          isActive
                            ? `${conf.bg} border border-current`
                            : 'bg-white/3 text-white/25 hover:bg-white/8 border border-transparent'
                        }`}
                        style={isActive ? { color: conf.color, borderColor: `${conf.color}30` } : undefined}
                      >
                        {s === 'on-air' ? 'AIR' : s === 'online' ? 'ON' : s === 'idle' ? 'IDLE' : 'OFF'}
                      </button>
                    );
                  })}
                </div>

                {/* Expand for details */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : member.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-white/30 hover:text-white/50 hover:bg-white/5 transition-all"
                >
                  {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  {isExpanded ? 'Less' : 'More details'}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 mt-3 border-t border-white/5 space-y-3">
                        {/* Bio */}
                        <p className="text-xs text-white/50 leading-relaxed">{member.bio}</p>

                        {/* Specialties */}
                        <div>
                          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Specialties</div>
                          <div className="flex flex-wrap gap-1">
                            {member.specialties.map(s => (
                              <span key={s} className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-white/50">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* All genres */}
                        <div>
                          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Genres</div>
                          <div className="flex flex-wrap gap-1">
                            {member.genres.map(g => (
                              <span
                                key={g}
                                className="px-2 py-0.5 rounded text-[10px] font-medium"
                                style={{ backgroundColor: `${member.color}10`, color: `${member.color}aa` }}
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </AdminLayout>
  );
}