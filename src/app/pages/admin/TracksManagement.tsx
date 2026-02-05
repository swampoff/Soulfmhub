import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Plus, Search, Upload, Edit2, Trash2, Play, Pause, X, Filter, Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { api } from '../../../lib/api';
import { toast } from 'sonner';

interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre: string;
  duration: number;
  fileUrl: string;
  coverUrl?: string;
  year?: number;
  bpm?: number;
  uploadedAt: string;
  uploadedBy: string;
}

export function TracksManagement() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const genres = ['all', 'soul', 'funk', 'jazz', 'disco', 'reggae', 'blues', 'r&b', 'afrobeat'];

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    try {
      setLoading(true);
      const response = await api.getTracks();
      setTracks(response.tracks || []);
    } catch (error) {
      console.error('Error loading tracks:', error);
      toast.error('Failed to load tracks');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Are you sure you want to delete this track?')) return;

    try {
      await api.deleteTrack(trackId);
      setTracks(tracks.filter(t => t.id !== trackId));
      toast.success('Track deleted successfully');
    } catch (error) {
      console.error('Error deleting track:', error);
      toast.error('Failed to delete track');
    }
  };

  const handleEditTrack = (track: Track) => {
    setSelectedTrack(track);
    setIsEditModalOpen(true);
  };

  const filteredTracks = tracks.filter(track => {
    const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         track.album?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'all' || track.genre.toLowerCase() === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading tracks...</div>
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
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Track Management</h1>
          <p className="text-white/70">Manage your music library • {tracks.length} tracks total</p>
        </div>
        <Button
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Upload Track
        </Button>
      </motion.div>

      {/* Search and Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <Input
                type="text"
                placeholder="Search tracks, artists, albums..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            {/* Genre Filter */}
            <div className="flex gap-2 overflow-x-auto">
              {genres.map((genre) => (
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
                  {genre.charAt(0).toUpperCase() + genre.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4 pt-4 border-t border-white/10 text-sm">
            <div className="text-white/70">
              Showing: <span className="text-white font-semibold">{filteredTracks.length}</span> tracks
            </div>
            <div className="text-white/70">
              Total duration: <span className="text-white font-semibold">
                {Math.floor(tracks.reduce((acc, t) => acc + t.duration, 0) / 3600)}h {Math.floor((tracks.reduce((acc, t) => acc + t.duration, 0) % 3600) / 60)}m
              </span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Tracks Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left text-white/70 text-sm font-semibold p-4 w-12">#</th>
                  <th className="text-left text-white/70 text-sm font-semibold p-4">Title</th>
                  <th className="text-left text-white/70 text-sm font-semibold p-4">Artist</th>
                  <th className="text-left text-white/70 text-sm font-semibold p-4">Album</th>
                  <th className="text-left text-white/70 text-sm font-semibold p-4">Genre</th>
                  <th className="text-left text-white/70 text-sm font-semibold p-4">Duration</th>
                  <th className="text-left text-white/70 text-sm font-semibold p-4 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTracks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-white/50">
                      <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No tracks found</p>
                      <p className="text-sm mt-2">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredTracks.map((track, index) => (
                    <motion.tr
                      key={track.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                    >
                      <td className="p-4">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-8 h-8 text-[#00d9ff] hover:bg-[#00d9ff]/10"
                          onClick={() => setPlayingTrackId(playingTrackId === track.id ? null : track.id)}
                        >
                          {playingTrackId === track.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {track.coverUrl ? (
                            <img
                              src={track.coverUrl}
                              alt={track.title}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center">
                              <Music className="w-5 h-5 text-[#00d9ff]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-white font-semibold truncate">{track.title}</div>
                            {track.year && (
                              <div className="text-white/50 text-xs">{track.year}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-white/80">{track.artist}</td>
                      <td className="p-4 text-white/70">{track.album || '-'}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-[#00d9ff]/20 text-[#00d9ff]">
                          {track.genre}
                        </span>
                      </td>
                      <td className="p-4 text-white/70 font-mono text-sm">
                        {formatDuration(track.duration)}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-8 h-8 text-blue-400 hover:bg-blue-400/10"
                            onClick={() => handleEditTrack(track)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-8 h-8 text-red-400 hover:bg-red-400/10"
                            onClick={() => handleDeleteTrack(track.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Upload Modal */}
      <UploadTrackModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          loadTracks();
          setIsUploadModalOpen(false);
        }}
      />

      {/* Edit Modal */}
      {selectedTrack && (
        <EditTrackModal
          isOpen={isEditModalOpen}
          track={selectedTrack}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTrack(null);
          }}
          onSuccess={() => {
            loadTracks();
            setIsEditModalOpen(false);
            setSelectedTrack(null);
          }}
        />
      )}
    </div>
  );
}

// Upload Modal Component
function UploadTrackModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    album: '',
    genre: 'soul',
    year: '',
    bpm: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      await api.createTrack({
        ...formData,
        year: formData.year ? parseInt(formData.year) : undefined,
        bpm: formData.bpm ? parseInt(formData.bpm) : undefined,
        duration: 0, // TODO: Get from file
        fileUrl: '', // TODO: Upload file
      });

      toast.success('Track uploaded successfully');
      onSuccess();
    } catch (error) {
      console.error('Error uploading track:', error);
      toast.error('Failed to upload track');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[#0a1628] rounded-xl border border-[#00d9ff]/30 shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Upload New Track</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onClose}
                  className="text-white/70 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* File Upload */}
                <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-[#00d9ff]/50 transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-[#00d9ff]" />
                  <p className="text-white mb-2">Drop audio file here or click to browse</p>
                  <p className="text-white/50 text-sm">Supports MP3, WAV, FLAC up to 50MB</p>
                  <input type="file" accept="audio/*" className="hidden" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title" className="text-white">Title *</Label>
                    <Input
                      id="title"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="artist" className="text-white">Artist *</Label>
                    <Input
                      id="artist"
                      required
                      value={formData.artist}
                      onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="album" className="text-white">Album</Label>
                    <Input
                      id="album"
                      value={formData.album}
                      onChange={(e) => setFormData({ ...formData, album: e.target.value })}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="genre" className="text-white">Genre *</Label>
                    <select
                      id="genre"
                      required
                      value={formData.genre}
                      onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                      className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/20 text-white"
                    >
                      <option value="soul">Soul</option>
                      <option value="funk">Funk</option>
                      <option value="jazz">Jazz</option>
                      <option value="disco">Disco</option>
                      <option value="reggae">Reggae</option>
                      <option value="blues">Blues</option>
                      <option value="r&b">R&B</option>
                      <option value="afrobeat">Afrobeat</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="year" className="text-white">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="bg-white/5 border-white/20 text-white"
                      placeholder="1970"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bpm" className="text-white">BPM</Label>
                    <Input
                      id="bpm"
                      type="number"
                      value={formData.bpm}
                      onChange={(e) => setFormData({ ...formData, bpm: e.target.value })}
                      className="bg-white/5 border-white/20 text-white"
                      placeholder="120"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 bg-white/5 text-white border-white/20 hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628]"
                  >
                    {uploading ? 'Uploading...' : 'Upload Track'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Edit Modal Component
function EditTrackModal({ isOpen, track, onClose, onSuccess }: { isOpen: boolean; track: Track; onClose: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: track.title,
    artist: track.artist,
    album: track.album || '',
    genre: track.genre,
    year: track.year?.toString() || '',
    bpm: track.bpm?.toString() || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.updateTrack(track.id, {
        ...formData,
        year: formData.year ? parseInt(formData.year) : undefined,
        bpm: formData.bpm ? parseInt(formData.bpm) : undefined,
      });

      toast.success('Track updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error updating track:', error);
      toast.error('Failed to update track');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[#0a1628] rounded-xl border border-[#00d9ff]/30 shadow-2xl z-50"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Edit Track</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onClose}
                  className="text-white/70 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-title" className="text-white">Title *</Label>
                    <Input
                      id="edit-title"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-artist" className="text-white">Artist *</Label>
                    <Input
                      id="edit-artist"
                      required
                      value={formData.artist}
                      onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-album" className="text-white">Album</Label>
                    <Input
                      id="edit-album"
                      value={formData.album}
                      onChange={(e) => setFormData({ ...formData, album: e.target.value })}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-genre" className="text-white">Genre *</Label>
                    <select
                      id="edit-genre"
                      required
                      value={formData.genre}
                      onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                      className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/20 text-white"
                    >
                      <option value="soul">Soul</option>
                      <option value="funk">Funk</option>
                      <option value="jazz">Jazz</option>
                      <option value="disco">Disco</option>
                      <option value="reggae">Reggae</option>
                      <option value="blues">Blues</option>
                      <option value="r&b">R&B</option>
                      <option value="afrobeat">Afrobeat</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-year" className="text-white">Year</Label>
                    <Input
                      id="edit-year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-bpm" className="text-white">BPM</Label>
                    <Input
                      id="edit-bpm"
                      type="number"
                      value={formData.bpm}
                      onChange={(e) => setFormData({ ...formData, bpm: e.target.value })}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 bg-white/5 text-white border-white/20 hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628]"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
