import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Upload,
  Music,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Play,
  Pause,
  MoreVertical,
  FileAudio,
  Tag,
  Clock,
  Disc3,
  User,
  AlignLeft,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Grid3x3,
  List,
  ChevronDown,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../../lib/api';
import { AdminLayout } from '../../components/admin/AdminLayout';

interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre: string;
  duration: number;
  bpm?: number;
  key?: string;
  artwork?: string;
  file_path: string;
  file_size?: number;
  waveform?: string;
  created_at: string;
  updated_at?: string;
}

interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'success' | 'error';
  error?: string;
}

const GENRE_OPTIONS = [
  'Disco', 'Soul', 'Funk', 'Jazz', 'Reggae', 'Latin', 
  'Afropop', 'House', 'Lounge', 'Instrumental', 'Dance',
  'Nu Disco', 'Tropical', 'Caribbean', 'R&B', 'Blues'
];

const MUSICAL_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

export function MediaLibraryManagement() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadTracks();
  }, []);

  useEffect(() => {
    filterTracks();
  }, [tracks, searchQuery, selectedGenre]);

  const loadTracks = async () => {
    setLoading(true);
    try {
      const { tracks: data } = await api.getTracks();
      setTracks(data || []);
    } catch (error) {
      console.error('Error loading tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTracks = () => {
    let filtered = [...tracks];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (track) =>
          track.title.toLowerCase().includes(query) ||
          track.artist.toLowerCase().includes(query) ||
          track.album?.toLowerCase().includes(query)
      );
    }

    if (selectedGenre !== 'all') {
      filtered = filtered.filter((track) =>
        track.genre.toLowerCase() === selectedGenre.toLowerCase()
      );
    }

    setFilteredTracks(filtered);
  };

  const handleFileSelect = async (files: FileList) => {
    const fileArray = Array.from(files);
    
    const initialProgress: UploadProgress[] = fileArray.map(file => ({
      filename: file.name,
      progress: 0,
      status: 'uploading',
    }));
    setUploadProgress(initialProgress);
    setShowUploadModal(true);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      try {
        await uploadTrack(file, i);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        updateUploadProgress(i, {
          status: 'error',
          error: 'Upload failed',
        });
      }
    }
  };

  const uploadTrack = async (file: File, index: number) => {
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      updateUploadProgress(index, { progress, status: 'uploading' });
    }

    updateUploadProgress(index, { progress: 100, status: 'processing' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    updateUploadProgress(index, { progress: 100, status: 'success' });
    
    await loadTracks();
  };

  const updateUploadProgress = (index: number, updates: Partial<UploadProgress>) => {
    setUploadProgress(prev => {
      const newProgress = [...prev];
      newProgress[index] = { ...newProgress[index], ...updates };
      return newProgress;
    });
  };

  const handleDeleteTracks = async () => {
    if (!confirm(`Delete ${selectedTracks.length} track(s)?`)) return;

    try {
      for (const trackId of selectedTracks) {
        await api.deleteTrack(trackId);
      }
      setSelectedTracks([]);
      await loadTracks();
    } catch (error) {
      console.error('Error deleting tracks:', error);
    }
  };

  const handleEditTrack = (track: Track) => {
    setEditingTrack(track);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedTrack: Track) => {
    try {
      await api.updateTrack(updatedTrack.id, updatedTrack);
      setShowEditModal(false);
      setEditingTrack(null);
      await loadTracks();
    } catch (error) {
      console.error('Error updating track:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const toggleTrackSelection = (trackId: string) => {
    setSelectedTracks(prev =>
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    );
  };

  const genres = ['all', ...GENRE_OPTIONS];
  const allSelected = selectedTracks.length === filteredTracks.length && filteredTracks.length > 0;

  // Drag and Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  if (loading) {
    return (
      <AdminLayout maxWidth="wide">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="size-10 sm:size-12 animate-spin text-[#00d9ff] mx-auto mb-4" />
            <p className="text-white/60 text-sm sm:text-base">Loading media library...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout maxWidth="wide">
      <div className="w-full max-w-full overflow-x-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6 lg:mb-8 w-full"
        >
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-righteous text-white mb-1 sm:mb-2">
              Media Library
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-white/60">
              Upload, organize and manage your music collection
            </p>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mb-4 sm:mb-6 border-2 border-dashed rounded-lg sm:rounded-xl p-4 sm:p-6 lg:p-8 transition-all w-full ${
              isDragging
                ? 'border-[#00d9ff] bg-[#00d9ff]/10 scale-[1.02]'
                : 'border-white/20 bg-[#141414] hover:border-[#00d9ff]/50'
            }`}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <div className={`p-3 sm:p-4 lg:p-6 rounded-full mb-2 sm:mb-3 lg:mb-4 transition-all ${
                isDragging 
                  ? 'bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] scale-110' 
                  : 'bg-[#00d9ff]/10'
              }`}>
                <Upload className={`size-8 sm:size-10 lg:size-12 ${isDragging ? 'text-black' : 'text-[#00d9ff]'}`} />
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-righteous text-white mb-1 sm:mb-2">
                {isDragging ? 'Drop files here!' : 'Drag & Drop your music files'}
              </h3>
              <p className="text-xs sm:text-sm text-white/60 mb-3 sm:mb-4 max-w-md">
                or click the button below to browse
              </p>
              <Button
                onClick={() => document.getElementById('file-upload')?.click()}
                className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black font-medium hover:shadow-lg hover:shadow-cyan-500/30 text-xs sm:text-sm"
                size="sm"
              >
                <Upload className="size-3 sm:size-4 mr-1.5 sm:mr-2" />
                Browse Files
              </Button>
              <input
                id="file-upload"
                type="file"
                multiple
                accept="audio/*"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                className="hidden"
              />
              <p className="text-[10px] sm:text-xs text-white/40 mt-2 sm:mt-4">
                Supported: MP3, WAV, FLAC, AAC, OGG
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6 w-full">
            <div className="p-3 sm:p-4 bg-[#141414] rounded-lg border border-white/5 hover:border-[#00d9ff]/30 transition-all min-w-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-[#00d9ff]/10 rounded-lg flex-shrink-0">
                  <Music className="size-4 sm:size-5 lg:size-6 text-[#00d9ff]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">
                    {tracks.length}
                  </p>
                  <p className="text-[10px] sm:text-xs lg:text-sm text-white/60 truncate">
                    Tracks
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-[#141414] rounded-lg border border-white/5 hover:border-green-500/30 transition-all min-w-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-green-500/10 rounded-lg flex-shrink-0">
                  <Disc3 className="size-4 sm:size-5 lg:size-6 text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">
                    {new Set(tracks.map(t => t.genre)).size}
                  </p>
                  <p className="text-[10px] sm:text-xs lg:text-sm text-white/60 truncate">Genres</p>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-[#141414] rounded-lg border border-white/5 hover:border-purple-500/30 transition-all min-w-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-purple-500/10 rounded-lg flex-shrink-0">
                  <User className="size-4 sm:size-5 lg:size-6 text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">
                    {new Set(tracks.map(t => t.artist)).size}
                  </p>
                  <p className="text-[10px] sm:text-xs lg:text-sm text-white/60 truncate">Artists</p>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-[#141414] rounded-lg border border-white/5 hover:border-orange-500/30 transition-all min-w-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-orange-500/10 rounded-lg flex-shrink-0">
                  <Clock className="size-4 sm:size-5 lg:size-6 text-orange-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">
                    {Math.floor(tracks.reduce((sum, t) => sum + t.duration, 0) / 3600)}h
                  </p>
                  <p className="text-[10px] sm:text-xs lg:text-sm text-white/60 truncate">
                    Duration
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <AnimatePresence>
            {selectedTracks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 sm:mb-6 p-3 sm:p-4 bg-[#141414] rounded-lg border border-[#00d9ff]/30 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 w-full"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <CheckCircle2 className="size-4 sm:size-5 text-[#00d9ff] flex-shrink-0" />
                  <span className="text-white font-medium text-xs sm:text-sm lg:text-base truncate">
                    {selectedTracks.length} selected
                  </span>
                </div>
                <Button
                  onClick={handleDeleteTracks}
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 w-full xs:w-auto text-xs sm:text-sm flex-shrink-0"
                >
                  <Trash2 className="size-3 sm:size-4 mr-1.5 sm:mr-2" />
                  Delete
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Upload Progress Modal */}
        <AnimatePresence>
          {showUploadModal && uploadProgress.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
              onClick={() => {
                if (uploadProgress.every(p => p.status === 'success' || p.status === 'error')) {
                  setShowUploadModal(false);
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#141414] rounded-lg sm:rounded-xl border border-white/10 w-full max-w-sm sm:max-w-md lg:max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 sm:p-6 border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg lg:text-xl font-righteous text-white">
                      Uploading Files
                    </h3>
                    {uploadProgress.every(p => p.status === 'success' || p.status === 'error') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowUploadModal(false)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                  <div className="space-y-3 sm:space-y-4">
                    {uploadProgress.map((progress, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {progress.status === 'success' && (
                              <CheckCircle2 className="size-4 sm:size-5 text-green-400 flex-shrink-0" />
                            )}
                            {progress.status === 'error' && (
                              <AlertCircle className="size-4 sm:size-5 text-red-400 flex-shrink-0" />
                            )}
                            {(progress.status === 'uploading' || progress.status === 'processing') && (
                              <Loader2 className="size-4 sm:size-5 text-[#00d9ff] animate-spin flex-shrink-0" />
                            )}
                            <span className="text-white/80 text-xs sm:text-sm truncate">
                              {progress.filename}
                            </span>
                          </div>
                          <span className="text-white/60 text-[10px] sm:text-xs lg:text-sm whitespace-nowrap">
                            {progress.status === 'uploading' && `${progress.progress}%`}
                            {progress.status === 'processing' && 'Processing...'}
                            {progress.status === 'success' && 'Complete'}
                            {progress.status === 'error' && progress.error}
                          </span>
                        </div>
                        {(progress.status === 'uploading' || progress.status === 'processing') && (
                          <div className="h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress.progress}%` }}
                              className="h-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search and Filters */}
        <div className="mb-4 sm:mb-6 w-full">
          <div className="bg-[#141414] rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 border border-white/5 w-full">
            {/* Top Row */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-0 w-full">
              {/* Search */}
              <div className="flex-1 relative min-w-0">
                <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 size-4 sm:size-5 text-[#00d9ff]/50" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tracks..."
                  className="w-full pl-8 sm:pl-10 bg-white/5 border-white/10 text-white text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>

              {/* Desktop View Toggle & Filter Button */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* View Toggle - Desktop */}
                <div className="hidden lg:flex items-center gap-1 p-1 bg-white/5 rounded-lg flex-shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-all ${
                      viewMode === 'grid' 
                        ? 'bg-white/10 text-white' 
                        : 'text-white/40 hover:text-white'
                    }`}
                    title="Grid view"
                  >
                    <Grid3x3 className="size-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-all ${
                      viewMode === 'list' 
                        ? 'bg-white/10 text-white' 
                        : 'text-white/40 hover:text-white'
                    }`}
                    title="List view"
                  >
                    <List className="size-4" />
                  </button>
                </div>

                {/* Mobile Filter Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-xs sm:text-sm flex-shrink-0"
                >
                  <SlidersHorizontal className="size-4" />
                  <span className="hidden xs:inline">Filters</span>
                  <ChevronDown className={`size-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                {/* Desktop Filter */}
                <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                  <Filter className="size-4 text-[#00d9ff] flex-shrink-0" />
                  <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                  >
                    {genres.map((genre) => (
                      <option key={genre} value={genre} className="bg-[#141414]">
                        {genre === 'all' ? 'All Genres' : genre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Refresh */}
                <button
                  onClick={loadTracks}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all flex-shrink-0"
                  title="Refresh"
                >
                  <RefreshCw className="size-4" />
                </button>
              </div>
            </div>

            {/* Mobile Filters Dropdown */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="lg:hidden overflow-hidden"
                >
                  <div className="pt-3 mt-3 border-t border-white/10 space-y-3">
                    <div>
                      <label className="text-xs text-white/60 mb-1.5 block">Genre</label>
                      <select
                        value={selectedGenre}
                        onChange={(e) => setSelectedGenre(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                      >
                        {genres.map((genre) => (
                          <option key={genre} value={genre} className="bg-[#141414]">
                            {genre === 'all' ? 'All Genres' : genre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-white/60 mb-1.5 block">View Mode</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                            viewMode === 'grid'
                              ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black'
                              : 'bg-white/5 text-white hover:bg-white/10'
                          }`}
                        >
                          <Grid3x3 className="size-4" />
                          Grid
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                            viewMode === 'list'
                              ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black'
                              : 'bg-white/5 text-white hover:bg-white/10'
                          }`}
                        >
                          <List className="size-4" />
                          List
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Tracks Display */}
        {filteredTracks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 sm:py-16 lg:py-20"
          >
            <Music className="size-12 sm:size-16 lg:size-20 mx-auto mb-4 sm:mb-6 text-white/20" />
            <h3 className="text-lg sm:text-xl lg:text-2xl font-righteous text-white mb-2">
              {searchQuery || selectedGenre !== 'all' ? 'No tracks found' : 'No tracks yet'}
            </h3>
            <p className="text-sm sm:text-base text-white/60 mb-4 sm:mb-6">
              {searchQuery || selectedGenre !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Upload your first track to get started'}
            </p>
            {!searchQuery && selectedGenre === 'all' && (
              <Button
                onClick={() => document.getElementById('file-upload')?.click()}
                className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black font-medium hover:shadow-lg hover:shadow-cyan-500/30"
              >
                <Upload className="size-4 mr-2" />
                Upload Tracks
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4'
                : 'space-y-2'
            }
          >
            {filteredTracks.map((track, index) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={
                  viewMode === 'grid'
                    ? 'bg-[#141414] rounded-lg border border-white/5 hover:border-[#00d9ff]/30 transition-all p-3 sm:p-4 cursor-pointer group'
                    : 'bg-[#141414] rounded-lg border border-white/5 hover:border-[#00d9ff]/30 transition-all p-3 sm:p-4 cursor-pointer'
                }
                onClick={() => toggleTrackSelection(track.id)}
              >
                {viewMode === 'grid' ? (
                  <div className="space-y-2 sm:space-y-3">
                    {/* Artwork */}
                    <div className="relative aspect-square bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 rounded-lg overflow-hidden">
                      {track.artwork ? (
                        <img
                          src={track.artwork}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="size-8 sm:size-10 text-[#00d9ff]/40" />
                        </div>
                      )}
                      {/* Selection Checkbox */}
                      <div className="absolute top-2 right-2">
                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center transition-all ${
                          selectedTracks.includes(track.id)
                            ? 'bg-[#00d9ff] border-[#00d9ff]'
                            : 'bg-black/40 border-white/40 group-hover:border-white'
                        }`}>
                          {selectedTracks.includes(track.id) && (
                            <CheckCircle2 className="size-3 sm:size-4 text-black" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-0.5 sm:space-y-1">
                      <h4 className="font-medium text-white text-xs sm:text-sm truncate">
                        {track.title}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-white/60 truncate">
                        {track.artist}
                      </p>
                      <div className="flex items-center justify-between text-[10px] sm:text-xs text-white/40">
                        <span className="truncate">{track.genre}</span>
                        <span className="flex-shrink-0">{formatDuration(track.duration)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 sm:gap-2 pt-1 sm:pt-2 border-t border-white/5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTrack(track);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded text-[10px] sm:text-xs transition-all"
                      >
                        <Edit2 className="size-3" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle delete
                        }}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-[10px] sm:text-xs transition-all"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                    {/* Checkbox */}
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      selectedTracks.includes(track.id)
                        ? 'bg-[#00d9ff] border-[#00d9ff]'
                        : 'bg-black/40 border-white/40 hover:border-white'
                    }`}>
                      {selectedTracks.includes(track.id) && (
                        <CheckCircle2 className="size-3 sm:size-4 text-black" />
                      )}
                    </div>

                    {/* Artwork */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {track.artwork ? (
                        <img
                          src={track.artwork}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="size-5 sm:size-6 text-[#00d9ff]/40" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-2 lg:gap-4">
                      <div className="min-w-0">
                        <h4 className="font-medium text-white text-xs sm:text-sm truncate">
                          {track.title}
                        </h4>
                        <p className="text-[10px] sm:text-xs text-white/60 truncate">
                          {track.artist}
                        </p>
                      </div>
                      <div className="hidden sm:block min-w-0">
                        <p className="text-xs text-white/40 truncate">{track.album || '-'}</p>
                      </div>
                      <div className="hidden lg:block min-w-0">
                        <p className="text-xs text-white/40 truncate">{track.genre}</p>
                      </div>
                      <div className="hidden lg:block text-xs text-white/40">
                        {formatDuration(track.duration)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTrack(track);
                        }}
                        className="p-1.5 sm:p-2 bg-white/5 hover:bg-white/10 rounded transition-all"
                      >
                        <Edit2 className="size-3 sm:size-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle delete
                        }}
                        className="p-1.5 sm:p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-all"
                      >
                        <Trash2 className="size-3 sm:size-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}