import React, { useState, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import {
  Music,
  Play,
  Pause,
  GripVertical,
  Trash2,
  Search,
  Shuffle,
  ListMusic,
  Radio,
  Clock,
  Filter,
  Download,
  Share2
} from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  duration: number;
  tags?: string[];
  coverUrl?: string;
  audioUrl?: string;
  streamUrl?: string;
  shortId?: string;
  playCount?: number;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
}

export function LiveStreamPlaylist() {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [orderedTracks, setOrderedTracks] = useState<Track[]>([]);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const genres = ['all', 'soul', 'funk', 'jazz', 'disco', 'reggae', 'blues', 'r&b', 'afrobeat'];

  useEffect(() => {
    loadPlaylist();
    loadAllTracks();
  }, []);

  useEffect(() => {
    if (playlist && allTracks.length > 0) {
      const ordered = playlist.trackIds
        .map(id => allTracks.find(t => t.id === id))
        .filter(Boolean) as Track[];
      setOrderedTracks(ordered);
    }
  }, [playlist, allTracks]);

  const loadPlaylist = async () => {
    try {
      const response = await api.getPlaylist('livestream');
      if (response.playlist) {
        setPlaylist(response.playlist);
      } else {
        // Create Live Stream playlist if it doesn't exist
        const newPlaylist = await api.createPlaylist({
          id: 'livestream',
          name: 'Live Stream',
          description: 'Main broadcast playlist',
          trackIds: []
        });
        setPlaylist(newPlaylist.playlist);
      }
    } catch (error) {
      console.error('Error loading playlist:', error);
      toast.error('Failed to load Live Stream playlist');
    }
  };

  const loadAllTracks = async () => {
    try {
      setLoading(true);
      const response = await api.getTracks();
      setAllTracks(response.tracks || []);
      setTracks(response.tracks || []);
    } catch (error) {
      console.error('Error loading tracks:', error);
      toast.error('Failed to load tracks');
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (newOrder: Track[]) => {
    setOrderedTracks(newOrder);
    
    if (!playlist) return;

    try {
      const newTrackIds = newOrder.map(t => t.id);
      await api.updatePlaylist(playlist.id, {
        ...playlist,
        trackIds: newTrackIds
      });
      setPlaylist({ ...playlist, trackIds: newTrackIds });
      toast.success('Playlist order updated');
    } catch (error) {
      console.error('Error updating playlist order:', error);
      toast.error('Failed to update playlist order');
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!playlist) return;
    if (!confirm('Remove this track from the Live Stream playlist?')) return;

    try {
      const newTrackIds = playlist.trackIds.filter(id => id !== trackId);
      await api.updatePlaylist(playlist.id, {
        ...playlist,
        trackIds: newTrackIds
      });
      setPlaylist({ ...playlist, trackIds: newTrackIds });
      toast.success('Track removed from playlist');
    } catch (error) {
      console.error('Error removing track:', error);
      toast.error('Failed to remove track');
    }
  };

  const handleAddTrack = async (trackId: string) => {
    if (!playlist) return;

    try {
      const newTrackIds = [...playlist.trackIds, trackId];
      await api.updatePlaylist(playlist.id, {
        ...playlist,
        trackIds: newTrackIds
      });
      setPlaylist({ ...playlist, trackIds: newTrackIds });
      toast.success('Track added to playlist');
    } catch (error) {
      console.error('Error adding track:', error);
      toast.error('Failed to add track');
    }
  };

  const handleShuffle = async () => {
    if (!playlist) return;
    if (!confirm('Shuffle the entire Live Stream playlist?')) return;

    try {
      const shuffled = [...playlist.trackIds].sort(() => Math.random() - 0.5);
      await api.updatePlaylist(playlist.id, {
        ...playlist,
        trackIds: shuffled
      });
      setPlaylist({ ...playlist, trackIds: shuffled });
      toast.success('Playlist shuffled');
    } catch (error) {
      console.error('Error shuffling playlist:', error);
      toast.error('Failed to shuffle playlist');
    }
  };

  const filteredTracks = allTracks.filter(track => {
    if (playlist?.trackIds.includes(track.id)) return false;

    const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         track.album?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGenre = selectedGenre === 'all' || track.genre?.toLowerCase() === selectedGenre;
    const matchesTag = !filterTag || track.tags?.includes(filterTag);
    
    return matchesSearch && matchesGenre && matchesTag;
  });

  const totalDuration = orderedTracks.reduce((sum, track) => sum + (track.duration || 0), 0);
  const formatTotalDuration = () => {
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Loading playlist...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] rounded-xl">
            <Radio className="w-8 h-8 text-[#0a1628]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-family-display)' }}>
              Live Stream Playlist
            </h1>
            <p className="text-white/70">
              {orderedTracks.length} tracks • {formatTotalDuration()} total duration
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleShuffle}
            variant="outline"
            className="border-[#00d9ff]/30 text-[#00d9ff] hover:bg-[#00d9ff]/10"
          >
            <Shuffle className="w-4 h-4 mr-2" />
            Shuffle
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Playlist */}
        <div className="lg:col-span-2">
          <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Current Queue</h2>
              <Badge variant="outline" className="border-[#00ffaa]/30 text-[#00ffaa]">
                {orderedTracks.length} tracks
              </Badge>
            </div>

            {orderedTracks.length === 0 ? (
              <div className="text-center py-12 text-white/50">
                <ListMusic className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>No tracks in the Live Stream playlist</p>
                <p className="text-sm mt-2">Add tracks from the library below</p>
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={orderedTracks}
                onReorder={handleReorder}
                className="space-y-2"
              >
                <AnimatePresence>
                  {orderedTracks.map((track, index) => (
                    <Reorder.Item
                      key={track.id}
                      value={track}
                      className="group"
                    >
                      <motion.div
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 p-3 bg-[#0a1628]/50 rounded-lg border border-white/5 hover:border-[#00d9ff]/30 transition-colors cursor-move"
                      >
                        <GripVertical className="w-4 h-4 text-white/30 group-hover:text-white/50 flex-shrink-0" />
                        
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-8 h-8 rounded bg-[#00d9ff]/10 text-[#00d9ff] text-sm font-semibold flex-shrink-0">
                            {index + 1}
                          </div>
                          
                          {track.coverUrl ? (
                            <img
                              src={track.coverUrl}
                              alt={track.title}
                              className="w-10 h-10 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center flex-shrink-0">
                              <Music className="w-5 h-5 text-[#00d9ff]" />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white truncate">{track.title}</h3>
                            <p className="text-sm text-white/70 truncate">{track.artist}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {track.tags?.includes('NEWFUNK') && (
                            <Badge variant="outline" className="border-[#00ffaa]/30 text-[#00ffaa] text-xs">
                              NEWFUNK
                            </Badge>
                          )}
                          
                          <span className="text-xs text-white/50 font-mono w-12 text-right">
                            {formatDuration(track.duration || 0)}
                          </span>
                          
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveTrack(track.id)}
                            className="w-8 h-8 text-[#FF8C42] hover:bg-[#FF8C42]/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            )}
          </Card>
        </div>

        {/* Add Tracks Panel */}
        <div>
          <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6 sticky top-4">
            <h2 className="text-xl font-bold text-white mb-4">Add Tracks</h2>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <Input
                  type="text"
                  placeholder="Search library..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="mb-4 space-y-2">
              <div className="flex gap-2 flex-wrap">
                {genres.slice(0, 4).map((genre) => (
                  <Button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    variant={selectedGenre === genre ? 'default' : 'outline'}
                    size="sm"
                    className={selectedGenre === genre 
                      ? 'bg-[#00d9ff] text-[#0a1628] hover:bg-[#00b8dd]' 
                      : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                    }
                  >
                    {genre === 'all' ? 'All' : genre.charAt(0).toUpperCase() + genre.slice(1)}
                  </Button>
                ))}
              </div>
              
              <Button
                onClick={() => setFilterTag(filterTag === 'NEWFUNK' ? null : 'NEWFUNK')}
                variant={filterTag === 'NEWFUNK' ? 'default' : 'outline'}
                size="sm"
                className={filterTag === 'NEWFUNK'
                  ? 'bg-[#00ffaa] text-[#0a1628] hover:bg-[#00dd99] w-full'
                  : 'bg-white/5 text-white border-white/20 hover:bg-white/10 w-full'
                }
              >
                <Filter className="w-3 h-3 mr-2" />
                NEWFUNK Only
              </Button>
            </div>

            {/* Available Tracks */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {filteredTracks.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  <p className="text-sm">No tracks found</p>
                </div>
              ) : (
                filteredTracks.map((track) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 p-2 bg-[#0a1628]/30 rounded border border-white/5 hover:border-[#00d9ff]/30 transition-colors group"
                  >
                    {track.coverUrl ? (
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center flex-shrink-0">
                        <Music className="w-4 h-4 text-[#00d9ff]" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate">{track.title}</h4>
                      <p className="text-xs text-white/70 truncate">{track.artist}</p>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => handleAddTrack(track.id)}
                      className="bg-[#00d9ff]/10 hover:bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
