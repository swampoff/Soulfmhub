import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Music, Search, Grid3x3, List, Play, Pause, Clock, Disc3, Filter, X } from 'lucide-react';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'motion/react';

const GENRE_COLORS: Record<string, string> = {
  disco: '#E91E63',
  soul: '#FF8C42',
  soulful: '#00BCD4',
  reggae: '#4CAF50',
  jazz: '#00CED1',
  'cafe jazz': '#607D8B',
  funk: '#FF5722',
  'new funk': '#00BCD4',
  latin: '#9C27B0',
  'latin house': '#9C27B0',
  'latin chill': '#9C27B0',
  afropop: '#FFC107',
  'afro house': '#FF9800',
  instrumental: '#4A90E2',
  experimental: '#8B008B',
  dance: '#E74C3C',
  dub: '#D2691E',
  dnb: '#FF5722',
  lounge: '#3498DB',
  'nu disco': '#9370DB',
  tropical: '#7FFF00',
  caribbean: '#00CED1',
};

interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre: string;
  duration: number;
  artwork?: string;
  file_path: string;
  created_at: string;
}

export function MusicLibraryPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'date'>('date');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadTracks();
  }, []);

  useEffect(() => {
    filterTracks();
  }, [tracks, searchQuery, selectedGenres, sortBy]);

  const loadTracks = async () => {
    setLoading(true);
    try {
      const { tracks: data } = await api.getTracks();
      setTracks(data || []);
      setFilteredTracks(data || []);
    } catch (error) {
      console.error('Error loading tracks:', error);
      setTracks([]);
      setFilteredTracks([]);
    } finally {
      setLoading(false);
    }
  };

  const filterTracks = () => {
    let filtered = [...tracks];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (track) =>
          track.title.toLowerCase().includes(query) ||
          track.artist.toLowerCase().includes(query) ||
          track.album?.toLowerCase().includes(query)
      );
    }

    // Genre filter
    if (selectedGenres.length > 0) {
      filtered = filtered.filter((track) =>
        selectedGenres.some((genre) => 
          track.genre.toLowerCase().includes(genre.toLowerCase())
        )
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
      if (sortBy === 'date') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });

    setFilteredTracks(filtered);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGenres([]);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGenreColor = (genre: string) => {
    const key = genre?.toLowerCase() || '';
    return GENRE_COLORS[key] || '#6B7280';
  };

  const availableGenres = Array.from(new Set(tracks.map((t) => t.genre))).sort();

  const handlePlayPause = (trackId: string) => {
    if (playingTrackId === trackId) {
      setPlayingTrackId(null);
      // Stop playback
    } else {
      setPlayingTrackId(trackId);
      // Start playback
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#00d9ff]/20 to-[#00ffaa]/20 border border-[#00d9ff]/30 mb-4">
                <Music className="w-4 h-4 text-[#00d9ff]" />
                <span className="text-[#00d9ff] font-semibold text-sm">MUSIC LIBRARY</span>
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent mb-2">
                Browse Our Collection
              </h1>
              <p className="text-white/70 text-lg">
                {filteredTracks.length} {filteredTracks.length === 1 ? 'track' : 'tracks'} available
              </p>
            </div>

            {/* View Controls */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className={
                  viewMode === 'grid'
                    ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628]'
                    : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                }
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
                className={
                  viewMode === 'list'
                    ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628]'
                    : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                }
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <Input
                type="text"
                placeholder="Search tracks, artists, albums..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#00d9ff]"
              />
            </div>

            {/* Filter Button */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`${
                showFilters || selectedGenres.length > 0
                  ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628]'
                  : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {selectedGenres.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                  {selectedGenres.length}
                </span>
              )}
            </Button>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:outline-none focus:border-[#00d9ff]"
            >
              <option value="date">Newest First</option>
              <option value="title">By Title</option>
              <option value="artist">By Artist</option>
            </select>

            {/* Clear Filters */}
            {(searchQuery || selectedGenres.length > 0) && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="bg-white/5 text-white border-white/20 hover:bg-white/10"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Genre Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#00d9ff]" />
                    Filter by Genre
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {availableGenres.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => toggleGenre(genre)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          selectedGenres.includes(genre)
                            ? 'text-white shadow-lg scale-105'
                            : 'text-white/70 hover:text-white opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: selectedGenres.includes(genre)
                            ? getGenreColor(genre)
                            : 'rgba(255,255,255,0.1)',
                        }}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Tracks */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card
                key={i}
                className="bg-white/10 backdrop-blur-sm border-white/20 p-4 animate-pulse"
              >
                <div className="aspect-square bg-white/5 rounded-lg mb-4" />
                <div className="h-4 bg-white/5 rounded mb-2" />
                <div className="h-3 bg-white/5 rounded w-2/3" />
              </Card>
            ))}
          </div>
        ) : filteredTracks.length === 0 ? (
          <Card className="p-12 bg-white/10 backdrop-blur-sm border-white/20 text-center">
            <Music className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <p className="text-white/70 text-lg mb-2">No tracks found</p>
            <p className="text-white/50 text-sm">Try adjusting your filters or search query</p>
          </Card>
        ) : viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTracks.map((track, index) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:border-[#00d9ff]/50 transition-all overflow-hidden group">
                  {/* Artwork */}
                  <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-white/5 to-white/10">
                    {track.artwork ? (
                      <img
                        src={track.artwork}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Disc3 className="w-20 h-20 text-white/20" />
                      </div>
                    )}
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handlePlayPause(track.id)}
                        className="w-16 h-16 rounded-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        {playingTrackId === track.id ? (
                          <Pause className="w-8 h-8 text-[#0a1628]" />
                        ) : (
                          <Play className="w-8 h-8 text-[#0a1628] ml-1" />
                        )}
                      </button>
                    </div>

                    {/* Genre Badge */}
                    <div
                      className="absolute top-2 right-2 px-3 py-1 rounded-full text-white text-xs font-bold"
                      style={{ backgroundColor: getGenreColor(track.genre) }}
                    >
                      {track.genre}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-white font-bold mb-1 line-clamp-1 group-hover:text-[#00d9ff] transition-colors">
                      {track.title}
                    </h3>
                    <p className="text-white/70 text-sm mb-2 line-clamp-1">{track.artist}</p>
                    {track.album && (
                      <p className="text-white/50 text-xs mb-2 line-clamp-1">{track.album}</p>
                    )}
                    <div className="flex items-center gap-2 text-white/50 text-xs">
                      <Clock className="w-3 h-3" />
                      {formatDuration(track.duration)}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          // List View
          <div className="space-y-2">
            {filteredTracks.map((track, index) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.01 }}
              >
                <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:border-[#00d9ff]/50 transition-all overflow-hidden group">
                  <div className="flex items-center gap-4 p-4">
                    {/* Play Button */}
                    <button
                      onClick={() => handlePlayPause(track.id)}
                      className="w-12 h-12 rounded-lg bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] flex items-center justify-center hover:scale-105 transition-transform flex-shrink-0"
                    >
                      {playingTrackId === track.id ? (
                        <Pause className="w-5 h-5 text-[#0a1628]" />
                      ) : (
                        <Play className="w-5 h-5 text-[#0a1628] ml-0.5" />
                      )}
                    </button>

                    {/* Artwork Thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                      {track.artwork ? (
                        <img
                          src={track.artwork}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Disc3 className="w-8 h-8 text-white/20" />
                        </div>
                      )}
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold mb-0.5 truncate group-hover:text-[#00d9ff] transition-colors">
                        {track.title}
                      </h3>
                      <p className="text-white/70 text-sm truncate">{track.artist}</p>
                      {track.album && (
                        <p className="text-white/50 text-xs truncate">{track.album}</p>
                      )}
                    </div>

                    {/* Genre */}
                    <div
                      className="px-4 py-2 rounded-full text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: getGenreColor(track.genre) }}
                    >
                      {track.genre}
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-2 text-white/50 text-sm flex-shrink-0 w-16">
                      <Clock className="w-4 h-4" />
                      {formatDuration(track.duration)}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}