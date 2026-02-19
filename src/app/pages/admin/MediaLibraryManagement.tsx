import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ListPlus,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../../lib/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { toast } from 'sonner';

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
  coverUrl?: string;
  audioUrl?: string;
  streamUrl?: string;
  file_path?: string;
  file_size?: number;
  waveform?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  tags?: string[];
  storageBucket?: string;
  storageFilename?: string;
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

const TAG_SUGGESTIONS = [
  'Chill', 'Upbeat', 'Summer', 'Party', 'Slow Jam', 'Classic',
  'Remix', 'Live', 'Acoustic', 'Morning', 'Evening', 'Night',
  'Workout', 'Driving', 'Beach', 'Romantic', 'Groovy', 'Soulful',
  'Funky', 'Smooth', 'Deep', 'Vocal', 'Instrumental', 'Rare',
];

function EditTrackModal({
  track,
  onSave,
  onClose,
}: {
  track: Track;
  onSave: (t: Track) => void;
  onClose: () => void;
}) {
  // Ensure genre is always a valid value from the list
  const initialGenre = track.genre && GENRE_OPTIONS.includes(track.genre)
    ? track.genre
    : GENRE_OPTIONS[0];
  const [form, setForm] = useState<Track>({ ...track, genre: initialGenre });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const tags = form.tags || [];

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    setForm({ ...form, tags: [...tags, trimmed] });
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setForm({ ...form, tags: tags.filter((t) => t !== tag) });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleSubmit = async () => {
    // Final safety guard: ensure genre is never empty
    const safeForm = {
      ...form,
      genre: form.genre && GENRE_OPTIONS.includes(form.genre) ? form.genre : initialGenre,
    };
    setSaving(true);
    await onSave(safeForm);
    setSaving(false);
  };

  const availableSuggestions = TAG_SUGGESTIONS.filter((s) => !tags.includes(s));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 24 }}
        className="bg-[#141414] rounded-xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-[#00d9ff]/10 rounded-lg flex-shrink-0">
              <Edit2 className="size-4 text-[#00d9ff]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-righteous text-white truncate">Edit Track</h3>
              <p className="text-xs text-white/40 truncate">{track.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all flex-shrink-0">
            <X className="size-4 text-white/60" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          {/* Title & Artist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/60 mb-1 block">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-white/5 border-white/10 text-white text-sm h-9"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Artist</label>
              <Input
                value={form.artist}
                onChange={(e) => setForm({ ...form, artist: e.target.value })}
                className="bg-white/5 border-white/10 text-white text-sm h-9"
              />
            </div>
          </div>

          {/* Album */}
          <div>
            <label className="text-xs text-white/60 mb-1 block">Album</label>
            <Input
              value={form.album || ''}
              onChange={(e) => setForm({ ...form, album: e.target.value })}
              placeholder="Optional"
              className="bg-white/5 border-white/10 text-white text-sm h-9"
            />
          </div>

          {/* Genre & Key & BPM */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/60 mb-1 block">Genre</label>
              <select
                value={form.genre}
                onChange={(e) => {
                  const val = e.target.value;
                  // If user clears genre, revert to the original track genre
                  if (!val) {
                    setForm({ ...form, genre: track.genre || GENRE_OPTIONS[0] });
                  } else {
                    setForm({ ...form, genre: val });
                  }
                }}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm h-9 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
              >
                {GENRE_OPTIONS.map((g) => (
                  <option key={g} value={g} className="bg-[#141414]">{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Key</label>
              <select
                value={form.key || ''}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm h-9 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
              >
                <option value="" className="bg-[#141414]">--</option>
                {MUSICAL_KEYS.map((k) => (
                  <option key={k} value={k} className="bg-[#141414]">{k}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">BPM</label>
              <Input
                type="number"
                value={form.bpm || ''}
                onChange={(e) => setForm({ ...form, bpm: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="120"
                className="bg-white/5 border-white/10 text-white text-sm h-9"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-white/60 mb-1.5 flex items-center gap-1.5">
              <Tag className="size-3" />
              Tags
            </label>

            {/* Current tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#00d9ff]/15 text-[#00d9ff] rounded-full text-xs border border-[#00d9ff]/20"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-white transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type and press Enter..."
                className="bg-white/5 border-white/10 text-white text-sm h-8 flex-1"
              />
              <button
                onClick={() => addTag(tagInput)}
                disabled={!tagInput.trim()}
                className="px-3 h-8 bg-[#00d9ff]/10 hover:bg-[#00d9ff]/20 text-[#00d9ff] rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus className="size-3.5" />
              </button>
            </div>

            {/* Suggestions */}
            {availableSuggestions.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] text-white/30 mb-1">Suggestions:</p>
                <div className="flex flex-wrap gap-1">
                  {availableSuggestions.slice(0, 12).map((s) => (
                    <button
                      key={s}
                      onClick={() => addTag(s)}
                      className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-full text-[10px] transition-all border border-white/5 hover:border-white/20"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex items-center justify-end gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white/60 hover:text-white text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving || !form.title.trim() || !form.artist.trim()}
            className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black font-medium text-xs hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-40"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="size-3.5 mr-1.5" />}
            Save Changes
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [playlistDropdownTrackId, setPlaylistDropdownTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const intentionalStopRef = useRef(false); // suppress onerror after user-initiated stop
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [playerVolume, setPlayerVolume] = useState(0.8);
  const [playerMuted, setPlayerMuted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadTracks();
    loadPlaylists();
  }, []);

  useEffect(() => {
    filterTracks();
  }, [tracks, searchQuery, selectedGenre]);

  const loadTracks = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const result = await api.getTracks();
      console.log('[MediaLibrary] getTracks response:', { count: result?.tracks?.length, hasError: !!result?.error });
      if (result?.error) {
        console.error('[MediaLibrary] Server error:', result.error);
      }
      setTracks(result?.tracks || []);
    } catch (error) {
      console.error('[MediaLibrary] Error loading tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylists = async () => {
    try {
      const result = await api.getAllPlaylists();
      console.log('[MediaLibrary] getPlaylists response:', { count: result?.playlists?.length, hasError: !!result?.error });
      setPlaylists(result?.playlists || []);
    } catch (error) {
      console.error('[MediaLibrary] Error loading playlists:', error);
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
    // Create FormData for the real API call
    const formData = new FormData();
    formData.append('file', file);
    formData.append('position', 'end');
    formData.append('autoAddToLiveStream', 'true');
    formData.append('generateWaveform', 'false');

    try {
      // 2-step upload: signed URL → direct Storage upload → server processing
      // Progress: 1-5 (getting URL), 5-80 (uploading to Storage), 85-100 (server processing)
      const response = await api.uploadTrackFile(formData, (progress) => {
        if (progress >= 85) {
          updateUploadProgress(index, { progress, status: 'processing' });
        } else {
          updateUploadProgress(index, { progress, status: 'uploading' });
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      updateUploadProgress(index, { progress: 100, status: 'success' });

      // Refresh the tracks list
      await loadTracks(false);
    } catch (error: any) {
      console.error(`Upload error for ${file.name}:`, error);
      updateUploadProgress(index, {
        status: 'error',
        error: error.message || 'Upload failed',
      });
    }
  };

  const updateUploadProgress = (index: number, updates: Partial<UploadProgress>) => {
    setUploadProgress(prev => {
      const newProgress = [...prev];
      newProgress[index] = { ...newProgress[index], ...updates };
      return newProgress;
    });
  };

  const handleDeleteTracks = async () => {
    if (!confirm(
      `Permanently delete ${selectedTracks.length} track(s)?\n\nThis will remove the audio files from storage and clean up all playlist references. This action cannot be undone.`
    )) return;

    try {
      let deleted = 0;
      for (const trackId of selectedTracks) {
        await api.deleteTrack(trackId);
        deleted++;
      }
      toast.success(`${deleted} track(s) permanently deleted`);
      setSelectedTracks([]);
      await loadTracks();
    } catch (error) {
      console.error('Error deleting tracks:', error);
      toast.error('Failed to delete some tracks');
    }
  };

  const handleEditTrack = (track: Track) => {
    setEditingTrack(track);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedTrack: Track) => {
    try {
      const result = await api.updateTrack(updatedTrack.id, updatedTrack);
      console.log('[MediaLibrary] Track updated:', result);
      // Optimistic update — immediately reflect changes in the UI
      setTracks(prev => prev.map(t => t.id === updatedTrack.id ? { ...t, ...updatedTrack, updatedAt: new Date().toISOString() } : t));
      setShowEditModal(false);
      setEditingTrack(null);
      toast.success(`"${updatedTrack.title}" updated`);
      // Also reload from server to ensure data consistency
      loadTracks(false);
    } catch (error: any) {
      console.error('Error updating track:', error);
      toast.error(`Failed to update track: ${error.message || 'Unknown error'}`);
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

  const trackHasAudio = (track: Track) => !!(track.audioUrl || track.streamUrl);

  /** Cleanly stop audio without triggering the onError toast */
  const stopAudio = useCallback(() => {
    intentionalStopRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load(); // reset the element
    }
    setPlayingTrackId(null);
    setIsPaused(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
  }, []);

  const handlePlayTrack = async (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    if (!trackHasAudio(track)) return;

    if (playingTrackId === track.id) {
      // Same track — toggle pause/resume
      if (isPaused) {
        audioRef.current?.play().catch(err => console.error('Resume error:', err));
        setIsPaused(false);
      } else {
        audioRef.current?.pause();
        setIsPaused(true);
      }
      return;
    }

    // Different track — fetch a fresh signed URL, then play
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setIsPaused(false);
    setPlayingTrackId(track.id); // show mini-player immediately (loading state)

    let url = track.audioUrl || track.streamUrl;

    // Always request a fresh signed URL — stored URLs may be expired / public-on-private-bucket
    try {
      const fresh = await api.getTrackPlayUrl(track.id);
      if (fresh?.audioUrl) {
        url = fresh.audioUrl;
        console.log(`[MediaLibrary] Fresh signed URL for "${track.title}"`);
      } else if (fresh?.error) {
        console.warn(`[MediaLibrary] play-url error for "${track.title}":`, fresh.error);
      }
    } catch (err) {
      console.warn('[MediaLibrary] Could not fetch fresh play URL, using stored URL:', err);
    }

    if (!url) {
      console.warn('[MediaLibrary] Track has no audioUrl:', track.id, track);
      toast.error(`Cannot play "${track.title}" — no audio URL available. Try re-uploading the file.`);
      setPlayingTrackId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.volume = playerMuted ? 0 : playerVolume;
      audioRef.current.play().catch(err => {
        console.error(`[MediaLibrary] Play error for "${track.title}" (url=${url?.substring(0, 80)}...):`, err);
        toast.error(`Playback failed for "${track.title}". The audio file may be missing from storage.`);
      });
    }
  };

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

  const handleSeekPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return;
    setIsSeeking(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    const newTime = ratio * audioDuration;
    audioRef.current.currentTime = newTime;
    setAudioCurrentTime(newTime);
  }, [audioDuration]);

  const handleSeekPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSeeking || !audioRef.current || !audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    const newTime = ratio * audioDuration;
    audioRef.current.currentTime = newTime;
    setAudioCurrentTime(newTime);
  }, [isSeeking, audioDuration]);

  const handleSeekPointerUp = useCallback(() => {
    setIsSeeking(false);
  }, []);

  const handleDeleteSingleTrack = async (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    const track = tracks.find(t => t.id === trackId);
    if (!confirm(
      `Permanently delete "${track?.title || 'this track'}"?\n\nThe audio file will be removed from storage and the track will be removed from all playlists. This cannot be undone.`
    )) return;
    try {
      await api.deleteTrack(trackId);
      if (playingTrackId === trackId) {
        stopAudio(); // uses intentionalStopRef to suppress false onerror
      }
      toast.success(`"${track?.title || 'Track'}" permanently deleted`);
      await loadTracks(false);
    } catch (error) {
      console.error('Error deleting track:', error);
      toast.error('Failed to delete track');
    }
  };

  const addTrackToPlaylistConfirmed = async (trackId: string, playlistId: string) => {
    try {
      await api.addTrackToPlaylist(playlistId, trackId, 'end');
      const pl = playlists.find(p => p.id === playlistId);
      const track = tracks.find(t => t.id === trackId);
      toast.success(`"${track?.title || 'Track'}" added to "${pl?.name || 'playlist'}"`, {
        description: 'Open the playlist to manage the queue',
        duration: 3000,
      });
      // Refresh playlists so trackIds stay up-to-date
      loadPlaylists();
    } catch (error) {
      console.error('Error adding to playlist:', error);
      toast.error('Failed to add track to playlist');
    }
  };

  const handleAddToPlaylist = async (e: React.MouseEvent, trackId: string, playlistId: string) => {
    e.stopPropagation();
    setPlaylistDropdownTrackId(null);

    const pl = playlists.find(p => p.id === playlistId);
    const track = tracks.find(t => t.id === trackId);
    const alreadyInPlaylist = (pl?.trackIds || []).includes(trackId);

    if (alreadyInPlaylist) {
      toast.warning(`"${track?.title || 'Track'}" is already in "${pl?.name || 'playlist'}"`, {
        description: 'Add it again?',
        duration: 8000,
        action: {
          label: 'Add anyway',
          onClick: () => addTrackToPlaylistConfirmed(trackId, playlistId),
        },
      });
      return;
    }

    await addTrackToPlaylistConfirmed(trackId, playlistId);
  };

  const handleTogglePlaylistDropdown = (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    setPlaylistDropdownTrackId(prev => prev === trackId ? null : trackId);
  };

  // Close playlist dropdown on outside click
  useEffect(() => {
    if (!playlistDropdownTrackId) return;
    const handler = () => setPlaylistDropdownTrackId(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [playlistDropdownTrackId]);

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
                accept=".mp3,audio/mpeg"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                className="hidden"
              />
              <p className="text-[10px] sm:text-xs text-white/40 mt-2 sm:mt-4">
                Supported: MP3 (max 50 files per batch)
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
        ) : viewMode === 'grid' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4"
          >
            {filteredTracks.map((track, index) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.5) }}
                className="bg-[#141414] rounded-lg border border-white/5 hover:border-[#00d9ff]/30 transition-all p-3 sm:p-4 cursor-pointer group"
                onClick={() => toggleTrackSelection(track.id)}
              >
                <div className="space-y-2 sm:space-y-3">
                  {/* Artwork */}
                  <div className="relative aspect-square bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 rounded-lg overflow-hidden">
                    {(track.artwork || track.coverUrl) ? (
                      <img src={track.artwork || track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="size-8 sm:size-10 text-[#00d9ff]/40" />
                      </div>
                    )}
                    {trackHasAudio(track) ? (
                      <button
                        onClick={(e) => handlePlayTrack(e, track)}
                        className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${playingTrackId === track.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      >
                        {playingTrackId === track.id && !isPaused ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#00d9ff] flex items-center justify-center shadow-lg shadow-cyan-500/30"><Pause className="size-5 sm:size-6 text-black" /></div>
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 flex items-center justify-center"><Play className="size-5 sm:size-6 text-black ml-0.5" /></div>
                        )}
                      </button>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center" title="No audio file">
                          <FileAudio className="size-5 sm:size-6 text-white/30" />
                        </div>
                      </div>
                    )}
                    {playingTrackId === track.id && (
                      <div className={`absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${isPaused ? 'bg-amber-400 text-black' : 'bg-[#00d9ff] text-black'}`}>
                        <Volume2 className={`size-3 ${isPaused ? '' : 'animate-pulse'}`} /> {isPaused ? 'PAUSED' : 'PLAYING'}
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center transition-all ${selectedTracks.includes(track.id) ? 'bg-[#00d9ff] border-[#00d9ff]' : 'bg-black/40 border-white/40 group-hover:border-white'}`}>
                        {selectedTracks.includes(track.id) && <CheckCircle2 className="size-3 sm:size-4 text-black" />}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-0.5 sm:space-y-1">
                    <h4 className="font-medium text-white text-xs sm:text-sm truncate">{track.title}</h4>
                    <p className="text-[10px] sm:text-xs text-white/60 truncate">{track.artist}</p>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs text-white/40">
                      <span className="truncate">{track.genre}</span>
                      <span className="flex-shrink-0">{formatDuration(track.duration)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 pt-1 sm:pt-2 border-t border-white/5">
                    <button onClick={(e) => { e.stopPropagation(); handleEditTrack(track); }} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded text-[10px] sm:text-xs transition-all"><Edit2 className="size-3" /><span className="hidden sm:inline">Edit</span></button>
                    <div className="relative">
                      <button onClick={(e) => handleTogglePlaylistDropdown(e, track.id)} className="flex items-center justify-center gap-1 px-2 py-1.5 bg-[#00d9ff]/10 hover:bg-[#00d9ff]/20 text-[#00d9ff] rounded text-[10px] sm:text-xs transition-all" title="Add to playlist"><ListPlus className="size-3" /></button>
                      {playlistDropdownTrackId === track.id && (
                        <div className="absolute bottom-full left-0 mb-1 w-48 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl z-50 py-1 max-h-48 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                          <p className="px-3 py-1.5 text-[10px] text-white/40 uppercase tracking-wider font-semibold">Add to playlist</p>
                          {playlists.length === 0 ? <p className="px-3 py-2 text-xs text-white/50">No playlists</p> : playlists.map((pl) => (<button key={pl.id} onClick={(e) => handleAddToPlaylist(e, track.id, pl.id)} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-[#00d9ff]/10 transition-colors truncate">{pl.name}</button>))}
                        </div>
                      )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSingleTrack(e, track.id); }} className="flex items-center justify-center gap-1 px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-[10px] sm:text-xs transition-all"><Trash2 className="size-3" /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          /* ═══ List / Table View ═══ */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden">
            {/* Table Header */}
            <div className="hidden lg:flex items-center gap-4 px-4 py-2.5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/30 font-semibold select-none">
              <div className="w-6 flex-shrink-0">
                <div
                  onClick={() => {
                    if (allSelected) setSelectedTracks([]);
                    else setSelectedTracks(filteredTracks.map(t => t.id));
                  }}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${allSelected ? 'bg-[#00d9ff] border-[#00d9ff]' : 'border-white/20 hover:border-white/40'}`}
                >
                  {allSelected && <CheckCircle2 className="size-3 text-black" />}
                </div>
              </div>
              <div className="w-10 flex-shrink-0"></div>
              <div className="flex-[3] min-w-0">Title / Artist</div>
              <div className="flex-[2] min-w-0">Album</div>
              <div className="flex-[1.5] min-w-0">Genre</div>
              <div className="w-14 flex-shrink-0 text-right">Duration</div>
              <div className="w-28 flex-shrink-0"></div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/[0.04]">
              {filteredTracks.map((track, index) => (
                <div
                  key={track.id}
                  onClick={() => toggleTrackSelection(track.id)}
                  className={`flex items-center gap-2 sm:gap-3 lg:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors ${
                    selectedTracks.includes(track.id) ? 'bg-[#00d9ff]/5' : 'hover:bg-white/[0.03]'
                  } ${playingTrackId === track.id ? 'bg-[#00d9ff]/[0.08]' : ''}`}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    selectedTracks.includes(track.id)
                      ? 'bg-[#00d9ff] border-[#00d9ff]'
                      : 'border-white/20 hover:border-white/40'
                  }`}>
                    {selectedTracks.includes(track.id) && <CheckCircle2 className="size-3 text-black" />}
                  </div>

                  {/* Artwork with Play/Pause overlay */}
                  {trackHasAudio(track) ? (
                    <button
                      onClick={(e) => handlePlayTrack(e, track)}
                      className="w-10 h-10 relative rounded flex-shrink-0 overflow-hidden group/art"
                    >
                      <div className="w-full h-full bg-gradient-to-br from-[#00d9ff]/15 to-[#00ffaa]/10 flex items-center justify-center">
                        {(track.artwork || track.coverUrl) ? (
                          <img src={track.artwork || track.coverUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Music className="size-4 text-[#00d9ff]/30" />
                        )}
                      </div>
                      <div className={`absolute inset-0 flex items-center justify-center bg-black/50 rounded transition-opacity ${
                        playingTrackId === track.id ? 'opacity-100' : 'opacity-0 group-hover/art:opacity-100'
                      }`}>
                        {playingTrackId === track.id && !isPaused ? (
                          <Pause className="size-4 text-white drop-shadow-lg" />
                        ) : (
                          <Play className="size-4 text-white ml-0.5 drop-shadow-lg" />
                        )}
                      </div>
                      {playingTrackId === track.id && (
                        <div className={`absolute inset-0 rounded ring-2 pointer-events-none ${isPaused ? 'ring-amber-400' : 'ring-[#00d9ff] animate-pulse'}`} />
                      )}
                    </button>
                  ) : (
                    <div className="w-10 h-10 relative rounded flex-shrink-0 overflow-hidden" title="No audio file">
                      <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center">
                        {(track.artwork || track.coverUrl) ? (
                          <img src={track.artwork || track.coverUrl} alt="" className="w-full h-full object-cover opacity-40" />
                        ) : (
                          <FileAudio className="size-4 text-white/15" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Title + Artist */}
                  <div className="flex-[3] min-w-0">
                    <h4 className="text-sm text-white font-medium truncate leading-tight">
                      {track.title}
                      {playingTrackId === track.id && (
                        <Volume2 className="inline-block size-3 text-[#00d9ff] ml-1.5 animate-pulse" />
                      )}
                      {!trackHasAudio(track) && (
                        <span className="inline-block ml-1.5 text-[9px] text-amber-400/70 bg-amber-400/10 px-1 py-0.5 rounded align-middle">NO FILE</span>
                      )}
                    </h4>
                    <p className="text-xs text-white/45 truncate">{track.artist}</p>
                  </div>

                  {/* Album — desktop */}
                  <div className="hidden sm:block flex-[2] min-w-0">
                    <p className="text-xs text-white/35 truncate">{track.album || '—'}</p>
                  </div>

                  {/* Genre + Tags — desktop */}
                  <div className="hidden lg:flex flex-[1.5] min-w-0 items-center gap-1.5">
                    <span className="text-xs text-white/35 truncate">{track.genre}</span>
                    {track.tags && track.tags.length > 0 && (
                      <span className="text-[9px] text-[#00d9ff]/40 bg-[#00d9ff]/[0.06] px-1 py-0.5 rounded flex-shrink-0">
                        +{track.tags.length}
                      </span>
                    )}
                  </div>

                  {/* Duration — desktop */}
                  <div className="hidden lg:block w-14 flex-shrink-0 text-right">
                    <span className="text-xs text-white/35 font-mono">{formatDuration(track.duration)}</span>
                  </div>

                  {/* Duration — mobile */}
                  <div className="lg:hidden flex-shrink-0">
                    <span className="text-[10px] text-white/30 font-mono">{formatDuration(track.duration)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditTrack(track); }}
                      className="p-1.5 hover:bg-white/10 rounded transition-all text-white/30 hover:text-white"
                      title="Edit"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={(e) => handleTogglePlaylistDropdown(e, track.id)}
                        className="p-1.5 hover:bg-[#00d9ff]/10 rounded transition-all text-[#00d9ff]/40 hover:text-[#00d9ff]"
                        title="Add to playlist"
                      >
                        <ListPlus className="size-3.5" />
                      </button>
                      {playlistDropdownTrackId === track.id && (
                        <div
                          className="absolute bottom-full right-0 mb-1 w-48 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl z-50 py-1 max-h-48 overflow-y-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="px-3 py-1.5 text-[10px] text-white/40 uppercase tracking-wider font-semibold">Add to playlist</p>
                          {playlists.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-white/50">No playlists</p>
                          ) : (
                            playlists.map((pl) => (
                              <button
                                key={pl.id}
                                onClick={(e) => handleAddToPlaylist(e, track.id, pl.id)}
                                className="w-full text-left px-3 py-2 text-xs text-white hover:bg-[#00d9ff]/10 transition-colors truncate"
                              >
                                {pl.name}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSingleTrack(e, track.id); }}
                      className="p-1.5 hover:bg-red-500/10 rounded transition-all text-white/20 hover:text-red-400"
                      title="Delete permanently"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer count */}
            <div className="px-4 py-2.5 border-t border-white/5 text-xs text-white/25">
              {filteredTracks.length} track{filteredTracks.length !== 1 ? 's' : ''}
              {searchQuery || selectedGenre !== 'all' ? ` (filtered from ${tracks.length})` : ''}
            </div>
          </motion.div>
        )}

        {/* Edit Track Modal */}
        <AnimatePresence>
          {showEditModal && editingTrack && (
            <EditTrackModal
              track={editingTrack}
              onSave={handleSaveEdit}
              onClose={() => {
                setShowEditModal(false);
                setEditingTrack(null);
              }}
            />
          )}
        </AnimatePresence>

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          onTimeUpdate={() => {
            if (audioRef.current && !isSeeking) {
              setAudioCurrentTime(audioRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setAudioDuration(audioRef.current.duration || 0);
              audioRef.current.volume = playerMuted ? 0 : playerVolume;
            }
          }}
          onEnded={() => {
            setPlayingTrackId(null);
            setIsPaused(false);
            setAudioCurrentTime(0);
            setAudioDuration(0);
          }}
          onError={(e) => {
            // Ignore errors triggered by intentional stop (removeAttribute('src') + load())
            if (intentionalStopRef.current) {
              intentionalStopRef.current = false;
              return;
            }
            const audio = e.currentTarget as HTMLAudioElement;
            const mediaError = audio.error;
            const src = audio.src?.substring(0, 120);
            const code = mediaError?.code;
            const msg = mediaError?.message || 'unknown';
            // MediaError codes: 1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED
            console.error(`[MediaLibrary] Audio error: code=${code} msg="${msg}" src="${src}"`);
            const playingTrack = tracks.find(t => t.id === playingTrackId);
            if (code === 4 || code === 2) {
              toast.error(
                `Cannot play "${playingTrack?.title || 'track'}" — the audio file may be missing from storage or the URL expired. Try refreshing the page.`
              );
            }
            setPlayingTrackId(null);
            setIsPaused(false);
            setAudioCurrentTime(0);
            setAudioDuration(0);
          }}
        />

        {/* Floating Mini Player with Seek Bar */}
        <AnimatePresence>
          {playingTrackId && (() => {
            const playingTrack = tracks.find(t => t.id === playingTrackId);
            const progress = audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0;
            return (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#0f1c2e]/95 backdrop-blur-xl border border-[#00d9ff]/25 rounded-2xl shadow-2xl shadow-black/50 w-[calc(100%-2rem)] max-w-md overflow-hidden"
              >
                {/* Seek bar at the top of the player — thin accent line */}
                <div
                  ref={seekBarRef}
                  className="relative h-2 sm:h-1.5 bg-white/10 cursor-pointer group/seek hover:h-3 transition-[height] duration-150"
                  onPointerDown={handleSeekPointerDown}
                  onPointerMove={handleSeekPointerMove}
                  onPointerUp={handleSeekPointerUp}
                >
                  {/* Buffered / progress */}
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] transition-[width] duration-100"
                    style={{ width: `${progress}%` }}
                  />
                  {/* Thumb dot — visible on hover / seeking */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg shadow-[#00d9ff]/30 border-2 border-[#00d9ff] transition-opacity ${isSeeking ? 'opacity-100 scale-110' : 'opacity-0 group-hover/seek:opacity-100'}`}
                    style={{ left: `${progress}%` }}
                  />
                </div>

                {/* Main content row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Album art */}
                  <div className="relative w-11 h-11 flex-shrink-0">
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/15 flex items-center justify-center overflow-hidden">
                      {(playingTrack?.artwork || playingTrack?.coverUrl) ? (
                        <img src={playingTrack.artwork || playingTrack.coverUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music className="size-5 text-[#00d9ff]/60" />
                      )}
                    </div>
                    {/* Spinning ring — pauses when track is paused */}
                    {!isPaused && (
                      <motion.div
                        className="absolute inset-0 rounded-lg border border-[#00ffaa]/40"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      />
                    )}
                  </div>

                  {/* Title + Artist + time */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {playingTrack?.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-white/50 truncate flex-1">
                        {playingTrack?.artist}
                      </p>
                      <span className="text-[10px] text-white/30 font-mono tabular-nums flex-shrink-0">
                        {fmtTime(audioCurrentTime)}{audioDuration > 0 ? ` / ${fmtTime(audioDuration)}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Play/Pause button */}
                  <button
                    onClick={(e) => {
                      if (playingTrack) handlePlayTrack(e, playingTrack);
                    }}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] flex items-center justify-center flex-shrink-0 hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-[#00d9ff]/20"
                  >
                    {isPaused
                      ? <Play className="size-4 text-[#0a1628] ml-0.5" />
                      : <Pause className="size-4 text-[#0a1628]" />}
                  </button>

                  {/* Volume control — hidden on small screens */}
                  <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => {
                        const next = !playerMuted;
                        setPlayerMuted(next);
                        if (audioRef.current) audioRef.current.volume = next ? 0 : playerVolume;
                      }}
                      className="text-white/40 hover:text-white/70 transition-colors"
                    >
                      {playerMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                    </button>
                    <input
                      type="range"
                      min={0} max={1} step={0.05}
                      value={playerMuted ? 0 : playerVolume}
                      onChange={e => {
                        const v = +e.target.value;
                        setPlayerVolume(v);
                        setPlayerMuted(v === 0);
                        if (audioRef.current) audioRef.current.volume = v;
                      }}
                      className="w-14 h-1 accent-[#00d9ff] cursor-pointer"
                    />
                  </div>

                  {/* Close / stop — uses stopAudio() to set intentionalStopRef and prevent false onerror toast */}
                  <button
                    onClick={() => stopAudio()}
                    className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
                    title="Stop"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}