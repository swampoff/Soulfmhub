import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Radio,
  Mic2,
  Search,
  Play,
  Clock,
  Users,
  Calendar,
  Star,
  Heart,
  TrendingUp,
  Headphones,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { api } from '../../lib/api';
import { AnimatedPalm } from '../components/AnimatedPalm';

const SHOW_GENRES = ['all', 'soul', 'funk', 'jazz', 'disco', 'rnb', 'reggae'];
const PODCAST_CATEGORIES = [
  { id: 'all', label: 'All Podcasts', icon: Mic2 },
  { id: 'interviews', label: 'Interviews', icon: Users },
  { id: 'history', label: 'Music History', icon: Calendar },
  { id: 'culture', label: 'Culture', icon: Star },
  { id: 'behind-scenes', label: 'Behind the Scenes', icon: Headphones },
];

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
  totalListeners: number;
  averageRating: number;
  featured?: boolean;
}

interface Episode {
  id: string;
  title: string;
  duration: number;
  publishedAt: string;
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
  episodeCount: number;
  totalListeners: number;
  averageRating: number;
  latestEpisode?: Episode;
  featured?: boolean;
  subscribed?: boolean;
}

export function ShowsPodcastsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('shows');
  
  // Shows state
  const [shows, setShows] = useState<Show[]>([]);
  const [filteredShows, setFilteredShows] = useState<Show[]>([]);
  const [showsLoading, setShowsLoading] = useState(true);
  const [showsSearch, setShowsSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');

  // Podcasts state
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [filteredPodcasts, setFilteredPodcasts] = useState<Podcast[]>([]);
  const [podcastsLoading, setPodcastsLoading] = useState(true);
  const [podcastsSearch, setPodcastsSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadShows();
    loadPodcasts();
  }, []);

  useEffect(() => {
    filterShows();
  }, [shows, showsSearch, selectedGenre]);

  useEffect(() => {
    filterPodcasts();
  }, [podcasts, podcastsSearch, selectedCategory]);

  // Shows functions
  const loadShows = async () => {
    setShowsLoading(true);
    try {
      const response = await api.getShows();
      setShows(response.shows || []);
    } catch (error) {
      console.error('Error loading shows:', error);
      setShows([]);
    } finally {
      setShowsLoading(false);
    }
  };

  const filterShows = () => {
    let filtered = [...shows];

    if (selectedGenre !== 'all') {
      filtered = filtered.filter((s) => s.genre === selectedGenre);
    }

    if (showsSearch) {
      const query = showsSearch.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.host.toLowerCase().includes(query)
      );
    }

    setFilteredShows(filtered);
  };

  // Podcasts functions
  const loadPodcasts = async () => {
    setPodcastsLoading(true);
    try {
      const response = await api.getPodcasts();
      setPodcasts(response.podcasts || []);
    } catch (error) {
      console.error('Error loading podcasts:', error);
      setPodcasts([]);
    } finally {
      setPodcastsLoading(false);
    }
  };

  const filterPodcasts = () => {
    let filtered = [...podcasts];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (podcastsSearch) {
      const query = podcastsSearch.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.host.toLowerCase().includes(query)
      );
    }

    setFilteredPodcasts(filtered);
  };

  const toggleSubscribe = async (podcastId: string) => {
    try {
      await api.togglePodcastSubscription(podcastId);
      setPodcasts(
        podcasts.map((p) =>
          p.id === podcastId ? { ...p, subscribed: !p.subscribed } : p
        )
      );
    } catch (error) {
      console.error('Error toggling subscription:', error);
    }
  };

  const featuredShows = filteredShows.filter((s) => s.featured);
  const regularShows = filteredShows.filter((s) => !s.featured);
  const featuredPodcasts = filteredPodcasts.filter((p) => p.featured);
  const regularPodcasts = filteredPodcasts.filter((p) => !p.featured);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] relative overflow-hidden py-12">
      {/* Animated Palms - Left */}
      <AnimatedPalm side="left" delay={0.3} />
      
      {/* Animated Palms - Right */}
      <AnimatedPalm side="right" delay={0.5} />

      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-[#00d9ff] rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-[#00ffaa] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-[#FF8C42] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#00d9ff]/20 to-[#00ffaa]/20 border border-[#00d9ff]/30 mb-4">
            <Radio className="w-4 h-4 text-[#00d9ff]" />
            <span className="text-[#00d9ff] font-semibold text-sm">PROGRAMMING</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
            Shows & Podcasts
          </h1>
          <p className="text-white/70 text-lg">
            Live radio shows and on-demand podcasts from Soul FM
          </p>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto mb-8 bg-white/10 border border-white/20">
            <TabsTrigger
              value="shows"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00d9ff] data-[state=active]:to-[#00ffaa] data-[state=active]:text-[#0a1628] text-white"
            >
              <Radio className="w-4 h-4 mr-2" />
              Live Shows
            </TabsTrigger>
            <TabsTrigger
              value="podcasts"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00d9ff] data-[state=active]:to-[#00ffaa] data-[state=active]:text-[#0a1628] text-white"
            >
              <Mic2 className="w-4 h-4 mr-2" />
              Podcasts
            </TabsTrigger>
          </TabsList>

          {/* Shows Tab */}
          <TabsContent value="shows" className="mt-0">
            {/* Genre Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {SHOW_GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all capitalize ${
                    selectedGenre === genre
                      ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] shadow-lg scale-105'
                      : 'text-white/70 hover:text-white bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <Input
                type="text"
                placeholder="Search live shows by title, host, or description..."
                value={showsSearch}
                onChange={(e) => setShowsSearch(e.target.value)}
                className="pl-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#00d9ff]"
              />
            </div>

            {/* Shows Content */}
            {showsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card
                    key={i}
                    className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden animate-pulse"
                  >
                    <div className="aspect-video bg-white/5" />
                    <div className="p-6">
                      <div className="h-6 bg-white/5 rounded mb-3" />
                      <div className="h-4 bg-white/5 rounded mb-2" />
                      <div className="h-4 bg-white/5 rounded w-2/3" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredShows.length === 0 ? (
              <Card className="p-12 bg-white/10 backdrop-blur-sm border-white/20 text-center">
                <Radio className="w-16 h-16 mx-auto mb-4 text-white/30" />
                <p className="text-white/70 text-lg mb-2">No shows found</p>
                <p className="text-white/50 text-sm">Try adjusting your filters or search query</p>
              </Card>
            ) : (
              <>
                {/* Featured Shows */}
                {featuredShows.length > 0 && (
                  <div className="mb-12">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                      <Star className="w-6 h-6 text-[#FFD700]" />
                      Featured Shows
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {featuredShows.map((show, index) => (
                        <ShowCardLarge key={show.id} show={show} index={index} navigate={navigate} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular Shows */}
                {regularShows.length > 0 && (
                  <div>
                    {featuredShows.length > 0 && (
                      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Radio className="w-6 h-6 text-[#00d9ff]" />
                        All Shows
                      </h2>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {regularShows.map((show, index) => (
                        <ShowCard key={show.id} show={show} index={index} navigate={navigate} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Podcasts Tab */}
          <TabsContent value="podcasts" className="mt-0">
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {PODCAST_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isActive = selectedCategory === category.id;

                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] shadow-lg scale-105'
                        : 'text-white/70 hover:text-white bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {category.label}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <Input
                type="text"
                placeholder="Search podcasts by title, host, or description..."
                value={podcastsSearch}
                onChange={(e) => setPodcastsSearch(e.target.value)}
                className="pl-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#00d9ff]"
              />
            </div>

            {/* Podcasts Content */}
            {podcastsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card
                    key={i}
                    className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden animate-pulse"
                  >
                    <div className="aspect-video bg-white/5" />
                    <div className="p-6">
                      <div className="h-6 bg-white/5 rounded mb-3" />
                      <div className="h-4 bg-white/5 rounded mb-2" />
                      <div className="h-4 bg-white/5 rounded w-2/3" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredPodcasts.length === 0 ? (
              <Card className="p-12 bg-white/10 backdrop-blur-sm border-white/20 text-center">
                <Mic2 className="w-16 h-16 mx-auto mb-4 text-white/30" />
                <p className="text-white/70 text-lg mb-2">No podcasts found</p>
                <p className="text-white/50 text-sm">Try adjusting your filters or search query</p>
              </Card>
            ) : (
              <>
                {/* Featured Podcasts */}
                {featuredPodcasts.length > 0 && (
                  <div className="mb-12">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                      <Star className="w-6 h-6 text-[#FFD700]" />
                      Featured Podcasts
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {featuredPodcasts.map((podcast, index) => (
                        <PodcastCardLarge
                          key={podcast.id}
                          podcast={podcast}
                          index={index}
                          navigate={navigate}
                          toggleSubscribe={toggleSubscribe}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular Podcasts */}
                {regularPodcasts.length > 0 && (
                  <div>
                    {featuredPodcasts.length > 0 && (
                      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Mic2 className="w-6 h-6 text-[#00d9ff]" />
                        All Podcasts
                      </h2>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {regularPodcasts.map((podcast, index) => (
                        <PodcastCard
                          key={podcast.id}
                          podcast={podcast}
                          index={index}
                          navigate={navigate}
                          toggleSubscribe={toggleSubscribe}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Show Card Components
function ShowCardLarge({ show, index, navigate }: any) {
  const getDayAbbrev = (day: string) => {
    const days: any = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
    return days[day.toLowerCase()] || day;
  };

  // Safely parse schedule - it might be a JSON string from KV store
  const schedule = Array.isArray(show.schedule)
    ? show.schedule
    : typeof show.schedule === 'string'
      ? (() => { try { return JSON.parse(show.schedule); } catch { return []; } })()
      : [];
  const totalListeners = show.totalListeners ?? 0;
  const averageRating = show.averageRating ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:border-[#00d9ff]/50 transition-all overflow-hidden group h-full">
        <div className="flex flex-col md:flex-row">
          <div
            className="w-full md:w-64 aspect-square relative overflow-hidden cursor-pointer"
            onClick={() => navigate(`/shows/${show.slug}`)}
          >
            {show.coverImage ? (
              <img
                src={show.coverImage}
                alt={show.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center">
                <Radio className="w-16 h-16 text-white/30" />
              </div>
            )}
            <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center">
              <Star className="w-5 h-5 text-[#0a1628]" />
            </div>
          </div>

          <div className="flex-1 p-6 flex flex-col">
            <div className="flex-1">
              <h3
                className="text-2xl font-bold text-white mb-2 cursor-pointer hover:text-[#00d9ff] transition-colors"
                onClick={() => navigate(`/shows/${show.slug}`)}
              >
                {show.title}
              </h3>
              <p className="text-[#00ffaa] text-sm font-semibold mb-3">by {show.host}</p>
              <p className="text-white/70 text-sm mb-4 line-clamp-2">{show.description}</p>

              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Users className="w-4 h-4 text-[#00ffaa]" />
                  {totalListeners.toLocaleString()} listeners
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Star className="w-4 h-4 text-[#FFD700]" />
                  {averageRating.toFixed(1)}
                </div>
              </div>

              {schedule.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {schedule.slice(0, 3).map((sched: any, i: number) => (
                    <div key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
                      <span className="text-[#00d9ff] font-semibold">{getDayAbbrev(sched.day)}</span>
                      <span className="text-white/70 ml-2">{sched.startTime}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={() => navigate(`/shows/${show.slug}`)}
              className="w-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] hover:opacity-90"
            >
              <Play className="w-4 h-4 mr-2" />
              View Show
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function ShowCard({ show, index, navigate }: any) {
  const getDayAbbrev = (day: string) => {
    const days: any = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
    return days[day.toLowerCase()] || day;
  };

  // Safely parse schedule - it might be a JSON string from KV store
  const schedule = Array.isArray(show.schedule)
    ? show.schedule
    : typeof show.schedule === 'string'
      ? (() => { try { return JSON.parse(show.schedule); } catch { return []; } })()
      : [];
  const totalListeners = show.totalListeners ?? 0;
  const averageRating = show.averageRating ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:border-[#00d9ff]/50 transition-all overflow-hidden group cursor-pointer h-full flex flex-col">
        <div
          className="aspect-video relative overflow-hidden"
          onClick={() => navigate(`/shows/${show.slug}`)}
        >
          {show.coverImage ? (
            <img
              src={show.coverImage}
              alt={show.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center">
              <Radio className="w-12 h-12 text-white/30" />
            </div>
          )}
        </div>

        <div className="p-6 flex-1 flex flex-col">
          <div className="flex-1">
            <h3
              className="text-xl font-bold text-white mb-2 hover:text-[#00d9ff] transition-colors cursor-pointer"
              onClick={() => navigate(`/shows/${show.slug}`)}
            >
              {show.title}
            </h3>
            <p className="text-[#00ffaa] text-sm font-semibold mb-3">by {show.host}</p>
            <p className="text-white/70 text-sm mb-4 line-clamp-2">{show.description}</p>

            {schedule.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {schedule.slice(0, 2).map((sched: any, i: number) => (
                  <div key={i} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs">
                    <span className="text-[#00d9ff] font-semibold">{getDayAbbrev(sched.day)}</span>
                    <span className="text-white/70 ml-1">{sched.startTime}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-white/60">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-[#00ffaa]" />
                {(totalListeners / 1000).toFixed(1)}k
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-[#FFD700]" />
                {averageRating.toFixed(1)}
              </span>
            </div>
          </div>

          <Button
            onClick={() => navigate(`/shows/${show.slug}`)}
            className="w-full mt-4 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] hover:opacity-90"
            size="sm"
          >
            <Play className="w-4 h-4 mr-2" />
            View Show
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

// Podcast Card Components
function PodcastCardLarge({ podcast, index, navigate, toggleSubscribe }: any) {
  const totalListeners = podcast.totalListeners ?? 0;
  const averageRating = podcast.averageRating ?? 0;
  const episodeCount = podcast.episodeCount ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:border-[#00d9ff]/50 transition-all overflow-hidden group h-full">
        <div className="flex flex-col md:flex-row">
          <div
            className="w-full md:w-64 aspect-square relative overflow-hidden cursor-pointer"
            onClick={() => navigate(`/podcasts/${podcast.slug}`)}
          >
            {podcast.coverImage ? (
              <img
                src={podcast.coverImage}
                alt={podcast.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center">
                <Mic2 className="w-16 h-16 text-white/30" />
              </div>
            )}
            <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center">
              <Star className="w-5 h-5 text-[#0a1628]" />
            </div>
          </div>

          <div className="flex-1 p-6 flex flex-col">
            <div className="flex-1">
              <h3
                className="text-2xl font-bold text-white mb-2 cursor-pointer hover:text-[#00d9ff] transition-colors"
                onClick={() => navigate(`/podcasts/${podcast.slug}`)}
              >
                {podcast.title}
              </h3>
              <p className="text-[#00ffaa] text-sm font-semibold mb-3">by {podcast.host}</p>
              <p className="text-white/70 text-sm mb-4 line-clamp-2">{podcast.description}</p>

              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Play className="w-4 h-4 text-[#00d9ff]" />
                  {episodeCount} episodes
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Users className="w-4 h-4 text-[#00ffaa]" />
                  {totalListeners.toLocaleString()} listeners
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Star className="w-4 h-4 text-[#FFD700]" />
                  {averageRating.toFixed(1)}
                </div>
              </div>

              {podcast.latestEpisode && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
                  <p className="text-white/50 text-xs mb-1">LATEST EPISODE</p>
                  <p className="text-white text-sm font-semibold line-clamp-1">
                    {podcast.latestEpisode.title}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-white/60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.floor((podcast.latestEpisode.duration ?? 0) / 60)} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(podcast.latestEpisode.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => navigate(`/podcasts/${podcast.slug}`)}
                className="flex-1 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] hover:opacity-90"
              >
                <Play className="w-4 h-4 mr-2" />
                Listen Now
              </Button>
              <Button
                onClick={() => toggleSubscribe(podcast.id)}
                variant="outline"
                className={`${
                  podcast.subscribed
                    ? 'bg-[#E91E63]/20 border-[#E91E63] text-[#E91E63]'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                }`}
              >
                <Heart className={`w-4 h-4 ${podcast.subscribed ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function PodcastCard({ podcast, index, navigate, toggleSubscribe }: any) {
  const totalListeners = podcast.totalListeners ?? 0;
  const averageRating = podcast.averageRating ?? 0;
  const episodeCount = podcast.episodeCount ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:border-[#00d9ff]/50 transition-all overflow-hidden group cursor-pointer h-full flex flex-col">
        <div
          className="aspect-video relative overflow-hidden"
          onClick={() => navigate(`/podcasts/${podcast.slug}`)}
        >
          {podcast.coverImage ? (
            <img
              src={podcast.coverImage}
              alt={podcast.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center">
              <Mic2 className="w-12 h-12 text-white/30" />
            </div>
          )}
        </div>

        <div className="p-6 flex-1 flex flex-col">
          <div className="flex-1">
            <h3
              className="text-xl font-bold text-white mb-2 hover:text-[#00d9ff] transition-colors cursor-pointer"
              onClick={() => navigate(`/podcasts/${podcast.slug}`)}
            >
              {podcast.title}
            </h3>
            <p className="text-[#00ffaa] text-sm font-semibold mb-3">by {podcast.host}</p>
            <p className="text-white/70 text-sm mb-4 line-clamp-2">{podcast.description}</p>

            <div className="flex flex-wrap gap-3 mb-4 text-xs text-white/60">
              <span className="flex items-center gap-1">
                <Play className="w-3 h-3 text-[#00d9ff]" />
                {episodeCount} eps
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-[#00ffaa]" />
                {(totalListeners / 1000).toFixed(1)}k
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-[#FFD700]" />
                {averageRating.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => navigate(`/podcasts/${podcast.slug}`)}
              className="flex-1 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] hover:opacity-90"
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              Listen
            </Button>
            <Button
              onClick={() => toggleSubscribe(podcast.id)}
              variant="outline"
              size="sm"
              className={`${
                podcast.subscribed
                  ? 'bg-[#E91E63]/20 border-[#E91E63] text-[#E91E63]'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
            >
              <Heart className={`w-4 h-4 ${podcast.subscribed ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}