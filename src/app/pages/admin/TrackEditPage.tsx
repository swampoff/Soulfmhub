import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save, Upload, Music, X, Plus, Tag, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { AdminLayout } from '../../components/admin/AdminLayout';

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
  tags?: string[];
  lyrics?: string;
  composer?: string;
  label?: string;
  isrc?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export function TrackEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [newTag, setNewTag] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    album: '',
    genre: 'soul',
    year: '',
    bpm: '',
    tags: [] as string[],
    lyrics: '',
    composer: '',
    label: '',
    isrc: '',
  });

  const genres = ['soul', 'funk', 'jazz', 'disco', 'reggae', 'blues', 'r&b', 'afrobeat'];

  // ISRC validation function
  const validateISRC = (isrc: string): boolean => {
    if (!isrc) return true; // Empty is valid (optional field)
    // ISRC format: AA-XXX-YY-NNNNN
    // AA = Country code (2 letters)
    // XXX = Registrant code (3 alphanumeric)
    // YY = Year (2 digits)
    // NNNNN = Designation code (5 digits)
    const isrcRegex = /^[A-Z]{2}-?[A-Z0-9]{3}-?\d{2}-?\d{5}$/i;
    return isrcRegex.test(isrc.replace(/\s/g, ''));
  };

  const formatISRC = (value: string): string => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Format as AA-XXX-YY-NNNNN
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 7)}-${cleaned.slice(7, 12)}`;
  };

  useEffect(() => {
    loadTrack();
  }, [id]);

  const loadTrack = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await api.getTrack(id);
      const trackData = response.track;
      setTrack(trackData);
      
      setFormData({
        title: trackData.title || '',
        artist: trackData.artist || '',
        album: trackData.album || '',
        genre: trackData.genre || 'soul',
        year: trackData.year?.toString() || '',
        bpm: trackData.bpm?.toString() || '',
        tags: trackData.tags || [],
        lyrics: trackData.lyrics || '',
        composer: trackData.composer || '',
        label: trackData.label || '',
        isrc: trackData.isrc || '',
      });

      if (trackData.coverUrl) {
        setCoverPreview(trackData.coverUrl);
      }
    } catch (error) {
      console.error('Error loading track:', error);
      toast.error('Failed to load track');
      navigate('/admin/tracks');
    } finally {
      setLoading(false);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim().toUpperCase())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim().toUpperCase()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleExtractMetadata = async () => {
    if (!id) return;
    
    setExtracting(true);
    try {
      toast.info('Extracting metadata from audio file...');
      const response = await api.extractTrackMetadata(id);
      
      if (response.metadata) {
        const meta = response.metadata;
        setFormData({
          ...formData,
          title: meta.title || formData.title,
          artist: meta.artist || formData.artist,
          album: meta.album || formData.album,
          genre: meta.genre || formData.genre,
          year: meta.year?.toString() || formData.year,
          bpm: meta.bpm?.toString() || formData.bpm,
          composer: meta.composer || formData.composer,
          label: meta.label || formData.label,
          isrc: meta.isrc || formData.isrc,
        });

        if (meta.coverUrl) {
          setCoverPreview(meta.coverUrl);
        }

        toast.success('Metadata extracted successfully!');
      }
    } catch (error) {
      console.error('Error extracting metadata:', error);
      toast.error('Failed to extract metadata');
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    try {
      // Upload cover if a new one was selected
      let coverUrl = track?.coverUrl;
      if (coverFile) {
        toast.info('Uploading cover...');
        const coverResponse = await api.uploadTrackCover(id, coverFile);
        if (coverResponse.coverUrl) {
          coverUrl = coverResponse.coverUrl;
          toast.success('Cover uploaded successfully');
        }
      }

      await api.updateTrack(id, {
        ...formData,
        year: formData.year ? parseInt(formData.year) : undefined,
        bpm: formData.bpm ? parseInt(formData.bpm) : undefined,
        coverUrl,
      });

      toast.success('Track updated successfully');
      navigate('/admin/tracks');
    } catch (error) {
      console.error('Error updating track:', error);
      toast.error('Failed to update track');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading track...</div>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Track not found</div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            onClick={() => navigate('/admin/tracks')}
            variant="outline"
            className="mb-4 bg-white/5 text-white border-white/20 hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tracks
          </Button>
          <h1 className="text-3xl font-righteous text-white mb-2">Edit Track</h1>
          <p className="text-white/70">Update track information and metadata</p>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Cover Art Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Cover Art</h2>
                <div className="flex items-start gap-6">
                  {/* Preview */}
                  <div className="flex-shrink-0">
                    {coverPreview ? (
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="w-48 h-48 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-48 h-48 rounded-lg bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center">
                        <Music className="w-16 h-16 text-[#00d9ff]" />
                      </div>
                    )}
                  </div>

                  {/* Upload */}
                  <div className="flex-1">
                    <Label htmlFor="cover-upload" className="text-white mb-2 block">
                      Upload New Cover
                    </Label>
                    <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-[#00d9ff]/50 transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-[#00d9ff]" />
                      <p className="text-white/70 text-sm mb-1">
                        Drop image here or click to browse
                      </p>
                      <p className="text-white/50 text-xs">
                        Recommended: 1000x1000px, JPG or PNG
                      </p>
                      <input
                        id="cover-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleCoverChange}
                        className="hidden"
                      />
                    </div>
                    {coverFile && (
                      <p className="text-[#00ffaa] text-sm mt-2">
                        Selected: {coverFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Basic Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Basic Information</h2>
                  <Button
                    type="button"
                    onClick={handleExtractMetadata}
                    disabled={extracting}
                    className="bg-[#00ffaa]/20 text-[#00ffaa] border border-[#00ffaa]/30 hover:bg-[#00ffaa]/30"
                  >
                    {extracting ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Auto-Extract Metadata
                      </>
                    )}
                  </Button>
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
                      {genres.map((genre) => (
                        <option key={genre} value={genre}>
                          {genre.charAt(0).toUpperCase() + genre.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Technical Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Technical Details</h2>
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
                  <div>
                    <Label htmlFor="composer" className="text-white">Composer</Label>
                    <Input
                      id="composer"
                      value={formData.composer}
                      onChange={(e) => setFormData({ ...formData, composer: e.target.value })}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="label" className="text-white">Label</Label>
                    <Input
                      id="label"
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="isrc" className="text-white">
                      ISRC Code
                      {formData.isrc && !validateISRC(formData.isrc) && (
                        <span className="text-red-400 text-xs ml-2">Invalid format (e.g., US-S1Z-99-00001)</span>
                      )}
                      {formData.isrc && validateISRC(formData.isrc) && (
                        <span className="text-[#00ffaa] text-xs ml-2">✓ Valid</span>
                      )}
                    </Label>
                    <Input
                      id="isrc"
                      value={formData.isrc}
                      onChange={(e) => {
                        const formatted = formatISRC(e.target.value);
                        setFormData({ ...formData, isrc: formatted });
                      }}
                      className={`bg-white/5 border-white/20 text-white ${
                        formData.isrc && !validateISRC(formData.isrc) 
                          ? 'border-red-500/50' 
                          : formData.isrc && validateISRC(formData.isrc)
                          ? 'border-[#00ffaa]/50'
                          : ''
                      }`}
                      placeholder="US-S1Z-99-00001"
                      maxLength={17}
                    />
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Tags */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Tags</h2>
                
                {/* Add Tag */}
                <div className="flex gap-2 mb-4">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add tag (e.g., NEWFUNK, CLASSIC, GROOVE)"
                    className="bg-white/5 border-white/20 text-white"
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    className="bg-[#00d9ff] text-[#0a1628] hover:bg-[#00b8dd]"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Tags Display */}
                <div className="flex flex-wrap gap-2">
                  {formData.tags.length === 0 ? (
                    <p className="text-white/50 text-sm">No tags yet. Add tags to organize your tracks.</p>
                  ) : (
                    formData.tags.map((tag) => (
                      <motion.div
                        key={tag}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00d9ff]/20 border border-[#00d9ff]/30"
                      >
                        <Tag className="w-3.5 h-3.5 text-[#00d9ff]" />
                        <span className="text-white text-sm font-semibold">{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-white/70 hover:text-white transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Lyrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Lyrics</h2>
                <Textarea
                  id="lyrics"
                  value={formData.lyrics}
                  onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                  className="bg-white/5 border-white/20 text-white min-h-[200px] font-mono"
                  placeholder="Enter lyrics here..."
                />
              </Card>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex gap-4"
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/tracks')}
                className="flex-1 bg-white/5 text-white border-white/20 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628]"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </motion.div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}