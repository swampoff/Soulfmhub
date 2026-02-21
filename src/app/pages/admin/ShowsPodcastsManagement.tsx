import React, { useState, useEffect, useCallback } from 'react';
// Shows & Podcasts Management - v2 with full CRUD modals and data normalization
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import {
  Radio,
  Mic2,
  Plus,
  Edit2,
  Trash2,
  User,
  Calendar,
  Clock,
  Save,
  X,
  Loader2,
  Play,
  TrendingUp,
  Users,
  Heart,
  AlertTriangle,
  Eraser,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../../lib/api';
import { AdminLayout } from '../../components/admin/AdminLayout';

interface ScheduleSlot {
  day: string;
  startTime: string;
  endTime: string;
}

interface Show {
  id: string;
  slug: string;
  title: string;
  description: string;
  host: string;
  hostAvatar?: string;
  coverImage?: string;
  genre: string;
  type: string;
  schedule: ScheduleSlot[];
  status: 'active' | 'inactive' | 'draft';
  totalListeners?: number;
  averageRating?: number;
  featured?: boolean;
}

interface Podcast {
  id: string;
  slug: string;
  title: string;
  description: string;
  host: string;
  hostAvatar?: string;
  coverImage?: string;
  category: string;
  status: 'active' | 'inactive' | 'draft';
  totalListeners?: number;
  episodeCount?: number;
}

interface Episode {
  id: string;
  podcastId: string;
  title: string;
  description: string;
  audioFile?: string;
  duration: number;
  publishedAt: string;
  status: 'draft' | 'published';
  listens?: number;
}

const GENRE_OPTIONS = [
  'Soul', 'Funk', 'Jazz', 'Disco', 'R&B', 'Reggae',
  'Latin', 'Afropop', 'House', 'Lounge', 'Chill', 'Electronic',
];

const PODCAST_CATEGORIES = [
  'Interviews', 'Music History', 'Culture',
  'Behind the Scenes', 'DJ Mixes', 'Educational',
];

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday', 'Sunday',
];

const STATUS_OPTIONS = ['active', 'inactive', 'draft'] as const;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function ShowsPodcastsManagement() {
  const [activeTab, setActiveTab] = useState('shows');
  const [shows, setShows] = useState<Show[]>([]);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Show modal
  const [showModalOpen, setShowModalOpen] = useState(false);
  const [editingShow, setEditingShow] = useState<Partial<Show> | null>(null);

  // Podcast modal
  const [podcastModalOpen, setPodcastModalOpen] = useState(false);
  const [editingPodcast, setEditingPodcast] = useState<Partial<Podcast> | null>(null);

  // Episode modal
  const [episodeModalOpen, setEpisodeModalOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Partial<Episode> | null>(null);

  // Confirm purge
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
  const [purging, setPurging] = useState(false);

  const [selectedPodcast, setSelectedPodcast] = useState<string | null>(null);

  // Schedule slots editor for show
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (selectedPodcast) {
      loadEpisodes(selectedPodcast);
    }
  }, [selectedPodcast]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'shows') {
        const res = await api.getShows();
        const raw = Array.isArray(res?.shows) ? res.shows : [];
        // Normalize: filter out null/invalid entries and ensure required fields
        setShows(
          raw
            .filter((s: any) => s && typeof s === 'object' && s.id)
            .map((s: any) => ({
              ...s,
              status: String(s.status || 'draft'),
              genre: String(s.genre || 'Soul'),
              host: String(s.host || ''),
              title: String(s.title || 'Untitled'),
              description: String(s.description || ''),
              schedule: Array.isArray(s.schedule) ? s.schedule : [],
            }))
        );
      } else {
        const res = await api.getPodcasts();
        const raw = Array.isArray(res?.podcasts) ? res.podcasts : [];
        setPodcasts(
          raw
            .filter((p: any) => p && typeof p === 'object' && p.id)
            .map((p: any) => ({
              ...p,
              status: String(p.status || 'draft'),
              category: String(p.category || 'Culture'),
              host: String(p.host || ''),
              title: String(p.title || 'Untitled'),
              description: String(p.description || ''),
            }))
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEpisodes = async (podcastId: string) => {
    try {
      const { episodes: data } = await api.getPodcastEpisodes(podcastId);
      setEpisodes(data || []);
    } catch (error) {
      console.error('Error loading episodes:', error);
    }
  };

  // ── Show CRUD ──

  const openCreateShow = () => {
    setEditingShow({
      title: '',
      description: '',
      host: '',
      genre: GENRE_OPTIONS[0],
      type: 'live',
      status: 'draft',
      schedule: [],
      featured: false,
    });
    setScheduleSlots([]);
    setShowModalOpen(true);
  };

  const openEditShow = (show: Show) => {
    setEditingShow({ ...show });
    setScheduleSlots(Array.isArray(show.schedule) ? [...show.schedule] : []);
    setShowModalOpen(true);
  };

  const handleSaveShow = async () => {
    if (!editingShow?.title?.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...editingShow,
        slug: editingShow.slug || slugify(editingShow.title || ''),
        schedule: scheduleSlots,
      };

      if (editingShow.id) {
        await api.updateShow(editingShow.id, payload);
      } else {
        await api.createShow(payload);
      }
      setShowModalOpen(false);
      setEditingShow(null);
      await loadData();
    } catch (error) {
      console.error('Error saving show:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShow = async (showId: string) => {
    if (!confirm('Delete this show? This action cannot be undone.')) return;
    try {
      await api.deleteShow(showId);
      await loadData();
    } catch (error) {
      console.error('Error deleting show:', error);
    }
  };

  const handlePurgeAllShows = async () => {
    setPurging(true);
    try {
      await api.deleteAllShows();
      setPurgeDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error purging shows:', error);
    } finally {
      setPurging(false);
    }
  };

  // ── Schedule Slots Editor helpers ──

  const addScheduleSlot = () => {
    setScheduleSlots(prev => [...prev, { day: 'Monday', startTime: '10:00', endTime: '12:00' }]);
  };

  const updateScheduleSlot = (index: number, field: keyof ScheduleSlot, value: string) => {
    setScheduleSlots(prev => prev.map((slot, i) => i === index ? { ...slot, [field]: value } : slot));
  };

  const removeScheduleSlot = (index: number) => {
    setScheduleSlots(prev => prev.filter((_, i) => i !== index));
  };

  // ── Podcast CRUD ──

  const openCreatePodcast = () => {
    setEditingPodcast({
      title: '',
      description: '',
      host: '',
      category: PODCAST_CATEGORIES[0],
      status: 'draft',
    });
    setPodcastModalOpen(true);
  };

  const openEditPodcast = (podcast: Podcast) => {
    setEditingPodcast({ ...podcast });
    setPodcastModalOpen(true);
  };

  const handleSavePodcast = async () => {
    if (!editingPodcast?.title?.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...editingPodcast,
        slug: editingPodcast.slug || slugify(editingPodcast.title || ''),
      };

      if (editingPodcast.id) {
        await api.updatePodcast(editingPodcast.id, payload);
      } else {
        await api.createPodcast(payload);
      }
      setPodcastModalOpen(false);
      setEditingPodcast(null);
      await loadData();
    } catch (error) {
      console.error('Error saving podcast:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePodcast = async (podcastId: string) => {
    if (!confirm('Delete this podcast and all its episodes?')) return;
    try {
      await api.deletePodcast(podcastId);
      if (selectedPodcast === podcastId) {
        setSelectedPodcast(null);
        setEpisodes([]);
      }
      await loadData();
    } catch (error) {
      console.error('Error deleting podcast:', error);
    }
  };

  // ── Episode CRUD ──

  const openCreateEpisode = () => {
    if (!selectedPodcast) return;
    setEditingEpisode({
      podcastId: selectedPodcast,
      title: '',
      description: '',
      duration: 0,
      publishedAt: new Date().toISOString(),
      status: 'draft',
    });
    setEpisodeModalOpen(true);
  };

  const handleSaveEpisode = async () => {
    if (!editingEpisode?.title?.trim()) return;
    setSaving(true);
    try {
      if (editingEpisode.id) {
        await api.updateEpisode(editingEpisode.id, editingEpisode);
      } else {
        await api.createEpisode(editingEpisode);
      }
      setEpisodeModalOpen(false);
      setEditingEpisode(null);
      if (selectedPodcast) await loadEpisodes(selectedPodcast);
    } catch (error) {
      console.error('Error saving episode:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-righteous text-transparent bg-clip-text bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]">
                Shows & Podcasts
              </h1>
              <p className="text-cyan-100/60 mt-1 sm:mt-2 text-sm sm:text-base">
                Manage live shows and podcast series
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              {activeTab === 'shows' && shows.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setPurgeDialogOpen(true)}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Eraser className="size-4 mr-2" />
                  Purge All
                </Button>
              )}
              <Button
                onClick={activeTab === 'shows' ? openCreateShow : openCreatePodcast}
                className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 hover:shadow-lg hover:shadow-cyan-500/30"
              >
                <Plus className="size-4 mr-2" />
                {activeTab === 'shows' ? 'New Show' : 'New Podcast'}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-3 sm:p-4 bg-slate-900/50 border-cyan-500/20">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-cyan-500/10 rounded-lg flex-shrink-0">
                  <Radio className="size-4 sm:size-6 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-cyan-100 truncate">{shows.length}</p>
                  <p className="text-xs sm:text-sm text-cyan-100/60 truncate">Shows</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 sm:p-4 bg-slate-900/50 border-cyan-500/20">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-purple-500/10 rounded-lg flex-shrink-0">
                  <Mic2 className="size-4 sm:size-6 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-cyan-100 truncate">{podcasts.length}</p>
                  <p className="text-xs sm:text-sm text-cyan-100/60 truncate">Podcasts</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 sm:p-4 bg-slate-900/50 border-cyan-500/20">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-green-500/10 rounded-lg flex-shrink-0">
                  <Play className="size-4 sm:size-6 text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-cyan-100 truncate">
                    {podcasts.reduce((sum, p) => sum + (p.episodeCount || 0), 0)}
                  </p>
                  <p className="text-xs sm:text-sm text-cyan-100/60 truncate">Episodes</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 sm:p-4 bg-slate-900/50 border-cyan-500/20">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-orange-500/10 rounded-lg flex-shrink-0">
                  <TrendingUp className="size-4 sm:size-6 text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-cyan-100 truncate">
                    {shows.filter(s => s.status === 'active').length}
                  </p>
                  <p className="text-xs sm:text-sm text-cyan-100/60 truncate">Active</p>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900/50 border border-cyan-500/20 mb-4 sm:mb-6 w-full sm:w-auto">
            <TabsTrigger value="shows" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 flex-1 sm:flex-initial text-sm sm:text-base">
              <Radio className="size-3 sm:size-4 mr-1 sm:mr-2" />
              Shows
            </TabsTrigger>
            <TabsTrigger value="podcasts" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 flex-1 sm:flex-initial text-sm sm:text-base">
              <Mic2 className="size-3 sm:size-4 mr-1 sm:mr-2" />
              Podcasts
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════ SHOWS TAB ═══════════════════ */}
          <TabsContent value="shows">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="size-8 text-cyan-400 animate-spin" />
              </div>
            ) : shows.length === 0 ? (
              <Card className="p-8 sm:p-12 bg-slate-900/50 border-cyan-500/20 text-center">
                <Radio className="size-12 sm:size-16 text-cyan-400/20 mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-cyan-100 mb-2">No Shows</h3>
                <p className="text-sm sm:text-base text-cyan-100/60 mb-4 sm:mb-6">Create your first live show</p>
                <Button
                  onClick={openCreateShow}
                  className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900"
                >
                  <Plus className="size-4 mr-2" />
                  Create Show
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <AnimatePresence mode="popLayout">
                  {shows.map((show, index) => (
                    <motion.div
                      key={show.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="bg-slate-900/50 border-cyan-500/20 overflow-hidden hover:border-cyan-500/40 transition-all group h-full flex flex-col">
                        {/* Cover */}
                        <div className="relative h-40 sm:h-44 bg-gradient-to-br from-cyan-500/20 to-cyan-700/20 overflow-hidden">
                          {show.coverImage ? (
                            <img
                              src={show.coverImage}
                              alt={show.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Radio className="size-12 sm:size-14 text-cyan-400/20" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 flex gap-1.5">
                            {show.featured && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                FEATURED
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              (show.status || 'draft') === 'active'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : (show.status || 'draft') === 'inactive'
                                ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            }`}>
                              {(show.status || 'draft').toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-3 sm:p-4 flex-1 flex flex-col">
                          <h3 className="text-base sm:text-lg font-semibold text-cyan-100 mb-1 truncate">
                            {show.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-cyan-100/50 mb-3 line-clamp-2 flex-1">
                            {show.description || 'No description'}
                          </p>

                          <div className="flex items-center gap-2 mb-2 text-xs sm:text-sm">
                            <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                              <User className="size-2.5 text-cyan-400" />
                            </div>
                            <span className="text-cyan-100/70 truncate">{show.host || '—'}</span>
                            <span className="text-cyan-500/30 flex-shrink-0">|</span>
                            <span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 text-[11px] rounded flex-shrink-0">
                              {show.genre}
                            </span>
                          </div>

                          {/* Schedule preview */}
                          {Array.isArray(show.schedule) && show.schedule.length > 0 && (
                            <div className="mb-3 p-2 bg-slate-800/50 rounded text-xs text-cyan-100/50 space-y-0.5">
                              {show.schedule.slice(0, 3).map((s, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <Calendar className="size-3 flex-shrink-0 opacity-60" />
                                  <span>{s.day}</span>
                                  <Clock className="size-3 flex-shrink-0 opacity-60 ml-auto" />
                                  <span>{s.startTime}–{s.endTime}</span>
                                </div>
                              ))}
                              {show.schedule.length > 3 && (
                                <span className="text-cyan-400/40">+{show.schedule.length - 3} more</span>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-auto pt-2">
                            <Button
                              onClick={() => openEditShow(show)}
                              className="flex-1 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                              size="sm"
                            >
                              <Edit2 className="size-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              onClick={() => handleDeleteShow(show.id)}
                              variant="outline"
                              size="sm"
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10 flex-shrink-0"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════ PODCASTS TAB ═══════════════════ */}
          <TabsContent value="podcasts">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Podcasts List */}
              <div className="lg:col-span-2">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="size-8 text-cyan-400 animate-spin" />
                  </div>
                ) : podcasts.length === 0 ? (
                  <Card className="p-8 sm:p-12 bg-slate-900/50 border-cyan-500/20 text-center">
                    <Mic2 className="size-12 sm:size-16 text-cyan-400/20 mx-auto mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-cyan-100 mb-2">No Podcasts</h3>
                    <p className="text-sm sm:text-base text-cyan-100/60 mb-4 sm:mb-6">Create your first podcast series</p>
                    <Button
                      onClick={openCreatePodcast}
                      className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900"
                    >
                      <Plus className="size-4 mr-2" />
                      Create Podcast
                    </Button>
                  </Card>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {podcasts.map((podcast, index) => (
                      <motion.div
                        key={podcast.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card
                          className={`bg-slate-900/50 border-cyan-500/20 overflow-hidden hover:border-cyan-500/40 transition-all cursor-pointer ${
                            selectedPodcast === podcast.id ? 'ring-2 ring-cyan-500/50' : ''
                          }`}
                          onClick={() => setSelectedPodcast(podcast.id)}
                        >
                          <div className="flex gap-3 sm:gap-4 p-3 sm:p-4">
                            {/* Cover */}
                            <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-700/20 overflow-hidden">
                              {podcast.coverImage ? (
                                <img
                                  src={podcast.coverImage}
                                  alt={podcast.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Mic2 className="size-8 sm:size-10 text-purple-400/50" />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <h3 className="text-lg font-semibold text-cyan-100 truncate flex-1">
                                  {podcast.title}
                                </h3>
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                  podcast.status === 'active'
                                    ? 'bg-green-500/20 text-green-400'
                                    : podcast.status === 'inactive'
                                    ? 'bg-gray-500/20 text-gray-400'
                                    : 'bg-orange-500/20 text-orange-400'
                                }`}>
                                  {(podcast.status || 'draft').toUpperCase()}
                                </span>
                              </div>
                              <p className="text-sm text-cyan-100/50 line-clamp-2 mb-2">
                                {podcast.description}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-cyan-100/60">
                                <User className="size-3" />
                                <span>{podcast.host}</span>
                                <span className="text-cyan-500/30">|</span>
                                <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded">
                                  {podcast.category}
                                </span>
                                <span className="text-cyan-500/30">|</span>
                                <Play className="size-3" />
                                <span>{podcast.episodeCount || 0} ep.</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-1.5 flex-shrink-0">
                              <Button
                                onClick={(e) => { e.stopPropagation(); openEditPodcast(podcast); }}
                                size="sm"
                                variant="ghost"
                                className="text-cyan-400 hover:bg-cyan-500/10 h-8 w-8 p-0"
                              >
                                <Edit2 className="size-3.5" />
                              </Button>
                              <Button
                                onClick={(e) => { e.stopPropagation(); handleDeletePodcast(podcast.id); }}
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Episodes Panel */}
              <Card className="bg-slate-900/50 border-cyan-500/20 p-4 sm:p-6 h-fit sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-cyan-400">Episodes</h2>
                  {selectedPodcast && (
                    <Button
                      onClick={openCreateEpisode}
                      size="sm"
                      className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                    >
                      <Plus className="size-3 mr-1" />
                      Add
                    </Button>
                  )}
                </div>

                {!selectedPodcast ? (
                  <div className="text-center py-8 text-cyan-100/40">
                    <Mic2 className="size-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Select a podcast</p>
                  </div>
                ) : episodes.length === 0 ? (
                  <div className="text-center py-8 text-cyan-100/40">
                    <Play className="size-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No episodes yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {episodes.map((episode) => (
                      <div
                        key={episode.id}
                        className="p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-cyan-100 line-clamp-1 flex-1">
                            {episode.title}
                          </h3>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded-full whitespace-nowrap ${
                            episode.status === 'published'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {episode.status}
                          </span>
                        </div>
                        <p className="text-xs text-cyan-100/40 mb-2 line-clamp-2">
                          {episode.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-cyan-100/50">
                          <div className="flex items-center gap-1">
                            <Clock className="size-3" />
                            <span>{formatDuration(episode.duration)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Play className="size-3" />
                            <span>{episode.listens || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ═══════════════════ SHOW EDIT / CREATE MODAL ═══════════════════ */}
      <Dialog open={showModalOpen} onOpenChange={setShowModalOpen}>
        <DialogContent className="bg-slate-900 border-cyan-500/30 text-cyan-100 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-righteous text-transparent bg-clip-text bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]">
              {editingShow?.id ? 'Edit Show' : 'Create New Show'}
            </DialogTitle>
            <DialogDescription className="text-cyan-100/50">
              {editingShow?.id ? 'Update the show details below.' : 'Fill in the details for your new show.'}
            </DialogDescription>
          </DialogHeader>

          {editingShow && (
            <div className="space-y-4 py-2">
              {/* Title */}
              <div className="space-y-1.5">
                <Label className="text-cyan-100/70 text-sm">Title *</Label>
                <Input
                  value={editingShow.title || ''}
                  onChange={e => setEditingShow(prev => prev ? { ...prev, title: e.target.value } : prev)}
                  placeholder="Show title"
                  className="bg-slate-800/50 border-cyan-500/20 text-cyan-100"
                />
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <Label className="text-cyan-100/70 text-sm">Slug</Label>
                <Input
                  value={editingShow.slug || slugify(editingShow.title || '')}
                  onChange={e => setEditingShow(prev => prev ? { ...prev, slug: e.target.value } : prev)}
                  placeholder="auto-generated-slug"
                  className="bg-slate-800/50 border-cyan-500/20 text-cyan-100/60 text-sm"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-cyan-100/70 text-sm">Description</Label>
                <Textarea
                  value={editingShow.description || ''}
                  onChange={e => setEditingShow(prev => prev ? { ...prev, description: e.target.value } : prev)}
                  placeholder="What's this show about?"
                  rows={3}
                  className="bg-slate-800/50 border-cyan-500/20 text-cyan-100 resize-none"
                />
              </div>

              {/* Host + Genre row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-cyan-100/70 text-sm">Host</Label>
                  <Input
                    value={editingShow.host || ''}
                    onChange={e => setEditingShow(prev => prev ? { ...prev, host: e.target.value } : prev)}
                    placeholder="DJ name"
                    className="bg-slate-800/50 border-cyan-500/20 text-cyan-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-cyan-100/70 text-sm">Genre</Label>
                  <Select
                    value={editingShow.genre || GENRE_OPTIONS[0]}
                    onValueChange={val => setEditingShow(prev => prev ? { ...prev, genre: val } : prev)}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-cyan-500/20 text-cyan-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-cyan-500/20">
                      {GENRE_OPTIONS.map(g => (
                        <SelectItem key={g} value={g} className="text-cyan-100 focus:bg-cyan-500/20 focus:text-cyan-100">
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status + Featured row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-cyan-100/70 text-sm">Status</Label>
                  <Select
                    value={editingShow.status || 'draft'}
                    onValueChange={val => setEditingShow(prev => prev ? { ...prev, status: val as Show['status'] } : prev)}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-cyan-500/20 text-cyan-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-cyan-500/20">
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s} value={s} className="text-cyan-100 focus:bg-cyan-500/20 focus:text-cyan-100">
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-cyan-100/70 text-sm">Featured</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      checked={!!editingShow.featured}
                      onCheckedChange={val => setEditingShow(prev => prev ? { ...prev, featured: val } : prev)}
                    />
                    <span className="text-xs text-cyan-100/50">{editingShow.featured ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              {/* Cover image URL */}
              <div className="space-y-1.5">
                <Label className="text-cyan-100/70 text-sm">Cover Image URL</Label>
                <Input
                  value={editingShow.coverImage || ''}
                  onChange={e => setEditingShow(prev => prev ? { ...prev, coverImage: e.target.value } : prev)}
                  placeholder="https://..."
                  className="bg-slate-800/50 border-cyan-500/20 text-cyan-100 text-sm"
                />
              </div>

              {/* Schedule Slots */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-cyan-100/70 text-sm">Schedule</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={addScheduleSlot}
                    className="text-cyan-400 hover:bg-cyan-500/10 h-7 text-xs"
                  >
                    <Plus className="size-3 mr-1" />
                    Add slot
                  </Button>
                </div>

                {scheduleSlots.length === 0 && (
                  <p className="text-xs text-cyan-100/30 italic">No schedule slots — click "Add slot"</p>
                )}

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {scheduleSlots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-800/40 rounded">
                      <Select
                        value={slot.day}
                        onValueChange={val => updateScheduleSlot(idx, 'day', val)}
                      >
                        <SelectTrigger className="bg-slate-800/50 border-cyan-500/20 text-cyan-100 text-xs h-8 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-cyan-500/20">
                          {DAYS_OF_WEEK.map(d => (
                            <SelectItem key={d} value={d} className="text-cyan-100 focus:bg-cyan-500/20 focus:text-cyan-100 text-xs">
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={e => updateScheduleSlot(idx, 'startTime', e.target.value)}
                        className="bg-slate-800/50 border-cyan-500/20 text-cyan-100 text-xs h-8 w-24"
                      />
                      <span className="text-cyan-100/30 text-xs">–</span>
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={e => updateScheduleSlot(idx, 'endTime', e.target.value)}
                        className="bg-slate-800/50 border-cyan-500/20 text-cyan-100 text-xs h-8 w-24"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeScheduleSlot(idx)}
                        className="text-red-400 hover:bg-red-500/10 h-7 w-7 p-0 flex-shrink-0"
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowModalOpen(false)}
              className="border-cyan-500/20 text-cyan-100/70 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveShow}
              disabled={saving || !editingShow?.title?.trim()}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900"
            >
              {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
              {editingShow?.id ? 'Save Changes' : 'Create Show'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ PODCAST EDIT / CREATE MODAL ═══════════════════ */}
      <Dialog open={podcastModalOpen} onOpenChange={setPodcastModalOpen}>
        <DialogContent className="bg-slate-900 border-cyan-500/30 text-cyan-100 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-righteous text-transparent bg-clip-text bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]">
              {editingPodcast?.id ? 'Edit Podcast' : 'Create New Podcast'}
            </DialogTitle>
            <DialogDescription className="text-cyan-100/50">
              {editingPodcast?.id ? 'Update podcast details.' : 'Fill in details for the new podcast.'}
            </DialogDescription>
          </DialogHeader>

          {editingPodcast && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-cyan-100/70 text-sm">Title *</Label>
                <Input
                  value={editingPodcast.title || ''}
                  onChange={e => setEditingPodcast(prev => prev ? { ...prev, title: e.target.value } : prev)}
                  placeholder="Podcast title"
                  className="bg-slate-800/50 border-cyan-500/20 text-cyan-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-cyan-100/70 text-sm">Description</Label>
                <Textarea
                  value={editingPodcast.description || ''}
                  onChange={e => setEditingPodcast(prev => prev ? { ...prev, description: e.target.value } : prev)}
                  placeholder="What's this podcast about?"
                  rows={3}
                  className="bg-slate-800/50 border-cyan-500/20 text-cyan-100 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-cyan-100/70 text-sm">Host</Label>
                  <Input
                    value={editingPodcast.host || ''}
                    onChange={e => setEditingPodcast(prev => prev ? { ...prev, host: e.target.value } : prev)}
                    placeholder="Host name"
                    className="bg-slate-800/50 border-cyan-500/20 text-cyan-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-cyan-100/70 text-sm">Category</Label>
                  <Select
                    value={editingPodcast.category || PODCAST_CATEGORIES[0]}
                    onValueChange={val => setEditingPodcast(prev => prev ? { ...prev, category: val } : prev)}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-cyan-500/20 text-cyan-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-cyan-500/20">
                      {PODCAST_CATEGORIES.map(c => (
                        <SelectItem key={c} value={c} className="text-cyan-100 focus:bg-cyan-500/20 focus:text-cyan-100">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-cyan-100/70 text-sm">Status</Label>
                <Select
                  value={editingPodcast.status || 'draft'}
                  onValueChange={val => setEditingPodcast(prev => prev ? { ...prev, status: val as Podcast['status'] } : prev)}
                >
                  <SelectTrigger className="bg-slate-800/50 border-cyan-500/20 text-cyan-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-cyan-500/20">
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s} value={s} className="text-cyan-100 focus:bg-cyan-500/20 focus:text-cyan-100">
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-cyan-100/70 text-sm">Cover Image URL</Label>
                <Input
                  value={editingPodcast.coverImage || ''}
                  onChange={e => setEditingPodcast(prev => prev ? { ...prev, coverImage: e.target.value } : prev)}
                  placeholder="https://..."
                  className="bg-slate-800/50 border-cyan-500/20 text-cyan-100 text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPodcastModalOpen(false)}
              className="border-cyan-500/20 text-cyan-100/70 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePodcast}
              disabled={saving || !editingPodcast?.title?.trim()}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900"
            >
              {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
              {editingPodcast?.id ? 'Save Changes' : 'Create Podcast'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ EPISODE MODAL ═══════════════════ */}
      <Dialog open={episodeModalOpen} onOpenChange={setEpisodeModalOpen}>
        <DialogContent className="bg-slate-900 border-cyan-500/30 text-cyan-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-righteous text-transparent bg-clip-text bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]">
              {editingEpisode?.id ? 'Edit Episode' : 'Add Episode'}
            </DialogTitle>
            <DialogDescription className="text-cyan-100/50">
              Episode details
            </DialogDescription>
          </DialogHeader>

          {editingEpisode && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-cyan-100/70 text-sm">Title *</Label>
                <Input
                  value={editingEpisode.title || ''}
                  onChange={e => setEditingEpisode(prev => prev ? { ...prev, title: e.target.value } : prev)}
                  placeholder="Episode title"
                  className="bg-slate-800/50 border-cyan-500/20 text-cyan-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-cyan-100/70 text-sm">Description</Label>
                <Textarea
                  value={editingEpisode.description || ''}
                  onChange={e => setEditingEpisode(prev => prev ? { ...prev, description: e.target.value } : prev)}
                  placeholder="Episode description"
                  rows={3}
                  className="bg-slate-800/50 border-cyan-500/20 text-cyan-100 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-cyan-100/70 text-sm">Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={editingEpisode.duration || 0}
                    onChange={e => setEditingEpisode(prev => prev ? { ...prev, duration: parseInt(e.target.value) || 0 } : prev)}
                    className="bg-slate-800/50 border-cyan-500/20 text-cyan-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-cyan-100/70 text-sm">Status</Label>
                  <Select
                    value={editingEpisode.status || 'draft'}
                    onValueChange={val => setEditingEpisode(prev => prev ? { ...prev, status: val as Episode['status'] } : prev)}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-cyan-500/20 text-cyan-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-cyan-500/20">
                      <SelectItem value="draft" className="text-cyan-100 focus:bg-cyan-500/20 focus:text-cyan-100">Draft</SelectItem>
                      <SelectItem value="published" className="text-cyan-100 focus:bg-cyan-500/20 focus:text-cyan-100">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEpisodeModalOpen(false)}
              className="border-cyan-500/20 text-cyan-100/70 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEpisode}
              disabled={saving || !editingEpisode?.title?.trim()}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900"
            >
              {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
              {editingEpisode?.id ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ PURGE CONFIRM DIALOG ═══════════════════ */}
      <Dialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
        <DialogContent className="bg-slate-900 border-red-500/30 text-cyan-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="size-5" />
              Delete All Shows
            </DialogTitle>
            <DialogDescription className="text-cyan-100/60">
              This will permanently delete <strong className="text-red-400">{shows.length}</strong> show(s), including all seed/fake data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPurgeDialogOpen(false)}
              className="border-cyan-500/20 text-cyan-100/70 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurgeAllShows}
              disabled={purging}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {purging ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Trash2 className="size-4 mr-2" />}
              Delete All ({shows.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}