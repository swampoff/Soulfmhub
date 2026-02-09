import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import {
  ListMusic,
  Plus,
  Edit,
  Trash2,
  Music,
  Loader2,
  Search,
  ChevronLeft,
  GripVertical,
  Radio,
  Shuffle,
  Play,
  Clock,
  ArrowUpDown,
  Zap,
  Check,
  X,
  Filter,
  Hash,
  LayoutGrid,
  PlusCircle,
  MinusCircle,
  ArrowRight,
  Volume2,
  SkipForward,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';

// ==================== TYPES ====================

interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  duration: number;
  tags?: string[];
  coverUrl?: string;
  bpm?: number;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  color?: string;
  genre?: string;
  trackIds: string[];
  isPublic?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface ScheduleSlot {
  id: string;
  playlistId: string;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  title: string;
  isActive: boolean;
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ==================== CONSTANTS ====================

const COLORS = [
  { value: '#00d9ff', label: 'Cyan' },
  { value: '#00ffaa', label: 'Mint' },
  { value: '#FF8C42', label: 'Sunset' },
  { value: '#E91E63', label: 'Pink' },
  { value: '#9C27B0', label: 'Purple' },
  { value: '#2196F3', label: 'Blue' },
  { value: '#4CAF50', label: 'Green' },
  { value: '#FF5722', label: 'Red' },
  { value: '#FFD700', label: 'Gold' },
];

const GENRES = ['all', 'soul', 'funk', 'jazz', 'disco', 'r&b', 'reggae', 'blues', 'afrobeat', 'house', 'lofi'];

// ==================== MAIN COMPONENT ====================

export function PlaylistsManagement() {
  // State
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editPlaylist, setEditPlaylist] = useState<Playlist | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Handle deep-link from Schedule: ?open=playlistId
  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId && playlists.length > 0) {
      const pl = playlists.find(p => p.id === openId);
      if (pl) setSelectedPlaylist(pl);
    }
  }, [searchParams, playlists]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [playlistsRes, tracksRes, schedRes] = await Promise.all([
        api.getAllPlaylists(),
        api.getTracks(),
        api.getAllSchedules().catch(() => ({ schedules: [] })),
      ]);
      setPlaylists(playlistsRes.playlists || []);
      setAllTracks(tracksRes.tracks || []);
      setSchedules(schedRes.schedules || []);
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Get schedule slots for a given playlist
  const getPlaylistSchedules = useCallback((playlistId: string) => {
    return schedules.filter(s => s.playlistId === playlistId);
  }, [schedules]);

  // When a playlist is selected, keep it in sync with playlists array
  useEffect(() => {
    if (selectedPlaylist) {
      const updated = playlists.find(p => p.id === selectedPlaylist.id);
      if (updated) {
        setSelectedPlaylist(updated);
      }
    }
  }, [playlists]);

  // Handlers
  const handleDeletePlaylist = async (id: string) => {
    if (id === 'livestream') {
      toast.error('Cannot delete the Live Stream playlist');
      return;
    }
    if (!confirm('Delete this playlist? This cannot be undone.')) return;
    try {
      await api.deletePlaylist(id);
      setPlaylists(prev => prev.filter(p => p.id !== id));
      if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
      toast.success('Playlist deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  const handleSetAsLiveStream = async (playlist: Playlist) => {
    if (playlist.id === 'livestream') {
      toast.info('This is already the Live Stream playlist');
      return;
    }
    if (!confirm(`Copy all ${playlist.trackIds?.length || 0} tracks from "${playlist.name}" to the Live Stream playlist? This replaces the current Live Stream queue.`)) return;

    try {
      // Get or create livestream playlist
      let livePlaylist: Playlist;
      const existingLive = playlists.find(p => p.id === 'livestream');
      if (existingLive) {
        livePlaylist = existingLive;
      } else {
        const res = await api.createPlaylist({
          id: 'livestream',
          name: 'Live Stream',
          description: 'Main broadcast playlist for Auto DJ',
          trackIds: []
        });
        livePlaylist = res.playlist;
      }

      // Copy tracks to livestream
      await api.updatePlaylist('livestream', {
        ...livePlaylist,
        trackIds: [...(playlist.trackIds || [])],
        description: `Loaded from: ${playlist.name}`
      });

      toast.success(`Loaded ${playlist.trackIds?.length || 0} tracks into Live Stream!`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to set as live stream');
    }
  };

  const isLiveStream = (id: string) => id === 'livestream';

  // Stats
  const totalTracks = playlists.reduce((sum, p) => sum + (p.trackIds?.length || 0), 0);
  const livePlaylist = playlists.find(p => p.id === 'livestream');
  const scheduledCount = new Set(schedules.map(s => s.playlistId)).size;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[500px]">
          <Loader2 className="w-8 h-8 text-[#00d9ff] animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  // ==================== DETAIL VIEW ====================
  if (selectedPlaylist) {
    return (
      <AdminLayout maxWidth="wide">
        <PlaylistDetail
          playlist={selectedPlaylist}
          allTracks={allTracks}
          scheduleSlots={getPlaylistSchedules(selectedPlaylist.id)}
          onBack={() => setSelectedPlaylist(null)}
          onUpdate={(updated) => {
            setPlaylists(prev => prev.map(p => p.id === updated.id ? updated : p));
            setSelectedPlaylist(updated);
          }}
          onSetAsLive={() => handleSetAsLiveStream(selectedPlaylist)}
          isLive={isLiveStream(selectedPlaylist.id)}
          onViewSchedule={() => navigate(`/admin/schedule?highlight=${selectedPlaylist.id}`)}
          onScheduleCreated={() => loadData()}
        />
      </AdminLayout>
    );
  }

  // ==================== GRID VIEW ====================
  const filteredPlaylists = playlists.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.genre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout maxWidth="wide">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] rounded-xl">
              <ListMusic className="w-7 h-7 text-[#0a1628]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
                Playlists
              </h1>
              <p className="text-white/60 text-sm">Manage playlists and assign tracks to go on air</p>
            </div>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                New Playlist
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0f1c2e] border-[#00d9ff]/30 text-white max-w-md">
              <DialogHeader>
                <DialogTitle>Create Playlist</DialogTitle>
              </DialogHeader>
              <CreatePlaylistForm
                onSuccess={(newPl) => {
                  setPlaylists(prev => [newPl, ...prev]);
                  setIsCreateOpen(false);
                }}
                onCancel={() => setIsCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard
            icon={<ListMusic className="w-5 h-5" />}
            label="Playlists"
            value={playlists.length}
            color="#00d9ff"
          />
          <StatCard
            icon={<Music className="w-5 h-5" />}
            label="Total Tracks"
            value={totalTracks}
            color="#00ffaa"
          />
          <StatCard
            icon={<Radio className="w-5 h-5" />}
            label="On Air"
            value={livePlaylist ? `${livePlaylist.trackIds?.length || 0} tracks` : 'None'}
            color="#FF8C42"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            label="Scheduled"
            value={`${scheduledCount} of ${playlists.length}`}
            color="#9C27B0"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Library"
            value={allTracks.length}
            color="#2196F3"
          />
        </div>

        {/* Search */}
        <Card className="bg-[#0f1c2e]/90 border-[#00d9ff]/20 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search playlists..."
              className="pl-10 bg-[#0a1628] border-white/10 text-white"
            />
          </div>
        </Card>

        {/* Playlists Grid */}
        {filteredPlaylists.length === 0 ? (
          <Card className="bg-[#0f1c2e]/90 border-[#00d9ff]/20 p-12 text-center">
            <ListMusic className="w-16 h-16 mx-auto mb-4 text-white/20" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? 'No results' : 'No Playlists Yet'}
            </h3>
            <p className="text-white/50 mb-6">
              {searchQuery ? 'Try a different search' : 'Create your first playlist and add tracks for Auto DJ'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredPlaylists.map((playlist, i) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  index={i}
                  isLive={isLiveStream(playlist.id)}
                  allTracks={allTracks}
                  scheduleSlots={getPlaylistSchedules(playlist.id)}
                  onClick={() => setSelectedPlaylist(playlist)}
                  onEdit={() => {
                    setEditPlaylist(playlist);
                    setIsEditOpen(true);
                  }}
                  onDelete={() => handleDeletePlaylist(playlist.id)}
                  onSetAsLive={() => handleSetAsLiveStream(playlist)}
                  onViewSchedule={() => navigate('/admin/schedule')}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#0f1c2e] border-[#00d9ff]/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
          </DialogHeader>
          {editPlaylist && (
            <EditPlaylistForm
              playlist={editPlaylist}
              onSuccess={(updated) => {
                setPlaylists(prev => prev.map(p => p.id === updated.id ? updated : p));
                setIsEditOpen(false);
              }}
              onCancel={() => setIsEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// ==================== STAT CARD ====================

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card className="bg-[#0f1c2e]/90 border-white/10 p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <div style={{ color }}>{icon}</div>
        </div>
        <div className="min-w-0">
          <p className="text-white/50 text-xs">{label}</p>
          <p className="text-white font-bold text-lg truncate">{value}</p>
        </div>
      </div>
    </Card>
  );
}

// ==================== PLAYLIST CARD ====================

function PlaylistCard({
  playlist,
  index,
  isLive,
  allTracks,
  scheduleSlots,
  onClick,
  onEdit,
  onDelete,
  onSetAsLive,
  onViewSchedule
}: {
  playlist: Playlist;
  index: number;
  isLive: boolean;
  allTracks: Track[];
  scheduleSlots: ScheduleSlot[];
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetAsLive: () => void;
  onViewSchedule: () => void;
}) {
  const trackCount = playlist.trackIds?.length || 0;
  const color = playlist.color || '#00d9ff';

  // Calculate total duration
  const totalDuration = useMemo(() => {
    return (playlist.trackIds || []).reduce((sum, id) => {
      const track = allTracks.find(t => t.id === id);
      return sum + (track?.duration || 0);
    }, 0);
  }, [playlist.trackIds, allTracks]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card
        className={`bg-[#0f1c2e]/90 border overflow-hidden hover:shadow-lg hover:shadow-[${color}]/10 transition-all cursor-pointer group ${
          isLive ? 'border-[#00ffaa]/50 ring-1 ring-[#00ffaa]/20' : 'border-white/10 hover:border-white/20'
        }`}
        onClick={onClick}
      >
        {/* Color Header */}
        <div
          className="h-2 w-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }}
        />

        <div className="p-4 sm:p-5">
          {/* Title Row */}
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                {isLive && (
                  <Badge className="bg-[#00ffaa]/20 text-[#00ffaa] border-[#00ffaa]/30 text-[10px] px-1.5 py-0 flex-shrink-0">
                    <Radio className="w-2.5 h-2.5 mr-1 animate-pulse" />
                    ON AIR
                  </Badge>
                )}
              </div>
              <h3 className="text-white font-bold text-lg truncate">{playlist.name}</h3>
              {playlist.description && (
                <p className="text-white/50 text-sm mt-1 line-clamp-2">{playlist.description}</p>
              )}
            </div>
          </div>

          {/* Genre */}
          {playlist.genre && (
            <Badge variant="outline" className="mb-3 text-xs" style={{ borderColor: `${color}40`, color }}>
              {playlist.genre}
            </Badge>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-white/50 mb-3">
            <span className="flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5" />
              {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
            </span>
            {totalDuration > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(totalDuration)}
              </span>
            )}
          </div>

          {/* Schedule Badges */}
          {scheduleSlots.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {scheduleSlots.slice(0, 3).map(slot => (
                <span
                  key={slot.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    slot.isActive
                      ? 'bg-[#00d9ff]/15 text-[#00d9ff]/80'
                      : 'bg-white/5 text-white/30 line-through'
                  }`}
                >
                  <Calendar className="w-2.5 h-2.5" />
                  {slot.dayOfWeek !== null ? DAYS_SHORT[slot.dayOfWeek] : 'Daily'} {slot.startTime}
                </span>
              ))}
              {scheduleSlots.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-white/30">
                  +{scheduleSlots.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              onClick={onClick}
              className="flex-1 border-white/10 text-white hover:bg-white/5 text-xs"
            >
              <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
              Open
            </Button>
            {!isLive && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSetAsLive}
                className="border-[#00ffaa]/30 text-[#00ffaa] hover:bg-[#00ffaa]/10 text-xs"
                title="Send to Live Stream"
              >
                <Radio className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              className="text-white/50 hover:text-white hover:bg-white/5"
            >
              <Edit className="w-3.5 h-3.5" />
            </Button>
            {!isLive && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="text-red-400/50 hover:text-red-400 hover:bg-red-400/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            {scheduleSlots.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onViewSchedule}
                className="text-[#00ffaa]/50 hover:text-[#00ffaa] hover:bg-[#00ffaa]/10"
              >
                <Calendar className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== PLAYLIST DETAIL VIEW ====================

function PlaylistDetail({
  playlist,
  allTracks,
  scheduleSlots,
  onBack,
  onUpdate,
  onSetAsLive,
  isLive,
  onViewSchedule,
  onScheduleCreated
}: {
  playlist: Playlist;
  allTracks: Track[];
  scheduleSlots: ScheduleSlot[];
  onBack: () => void;
  onUpdate: (p: Playlist) => void;
  onSetAsLive: () => void;
  isLive: boolean;
  onViewSchedule: () => void;
  onScheduleCreated: () => void;
}) {
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryGenre, setLibraryGenre] = useState('all');
  const [saving, setSaving] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [quickScheduleOpen, setQuickScheduleOpen] = useState(false);
  const [quickScheduleForm, setQuickScheduleForm] = useState({
    dayOfWeek: new Date().getDay().toString(),
    startTime: '08:00',
    endTime: '10:00',
  });
  const [quickScheduleSaving, setQuickScheduleSaving] = useState(false);

  const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const QUICK_TIME_SLOTS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  const handleQuickSchedule = async () => {
    const dayOfWeek = quickScheduleForm.dayOfWeek === 'daily' ? null : parseInt(quickScheduleForm.dayOfWeek);
    setQuickScheduleSaving(true);
    try {
      await api.createSchedule({
        playlistId: playlist.id,
        dayOfWeek,
        startTime: quickScheduleForm.startTime,
        endTime: quickScheduleForm.endTime,
        title: playlist.name,
        isActive: true,
        repeatWeekly: true,
      });
      toast.success(`Scheduled "${playlist.name}" at ${quickScheduleForm.dayOfWeek === 'daily' ? 'Daily' : DAYS_SHORT[parseInt(quickScheduleForm.dayOfWeek)]} ${quickScheduleForm.startTime}`);
      setQuickScheduleOpen(false);
      onScheduleCreated();
    } catch (error: any) {
      console.error('Quick schedule error:', error);
      toast.error('Failed to schedule');
    } finally {
      setQuickScheduleSaving(false);
    }
  };

  // Build ordered tracks list
  const orderedTracks = useMemo(() => {
    return (playlist.trackIds || [])
      .map(id => allTracks.find(t => t.id === id))
      .filter(Boolean) as Track[];
  }, [playlist.trackIds, allTracks]);

  // Filter library tracks (exclude already in playlist)
  const libraryTracks = useMemo(() => {
    const inPlaylist = new Set(playlist.trackIds || []);
    return allTracks.filter(t => {
      if (inPlaylist.has(t.id)) return false;
      const matchSearch = !librarySearch ||
        t.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
        t.artist.toLowerCase().includes(librarySearch.toLowerCase());
      const matchGenre = libraryGenre === 'all' || t.genre?.toLowerCase() === libraryGenre;
      return matchSearch && matchGenre;
    });
  }, [allTracks, playlist.trackIds, librarySearch, libraryGenre]);

  const totalDuration = orderedTracks.reduce((sum, t) => sum + (t.duration || 0), 0);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  // Save track order
  const saveOrder = useCallback(async (newTrackIds: string[]) => {
    setSaving(true);
    try {
      await api.updatePlaylist(playlist.id, {
        ...playlist,
        trackIds: newTrackIds
      });
      onUpdate({ ...playlist, trackIds: newTrackIds });
    } catch (error: any) {
      toast.error('Failed to save order');
    } finally {
      setSaving(false);
    }
  }, [playlist, onUpdate]);

  const handleReorder = (newOrder: Track[]) => {
    const newIds = newOrder.map(t => t.id);
    onUpdate({ ...playlist, trackIds: newIds });
    saveOrder(newIds);
  };

  const handleAddTrack = async (trackId: string) => {
    const newIds = [...(playlist.trackIds || []), trackId];
    setSaving(true);
    try {
      await api.updatePlaylist(playlist.id, { ...playlist, trackIds: newIds });
      onUpdate({ ...playlist, trackIds: newIds });
      toast.success('Track added');
    } catch {
      toast.error('Failed to add track');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    const newIds = (playlist.trackIds || []).filter(id => id !== trackId);
    setSaving(true);
    try {
      await api.updatePlaylist(playlist.id, { ...playlist, trackIds: newIds });
      onUpdate({ ...playlist, trackIds: newIds });
      toast.success('Track removed');
    } catch {
      toast.error('Failed to remove track');
    } finally {
      setSaving(false);
    }
  };

  const handleShuffle = async () => {
    if (orderedTracks.length < 2) return;
    if (!confirm('Shuffle all tracks in this playlist?')) return;
    const shuffled = [...(playlist.trackIds || [])].sort(() => Math.random() - 0.5);
    setSaving(true);
    try {
      await api.updatePlaylist(playlist.id, { ...playlist, trackIds: shuffled });
      onUpdate({ ...playlist, trackIds: shuffled });
      toast.success('Playlist shuffled');
    } catch {
      toast.error('Failed to shuffle');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAll = async () => {
    if (libraryTracks.length === 0) return;
    const count = Math.min(libraryTracks.length, 50);
    if (!confirm(`Add ${count} tracks to the playlist?`)) return;
    const newIds = [...(playlist.trackIds || []), ...libraryTracks.slice(0, 50).map(t => t.id)];
    setSaving(true);
    try {
      await api.updatePlaylist(playlist.id, { ...playlist, trackIds: newIds });
      onUpdate({ ...playlist, trackIds: newIds });
      toast.success(`${count} tracks added`);
    } catch {
      toast.error('Failed to add tracks');
    } finally {
      setSaving(false);
    }
  };

  const color = playlist.color || '#00d9ff';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-white/70 hover:text-white flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}80)` }}
            >
              {isLive ? <Radio className="w-6 h-6 text-[#0a1628]" /> : <ListMusic className="w-6 h-6 text-[#0a1628]" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate" style={{ fontFamily: 'var(--font-family-display)' }}>
                  {playlist.name}
                </h1>
                {isLive && (
                  <Badge className="bg-[#00ffaa]/20 text-[#00ffaa] border-[#00ffaa]/30 text-xs flex-shrink-0">
                    <Radio className="w-3 h-3 mr-1 animate-pulse" />
                    ON AIR
                  </Badge>
                )}
                {saving && (
                  <Loader2 className="w-4 h-4 text-[#00d9ff] animate-spin flex-shrink-0" />
                )}
              </div>
              <p className="text-white/50 text-sm">
                {orderedTracks.length} tracks &bull; {formatTotalDuration(totalDuration)}
                {playlist.genre && <> &bull; {playlist.genre}</>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isLive && (
              <Button
                onClick={onSetAsLive}
                variant="outline"
                size="sm"
                className="border-[#00ffaa]/30 text-[#00ffaa] hover:bg-[#00ffaa]/10"
              >
                <Radio className="w-4 h-4 mr-2" />
                Send to Live Stream
              </Button>
            )}
            <Button
              onClick={handleShuffle}
              variant="outline"
              size="sm"
              className="border-white/10 text-white/70 hover:bg-white/5"
              disabled={orderedTracks.length < 2}
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Shuffle
            </Button>
            <Button
              onClick={() => setShowLibrary(!showLibrary)}
              size="sm"
              className={showLibrary
                ? 'bg-[#00d9ff] text-[#0a1628]'
                : 'bg-[#00d9ff]/10 text-[#00d9ff] border border-[#00d9ff]/30'
              }
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              {showLibrary ? 'Hide Library' : 'Add Tracks'}
            </Button>
            <Button
              onClick={() => setQuickScheduleOpen(true)}
              size="sm"
              className="bg-[#00ffaa] text-[#0a1628] hover:bg-[#00ffaa]/90"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Quick Schedule
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Schedule Info Strip */}
      {scheduleSlots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-[#0f1c2e]/90 border-[#00d9ff]/15 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-1.5 rounded-lg bg-[#00d9ff]/15 flex-shrink-0">
                  <Calendar className="w-4 h-4 text-[#00d9ff]" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white/60 text-sm font-medium">Scheduled:</span>
                  {scheduleSlots.map(slot => (
                    <Badge
                      key={slot.id}
                      variant="outline"
                      className={`text-xs ${
                        slot.isActive
                          ? 'border-[#00d9ff]/30 text-[#00d9ff]'
                          : 'border-white/10 text-white/30 line-through'
                      }`}
                    >
                      {slot.dayOfWeek !== null ? DAYS_SHORT[slot.dayOfWeek] : 'Daily'} {slot.startTime}–{slot.endTime}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                onClick={onViewSchedule}
                size="sm"
                variant="outline"
                className="border-[#00d9ff]/30 text-[#00d9ff] hover:bg-[#00d9ff]/10 text-xs flex-shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                View in Schedule
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Content */}
      <div className={`grid gap-4 sm:gap-6 ${showLibrary ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1'}`}>
        {/* Playlist Tracks */}
        <div className={showLibrary ? 'lg:col-span-3' : ''}>
          <Card className="bg-[#0f1c2e]/90 border-white/10">
            <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-white/40" />
                Queue &mdash; {orderedTracks.length} tracks
              </h2>
              {isLive && (
                <Badge variant="outline" className="text-[#00ffaa] border-[#00ffaa]/30 text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  Auto DJ will play these
                </Badge>
              )}
            </div>

            {orderedTracks.length === 0 ? (
              <div className="p-12 text-center">
                <Music className="w-16 h-16 mx-auto mb-4 text-white/10" />
                <p className="text-white/40 mb-2">No tracks in this playlist</p>
                <p className="text-white/30 text-sm mb-4">Click "Add Tracks" to browse your library</p>
                <Button
                  onClick={() => setShowLibrary(true)}
                  size="sm"
                  className="bg-[#00d9ff]/10 text-[#00d9ff] border border-[#00d9ff]/30"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Browse Library
                </Button>
              </div>
            ) : (
              <div className="p-2 sm:p-3">
                <Reorder.Group
                  axis="y"
                  values={orderedTracks}
                  onReorder={handleReorder}
                  className="space-y-1"
                >
                  {orderedTracks.map((track, index) => (
                    <Reorder.Item key={track.id} value={track}>
                      <motion.div
                        layout
                        className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-[#0a1628]/40 border border-white/5 hover:border-[#00d9ff]/20 transition-colors cursor-grab active:cursor-grabbing group"
                      >
                        <GripVertical className="w-4 h-4 text-white/20 group-hover:text-white/40 flex-shrink-0 hidden sm:block" />

                        <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center text-white/40 text-xs font-mono flex-shrink-0">
                          {index + 1}
                        </div>

                        {track.coverUrl ? (
                          <img src={track.coverUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                            style={{ background: `linear-gradient(135deg, ${color}20, ${color}10)` }}
                          >
                            <Music className="w-5 h-5" style={{ color }} />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h4 className="text-white text-sm font-medium truncate">{track.title}</h4>
                          <p className="text-white/50 text-xs truncate">{track.artist}{track.album ? ` — ${track.album}` : ''}</p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {track.genre && (
                            <Badge variant="outline" className="border-white/10 text-white/40 text-[10px] hidden md:flex">
                              {track.genre}
                            </Badge>
                          )}
                          <span className="text-white/30 text-xs font-mono w-10 text-right">
                            {formatDuration(track.duration || 0)}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveTrack(track.id)}
                            className="w-7 h-7 text-red-400/40 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            )}
          </Card>
        </div>

        {/* Library Browser */}
        {showLibrary && (
          <div className="lg:col-span-2">
            <Card className="bg-[#0f1c2e]/90 border-white/10 lg:sticky lg:top-4">
              <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-white font-semibold flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-[#00d9ff]" />
                    Track Library
                  </h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowLibrary(false)}
                    className="text-white/40 hover:text-white lg:hidden"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <Input
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Search tracks..."
                    className="pl-9 h-9 bg-[#0a1628] border-white/10 text-white text-sm"
                  />
                </div>

                {/* Genre filter */}
                <div className="flex gap-1.5 flex-wrap">
                  {GENRES.slice(0, 6).map(g => (
                    <Button
                      key={g}
                      size="sm"
                      variant={libraryGenre === g ? 'default' : 'outline'}
                      onClick={() => setLibraryGenre(g)}
                      className={`h-7 px-2.5 text-[11px] ${
                        libraryGenre === g
                          ? 'bg-[#00d9ff] text-[#0a1628]'
                          : 'border-white/10 text-white/50 hover:bg-white/5'
                      }`}
                    >
                      {g === 'all' ? 'All' : g.charAt(0).toUpperCase() + g.slice(1)}
                    </Button>
                  ))}
                </div>

                {/* Bulk add */}
                {libraryTracks.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddAll}
                    className="w-full mt-3 h-8 text-xs border-[#00d9ff]/20 text-[#00d9ff] hover:bg-[#00d9ff]/10"
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                    Add All ({Math.min(libraryTracks.length, 50)})
                  </Button>
                )}
              </div>

              {/* Track list */}
              <div className="p-2 max-h-[60vh] overflow-y-auto space-y-1">
                {libraryTracks.length === 0 ? (
                  <div className="p-8 text-center text-white/30 text-sm">
                    {allTracks.length === 0 ? 'No tracks uploaded yet' : 'All tracks already in playlist'}
                  </div>
                ) : (
                  libraryTracks.map(track => (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                      {track.coverUrl ? (
                        <img src={track.coverUrl} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded bg-[#00d9ff]/10 flex items-center justify-center flex-shrink-0">
                          <Music className="w-4 h-4 text-[#00d9ff]/50" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="text-white text-sm truncate">{track.title}</h4>
                        <p className="text-white/40 text-xs truncate">{track.artist}</p>
                      </div>

                      <span className="text-white/20 text-xs font-mono flex-shrink-0">
                        {formatDuration(track.duration || 0)}
                      </span>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleAddTrack(track.id)}
                        className="w-7 h-7 text-[#00ffaa]/60 hover:text-[#00ffaa] hover:bg-[#00ffaa]/10 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Quick Schedule Dialog */}
      <Dialog open={quickScheduleOpen} onOpenChange={setQuickScheduleOpen}>
        <DialogContent className="bg-[#0f1c2e] border-[#00d9ff]/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: `${color}15`, borderLeft: `3px solid ${color}` }}>
              <ListMusic className="w-5 h-5 flex-shrink-0" style={{ color }} />
              <div className="min-w-0">
                <p className="text-white font-medium truncate">{playlist.name}</p>
                <p className="text-white/40 text-xs">{orderedTracks.length} tracks &bull; {formatTotalDuration(totalDuration)}</p>
              </div>
            </div>
            <div>
              <Label className="text-white/80">Day of Week</Label>
              <select
                value={quickScheduleForm.dayOfWeek}
                onChange={e => setQuickScheduleForm({ ...quickScheduleForm, dayOfWeek: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-[#0a1628] border border-white/10 text-white text-sm"
              >
                <option value="daily">Daily</option>
                {DAYS_FULL.map((day, index) => (
                  <option key={index} value={index.toString()}>{day}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/80">Start Time</Label>
                <select
                  value={quickScheduleForm.startTime}
                  onChange={e => setQuickScheduleForm({ ...quickScheduleForm, startTime: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-[#0a1628] border border-white/10 text-white text-sm"
                >
                  {QUICK_TIME_SLOTS.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-white/80">End Time</Label>
                <select
                  value={quickScheduleForm.endTime}
                  onChange={e => setQuickScheduleForm({ ...quickScheduleForm, endTime: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-[#0a1628] border border-white/10 text-white text-sm"
                >
                  {QUICK_TIME_SLOTS.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setQuickScheduleOpen(false)} className="flex-1 border-white/10 text-white/70">
                Cancel
              </Button>
              <Button
                onClick={handleQuickSchedule}
                disabled={quickScheduleSaving}
                className="flex-1 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] font-semibold"
              >
                {quickScheduleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schedule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== CREATE FORM ====================

function CreatePlaylistForm({ onSuccess, onCancel }: { onSuccess: (p: Playlist) => void; onCancel: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    genre: '',
    color: '#00d9ff'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Enter a playlist name');
      return;
    }
    setSaving(true);
    try {
      const res = await api.createPlaylist({
        ...form,
        trackIds: []
      });
      toast.success('Playlist created');
      onSuccess(res.playlist || { ...form, id: Date.now().toString(), trackIds: [], createdAt: new Date().toISOString() });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div>
        <Label className="text-white/80">Name *</Label>
        <Input
          required
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="Sunday Soul Grooves"
          className="bg-[#0a1628] border-white/10 text-white"
        />
      </div>
      <div>
        <Label className="text-white/80">Description</Label>
        <Input
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Smooth soul tracks for lazy Sundays"
          className="bg-[#0a1628] border-white/10 text-white"
        />
      </div>
      <div>
        <Label className="text-white/80">Genre</Label>
        <select
          value={form.genre}
          onChange={e => setForm({ ...form, genre: e.target.value })}
          className="w-full h-10 px-3 rounded-md bg-[#0a1628] border border-white/10 text-white text-sm"
        >
          <option value="">Any genre</option>
          {GENRES.filter(g => g !== 'all').map(g => (
            <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-white/80">Color</Label>
        <div className="flex gap-2 flex-wrap mt-1">
          {COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setForm({ ...form, color: c.value })}
              className={`w-8 h-8 rounded-lg border-2 transition-all ${
                form.color === c.value ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border-white/10 text-white/70">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="flex-1 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] font-semibold"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
        </Button>
      </div>
    </form>
  );
}

// ==================== EDIT FORM ====================

function EditPlaylistForm({ playlist, onSuccess, onCancel }: { playlist: Playlist; onSuccess: (p: Playlist) => void; onCancel: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: playlist.name,
    description: playlist.description || '',
    genre: playlist.genre || '',
    color: playlist.color || '#00d9ff'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Enter a playlist name');
      return;
    }
    setSaving(true);
    try {
      await api.updatePlaylist(playlist.id, { ...playlist, ...form });
      toast.success('Playlist updated');
      onSuccess({ ...playlist, ...form });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div>
        <Label className="text-white/80">Name *</Label>
        <Input
          required
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          className="bg-[#0a1628] border-white/10 text-white"
        />
      </div>
      <div>
        <Label className="text-white/80">Description</Label>
        <Input
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          className="bg-[#0a1628] border-white/10 text-white"
        />
      </div>
      <div>
        <Label className="text-white/80">Genre</Label>
        <select
          value={form.genre}
          onChange={e => setForm({ ...form, genre: e.target.value })}
          className="w-full h-10 px-3 rounded-md bg-[#0a1628] border border-white/10 text-white text-sm"
        >
          <option value="">Any genre</option>
          {GENRES.filter(g => g !== 'all').map(g => (
            <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-white/80">Color</Label>
        <div className="flex gap-2 flex-wrap mt-1">
          {COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setForm({ ...form, color: c.value })}
              className={`w-8 h-8 rounded-lg border-2 transition-all ${
                form.color === c.value ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border-white/10 text-white/70">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="flex-1 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] font-semibold"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </form>
  );
}