import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Radio,
  Mic2,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Image as ImageIcon,
  User,
  Calendar,
  Clock,
  Save,
  X,
  Loader2,
  Play,
  Pause,
  Download,
  Eye,
  TrendingUp,
  Users,
  Heart,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../../lib/api';
import { AdminLayout } from '../../components/admin/AdminLayout';

interface Show {
  id: string;
  slug: string;
  title: string;
  description: string;
  host: string;
  hostAvatar?: string;
  coverImage?: string;
  genre: string;
  schedule: {
    day: string;
    startTime: string;
    endTime: string;
  }[];
  status: 'active' | 'inactive' | 'draft';
  totalListeners?: number;
  averageRating?: number;
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
  'Latin', 'Afropop', 'House', 'Lounge'
];

const PODCAST_CATEGORIES = [
  'Interviews', 'Music History', 'Culture', 
  'Behind the Scenes', 'DJ Mixes', 'Educational'
];

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
  'Friday', 'Saturday', 'Sunday'
];

export function ShowsPodcastsManagement() {
  const [activeTab, setActiveTab] = useState('shows');
  const [shows, setShows] = useState<Show[]>([]);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [editingPodcast, setEditingPodcast] = useState<Podcast | null>(null);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  
  const [selectedPodcast, setSelectedPodcast] = useState<string | null>(null);

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
        const { shows: data } = await api.getShows();
        setShows(data || []);
      } else {
        const { podcasts: data } = await api.getPodcasts();
        setPodcasts(data || []);
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

  const handleCreateShow = () => {
    setEditingShow({
      id: '',
      slug: '',
      title: '',
      description: '',
      host: '',
      genre: GENRE_OPTIONS[0],
      schedule: [],
      status: 'draft',
    });
    setShowEditModal(true);
  };

  const handleCreatePodcast = () => {
    setEditingPodcast({
      id: '',
      slug: '',
      title: '',
      description: '',
      host: '',
      category: PODCAST_CATEGORIES[0],
      status: 'draft',
    });
    setShowEditModal(true);
  };

  const handleCreateEpisode = () => {
    if (!selectedPodcast) return;
    
    setEditingEpisode({
      id: '',
      podcastId: selectedPodcast,
      title: '',
      description: '',
      duration: 0,
      publishedAt: new Date().toISOString(),
      status: 'draft',
    });
    setShowEditModal(true);
  };

  const handleSaveShow = async (show: Show) => {
    try {
      if (show.id) {
        await api.updateShow(show.id, show);
      } else {
        await api.createShow(show);
      }
      setShowEditModal(false);
      setEditingShow(null);
      await loadData();
    } catch (error) {
      console.error('Error saving show:', error);
    }
  };

  const handleSavePodcast = async (podcast: Podcast) => {
    try {
      if (podcast.id) {
        await api.updatePodcast(podcast.id, podcast);
      } else {
        await api.createPodcast(podcast);
      }
      setShowEditModal(false);
      setEditingPodcast(null);
      await loadData();
    } catch (error) {
      console.error('Error saving podcast:', error);
    }
  };

  const handleSaveEpisode = async (episode: Episode) => {
    try {
      if (episode.id) {
        await api.updateEpisode(episode.id, episode);
      } else {
        await api.createEpisode(episode);
      }
      setShowEditModal(false);
      setEditingEpisode(null);
      if (selectedPodcast) {
        await loadEpisodes(selectedPodcast);
      }
    } catch (error) {
      console.error('Error saving episode:', error);
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

  const handleDeletePodcast = async (podcastId: string) => {
    if (!confirm('Delete this podcast and all its episodes? This action cannot be undone.')) return;
    
    try {
      await api.deletePodcast(podcastId);
      await loadData();
    } catch (error) {
      console.error('Error deleting podcast:', error);
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
                Shows & Podcasts Management
              </h1>
              <p className="text-cyan-100/60 mt-1 sm:mt-2 text-sm sm:text-base">
                Create and manage your live shows and podcast series
              </p>
            </div>

            <Button
              onClick={activeTab === 'shows' ? handleCreateShow : handleCreatePodcast}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 hover:shadow-lg hover:shadow-cyan-500/30 w-full sm:w-auto flex-shrink-0"
            >
              <Plus className="size-4 mr-2" />
              {activeTab === 'shows' ? 'Create Show' : 'Create Podcast'}
            </Button>
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
                  <p className="text-xs sm:text-sm text-cyan-100/60 truncate">Active Shows</p>
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
                  <p className="text-xs sm:text-sm text-cyan-100/60 truncate">Podcast Series</p>
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
                  <p className="text-xs sm:text-sm text-cyan-100/60 truncate">Total Episodes</p>
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
                    {(shows.reduce((sum, s) => sum + (s.totalListeners || 0), 0) / 1000).toFixed(1)}k
                  </p>
                  <p className="text-xs sm:text-sm text-cyan-100/60 truncate">Total Listeners</p>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900/50 border border-cyan-500/20 mb-4 sm:mb-6 w-full sm:w-auto">
            <TabsTrigger value="shows" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 flex-1 sm:flex-initial text-sm sm:text-base">
              <Radio className="size-3 sm:size-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Live Shows</span>
              <span className="xs:hidden">Shows</span>
            </TabsTrigger>
            <TabsTrigger value="podcasts" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 flex-1 sm:flex-initial text-sm sm:text-base">
              <Mic2 className="size-3 sm:size-4 mr-1 sm:mr-2" />
              Podcasts
            </TabsTrigger>
          </TabsList>

          {/* Shows Tab */}
          <TabsContent value="shows">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="size-8 text-cyan-400 animate-spin" />
              </div>
            ) : shows.length === 0 ? (
              <Card className="p-8 sm:p-12 bg-slate-900/50 border-cyan-500/20 text-center">
                <Radio className="size-12 sm:size-16 text-cyan-400/20 mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-cyan-100 mb-2">No Shows Yet</h3>
                <p className="text-sm sm:text-base text-cyan-100/60 mb-4 sm:mb-6">Create your first live show to get started</p>
                <Button
                  onClick={handleCreateShow}
                  className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900"
                >
                  <Plus className="size-4 mr-2" />
                  Create Show
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {shows.map((show, index) => (
                  <motion.div
                    key={show.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-slate-900/50 border-cyan-500/20 overflow-hidden hover:border-cyan-500/40 transition-all group">
                      {/* Cover Image */}
                      <div className="relative h-40 sm:h-48 bg-gradient-to-br from-cyan-500/20 to-cyan-700/20 overflow-hidden">
                        {show.coverImage ? (
                          <img
                            src={show.coverImage}
                            alt={show.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Radio className="size-12 sm:size-16 text-cyan-400/30" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            show.status === 'active' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : show.status === 'inactive'
                              ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                              : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          }`}>
                            {show.status}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-3 sm:p-4">
                        <h3 className="text-base sm:text-lg font-semibold text-cyan-100 mb-2 truncate">
                          {show.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-cyan-100/60 mb-3 line-clamp-2">
                          {show.description}
                        </p>

                        <div className="flex items-center gap-2 mb-3 text-xs sm:text-sm">
                          {show.hostAvatar ? (
                            <img
                              src={show.hostAvatar}
                              alt={show.host}
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0"
                            />
                          ) : (
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                              <User className="size-2 sm:size-3 text-cyan-400" />
                            </div>
                          )}
                          <span className="text-cyan-100/70 truncate">{show.host}</span>
                          <span className="text-cyan-500/30 flex-shrink-0">•</span>
                          <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-xs rounded-full flex-shrink-0">
                            {show.genre}
                          </span>
                        </div>

                        {/* Schedule */}
                        {show.schedule.length > 0 && (
                          <div className="mb-3 p-2 bg-slate-800/50 rounded">
                            <div className="flex items-center gap-2 text-xs text-cyan-100/60">
                              <Calendar className="size-3 flex-shrink-0" />
                              <span className="truncate">
                                {show.schedule.map(s => s.day).join(', ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-cyan-100/60 mt-1">
                              <Clock className="size-3 flex-shrink-0" />
                              <span className="truncate">
                                {show.schedule[0]?.startTime} - {show.schedule[0]?.endTime}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm text-cyan-100/60">
                          <div className="flex items-center gap-1">
                            <Users className="size-3 sm:size-4" />
                            <span>{show.totalListeners || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="size-3 sm:size-4" />
                            <span>{show.averageRating?.toFixed(1) || '0.0'}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => {
                              setEditingShow(show);
                              setShowEditModal(true);
                            }}
                            className="flex-1 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                            size="sm"
                          >
                            <Edit2 className="size-3 mr-1" />
                            <span className="hidden xs:inline">Edit</span>
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
              </div>
            )}
          </TabsContent>

          {/* Podcasts Tab */}
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
                    <h3 className="text-lg sm:text-xl font-semibold text-cyan-100 mb-2">No Podcasts Yet</h3>
                    <p className="text-sm sm:text-base text-cyan-100/60 mb-4 sm:mb-6">Create your first podcast series</p>
                    <Button
                      onClick={handleCreatePodcast}
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
                        transition={{ delay: index * 0.1 }}
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
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-semibold text-cyan-100 truncate">
                                    {podcast.title}
                                  </h3>
                                  <p className="text-sm text-cyan-100/60 line-clamp-2">
                                    {podcast.description}
                                  </p>
                                </div>
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                                  podcast.status === 'active' 
                                    ? 'bg-green-500/20 text-green-400'
                                    : podcast.status === 'inactive'
                                    ? 'bg-gray-500/20 text-gray-400'
                                    : 'bg-orange-500/20 text-orange-400'
                                }`}>
                                  {podcast.status}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                                  <User className="size-3 text-purple-400" />
                                </div>
                                <span className="text-sm text-cyan-100/70">{podcast.host}</span>
                                <span className="text-cyan-500/30">•</span>
                                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full">
                                  {podcast.category}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-cyan-100/60">
                                <div className="flex items-center gap-1">
                                  <Play className="size-4" />
                                  <span>{podcast.episodeCount || 0} episodes</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="size-4" />
                                  <span>{podcast.totalListeners || 0} listeners</span>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPodcast(podcast);
                                  setShowEditModal(true);
                                }}
                                size="sm"
                                variant="ghost"
                                className="text-cyan-400 hover:bg-cyan-500/10"
                              >
                                <Edit2 className="size-4" />
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePodcast(podcast.id);
                                }}
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="size-4" />
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
              <Card className="bg-slate-900/50 border-cyan-500/20 p-6 h-fit sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-cyan-400">Episodes</h2>
                  {selectedPodcast && (
                    <Button
                      onClick={handleCreateEpisode}
                      size="sm"
                      className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                    >
                      <Plus className="size-4 mr-1" />
                      Add
                    </Button>
                  )}
                </div>

                {!selectedPodcast ? (
                  <div className="text-center py-8 text-cyan-100/40">
                    <Mic2 className="size-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Select a podcast to view episodes</p>
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
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-sm font-semibold text-cyan-100 line-clamp-1 flex-1">
                            {episode.title}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${
                            episode.status === 'published'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {episode.status}
                          </span>
                        </div>
                        <p className="text-xs text-cyan-100/50 mb-2 line-clamp-2">
                          {episode.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-cyan-100/60">
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

      {/* Edit Modals would go here - simplified for brevity */}
    </AdminLayout>
  );
}