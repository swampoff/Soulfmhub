import React, { useState, useCallback, useRef } from 'react';
import { useApp } from '../../../context/AppContext';
import { api } from '../../../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { MetadataExtractionDemo } from '../../components/MetadataExtractionDemo';
import { 
  Upload, 
  Music, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  FileAudio,
  Plus,
  ListMusic,
  AlertCircle,
  Copy,
  ExternalLink,
  Play,
  Link
} from 'lucide-react';

interface UploadingTrack {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
  shortId?: string;
  streamUrl?: string;
  metadata?: {
    title: string;
    artist: string;
    album?: string;
    duration?: number;
    genre?: string;
    year?: number;
  };
}

export function TrackUpload() {
  const { user } = useApp();
  const [uploadingTracks, setUploadingTracks] = useState<UploadingTrack[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [playlistPosition, setPlaylistPosition] = useState<'start' | 'end'>('end');
  const [autoAddToLiveStream, setAutoAddToLiveStream] = useState(true);
  const [generateWaveform, setGenerateWaveform] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract basic metadata from audio file (duration only on frontend)
  const extractBasicMetadata = async (file: File): Promise<any> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      audio.src = objectUrl;
      
      // Parse filename for title and artist
      const fileName = file.name.replace(/\.(mp3|wav|m4a|flac)$/i, '');
      const parts = fileName.split(' - ');
      
      const basicMetadata = {
        title: parts.length >= 2 ? parts.slice(1).join(' - ') : fileName,
        artist: parts.length >= 2 ? parts[0] : 'Unknown Artist',
        album: '',
        genre: 'Funk',
        year: new Date().getFullYear(),
        duration: 180 // default fallback
      };
      
      audio.addEventListener('loadedmetadata', () => {
        const duration = Math.floor(audio.duration);
        URL.revokeObjectURL(objectUrl);
        
        resolve({
          ...basicMetadata,
          duration: duration || 180
        });
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        // Return fallback metadata if audio loading fails
        resolve(basicMetadata);
      });

      // Set timeout for metadata loading
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        resolve(basicMetadata);
      }, 5000);
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  }, []);

  const handleFiles = (files: File[]) => {
    // Filter audio files
    const audioFiles = files.filter(file => {
      const ext = file.name.toLowerCase();
      return ext.endsWith('.mp3') || ext.endsWith('.wav') || ext.endsWith('.m4a') || ext.endsWith('.flac');
    });

    if (audioFiles.length === 0) {
      toast.error('No audio files found. Please upload MP3, WAV, M4A, or FLAC files.');
      return;
    }

    if (audioFiles.length > 50) {
      toast.error('Maximum 50 files at once. Please select fewer files.');
      return;
    }

    // Create upload tasks
    const newTracks: UploadingTrack[] = audioFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'pending',
      progress: 0
    }));

    setUploadingTracks(prev => [...prev, ...newTracks]);

    // Start uploading
    newTracks.forEach(track => uploadTrack(track));

    toast.success(`${audioFiles.length} track(s) added to upload queue`);
  };

  const uploadTrack = async (track: UploadingTrack) => {
    try {
      // Update status to uploading
      updateTrackStatus(track.id, { status: 'uploading', progress: 10 });

      // Create FormData
      const formData = new FormData();
      formData.append('file', track.file);
      formData.append('position', playlistPosition);
      formData.append('autoAddToLiveStream', autoAddToLiveStream.toString());
      formData.append('generateWaveform', generateWaveform.toString());

      // Upload with progress
      const response = await api.uploadTrackFile(formData, (progress) => {
        updateTrackStatus(track.id, { progress });
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Update status to processing
      updateTrackStatus(track.id, { 
        status: 'processing', 
        progress: 90,
        metadata: response.metadata 
      });

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Success
      updateTrackStatus(track.id, { 
        status: 'success', 
        progress: 100,
        metadata: response.metadata,
        shortId: response.shortId,
        streamUrl: response.streamUrl
      });

      toast.success(`${response.metadata.title} uploaded successfully!`);

    } catch (error: any) {
      console.error('Upload error:', error);
      updateTrackStatus(track.id, { 
        status: 'error', 
        progress: 0,
        error: error.message || 'Upload failed' 
      });
      toast.error(`Failed to upload ${track.file.name}: ${error.message}`);
    }
  };

  const updateTrackStatus = (id: string, updates: Partial<UploadingTrack>) => {
    setUploadingTracks(prev =>
      prev.map(track =>
        track.id === id ? { ...track, ...updates } : track
      )
    );
  };

  const removeTrack = (id: string) => {
    setUploadingTracks(prev => prev.filter(track => track.id !== id));
  };

  const clearCompleted = () => {
    setUploadingTracks(prev =>
      prev.filter(track => track.status !== 'success' && track.status !== 'error')
    );
  };

  const retryFailed = () => {
    const failedTracks = uploadingTracks.filter(t => t.status === 'error');
    failedTracks.forEach(track => {
      updateTrackStatus(track.id, { status: 'pending', progress: 0, error: undefined });
      uploadTrack(track);
    });
  };

  const getStatusIcon = (status: UploadingTrack['status']) => {
    switch (status) {
      case 'pending':
        return <FileAudio className="w-5 h-5 text-white/50" />;
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-5 h-5 text-[#00d9ff] animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-[#00ffaa]" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-[#FF8C42]" />;
    }
  };

  const getStatusText = (status: UploadingTrack['status']) => {
    switch (status) {
      case 'pending':
        return 'Waiting...';
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'success':
        return 'Complete';
      case 'error':
        return 'Failed';
    }
  };

  const completedCount = uploadingTracks.filter(t => t.status === 'success').length;
  const failedCount = uploadingTracks.filter(t => t.status === 'error').length;
  const uploadingCount = uploadingTracks.filter(t => t.status === 'uploading' || t.status === 'processing').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Upload className="w-8 h-8 text-[#00d9ff]" />
          <div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
              Track Upload
            </h2>
            <p className="text-white/70 text-sm">Mass upload audio files with automatic processing</p>
          </div>
        </div>

        {uploadingTracks.length > 0 && (
          <div className="flex gap-2">
            {failedCount > 0 && (
              <Button
                onClick={retryFailed}
                variant="outline"
                className="border-[#FF8C42]/30 text-[#FF8C42] hover:bg-[#FF8C42]/10"
                size="sm"
              >
                Retry Failed ({failedCount})
              </Button>
            )}
            {(completedCount > 0 || failedCount > 0) && (
              <Button
                onClick={clearCompleted}
                variant="outline"
                className="border-[#00d9ff]/30"
                size="sm"
              >
                Clear Completed
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Upload Settings */}
      <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Upload Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-white/70 text-sm mb-2 block">
              <ListMusic className="w-4 h-4 inline mr-2" />
              Add to Live Stream Playlist
            </label>
            <Select
              value={autoAddToLiveStream ? 'yes' : 'no'}
              onValueChange={(value) => setAutoAddToLiveStream(value === 'yes')}
            >
              <SelectTrigger className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                <SelectItem value="yes">Yes, add automatically</SelectItem>
                <SelectItem value="no">No, only add to library</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {autoAddToLiveStream && (
            <div>
              <label className="text-white/70 text-sm mb-2 block">
                <Plus className="w-4 h-4 inline mr-2" />
                Playlist Position
              </label>
              <Select value={playlistPosition} onValueChange={(value: 'start' | 'end') => setPlaylistPosition(value)}>
                <SelectTrigger className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                  <SelectItem value="start">Add to beginning</SelectItem>
                  <SelectItem value="end">Add to end</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Advanced Options */}
        <div className="mt-4 p-4 bg-[#0a1628]/50 border border-slate-700 rounded-lg">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <Music className="w-4 h-4" />
            Advanced Options
          </h4>
          
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={generateWaveform}
              onChange={(e) => setGenerateWaveform(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-800 checked:bg-[#00d9ff] checked:border-[#00d9ff] transition-colors"
            />
            <div>
              <p className="text-white font-medium group-hover:text-[#00d9ff] transition-colors">
                Generate Waveform
              </p>
              <p className="text-xs text-slate-400">
                Creates visual waveform data for each track (adds ~2-3 seconds per track)
              </p>
            </div>
          </label>
        </div>

        <div className="mt-4 p-3 bg-[#00d9ff]/5 border border-[#00d9ff]/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#00d9ff] mt-0.5 flex-shrink-0" />
            <div className="text-sm text-white/70">
              <p className="font-semibold text-white mb-1">🎵 Automatic ID3 Processing:</p>
              <ul className="space-y-1 text-xs">
                <li>✅ <strong>ID3 Tags:</strong> Title, Artist, Album, Genre, Year, BPM</li>
                <li>✅ <strong>Cover Art:</strong> Extracted from ID3 or searched via MusicBrainz</li>
                <li>✅ <strong>Duration:</strong> Precisely calculated from audio</li>
                <li>✅ <strong>Auto-tagging:</strong> All tracks tagged with "NEWFUNK"</li>
                <li>📊 <strong>Waveform:</strong> Optional visual data generation</li>
                <li>💾 <strong>Formats:</strong> MP3, WAV, M4A, FLAC (max 50 files/batch)</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Drag & Drop Zone */}
      <Card
        className={`bg-[#0f1c2e]/90 backdrop-blur-sm border-2 border-dashed transition-all ${
          isDragging
            ? 'border-[#00d9ff] bg-[#00d9ff]/5 scale-[1.02]'
            : 'border-[#00d9ff]/30 hover:border-[#00d9ff]/50'
        }`}
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="p-12 text-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <motion.div
            animate={{
              scale: isDragging ? 1.1 : 1,
              rotate: isDragging ? 5 : 0,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Upload className="w-16 h-16 mx-auto mb-4 text-[#00d9ff]" />
          </motion.div>
          
          <h3 className="text-2xl font-bold text-white mb-2">
            {isDragging ? 'Drop files here!' : 'Drag & Drop Audio Files'}
          </h3>
          
          <p className="text-white/70 mb-4">
            or click to browse your computer
          </p>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="border-[#00d9ff]/30 text-[#00d9ff]">
              MP3
            </Badge>
            <Badge variant="outline" className="border-[#00d9ff]/30 text-[#00d9ff]">
              WAV
            </Badge>
            <Badge variant="outline" className="border-[#00d9ff]/30 text-[#00d9ff]">
              M4A
            </Badge>
            <Badge variant="outline" className="border-[#00d9ff]/30 text-[#00d9ff]">
              FLAC
            </Badge>
          </div>

          <p className="text-xs text-white/50 mt-4">
            Up to 50 files at once • Automatic metadata extraction
          </p>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".mp3,.wav,.m4a,.flac,audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </Card>

      {/* Upload Progress */}
      {uploadingTracks.length > 0 && (
        <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Upload Progress ({uploadingTracks.length})
            </h3>
            <div className="flex items-center gap-4 text-sm">
              {uploadingCount > 0 && (
                <span className="text-[#00d9ff]">
                  <Loader2 className="w-4 h-4 inline animate-spin mr-1" />
                  {uploadingCount} uploading
                </span>
              )}
              {completedCount > 0 && (
                <span className="text-[#00ffaa]">
                  <CheckCircle2 className="w-4 h-4 inline mr-1" />
                  {completedCount} completed
                </span>
              )}
              {failedCount > 0 && (
                <span className="text-[#FF8C42]">
                  <XCircle className="w-4 h-4 inline mr-1" />
                  {failedCount} failed
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            <AnimatePresence>
              {uploadingTracks.map((track) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4 bg-[#0a1628]/50 rounded-lg border border-white/5"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="mt-1">{getStatusIcon(track.status)}</div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-white truncate">
                          {track.metadata?.title || track.file.name}
                        </h4>
                        <span className="text-xs text-white/50 ml-2">
                          {getStatusText(track.status)}
                        </span>
                      </div>
                      
                      {track.metadata && (
                        <p className="text-sm text-white/70 truncate">
                          {track.metadata.artist}
                          {track.metadata.album && ` • ${track.metadata.album}`}
                          {track.metadata.duration && ` • ${Math.floor(track.metadata.duration / 60)}:${String(Math.floor(track.metadata.duration % 60)).padStart(2, '0')}`}
                        </p>
                      )}

                      {!track.metadata && (
                        <p className="text-sm text-white/50">
                          {(track.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      )}

                      {track.error && (
                        <p className="text-sm text-[#FF8C42] mt-1">{track.error}</p>
                      )}

                      {(track.status === 'uploading' || track.status === 'processing') && (
                        <Progress value={track.progress} className="mt-2 h-1" />
                      )}
                    </div>

                    {(track.status === 'success' || track.status === 'error') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTrack(track.id)}
                        className="text-white/50 hover:text-white"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {track.status === 'success' && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-white/5">
                      {/* Metadata Success Indicator */}
                      {track.metadata && (
                        <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-xs text-green-400 font-medium">
                            ID3 Metadata Extracted
                          </span>
                          {track.metadata.genre && (
                            <Badge className="bg-purple-500/20 text-purple-300 text-xs ml-auto">
                              {track.metadata.genre}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Tags */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="border-[#00ffaa]/30 text-[#00ffaa] text-xs">
                          NEWFUNK
                        </Badge>
                        {autoAddToLiveStream && (
                          <Badge variant="outline" className="border-[#00d9ff]/30 text-[#00d9ff] text-xs">
                            Added to Live Stream
                          </Badge>
                        )}
                      </div>

                      {/* Streaming Link */}
                      {track.streamUrl && track.shortId && (
                        <div className="space-y-2">
                          {/* Public Player Link */}
                          <div className="bg-[#00ffaa]/5 border border-[#00ffaa]/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <ExternalLink className="w-4 h-4 text-[#00ffaa]" />
                              <span className="text-xs font-semibold text-white uppercase tracking-wide">
                                Public Player Link
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-xs bg-[#0a1628]/80 px-2 py-1.5 rounded border border-[#00ffaa]/10 text-[#00ffaa] font-mono truncate">
                                {window.location.origin}/play/{track.shortId}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/play/${track.shortId}`);
                                  toast.success('Player link copied!');
                                }}
                                className="h-7 w-7 p-0 hover:bg-[#00ffaa]/10"
                              >
                                <Copy className="w-3 h-3 text-[#00ffaa]" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(`/play/${track.shortId}`, '_blank')}
                                className="h-7 w-7 p-0 hover:bg-[#00ffaa]/10"
                              >
                                <ExternalLink className="w-3 h-3 text-[#00ffaa]" />
                              </Button>
                            </div>
                          </div>

                          {/* Direct Stream Link */}
                          <div className="bg-[#00d9ff]/5 border border-[#00d9ff]/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <ExternalLink className="w-4 h-4 text-[#00d9ff]" />
                              <span className="text-xs font-semibold text-white uppercase tracking-wide">
                                Direct Stream URL
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-sm bg-[#0a1628]/80 px-3 py-2 rounded border border-[#00d9ff]/10 text-[#00d9ff] font-mono truncate">
                                {track.streamUrl}
                              </code>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  navigator.clipboard.writeText(track.streamUrl!);
                                  toast.success('Link copied to clipboard!');
                                }}
                                className="border-[#00d9ff]/30 text-[#00d9ff] hover:bg-[#00d9ff]/10 flex-shrink-0"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Open in new tab for testing
                                  window.open(track.streamUrl!, '_blank');
                                }}
                                className="border-[#00ffaa]/30 text-[#00ffaa] hover:bg-[#00ffaa]/10 flex-shrink-0"
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Test
                              </Button>
                            </div>
                            
                            <p className="text-xs text-white/50 mt-2">
                              Share this link to stream the track • Short ID: <span className="text-[#00d9ff] font-mono">{track.shortId}</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Card>
      )}

      {/* Metadata Extraction Demo */}
      {uploadingTracks.length === 0 && (
        <MetadataExtractionDemo />
      )}
    </div>
  );
}