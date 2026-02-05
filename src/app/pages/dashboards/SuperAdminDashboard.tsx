import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { api } from '../../../lib/api';
import { motion } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { 
  Music, 
  ListMusic, 
  Upload, 
  Plus, 
  Trash2, 
  Edit, 
  Users,
  Radio,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Crown,
  UserCog
} from 'lucide-react';
import { AnimatedPalm } from '../../components/AnimatedPalm';
import { UsersManagement } from './UsersManagement';
import { TrackUpload } from './TrackUpload';
import { useNavigate } from 'react-router';

export function SuperAdminDashboard() {
  const { user, signOut } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [tracks, setTracks] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Track Form State
  const [trackForm, setTrackForm] = useState({
    title: '',
    artist: '',
    album: '',
    genre: '',
    duration: '',
    year: '',
    bpm: '',
    coverUrl: '',
    audioUrl: '',
    tags: ''
  });

  // Playlist Form State
  const [playlistForm, setPlaylistForm] = useState({
    name: '',
    description: '',
    genre: '',
    coverUrl: '',
    trackIds: [] as string[]
  });

  const [isTrackDialogOpen, setIsTrackDialogOpen] = useState(false);
  const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<any>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<any>(null);

  useEffect(() => {
    loadTracks();
    loadPlaylists();
  }, []);

  const loadTracks = async () => {
    try {
      const data = await api.getTracks();
      setTracks(data.tracks || []);
    } catch (error) {
      console.error('Error loading tracks:', error);
    }
  };

  const loadPlaylists = async () => {
    try {
      const data = await api.getPlaylists();
      setPlaylists(data.playlists || []);
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  };

  const handleCreateTrack = async () => {
    setLoading(true);
    try {
      const trackData = {
        ...trackForm,
        duration: parseInt(trackForm.duration) || 0,
        year: parseInt(trackForm.year) || new Date().getFullYear(),
        bpm: parseInt(trackForm.bpm) || 0,
        tags: trackForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      if (editingTrack) {
        await api.updateTrack(editingTrack.id, trackData);
        toast.success('Track updated!');
      } else {
        await api.createTrack(trackData);
        toast.success('Track added!');
      }

      setIsTrackDialogOpen(false);
      resetTrackForm();
      loadTracks();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save track');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    setLoading(true);
    try {
      if (editingPlaylist) {
        await api.updatePlaylist(editingPlaylist.id, playlistForm);
        toast.success('Playlist updated!');
      } else {
        await api.createPlaylist(playlistForm);
        toast.success('Playlist created!');
      }

      setIsPlaylistDialogOpen(false);
      resetPlaylistForm();
      loadPlaylists();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrack = async (id: string) => {
    if (!confirm('Are you sure you want to delete this track?')) return;
    
    try {
      await api.deleteTrack(id);
      toast.success('Track deleted');
      loadTracks();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete track');
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    
    try {
      await api.deletePlaylist(id);
      toast.success('Playlist deleted');
      loadPlaylists();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete playlist');
    }
  };

  const handleEditTrack = (track: any) => {
    setEditingTrack(track);
    setTrackForm({
      title: track.title || '',
      artist: track.artist || '',
      album: track.album || '',
      genre: track.genre || '',
      duration: track.duration?.toString() || '',
      year: track.year?.toString() || '',
      bpm: track.bpm?.toString() || '',
      coverUrl: track.coverUrl || '',
      audioUrl: track.audioUrl || '',
      tags: track.tags?.join(', ') || ''
    });
    setIsTrackDialogOpen(true);
  };

  const handleEditPlaylist = (playlist: any) => {
    setEditingPlaylist(playlist);
    setPlaylistForm({
      name: playlist.name || '',
      description: playlist.description || '',
      genre: playlist.genre || '',
      coverUrl: playlist.coverUrl || '',
      trackIds: playlist.trackIds || []
    });
    setIsPlaylistDialogOpen(true);
  };

  const resetTrackForm = () => {
    setTrackForm({
      title: '',
      artist: '',
      album: '',
      genre: '',
      duration: '',
      year: '',
      bpm: '',
      coverUrl: '',
      audioUrl: '',
      tags: ''
    });
    setEditingTrack(null);
  };

  const resetPlaylistForm = () => {
    setPlaylistForm({
      name: '',
      description: '',
      genre: '',
      coverUrl: '',
      trackIds: []
    });
    setEditingPlaylist(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    toast.success('Signed out successfully');
  };

  const toggleTrackInPlaylist = (trackId: string) => {
    setPlaylistForm(prev => ({
      ...prev,
      trackIds: prev.trackIds.includes(trackId)
        ? prev.trackIds.filter(id => id !== trackId)
        : [...prev.trackIds, trackId]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] relative overflow-hidden">
      {/* Animated Palms */}
      <AnimatedPalm side="left" delay={0.2} />
      <AnimatedPalm side="right" delay={0.4} />

      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-[#00d9ff] rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-[#00ffaa] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-[#FF8C42] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Crown className="w-8 h-8 text-[#FF8C42]" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-family-display)' }}>
                  Super Admin Dashboard
                </h1>
              </div>
              <p className="text-white/70">Welcome back, <span className="text-[#00d9ff] font-semibold">{user?.name}</span></p>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="border-[#FF8C42]/30 text-[#FF8C42] hover:bg-[#FF8C42]/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#00d9ff]/10 rounded-xl">
                <Music className="w-6 h-6 text-[#00d9ff]" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Total Tracks</p>
                <p className="text-2xl font-bold text-white">{tracks.length}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00ffaa]/30 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#00ffaa]/10 rounded-xl">
                <ListMusic className="w-6 h-6 text-[#00ffaa]" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Playlists</p>
                <p className="text-2xl font-bold text-white">{playlists.length}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#FF8C42]/30 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#FF8C42]/10 rounded-xl">
                <Users className="w-6 h-6 text-[#FF8C42]" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Active Users</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
            </div>
          </Card>

          <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#00d9ff]/10 rounded-xl">
                <Radio className="w-6 h-6 text-[#00d9ff]" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Stream Status</p>
                <p className="text-2xl font-bold text-white">Online</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Main Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-[#0f1c2e]/90 backdrop-blur-sm border border-[#00d9ff]/30 mb-6">
              <TabsTrigger value="overview" className="data-[state=active]:bg-[#00d9ff] data-[state=active]:text-[#0a1628]">
                <BarChart3 className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="upload" className="data-[state=active]:bg-[#00d9ff] data-[state=active]:text-[#0a1628]">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="tracks" className="data-[state=active]:bg-[#00d9ff] data-[state=active]:text-[#0a1628]">
                <Music className="w-4 h-4 mr-2" />
                Tracks
              </TabsTrigger>
              <TabsTrigger value="playlists" className="data-[state=active]:bg-[#00d9ff] data-[state=active]:text-[#0a1628]">
                <ListMusic className="w-4 h-4 mr-2" />
                Playlists
              </TabsTrigger>
              <TabsTrigger value="schedule" className="data-[state=active]:bg-[#00d9ff] data-[state=active]:text-[#0a1628]">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-[#00d9ff] data-[state=active]:text-[#0a1628]">
                <UserCog className="w-4 h-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-[#00d9ff] data-[state=active]:text-[#0a1628]">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button
                    onClick={() => {
                      resetTrackForm();
                      setIsTrackDialogOpen(true);
                    }}
                    className="bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628] justify-start h-auto py-6"
                  >
                    <Upload className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold">Upload Track</div>
                      <div className="text-xs opacity-80">Add new music to library</div>
                    </div>
                  </Button>

                  <Button
                    onClick={() => {
                      resetPlaylistForm();
                      setIsPlaylistDialogOpen(true);
                    }}
                    className="bg-[#00ffaa] hover:bg-[#00dd99] text-[#0a1628] justify-start h-auto py-6"
                  >
                    <Plus className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold">Create Playlist</div>
                      <div className="text-xs opacity-80">New curated collection</div>
                    </div>
                  </Button>

                  <Button
                    onClick={() => navigate('/admin/schedule')}
                    className="bg-[#FF8C42] hover:bg-[#ff7a2e] text-white justify-start h-auto py-6"
                  >
                    <Calendar className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold">Manage Schedule</div>
                      <div className="text-xs opacity-80">Plan your programming</div>
                    </div>
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Upload Tab */}
            <TabsContent value="upload">
              <TrackUpload />
            </TabsContent>

            {/* Tracks Tab */}
            <TabsContent value="tracks">
              <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Music Library</h2>
                  <Dialog open={isTrackDialogOpen} onOpenChange={setIsTrackDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => resetTrackForm()}
                        className="bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628]"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Track
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0f1c2e] border-[#00d9ff]/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent">
                          {editingTrack ? 'Edit Track' : 'Upload New Track'}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Title *</Label>
                            <Input
                              value={trackForm.title}
                              onChange={(e) => setTrackForm({ ...trackForm, title: e.target.value })}
                              placeholder="Track title"
                              className="bg-[#0a1628] border-[#00d9ff]/30"
                            />
                          </div>
                          <div>
                            <Label>Artist *</Label>
                            <Input
                              value={trackForm.artist}
                              onChange={(e) => setTrackForm({ ...trackForm, artist: e.target.value })}
                              placeholder="Artist name"
                              className="bg-[#0a1628] border-[#00d9ff]/30"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Album</Label>
                            <Input
                              value={trackForm.album}
                              onChange={(e) => setTrackForm({ ...trackForm, album: e.target.value })}
                              placeholder="Album name"
                              className="bg-[#0a1628] border-[#00d9ff]/30"
                            />
                          </div>
                          <div>
                            <Label>Genre</Label>
                            <Select
                              value={trackForm.genre}
                              onValueChange={(value) => setTrackForm({ ...trackForm, genre: value })}
                            >
                              <SelectTrigger className="bg-[#0a1628] border-[#00d9ff]/30">
                                <SelectValue placeholder="Select genre" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#0a1628] border-[#00d9ff]/30">
                                <SelectItem value="Soul">Soul</SelectItem>
                                <SelectItem value="Funk">Funk</SelectItem>
                                <SelectItem value="Jazz">Jazz</SelectItem>
                                <SelectItem value="Disco">Disco</SelectItem>
                                <SelectItem value="Reggae">Reggae</SelectItem>
                                <SelectItem value="R&B">R&B</SelectItem>
                                <SelectItem value="Hip-Hop">Hip-Hop</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Duration (seconds)</Label>
                            <Input
                              type="number"
                              value={trackForm.duration}
                              onChange={(e) => setTrackForm({ ...trackForm, duration: e.target.value })}
                              placeholder="180"
                              className="bg-[#0a1628] border-[#00d9ff]/30"
                            />
                          </div>
                          <div>
                            <Label>Year</Label>
                            <Input
                              type="number"
                              value={trackForm.year}
                              onChange={(e) => setTrackForm({ ...trackForm, year: e.target.value })}
                              placeholder="2024"
                              className="bg-[#0a1628] border-[#00d9ff]/30"
                            />
                          </div>
                          <div>
                            <Label>BPM</Label>
                            <Input
                              type="number"
                              value={trackForm.bpm}
                              onChange={(e) => setTrackForm({ ...trackForm, bpm: e.target.value })}
                              placeholder="120"
                              className="bg-[#0a1628] border-[#00d9ff]/30"
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Cover Image URL</Label>
                          <Input
                            value={trackForm.coverUrl}
                            onChange={(e) => setTrackForm({ ...trackForm, coverUrl: e.target.value })}
                            placeholder="https://..."
                            className="bg-[#0a1628] border-[#00d9ff]/30"
                          />
                        </div>

                        <div>
                          <Label>Audio File URL *</Label>
                          <Input
                            value={trackForm.audioUrl}
                            onChange={(e) => setTrackForm({ ...trackForm, audioUrl: e.target.value })}
                            placeholder="https://..."
                            className="bg-[#0a1628] border-[#00d9ff]/30"
                          />
                          <p className="text-xs text-white/50 mt-1">
                            Upload your audio file to Supabase Storage and paste the URL here
                          </p>
                        </div>

                        <div>
                          <Label>Tags (comma-separated)</Label>
                          <Input
                            value={trackForm.tags}
                            onChange={(e) => setTrackForm({ ...trackForm, tags: e.target.value })}
                            placeholder="groovy, upbeat, classic"
                            className="bg-[#0a1628] border-[#00d9ff]/30"
                          />
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button
                            onClick={handleCreateTrack}
                            disabled={loading || !trackForm.title || !trackForm.artist || !trackForm.audioUrl}
                            className="flex-1 bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628]"
                          >
                            {loading ? 'Saving...' : editingTrack ? 'Update Track' : 'Add Track'}
                          </Button>
                          <Button
                            onClick={() => {
                              setIsTrackDialogOpen(false);
                              resetTrackForm();
                            }}
                            variant="outline"
                            className="border-[#00d9ff]/30"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Tracks List */}
                <div className="space-y-3">
                  {tracks.length === 0 ? (
                    <div className="text-center py-12 text-white/50">
                      <Music className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>No tracks uploaded yet. Start building your library!</p>
                    </div>
                  ) : (
                    tracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center gap-4 p-4 bg-[#0a1628]/50 rounded-lg border border-white/5 hover:border-[#00d9ff]/30 transition-colors"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] rounded-lg flex items-center justify-center">
                          <Music className="w-6 h-6 text-[#0a1628]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{track.title}</h3>
                          <p className="text-sm text-white/70 truncate">{track.artist}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {track.genre && (
                            <Badge variant="outline" className="border-[#00d9ff]/30 text-[#00d9ff]">
                              {track.genre}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditTrack(track)}
                            className="text-[#00ffaa] hover:bg-[#00ffaa]/10"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteTrack(track.id)}
                            className="text-[#FF8C42] hover:bg-[#FF8C42]/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* Playlists Tab */}
            <TabsContent value="playlists">
              <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Playlists</h2>
                  <Dialog open={isPlaylistDialogOpen} onOpenChange={setIsPlaylistDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => resetPlaylistForm()}
                        className="bg-[#00ffaa] hover:bg-[#00dd99] text-[#0a1628]"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Playlist
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0f1c2e] border-[#00d9ff]/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent">
                          {editingPlaylist ? 'Edit Playlist' : 'Create New Playlist'}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label>Playlist Name *</Label>
                          <Input
                            value={playlistForm.name}
                            onChange={(e) => setPlaylistForm({ ...playlistForm, name: e.target.value })}
                            placeholder="e.g., Morning Grooves"
                            className="bg-[#0a1628] border-[#00d9ff]/30"
                          />
                        </div>

                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={playlistForm.description}
                            onChange={(e) => setPlaylistForm({ ...playlistForm, description: e.target.value })}
                            placeholder="Describe your playlist..."
                            className="bg-[#0a1628] border-[#00d9ff]/30"
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Genre</Label>
                            <Select
                              value={playlistForm.genre}
                              onValueChange={(value) => setPlaylistForm({ ...playlistForm, genre: value })}
                            >
                              <SelectTrigger className="bg-[#0a1628] border-[#00d9ff]/30">
                                <SelectValue placeholder="Select genre" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#0a1628] border-[#00d9ff]/30">
                                <SelectItem value="Soul">Soul</SelectItem>
                                <SelectItem value="Funk">Funk</SelectItem>
                                <SelectItem value="Jazz">Jazz</SelectItem>
                                <SelectItem value="Disco">Disco</SelectItem>
                                <SelectItem value="Mixed">Mixed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Cover Image URL</Label>
                            <Input
                              value={playlistForm.coverUrl}
                              onChange={(e) => setPlaylistForm({ ...playlistForm, coverUrl: e.target.value })}
                              placeholder="https://..."
                              className="bg-[#0a1628] border-[#00d9ff]/30"
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Select Tracks</Label>
                          <div className="mt-2 max-h-64 overflow-y-auto space-y-2 border border-[#00d9ff]/20 rounded-lg p-3 bg-[#0a1628]/50">
                            {tracks.length === 0 ? (
                              <p className="text-white/50 text-sm text-center py-4">
                                No tracks available. Upload tracks first.
                              </p>
                            ) : (
                              tracks.map((track) => (
                                <label
                                  key={track.id}
                                  className="flex items-center gap-3 p-2 rounded hover:bg-[#00d9ff]/5 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={playlistForm.trackIds.includes(track.id)}
                                    onChange={() => toggleTrackInPlaylist(track.id)}
                                    className="w-4 h-4 rounded border-[#00d9ff]/30"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{track.title}</p>
                                    <p className="text-xs text-white/50 truncate">{track.artist}</p>
                                  </div>
                                </label>
                              ))
                            )}
                          </div>
                          <p className="text-xs text-white/50 mt-1">
                            {playlistForm.trackIds.length} track(s) selected
                          </p>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button
                            onClick={handleCreatePlaylist}
                            disabled={loading || !playlistForm.name}
                            className="flex-1 bg-[#00ffaa] hover:bg-[#00dd99] text-[#0a1628]"
                          >
                            {loading ? 'Saving...' : editingPlaylist ? 'Update Playlist' : 'Create Playlist'}
                          </Button>
                          <Button
                            onClick={() => {
                              setIsPlaylistDialogOpen(false);
                              resetPlaylistForm();
                            }}
                            variant="outline"
                            className="border-[#00d9ff]/30"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Playlists Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playlists.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-white/50">
                      <ListMusic className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>No playlists created yet. Create your first playlist!</p>
                    </div>
                  ) : (
                    playlists.map((playlist) => (
                      <Card
                        key={playlist.id}
                        className="bg-[#0a1628]/50 border-white/5 hover:border-[#00d9ff]/30 transition-colors overflow-hidden"
                      >
                        <div className="aspect-square bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] flex items-center justify-center">
                          <ListMusic className="w-12 h-12 text-[#0a1628]" />
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-white mb-1 truncate">{playlist.name}</h3>
                          <p className="text-sm text-white/70 mb-3 line-clamp-2">{playlist.description || 'No description'}</p>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="border-[#00d9ff]/30 text-[#00d9ff] text-xs">
                              {playlist.trackIds?.length || 0} tracks
                            </Badge>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditPlaylist(playlist)}
                                className="text-[#00ffaa] hover:bg-[#00ffaa]/10 h-8 w-8 p-0"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeletePlaylist(playlist.id)}
                                className="text-[#FF8C42] hover:bg-[#FF8C42]/10 h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule">
              <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Schedule Management</h2>
                <div className="text-center py-12 text-white/50">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Schedule management coming soon...</p>
                  <Button
                    onClick={() => navigate('/schedule')}
                    className="mt-4 bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628]"
                  >
                    View Public Schedule
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
                <h2 className="text-2xl font-bold text-white mb-4">User Management</h2>
                <UsersManagement />
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Settings</h2>
                <div className="text-center py-12 text-white/50">
                  <Settings className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Settings coming soon...</p>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}