import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { List, Plus, Search, Edit2, Trash2, X, Play, Music, Clock, Shuffle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { api } from '../../../lib/api';
import { toast } from 'sonner';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  genre?: string;
  trackCount: number;
  duration: number;
  coverUrl?: string;
  isPublic: boolean;
  createdAt: string;
  createdBy: string;
  tracks: string[];
}

export function PlaylistsManagement() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const response = await api.getPlaylists();
      setPlaylists(response.playlists || []);
    } catch (error) {
      console.error('Error loading playlists:', error);
      toast.error('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;

    try {
      await api.deletePlaylist(playlistId);
      setPlaylists(playlists.filter(p => p.id !== playlistId));
      toast.success('Playlist deleted successfully');
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Failed to delete playlist');
    }
  };

  const handleEditPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setIsEditModalOpen(true);
  };

  const filteredPlaylists = playlists.filter(playlist =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playlist.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-sm sm:text-base">Loading playlists...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 sm:gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-righteous text-white mb-1 sm:mb-2">Playlist Management</h1>
          <p className="text-white/70 text-sm sm:text-base">Create and manage playlists for Auto DJ • {playlists.length} playlists</p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628] w-full xs:w-auto flex-shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Playlist
        </Button>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input
              type="text"
              placeholder="Search playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50 text-sm sm:text-base"
            />
          </div>
        </Card>
      </motion.div>

      {/* Playlists Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
      >
        {filteredPlaylists.length === 0 ? (
          <div className="col-span-full text-center py-12 text-white/50">
            <List className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm sm:text-base">No playlists found</p>
            <p className="text-xs sm:text-sm mt-2">Create your first playlist to get started</p>
          </div>
        ) : (
          filteredPlaylists.map((playlist, index) => (
            <motion.div
              key={playlist.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden hover:border-[#00d9ff]/50 transition-all group">
                {/* Cover */}
                <div className="relative aspect-square bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 overflow-hidden">
                  {playlist.coverUrl ? (
                    <img
                      src={playlist.coverUrl}
                      alt={playlist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <List className="w-16 sm:w-20 h-16 sm:h-20 text-[#00d9ff]/50" />
                    </div>
                  )}
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="icon"
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628]"
                    >
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-1" fill="currentColor" />
                    </Button>
                  </div>

                  {/* Public Badge */}
                  {playlist.isPublic && (
                    <div className="absolute top-2 sm:top-3 right-2 sm:right-3 px-2 py-1 rounded-full bg-green-500/80 text-white text-xs font-semibold backdrop-blur-sm">
                      Public
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3 sm:p-4">
                  <h3 className="text-white font-bold text-base sm:text-lg mb-1 truncate">{playlist.name}</h3>
                  <p className="text-white/60 text-xs sm:text-sm mb-3 line-clamp-2 min-h-[2.5rem]">
                    {playlist.description || 'No description'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-white/50 mb-3 sm:mb-4">
                    <div className="flex items-center gap-1">
                      <Music className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                      <span>{playlist.trackCount} tracks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                      <span>{formatDuration(playlist.duration)}</span>
                    </div>
                  </div>

                  {/* Genre Tag */}
                  {playlist.genre && (
                    <div className="mb-3 sm:mb-4">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-[#00d9ff]/20 text-[#00d9ff]">
                        {playlist.genre}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditPlaylist(playlist)}
                      className="flex-1 bg-white/5 text-white border-white/20 hover:bg-white/10 text-xs sm:text-sm"
                    >
                      <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">Edit</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeletePlaylist(playlist.id)}
                      className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Create Modal */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadPlaylists();
          setIsCreateModalOpen(false);
        }}
      />

      {/* Edit Modal */}
      {selectedPlaylist && (
        <EditPlaylistModal
          isOpen={isEditModalOpen}
          playlist={selectedPlaylist}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedPlaylist(null);
          }}
          onSuccess={() => {
            loadPlaylists();
            setIsEditModalOpen(false);
            setSelectedPlaylist(null);
          }}
        />
      )}
    </div>
  );
}

// Create Modal Component
function CreatePlaylistModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    genre: '',
    isPublic: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      await api.createPlaylist(formData);
      toast.success('Playlist created successfully');
      onSuccess();
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Failed to create playlist');
    } finally {
      setCreating(false);
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full max-w-lg bg-[#0a1628] rounded-xl border border-[#00d9ff]/30 shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Create New Playlist</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onClose}
                  className="text-white/70 hover:text-white flex-shrink-0"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-white text-sm sm:text-base">Playlist Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-white/5 border-white/20 text-white text-sm sm:text-base"
                    placeholder="Sunday Soul Classics"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-white text-sm sm:text-base">Description</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full h-20 sm:h-24 px-3 py-2 rounded-md bg-white/5 border border-white/20 text-white placeholder:text-white/50 resize-none text-sm sm:text-base"
                    placeholder="Smooth soul grooves for a relaxing Sunday..."
                  />
                </div>

                <div>
                  <Label htmlFor="genre" className="text-white text-sm sm:text-base">Genre</Label>
                  <select
                    id="genre"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/20 text-white text-sm sm:text-base"
                  >
                    <option value="">All Genres</option>
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

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    className="w-4 h-4 rounded bg-white/5 border-white/20 text-[#00d9ff] focus:ring-[#00d9ff]"
                  />
                  <Label htmlFor="isPublic" className="text-white cursor-pointer text-sm sm:text-base">
                    Make this playlist public
                  </Label>
                </div>

                <div className="flex flex-col xs:flex-row gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 bg-white/5 text-white border-white/20 hover:bg-white/10 text-sm sm:text-base order-2 xs:order-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628] text-sm sm:text-base order-1 xs:order-2"
                  >
                    {creating ? 'Creating...' : 'Create Playlist'}
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
function EditPlaylistModal({ isOpen, playlist, onClose, onSuccess }: { isOpen: boolean; playlist: Playlist; onClose: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: playlist.name,
    description: playlist.description || '',
    genre: playlist.genre || '',
    isPublic: playlist.isPublic,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.updatePlaylist(playlist.id, formData);
      toast.success('Playlist updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error('Failed to update playlist');
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full max-w-lg bg-[#0a1628] rounded-xl border border-[#00d9ff]/30 shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Edit Playlist</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onClose}
                  className="text-white/70 hover:text-white flex-shrink-0"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name" className="text-white text-sm sm:text-base">Playlist Name *</Label>
                  <Input
                    id="edit-name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-white/5 border-white/20 text-white text-sm sm:text-base"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description" className="text-white text-sm sm:text-base">Description</Label>
                  <textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full h-20 sm:h-24 px-3 py-2 rounded-md bg-white/5 border border-white/20 text-white placeholder:text-white/50 resize-none text-sm sm:text-base"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-genre" className="text-white text-sm sm:text-base">Genre</Label>
                  <select
                    id="edit-genre"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/20 text-white text-sm sm:text-base"
                  >
                    <option value="">All Genres</option>
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

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-isPublic"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    className="w-4 h-4 rounded bg-white/5 border-white/20 text-[#00d9ff] focus:ring-[#00d9ff]"
                  />
                  <Label htmlFor="edit-isPublic" className="text-white cursor-pointer text-sm sm:text-base">
                    Make this playlist public
                  </Label>
                </div>

                <div className="flex flex-col xs:flex-row gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 bg-white/5 text-white border-white/20 hover:bg-white/10 text-sm sm:text-base order-2 xs:order-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628] text-sm sm:text-base order-1 xs:order-2"
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