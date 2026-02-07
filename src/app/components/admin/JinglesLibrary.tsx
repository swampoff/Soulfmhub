import React, { useState, useEffect } from 'react';
import { Play, Pause, Upload, Plus, Filter, Grid3x3, List, Trash2, Edit2, Volume2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';
import { JingleUploadButton } from './JingleUploadButton';
import { JINGLE_CATEGORIES, getCategoryInfo, CATEGORY_GROUPS } from './jingle-categories';

interface Jingle {
  id: string;
  title: string;
  description: string;
  duration: number;
  category: string;
  priority: number;
  active: boolean;
  playCount: number;
  lastPlayed: string | null;
  tags: string[];
  storageFilename: string | null;
  createdAt: string;
}

export function JinglesLibrary() {
  const [jingles, setJingles] = useState<Jingle[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadJingles();
  }, [filterCategory, filterActive]);

  async function loadJingles() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      if (filterActive !== null) params.append('active', filterActive.toString());

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/jingles?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load jingles');
      }

      const data = await response.json();
      setJingles(data.jingles || []);
    } catch (error) {
      console.error('Error loading jingles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteJingle(id: string) {
    if (!confirm('Are you sure you want to delete this jingle?')) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/jingles/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete jingle');
      }

      await loadJingles();
    } catch (error) {
      console.error('Error deleting jingle:', error);
      alert('Failed to delete jingle');
    }
  }

  async function toggleActive(jingle: Jingle) {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/jingles/${jingle.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ active: !jingle.active }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update jingle');
      }

      await loadJingles();
    } catch (error) {
      console.error('Error updating jingle:', error);
    }
  }

  async function playPreview(jingle: Jingle) {
    try {
      // Stop current playback
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }

      // If clicking the same jingle, just stop
      if (playingId === jingle.id) {
        setPlayingId(null);
        setAudioElement(null);
        return;
      }

      // Get signed URL for audio
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/jingles/${jingle.id}/audio`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get audio URL');
      }

      const { audioUrl } = await response.json();

      // Create and play audio
      const audio = new Audio(audioUrl);
      audio.volume = 0.7; // Set volume to 70%
      
      audio.onended = () => {
        setPlayingId(null);
        setAudioElement(null);
      };

      audio.onerror = () => {
        console.error('Error playing audio');
        setPlayingId(null);
        setAudioElement(null);
        alert('Failed to play jingle preview');
      };

      await audio.play();
      setPlayingId(jingle.id);
      setAudioElement(audio);
    } catch (error) {
      console.error('Error playing preview:', error);
      alert('Failed to play jingle preview');
      setPlayingId(null);
      setAudioElement(null);
    }
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-[#00ffaa] bg-clip-text text-transparent">
            Jingles Library
          </h1>
          <p className="text-gray-400 mt-1">
            {jingles.length} jingle{jingles.length !== 1 ? 's' : ''} total
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          <JingleUploadButton onSuccess={loadJingles} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">All Categories</option>
            {JINGLE_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterActive(null)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterActive === null ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterActive(true)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterActive === true ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterActive(false)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterActive === false ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-400'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Jingles Grid/List */}
      {jingles.length === 0 ? (
        <div className="text-center py-20">
          <Volume2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No jingles yet</h3>
          <p className="text-gray-500">Upload your first jingle to get started</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {jingles.map(jingle => {
            const categoryInfo = getCategoryInfo(jingle.category);
            return (
              <div
                key={jingle.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-cyan-500/50 transition-all group"
              >
                {/* Category Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`${categoryInfo.color} text-white text-xs font-semibold px-3 py-1 rounded-full`}>
                    {categoryInfo.label}
                  </span>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <span className="text-sm font-bold">{jingle.priority}</span>
                    <span className="text-xs">★</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-1 truncate">{jingle.title}</h3>
                {jingle.description && (
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{jingle.description}</p>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                  <span>{formatDuration(jingle.duration)}</span>
                  <span>{jingle.playCount} plays</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button className="flex-1 px-3 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center justify-center gap-2">
                    <Play className="w-4 h-4" />
                    Play
                  </button>
                  <button
                    onClick={() => toggleActive(jingle)}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      jingle.active
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                    }`}
                  >
                    {jingle.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => playPreview(jingle)}
                    disabled={!jingle.storageFilename}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      !jingle.storageFilename
                        ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                        : playingId === jingle.id
                        ? 'bg-[#00d9ff]/20 text-[#00d9ff] hover:bg-[#00d9ff]/30'
                        : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                    }`}
                    title={!jingle.storageFilename ? 'No audio file uploaded' : 'Play preview'}
                  >
                    {playingId === jingle.id ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteJingle(jingle.id)}
                    className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {jingles.map(jingle => {
            const categoryInfo = getCategoryInfo(jingle.category);
            return (
              <div
                key={jingle.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:border-cyan-500/50 transition-all flex items-center gap-4"
              >
                <button 
                  onClick={() => playPreview(jingle)}
                  disabled={!jingle.storageFilename}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                    !jingle.storageFilename
                      ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                      : playingId === jingle.id
                      ? 'bg-[#00d9ff] text-slate-900'
                      : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                  }`}
                  title={!jingle.storageFilename ? 'No audio file uploaded' : 'Play preview'}
                >
                  {playingId === jingle.id ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate">{jingle.title}</h3>
                  <p className="text-sm text-gray-400">{formatDuration(jingle.duration)} • {jingle.playCount} plays</p>
                </div>

                <span className={`${categoryInfo.color} text-white text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0`}>
                  {categoryInfo.label}
                </span>

                <div className="flex items-center gap-1 text-yellow-400 flex-shrink-0">
                  <span className="text-sm font-bold">{jingle.priority}</span>
                  <span className="text-xs">★</span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(jingle)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      jingle.active
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                    }`}
                  >
                    {jingle.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => deleteJingle(jingle.id)}
                    className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}