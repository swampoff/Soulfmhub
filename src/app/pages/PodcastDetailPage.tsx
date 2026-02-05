import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Play,
  Pause,
  Clock,
  Calendar,
  Users,
  Star,
  Heart,
  Share2,
  Download,
  ChevronLeft,
  Volume2,
  SkipBack,
  SkipForward,
  Mic2,
  MessageSquare,
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../../lib/api';

interface Episode {
  id: string;
  title: string;
  description: string;
  duration: number;
  audioUrl: string;
  publishedAt: string;
  plays: number;
  likes: number;
  isLiked?: boolean;
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
  subscribed?: boolean;
  episodes: Episode[];
}

export function PodcastDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadPodcast();
    }
  }, [slug]);

  const loadPodcast = async () => {
    setLoading(true);
    try {
      console.log('🎙️ Loading podcast:', slug);
      const response = await api.getPodcast(slug!);
      console.log('✅ Podcast response:', response);
      setPodcast(response.podcast);
      if (response.podcast?.episodes?.length > 0) {
        setCurrentEpisode(response.podcast.episodes[0]);
      }
    } catch (error) {
      console.error('❌ Error loading podcast:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    // In real app, this would control actual audio playback
  };

  const toggleSubscribe = async () => {
    if (!podcast) return;
    try {
      await api.togglePodcastSubscription(podcast.id);
      setPodcast({ ...podcast, subscribed: !podcast.subscribed });
    } catch (error) {
      console.error('Error toggling subscription:', error);
    }
  };

  const toggleEpisodeLike = async (episodeId: string) => {
    if (!podcast) return;
    try {
      await api.toggleEpisodeLike(episodeId);
      setPodcast({
        ...podcast,
        episodes: podcast.episodes.map((ep) =>
          ep.id === episodeId
            ? {
                ...ep,
                isLiked: !ep.isLiked,
                likes: ep.isLiked ? ep.likes - 1 : ep.likes + 1,
              }
            : ep
        ),
      });
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] flex items-center justify-center">
        <div className="text-center">
          <Mic2 className="w-12 h-12 text-[#00d9ff] animate-pulse mx-auto mb-4" />
          <p className="text-white/70">Loading podcast...</p>
        </div>
      </div>
    );
  }

  if (!podcast) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] flex items-center justify-center">
        <Card className="p-12 bg-white/10 backdrop-blur-sm border-white/20 text-center">
          <Mic2 className="w-16 h-16 mx-auto mb-4 text-white/30" />
          <p className="text-white/70 text-lg mb-4">Podcast not found</p>
          <Button onClick={() => navigate('/podcasts')}>Back to Podcasts</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] pb-32">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Button
          onClick={() => navigate('/podcasts')}
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Podcasts
        </Button>
      </div>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 max-w-7xl mb-12"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cover */}
          <div className="lg:col-span-1">
            <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10">
              {podcast.coverImage ? (
                <img
                  src={podcast.coverImage}
                  alt={podcast.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center">
                  <Mic2 className="w-32 h-32 text-white/30" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="lg:col-span-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#00d9ff]/20 to-[#00ffaa]/20 border border-[#00d9ff]/30 mb-4">
              <Mic2 className="w-4 h-4 text-[#00d9ff]" />
              <span className="text-[#00d9ff] font-semibold text-sm uppercase">
                {podcast.category}
              </span>
            </div>

            <h1 className="text-5xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
              {podcast.title}
            </h1>

            <p className="text-white/70 text-lg mb-6">{podcast.description}</p>

            <div className="flex items-center gap-4 mb-6">
              {podcast.hostAvatar && (
                <img
                  src={podcast.hostAvatar}
                  alt={podcast.host}
                  className="w-12 h-12 rounded-full border-2 border-[#00d9ff]"
                />
              )}
              <div>
                <p className="text-white/50 text-sm">Hosted by</p>
                <p className="text-white font-bold text-lg">{podcast.host}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-2 text-[#00d9ff] mb-1">
                  <Play className="w-4 h-4" />
                  <span className="text-white/50 text-xs">EPISODES</span>
                </div>
                <p className="text-white text-2xl font-bold">{podcast.episodeCount}</p>
              </div>
              <div className="p-4 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-2 text-[#00ffaa] mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-white/50 text-xs">LISTENERS</span>
                </div>
                <p className="text-white text-2xl font-bold">
                  {(podcast.totalListeners / 1000).toFixed(1)}k
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-2 text-[#FFD700] mb-1">
                  <Star className="w-4 h-4" />
                  <span className="text-white/50 text-xs">RATING</span>
                </div>
                <p className="text-white text-2xl font-bold">
                  {podcast.averageRating.toFixed(1)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-2 text-[#E91E63] mb-1">
                  <Heart className="w-4 h-4" />
                  <span className="text-white/50 text-xs">SUBSCRIBERS</span>
                </div>
                <p className="text-white text-2xl font-bold">
                  {Math.floor(podcast.totalListeners * 0.3 / 1000)}k
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={toggleSubscribe}
                className={`${
                  podcast.subscribed
                    ? 'bg-[#E91E63] hover:bg-[#E91E63]/80'
                    : 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]'
                } text-white`}
              >
                <Heart className={`w-4 h-4 mr-2 ${podcast.subscribed ? 'fill-current' : ''}`} />
                {podcast.subscribed ? 'Subscribed' : 'Subscribe'}
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white">
                <MessageSquare className="w-4 h-4 mr-2" />
                Reviews
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Episodes List */}
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-white mb-6">Episodes</h2>
          <div className="space-y-4">
            {podcast.episodes.map((episode, index) => (
              <motion.div
                key={episode.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`p-6 transition-all ${
                    currentEpisode?.id === episode.id
                      ? 'bg-gradient-to-r from-[#00d9ff]/20 to-[#00ffaa]/20 border-[#00d9ff]'
                      : 'bg-white/10 border-white/20 hover:border-[#00d9ff]/50'
                  } backdrop-blur-sm cursor-pointer`}
                  onClick={() => setCurrentEpisode(episode)}
                >
                  <div className="flex items-start gap-4">
                    {/* Episode Number */}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#00d9ff]/30 to-[#00ffaa]/30 border border-[#00d9ff]/50 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">#{podcast.episodes.length - index}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-white mb-2">{episode.title}</h3>
                      <p className="text-white/70 text-sm mb-3 line-clamp-2">
                        {episode.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-[#00d9ff]" />
                          {Math.floor(episode.duration / 60)} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-[#00ffaa]" />
                          {new Date(episode.publishedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Play className="w-4 h-4 text-[#FF8C42]" />
                          {episode.plays.toLocaleString()} plays
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentEpisode(episode);
                          togglePlay();
                        }}
                        className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] hover:opacity-90"
                      >
                        {currentEpisode?.id === episode.id && isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEpisodeLike(episode.id);
                        }}
                        variant="outline"
                        className={`${
                          episode.isLiked
                            ? 'bg-[#E91E63]/20 border-[#E91E63] text-[#E91E63]'
                            : 'bg-white/10 border-white/20 text-white'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${episode.isLiked ? 'fill-current' : ''}`} />
                        <span className="ml-2">{episode.likes}</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Fixed Player */}
      {currentEpisode && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-[#0a1628] to-[#0d1a2d] border-t border-white/20 backdrop-blur-xl z-50">
          <div className="container mx-auto px-4 py-4 max-w-7xl">
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(currentEpisode.duration)}</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer">
                <div
                  className="h-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] rounded-full transition-all"
                  style={{
                    width: `${(currentTime / currentEpisode.duration) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Cover */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex-shrink-0">
                {podcast.coverImage ? (
                  <img src={podcast.coverImage} alt={podcast.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Mic2 className="w-8 h-8 text-white/30" />
                  </div>
                )}
              </div>

              {/* Episode Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{currentEpisode.title}</p>
                <p className="text-white/60 text-sm truncate">{podcast.title}</p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-white">
                  <SkipBack className="w-5 h-5" />
                </Button>
                <Button
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] hover:opacity-90"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </Button>
                <Button variant="ghost" size="sm" className="text-white">
                  <SkipForward className="w-5 h-5" />
                </Button>
              </div>

              {/* Volume */}
              <div className="hidden md:flex items-center gap-2 w-32">
                <Volume2 className="w-5 h-5 text-white/70" />
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/70 rounded-full"
                    style={{ width: `${volume}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}