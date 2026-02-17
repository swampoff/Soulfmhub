import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Search, Radio, Clock, Users, Play, Calendar, Mic, Podcast } from 'lucide-react';
import { api } from '../../lib/api';
import { motion } from 'motion/react';

export function ShowsPage() {
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    loadShows();
  }, []);

  const loadShows = async () => {
    try {
      const { shows: data } = await api.getShows();
      setShows(data || []);
    } catch (error) {
      console.error('Error loading shows:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredShows = shows.filter(show => {
    const matchesSearch = !searchQuery || 
      (show.title || show.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (show.host || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (show.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGenre = !selectedGenre || show.genre === selectedGenre;
    const matchesType = !selectedType || show.type === selectedType;
    
    return matchesSearch && matchesGenre && matchesType;
  });

  const genres = Array.from(new Set(shows.map(show => show.genre).filter(Boolean)));
  const types = Array.from(new Set(shows.map(show => show.type).filter(Boolean)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#00d9ff]/20 to-[#00ffaa]/20 border border-[#00d9ff]/30 mb-6">
            <Radio className="w-4 h-4 text-[#00d9ff]" />
            <span className="text-[#00d9ff] font-semibold text-sm">EXPLORE OUR PROGRAMS</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-[#00d9ff] via-[#00ffaa] to-[#00d9ff] bg-clip-text text-transparent mb-4">
            Shows & Podcasts
          </h1>
          <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto">
            Discover our curated selection of shows hosted by passionate DJs and music lovers
          </p>
          <div className="flex items-center justify-center gap-8 mt-6 text-white/60">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-[#00d9ff]" />
              <span>{shows.length} Shows</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#00ffaa]" />
              <span>{Array.from(new Set(shows.map(s => s.host))).length} Hosts</span>
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <Input
                type="text"
                placeholder="Search shows, hosts, or descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-white/5 border-white/20 text-white placeholder:text-white/50 text-lg"
              />
            </div>

            {/* Type Filter */}
            <div className="mb-4">
              <div className="text-white/70 text-sm font-semibold mb-2">Type</div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={selectedType === null ? 'default' : 'outline'}
                  onClick={() => setSelectedType(null)}
                  className={selectedType === null 
                    ? 'bg-[#00d9ff] text-[#0a1628] hover:bg-[#00b8dd]' 
                    : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                  }
                >
                  All Types
                </Button>
                {types.map(type => (
                  <Button
                    key={type}
                    size="sm"
                    variant={selectedType === type ? 'default' : 'outline'}
                    onClick={() => setSelectedType(type)}
                    className={selectedType === type
                      ? 'bg-[#00d9ff] text-[#0a1628] hover:bg-[#00b8dd]'
                      : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                    }
                  >
                    {type === 'live' && '🔴'} {type === 'podcast' && '🎙️'} {type}
                  </Button>
                ))}
              </div>
            </div>

            {/* Genre Filter */}
            <div>
              <div className="text-white/70 text-sm font-semibold mb-2">Genre</div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={selectedGenre === null ? 'default' : 'outline'}
                  onClick={() => setSelectedGenre(null)}
                  className={selectedGenre === null 
                    ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] hover:from-[#00b8dd] hover:to-[#00dd88]' 
                    : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                  }
                >
                  All Genres
                </Button>
                {genres.map(genre => (
                  <Button
                    key={genre}
                    size="sm"
                    variant={selectedGenre === genre ? 'default' : 'outline'}
                    onClick={() => setSelectedGenre(genre)}
                    className={selectedGenre === genre
                      ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] hover:from-[#00b8dd] hover:to-[#00dd88]'
                      : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                    }
                  >
                    {genre}
                  </Button>
                ))}
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 pt-4 border-t border-white/10 text-white/60 text-sm">
              Showing {filteredShows.length} of {shows.length} shows
            </div>
          </Card>
        </motion.div>

        {/* Shows Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden animate-pulse">
                <div className="aspect-video bg-white/5" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                  <div className="h-3 bg-white/10 rounded w-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredShows.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShows.map((show, index) => (
              <motion.div
                key={show.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <Link to={`/shows/${show.id}`}>
                  <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:border-[#00d9ff]/50 transition-all overflow-hidden group h-full">
                    {/* Cover Image */}
                    <div className="relative aspect-video overflow-hidden">
                      {(show.coverImage || show.cover) ? (
                        <img
                          src={show.coverImage || show.cover}
                          alt={show.title || show.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center">
                          <Radio className="w-20 h-20 text-[#00d9ff]/50" />
                        </div>
                      )}
                      
                      {/* Play Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] flex items-center justify-center">
                          <Play className="w-6 h-6 text-[#0a1628] ml-1" fill="currentColor" />
                        </div>
                      </div>

                      {/* Type Badge */}
                      <div className="absolute top-3 left-3">
                        {show.type === 'live' && (
                          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/90 text-white text-xs font-bold backdrop-blur-sm">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            LIVE
                          </div>
                        )}
                        {show.type === 'podcast' && (
                          <div className="px-3 py-1 rounded-full bg-blue-500/90 text-white text-xs font-bold backdrop-blur-sm">
                            <Podcast className="w-3 h-3 inline mr-1" />
                            PODCAST
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6">
                      {/* Genre Badge */}
                      {show.genre && (
                        <div className="mb-3">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30">
                            {show.genre}
                          </span>
                        </div>
                      )}

                      {/* Show Info */}
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#00d9ff] transition-colors line-clamp-1">
                        {show.title || show.name}
                      </h3>

                      {show.host && (
                        <div className="text-white/70 mb-3 flex items-center gap-2">
                          <Mic className="w-4 h-4 text-[#00ffaa]" />
                          <span>with {show.host}</span>
                        </div>
                      )}

                      {show.description && (
                        <p className="text-white/60 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                          {show.description}
                        </p>
                      )}

                      {/* Schedule */}
                      {(show.schedule) && (
                        <div className="flex items-center gap-2 text-white/50 text-sm mb-4">
                          <Calendar className="w-4 h-4" />
                          <span>{typeof show.schedule === 'string' ? show.schedule : Array.isArray(show.schedule) ? show.schedule.map((s: any) => `${s.day} ${s.startTime}`).join(', ') : ''}</span>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm">
                        <div className="text-white/60">
                          {show.episodes?.length || 0} episode{show.episodes?.length !== 1 ? 's' : ''}
                        </div>
                        {(show.totalListeners || show.averageListeners) && (
                          <div className="flex items-center gap-1 text-[#00ffaa]">
                            <Users className="w-3.5 h-3.5" />
                            <span>{show.totalListeners || show.averageListeners}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-12 bg-white/10 backdrop-blur-sm border-white/20 text-center">
              <Radio className="w-16 h-16 mx-auto mb-4 text-white/30" />
              <p className="text-white/70 text-lg mb-2">
                {searchQuery || selectedGenre || selectedType
                  ? 'No shows found matching your criteria'
                  : 'No shows available yet'}
              </p>
              <p className="text-white/50 text-sm">
                {searchQuery || selectedGenre || selectedType
                  ? 'Try adjusting your search or filters'
                  : 'Check back soon for new content'}
              </p>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}