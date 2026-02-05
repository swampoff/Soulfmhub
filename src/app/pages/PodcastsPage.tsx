import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Mic2,
  Search,
  Play,
  Clock,
  Users,
  Calendar,
  Filter,
  TrendingUp,
  Star,
  Headphones,
  Plus,
  Heart,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { api } from '../../lib/api';

const CATEGORIES = [
  { id: 'all', label: 'All Podcasts', icon: Mic2 },
  { id: 'interviews', label: 'Interviews', icon: Users },
  { id: 'history', label: 'Music History', icon: Calendar },
  { id: 'culture', label: 'Culture', icon: Star },
  { id: 'behind-scenes', label: 'Behind the Scenes', icon: Headphones },
];

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

export function PodcastsPage() {
  const navigate = useNavigate();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [filteredPodcasts, setFilteredPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadPodcasts();
  }, []);

  useEffect(() => {
    filterPodcasts();
  }, [podcasts, searchQuery, selectedCategory]);

  const loadPodcasts = async () => {
    setLoading(true);
    try {
      console.log('🎙️ Loading podcasts...');
      const response = await api.getPodcasts();
      console.log('✅ Podcasts response:', response);
      setPodcasts(response.podcasts || []);
    } catch (error) {
      console.error('❌ Error loading podcasts:', error);
      setPodcasts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterPodcasts = () => {
    let filtered = [...podcasts];

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
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

  const featuredPodcasts = filteredPodcasts.filter((p) => p.featured);
  const regularPodcasts = filteredPodcasts.filter((p) => !p.featured);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#00d9ff]/20 to-[#00ffaa]/20 border border-[#00d9ff]/30 mb-4">
              <Mic2 className="w-4 h-4 text-[#00d9ff]" />
              <span className="text-[#00d9ff] font-semibold text-sm">PODCASTS</span>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
              Soul FM Podcasts
            </h1>
            <p className="text-white/70 text-lg">
              Deep dives, interviews, and stories from the world of soul, funk, and beyond
            </p>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map((category) => {
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
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            <Input
              type="text"
              placeholder="Search podcasts by title, host, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#00d9ff]"
            />
          </div>
        </motion.div>

        {/* Loading State */}
        {loading ? (
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Star className="w-6 h-6 text-[#FFD700]" />
                  Featured Podcasts
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {featuredPodcasts.map((podcast, index) => (
                    <motion.div
                      key={podcast.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:border-[#00d9ff]/50 transition-all overflow-hidden group h-full">
                        <div className="flex flex-col md:flex-row">
                          {/* Cover Image */}
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

                          {/* Content */}
                          <div className="flex-1 p-6 flex flex-col">
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h3
                                    className="text-2xl font-bold text-white mb-2 cursor-pointer hover:text-[#00d9ff] transition-colors"
                                    onClick={() => navigate(`/podcasts/${podcast.slug}`)}
                                  >
                                    {podcast.title}
                                  </h3>
                                  <p className="text-[#00ffaa] text-sm font-semibold mb-3">
                                    by {podcast.host}
                                  </p>
                                </div>
                              </div>

                              <p className="text-white/70 text-sm mb-4 line-clamp-2">
                                {podcast.description}
                              </p>

                              {/* Stats */}
                              <div className="flex flex-wrap gap-4 mb-4">
                                <div className="flex items-center gap-2 text-white/60 text-sm">
                                  <Play className="w-4 h-4 text-[#00d9ff]" />
                                  {podcast.episodeCount} episodes
                                </div>
                                <div className="flex items-center gap-2 text-white/60 text-sm">
                                  <Users className="w-4 h-4 text-[#00ffaa]" />
                                  {podcast.totalListeners.toLocaleString()} listeners
                                </div>
                                <div className="flex items-center gap-2 text-white/60 text-sm">
                                  <Star className="w-4 h-4 text-[#FFD700]" />
                                  {podcast.averageRating.toFixed(1)}
                                </div>
                              </div>

                              {/* Latest Episode */}
                              {podcast.latestEpisode && (
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
                                  <p className="text-white/50 text-xs mb-1">LATEST EPISODE</p>
                                  <p className="text-white text-sm font-semibold line-clamp-1">
                                    {podcast.latestEpisode.title}
                                  </p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-white/60">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {Math.floor(podcast.latestEpisode.duration / 60)} min
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(podcast.latestEpisode.publishedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
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
                                <Heart
                                  className={`w-4 h-4 ${podcast.subscribed ? 'fill-current' : ''}`}
                                />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Regular Podcasts */}
            {regularPodcasts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {featuredPodcasts.length > 0 && (
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Mic2 className="w-6 h-6 text-[#00d9ff]" />
                    All Podcasts
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularPodcasts.map((podcast, index) => (
                    <motion.div
                      key={podcast.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:border-[#00d9ff]/50 transition-all overflow-hidden group cursor-pointer h-full flex flex-col">
                        {/* Cover Image */}
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

                        {/* Content */}
                        <div className="p-6 flex-1 flex flex-col">
                          <div className="flex-1">
                            <h3
                              className="text-xl font-bold text-white mb-2 hover:text-[#00d9ff] transition-colors cursor-pointer"
                              onClick={() => navigate(`/podcasts/${podcast.slug}`)}
                            >
                              {podcast.title}
                            </h3>
                            <p className="text-[#00ffaa] text-sm font-semibold mb-3">
                              by {podcast.host}
                            </p>
                            <p className="text-white/70 text-sm mb-4 line-clamp-2">
                              {podcast.description}
                            </p>

                            {/* Stats */}
                            <div className="flex flex-wrap gap-3 mb-4 text-xs text-white/60">
                              <span className="flex items-center gap-1">
                                <Play className="w-3 h-3 text-[#00d9ff]" />
                                {podcast.episodeCount} eps
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-[#00ffaa]" />
                                {(podcast.totalListeners / 1000).toFixed(1)}k
                              </span>
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-[#FFD700]" />
                                {podcast.averageRating.toFixed(1)}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
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
                              <Heart
                                className={`w-4 h-4 ${podcast.subscribed ? 'fill-current' : ''}`}
                              />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}