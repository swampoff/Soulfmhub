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
        <div className="text-white">Loading playlists...</div>
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
          <h1 className="text-3xl font-bold text-white mb-2">Playlist Management</h1>
          <p className="text-white/70">Create and manage playlists for Auto DJ • {playlists.length} playlists</p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628]"
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
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input
              type="text"
              placeholder="Search playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50"
            />
          </div>
        </Card>
      </motion.div>

      {/* Playlists Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredPlaylists.length === 0 ? (
          <div className="col-span-full text-center py-12 text-white/50">
            <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No playlists found</p>
            <p className="text-sm mt-2">Create your first playlist to get started</p>
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
                      <List className="w-20 h-20 text-[#00d9ff]/50" />
                    </div>
                  )}
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="icon"
                      className="w-16 h-16 rounded-full bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628]"
                    >
                      <Play className="w-6 h-6 ml-1" fill="currentColor" />
                    </Button>
                  </div>

                  {/* Public Badge */}
                  {playlist.isPublic && (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-green-500/80 text-white text-xs font-semibold backdrop-blur-sm">
                      Public
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-white font-bold text-lg mb-1 truncate">{playlist.name}</h3>
                  <p className="text-white/60 text-sm mb-3 line-clamp-2 min-h-[2.5rem]">
                    {playlist.description || 'No description'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-white/50 mb-4">
                    <div className="flex items-center gap-1">
                      <Music className="w-3.5 h-3.5" />
                      <span>{playlist.trackCount} tracks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDuration(playlist.duration)}</span>
                    </div>
                  </div>

                  {/* Genre Tag */}
                  {playlist.genre && (
                    <div className="mb-4">
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
                      className="flex-1 bg-white/5 text-white border-white/20 hover:bg-white/10"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeletePlaylist(playlist.id)}
                      className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#0a1628] rounded-xl border border-[#00d9ff]/30 shadow-2xl z-50"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Create New Playlist</h2>
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
                <div>
                  <Label htmlFor="name" className="text-white">Playlist Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-white/5 border-white/20 text-white"
                    placeholder="Sunday Soul Classics"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full h-24 px-3 py-2 rounded-md bg-white/5 border border-white/20 text-white placeholder:text-white/50 resize-none"
                    placeholder="Smooth soul grooves for a relaxing Sunday..."
                  />
                </div>

                <div>
                  <Label htmlFor="genre" className="text-white">Genre</Label>
                  <select
                    id="genre"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/20 text-white"
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
                  <Label htmlFor="isPublic" className="text-white cursor-pointer">
                    Make this playlist public
                  </Label>
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
                    disabled={creating}
                    className="flex-1 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628]"
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#0a1628] rounded-xl border border-[#00d9ff]/30 shadow-2xl z-50"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Edit Playlist</h2>
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
                <div>
                  <Label htmlFor="edit-name" className="text-white">Playlist Name *</Label>
                  <Input
                    id="edit-name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description" className="text-white">Description</Label>
                  <textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full h-24 px-3 py-2 rounded-md bg-white/5 border border-white/20 text-white placeholder:text-white/50 resize-none"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-genre" className="text-white">Genre</Label>
                  <select
                    id="edit-genre"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/20 text-white"
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
                  <Label htmlFor="edit-isPublic" className="text-white cursor-pointer">
                    Make this playlist public
                  </Label>
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
