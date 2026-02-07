import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { api } from '../../../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  ListMusic, 
  Plus, 
  Edit, 
  Trash2, 
  Music, 
  Loader2,
  Search,
  Calendar,
  MoreVertical
} from 'lucide-react';

interface Playlist {
  id: string;
  name: string;
  description: string;
  color: string;
  genre?: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
}

const PRESET_COLORS = [
  { value: '#00d9ff', label: 'Cyan' },
  { value: '#00ffaa', label: 'Mint' },
  { value: '#FF8C42', label: 'Orange' },
  { value: '#E91E63', label: 'Pink' },
  { value: '#9C27B0', label: 'Purple' },
  { value: '#2196F3', label: 'Blue' },
  { value: '#4CAF50', label: 'Green' },
  { value: '#FFEB3B', label: 'Yellow' },
];

export function PlaylistsManagement() {
  const { user } = useApp();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  
  const [newPlaylist, setNewPlaylist] = useState({
    name: '',
    description: '',
    color: '#00d9ff',
    genre: ''
  });

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const data = await api.getAllPlaylists();
      setPlaylists(data.playlists || []);
    } catch (error: any) {
      console.error('Error loading playlists:', error);
      toast.error('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylist.name.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    try {
      await api.createPlaylist(newPlaylist);
      toast.success('Playlist created successfully!');
      setIsCreateDialogOpen(false);
      setNewPlaylist({ name: '', description: '', color: '#00d9ff', genre: '' });
      loadPlaylists();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create playlist');
    }
  };

  const handleUpdatePlaylist = async () => {
    if (!selectedPlaylist) return;

    try {
      await api.updatePlaylist(selectedPlaylist.id, {
        name: selectedPlaylist.name,
        description: selectedPlaylist.description,
        color: selectedPlaylist.color,
        genre: selectedPlaylist.genre
      });
      toast.success('Playlist updated successfully!');
      setIsEditDialogOpen(false);
      setSelectedPlaylist(null);
      loadPlaylists();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update playlist');
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm('Are you sure you want to delete this playlist? This action cannot be undone.')) {
      return;
    }

    try {
      await api.deletePlaylist(playlistId);
      toast.success('Playlist deleted');
      loadPlaylists();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete playlist');
    }
  };

  const filteredPlaylists = playlists.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.genre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && playlists.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#00d9ff] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <ListMusic className="w-8 h-8 text-[#00d9ff]" />
          <div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
              Playlists Management
            </h2>
            <p className="text-white/70 text-sm">Create and manage your radio playlists</p>
          </div>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628]">
              <Plus className="w-4 h-4 mr-2" />
              New Playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0f1c2e] border-[#00d9ff]/30 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl text-white">Create New Playlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Playlist Name *</Label>
                <Input
                  id="name"
                  value={newPlaylist.name}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, name: e.target.value })}
                  placeholder="e.g., NuDisco, House, Deep House"
                  className="bg-[#0a1628] border-[#00d9ff]/30 text-white"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newPlaylist.description}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, description: e.target.value })}
                  placeholder="Brief description of this playlist"
                  className="bg-[#0a1628] border-[#00d9ff]/30 text-white"
                />
              </div>

              <div>
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  value={newPlaylist.genre}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, genre: e.target.value })}
                  placeholder="e.g., Funk, Soul, Disco"
                  className="bg-[#0a1628] border-[#00d9ff]/30 text-white"
                />
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <Select
                  value={newPlaylist.color}
                  onValueChange={(value) => setNewPlaylist({ ...newPlaylist, color: value })}
                >
                  <SelectTrigger className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: newPlaylist.color }}
                      />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                    {PRESET_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreatePlaylist}
                  className="flex-1 bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628]"
                >
                  Create Playlist
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="border-[#00d9ff]/30"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search playlists by name or genre..."
            className="pl-10 bg-[#0a1628] border-[#00d9ff]/30 text-white"
          />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#00d9ff]/20 rounded-lg">
              <ListMusic className="w-6 h-6 text-[#00d9ff]" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Total Playlists</p>
              <p className="text-2xl font-bold text-white">{playlists.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00ffaa]/30 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#00ffaa]/20 rounded-lg">
              <Music className="w-6 h-6 text-[#00ffaa]" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Total Tracks</p>
              <p className="text-2xl font-bold text-white">
                {playlists.reduce((sum, p) => sum + (p.trackIds?.length || 0), 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#FF8C42]/30 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#FF8C42]/20 rounded-lg">
              <Calendar className="w-6 h-6 text-[#FF8C42]" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Scheduled</p>
              <p className="text-2xl font-bold text-white">0</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Playlists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredPlaylists.map((playlist) => (
            <motion.div
              key={playlist.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6 hover:border-[#00d9ff]/60 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${playlist.color}20` }}
                    >
                      <Music className="w-6 h-6" style={{ color: playlist.color }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{playlist.name}</h3>
                      {playlist.genre && (
                        <Badge
                          variant="outline"
                          className="mt-1"
                          style={{ borderColor: `${playlist.color}40`, color: playlist.color }}
                        >
                          {playlist.genre}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedPlaylist(playlist);
                        setIsEditDialogOpen(true);
                      }}
                      className="hover:bg-[#00d9ff]/10"
                    >
                      <Edit className="w-4 h-4 text-[#00d9ff]" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeletePlaylist(playlist.id)}
                      className="hover:bg-[#FF8C42]/10"
                    >
                      <Trash2 className="w-4 h-4 text-[#FF8C42]" />
                    </Button>
                  </div>
                </div>

                {playlist.description && (
                  <p className="text-white/70 text-sm mb-4">{playlist.description}</p>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-white/50 text-sm">
                    {playlist.trackIds?.length || 0} tracks
                  </span>
                  <span className="text-white/50 text-xs">
                    {new Date(playlist.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredPlaylists.length === 0 && (
        <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-12 text-center">
          <ListMusic className="w-16 h-16 mx-auto mb-4 text-white/30" />
          <h3 className="text-xl font-semibold text-white mb-2">No Playlists Found</h3>
          <p className="text-white/70 mb-6">
            {searchQuery ? 'Try adjusting your search' : 'Create your first playlist to get started'}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Playlist
            </Button>
          )}
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[#0f1c2e] border-[#00d9ff]/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white">Edit Playlist</DialogTitle>
          </DialogHeader>
          {selectedPlaylist && (
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="edit-name">Playlist Name *</Label>
                <Input
                  id="edit-name"
                  value={selectedPlaylist.name}
                  onChange={(e) => setSelectedPlaylist({ ...selectedPlaylist, name: e.target.value })}
                  className="bg-[#0a1628] border-[#00d9ff]/30 text-white"
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={selectedPlaylist.description}
                  onChange={(e) => setSelectedPlaylist({ ...selectedPlaylist, description: e.target.value })}
                  className="bg-[#0a1628] border-[#00d9ff]/30 text-white"
                />
              </div>

              <div>
                <Label htmlFor="edit-genre">Genre</Label>
                <Input
                  id="edit-genre"
                  value={selectedPlaylist.genre || ''}
                  onChange={(e) => setSelectedPlaylist({ ...selectedPlaylist, genre: e.target.value })}
                  className="bg-[#0a1628] border-[#00d9ff]/30 text-white"
                />
              </div>

              <div>
                <Label htmlFor="edit-color">Color</Label>
                <Select
                  value={selectedPlaylist.color}
                  onValueChange={(value) => setSelectedPlaylist({ ...selectedPlaylist, color: value })}
                >
                  <SelectTrigger className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: selectedPlaylist.color }}
                      />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                    {PRESET_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleUpdatePlaylist}
                  className="flex-1 bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628]"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedPlaylist(null);
                  }}
                  className="border-[#00d9ff]/30"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
