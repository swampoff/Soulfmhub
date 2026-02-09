import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import {
  Radio,
  Music,
  Settings,
  Save,
  RefreshCw,
  Volume2,
  Clock,
  Zap,
  Database,
  Info,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { api } from '../../../lib/api';
import { AdminLayout } from '../../components/admin/AdminLayout';

interface StreamSettingsData {
  stationName: string;
  stationSlogan: string;
  stationGenre: string;
  defaultPlaylistId: string;
  autoAdvanceEnabled: boolean;
  crossfadeDuration: number;
  bufferSize: number;
  bitrate: string;
  maxListeners: number;
  fallbackTrackId: string | null;
  autoRestartOnError: boolean;
  metadataUpdateInterval: number;
}

interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
}

export function StreamSettings() {
  const [settings, setSettings] = useState<StreamSettingsData>({
    stationName: 'Soul FM Hub',
    stationSlogan: 'Your Soul & Funk Headquarters',
    stationGenre: 'Soul, Funk, R&B',
    defaultPlaylistId: 'livestream',
    autoAdvanceEnabled: true,
    crossfadeDuration: 3,
    bufferSize: 8192,
    bitrate: '128',
    maxListeners: 100,
    fallbackTrackId: null,
    autoRestartOnError: true,
    metadataUpdateInterval: 10
  });

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadPlaylists();
  }, []);

  const loadSettings = async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const response = await api.getStreamSettings();
      if (response.settings) {
        setSettings(response.settings);
      }
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.error('Error loading settings:', msg);
      setLoadError(msg);
      toast.error('Could not load stream settings — the server may still be starting up.');
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylists = async () => {
    try {
      const response = await api.getPlaylists();
      setPlaylists(response.playlists || []);
    } catch (error: any) {
      console.error('Error loading playlists:', error?.message || error);
    }
  };

  const handleChange = (field: keyof StreamSettingsData, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateStreamSettings(settings);
      toast.success('Stream settings saved successfully');
      setHasChanges(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    loadSettings();
    setHasChanges(false);
    toast.info('Settings reset to saved values');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12 sm:py-20">
          <RefreshCw className="size-6 sm:size-8 text-[#00d9ff] animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (loadError) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12 sm:py-20 gap-4">
          <AlertCircle className="size-10 text-red-400" />
          <p className="text-white/70 text-sm text-center max-w-md">
            Could not connect to the server. It may still be starting up (cold start).
          </p>
          <p className="text-white/40 text-xs text-center font-mono max-w-md">{loadError}</p>
          <Button
            onClick={loadSettings}
            className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black font-medium"
          >
            <RefreshCw className="size-4 mr-2" />
            Retry
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout maxWidth="wide">
      <div className="w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-righteous truncate">
              Stream Settings
            </h2>
            <p className="text-xs sm:text-sm text-white/60 mt-1">
              Configure your radio station and Auto-DJ parameters
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {hasChanges && (
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm"
              >
                <RefreshCw className="size-3 sm:size-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              size="sm"
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black font-medium hover:opacity-90 text-xs sm:text-sm"
            >
              {saving ? (
                <>
                  <RefreshCw className="size-3 sm:size-4 mr-1.5 sm:mr-2 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                  <span className="sm:hidden">Save</span>
                </>
              ) : (
                <>
                  <Save className="size-3 sm:size-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Save Changes</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Changes Indicator */}
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 sm:p-4"
          >
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertCircle className="size-4 sm:size-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-orange-400 font-medium text-xs sm:text-sm">Unsaved Changes</p>
                <p className="text-xs sm:text-sm text-white/60">Don't forget to save your changes before leaving this page.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Station Information */}
        <Card className="bg-[#141414] border-white/10 p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Radio className="size-5 sm:size-6 text-[#00d9ff] flex-shrink-0" />
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white font-righteous">Station Information</h3>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
                Station Name
              </label>
              <input
                type="text"
                value={settings.stationName}
                onChange={(e) => handleChange('stationName', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-[#00d9ff] transition-colors"
                placeholder="Soul FM Hub"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
                Station Slogan
              </label>
              <input
                type="text"
                value={settings.stationSlogan}
                onChange={(e) => handleChange('stationSlogan', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-[#00d9ff] transition-colors"
                placeholder="Your Soul & Funk Headquarters"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
                Station Genre
              </label>
              <input
                type="text"
                value={settings.stationGenre}
                onChange={(e) => handleChange('stationGenre', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-[#00d9ff] transition-colors"
                placeholder="Soul, Funk, R&B"
              />
            </div>
          </div>
        </Card>

        {/* Auto-DJ Configuration */}
        <Card className="bg-[#141414] border-white/10 p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Zap className="size-5 sm:size-6 text-[#00ffaa] flex-shrink-0" />
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white font-righteous">Auto-DJ Configuration</h3>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
                Default Playlist
              </label>
              <select
                value={settings.defaultPlaylistId}
                onChange={(e) => handleChange('defaultPlaylistId', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-[#00d9ff] transition-colors"
              >
                {playlists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id} className="bg-[#141414]">
                    {playlist.name} ({playlist.trackIds?.length || 0} tracks)
                  </option>
                ))}
              </select>
              <p className="text-[10px] sm:text-xs text-white/40 mt-1">
                This playlist will be used when Auto-DJ starts and no schedule is active
              </p>
            </div>

            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 p-3 sm:p-4 bg-white/5 rounded-lg">
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium text-xs sm:text-sm lg:text-base">Auto-Advance Tracks</p>
                <p className="text-[10px] sm:text-xs lg:text-sm text-white/60">Automatically play next track when current ends</p>
              </div>
              <button
                onClick={() => handleChange('autoAdvanceEnabled', !settings.autoAdvanceEnabled)}
                className={`relative w-12 h-7 sm:w-14 sm:h-8 rounded-full transition-colors flex-shrink-0 ${
                  settings.autoAdvanceEnabled ? 'bg-[#00d9ff]' : 'bg-white/20'
                }`}
              >
                <motion.div
                  className="absolute top-0.5 sm:top-1 left-0.5 sm:left-1 w-6 h-6 bg-white rounded-full shadow-lg"
                  animate={{ x: settings.autoAdvanceEnabled ? (window.innerWidth >= 640 ? 24 : 20) : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 p-3 sm:p-4 bg-white/5 rounded-lg">
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium text-xs sm:text-sm lg:text-base">Auto-Restart on Error</p>
                <p className="text-[10px] sm:text-xs lg:text-sm text-white/60">Automatically restart stream if an error occurs</p>
              </div>
              <button
                onClick={() => handleChange('autoRestartOnError', !settings.autoRestartOnError)}
                className={`relative w-12 h-7 sm:w-14 sm:h-8 rounded-full transition-colors flex-shrink-0 ${
                  settings.autoRestartOnError ? 'bg-[#00d9ff]' : 'bg-white/20'
                }`}
              >
                <motion.div
                  className="absolute top-0.5 sm:top-1 left-0.5 sm:left-1 w-6 h-6 bg-white rounded-full shadow-lg"
                  animate={{ x: settings.autoRestartOnError ? (window.innerWidth >= 640 ? 24 : 20) : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
                Crossfade Duration (seconds)
              </label>
              <div className="flex items-center gap-3 sm:gap-4">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={settings.crossfadeDuration}
                  onChange={(e) => handleChange('crossfadeDuration', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00d9ff]"
                />
                <span className="text-white font-medium w-10 sm:w-12 text-center text-sm sm:text-base">
                  {settings.crossfadeDuration}s
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-white/40 mt-1">
                Smooth transition between tracks
              </p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
                Metadata Update Interval (seconds)
              </label>
              <div className="flex items-center gap-3 sm:gap-4">
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={settings.metadataUpdateInterval}
                  onChange={(e) => handleChange('metadataUpdateInterval', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00ffaa]"
                />
                <span className="text-white font-medium w-10 sm:w-12 text-center text-sm sm:text-base">
                  {settings.metadataUpdateInterval}s
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-white/40 mt-1">
                How often to update Now Playing information
              </p>
            </div>
          </div>
        </Card>

        {/* Stream Quality */}
        <Card className="bg-[#141414] border-white/10 p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Volume2 className="size-5 sm:size-6 text-[#00d9ff] flex-shrink-0" />
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white font-righteous">Stream Quality</h3>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
                Bitrate
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {['64', '128', '192', '320'].map((bitrate) => (
                  <button
                    key={bitrate}
                    onClick={() => handleChange('bitrate', bitrate)}
                    className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 transition-all ${
                      settings.bitrate === bitrate
                        ? 'border-[#00d9ff] bg-[#00d9ff]/10 text-[#00d9ff]'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold text-sm sm:text-base">{bitrate}</div>
                    <div className="text-[10px] sm:text-xs">kbps</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
                Buffer Size
              </label>
              <select
                value={settings.bufferSize}
                onChange={(e) => handleChange('bufferSize', parseInt(e.target.value))}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-[#00d9ff] transition-colors"
              >
                <option value={2048} className="bg-[#141414]">2048 bytes (Low latency)</option>
                <option value={4096} className="bg-[#141414]">4096 bytes (Balanced)</option>
                <option value={8192} className="bg-[#141414]">8192 bytes (Recommended)</option>
                <option value={16384} className="bg-[#141414]">16384 bytes (High quality)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
                Max Concurrent Listeners
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={settings.maxListeners}
                onChange={(e) => handleChange('maxListeners', parseInt(e.target.value))}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-[#00d9ff] transition-colors"
              />
              <p className="text-[10px] sm:text-xs text-white/40 mt-1">
                Maximum number of simultaneous listeners allowed
              </p>
            </div>
          </div>
        </Card>

        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <Info className="size-4 sm:size-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-blue-400 font-medium mb-1 text-xs sm:text-sm">Important Notes</p>
              <ul className="text-xs sm:text-sm text-white/70 space-y-0.5 sm:space-y-1 list-disc list-inside">
                <li>Changes to bitrate and buffer size require restarting Auto-DJ</li>
                <li>Higher bitrate = better quality but more bandwidth usage</li>
                <li className="hidden sm:list-item">Crossfade works best with tracks that have proper fade-in/out</li>
                <li className="hidden sm:list-item">Default playlist is used when no schedule is active</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}