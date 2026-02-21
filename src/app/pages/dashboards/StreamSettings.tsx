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
  PauseCircle,
  Globe,
  Shield,
  Wifi,
  WifiOff,
  Loader2,
  Server,
  ExternalLink,
  Eye,
  EyeOff,
  RotateCcw,
  Activity,
  Headphones,
  Signal,
  Cloud,
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

  // Icecast config
  const [icecast, setIcecast] = useState({
    enabled: false,
    serverUrl: '',
    port: 8000,
    mountPoint: '/live',
    adminUser: 'admin',
    adminPassword: '',
    sourcePassword: '',
    ssl: false,
    listenerUrl: '',
  });
  const [icecastDirty, setIcecastDirty] = useState(false);
  const [icecastSaving, setIcecastSaving] = useState(false);
  const [icecastTesting, setIcecastTesting] = useState(false);
  const [icecastTestResult, setIcecastTestResult] = useState<any>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  // AzuraCast config
  const [azuracast, setAzuracast] = useState({
    enabled: false,
    baseUrl: '',
    stationId: 1,
    stationShortName: '',
    streamUrlHttps: '',
    streamUrlHttp: '',
  });
  const [azuraDirty, setAzuraDirty] = useState(false);
  const [azuraSaving, setAzuraSaving] = useState(false);
  const [azuraTesting, setAzuraTesting] = useState(false);
  const [azuraTestResult, setAzuraTestResult] = useState<any>(null);
  const [azuraStatus, setAzuraStatus] = useState<any>(null);

  useEffect(() => {
    loadSettings();
    loadPlaylists();
    loadIcecastConfig();
    loadAzuraCastConfig();
  }, []);

  const loadIcecastConfig = async () => {
    try {
      const res = await api.getIcecastConfig();
      if (res.config) setIcecast(res.config);
    } catch (err: any) {
      console.error('Error loading icecast config:', err?.message || err);
    }
  };

  const handleIcecastChange = (field: string, value: any) => {
    setIcecast(prev => ({ ...prev, [field]: value }));
    setIcecastDirty(true);
  };

  const handleIcecastSave = async () => {
    setIcecastSaving(true);
    try {
      const res = await api.saveIcecastConfig(icecast);
      if (res.success) {
        toast.success('Icecast configuration saved');
        setIcecastDirty(false);
        if (res.listenerUrl) {
          setIcecast(prev => ({ ...prev, listenerUrl: prev.listenerUrl || '' }));
        }
      } else {
        toast.error(res.error || 'Failed to save');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Save failed');
    } finally {
      setIcecastSaving(false);
    }
  };

  const handleIcecastTest = async () => {
    setIcecastTesting(true);
    setIcecastTestResult(null);
    try {
      const res = await api.testIcecastConnection();
      setIcecastTestResult(res);
      if (res.success) {
        toast.success(res.mountActive ? 'Icecast connected — mount is active!' : 'Icecast connected — no source on mount yet');
      } else {
        toast.error(res.error || 'Connection test failed');
      }
    } catch (err: any) {
      setIcecastTestResult({ success: false, error: err?.message || 'Test failed' });
      toast.error(err?.message || 'Connection test failed');
    } finally {
      setIcecastTesting(false);
    }
  };

  // AzuraCast handlers
  const loadAzuraCastConfig = async () => {
    try {
      const res = await api.getAzuraCastConfig();
      if (res.config) setAzuracast(res.config);
      // Also load status
      const status = await api.getAzuraCastStatus().catch(() => null);
      if (status) setAzuraStatus(status);
    } catch (err: any) {
      console.error('Error loading AzuraCast config:', err?.message || err);
    }
  };

  const handleAzuraChange = (field: string, value: any) => {
    setAzuracast(prev => ({ ...prev, [field]: value }));
    setAzuraDirty(true);
  };

  const handleAzuraSave = async () => {
    setAzuraSaving(true);
    try {
      const res = await api.saveAzuraCastConfig(azuracast);
      if (res.success) {
        toast.success('AzuraCast configuration saved');
        setAzuraDirty(false);
      } else {
        toast.error(res.error || 'Failed to save');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Save failed');
    } finally {
      setAzuraSaving(false);
    }
  };

  const handleAzuraTest = async () => {
    setAzuraTesting(true);
    setAzuraTestResult(null);
    try {
      const res = await api.testAzuraCastConnection();
      setAzuraTestResult(res);
      if (res.success) {
        toast.success(`Connected to AzuraCast! ${res.station?.name || ''} — ${res.listeners?.total ?? 0} listeners`);
      } else {
        toast.error(res.error || 'Connection test failed');
      }
    } catch (err: any) {
      setAzuraTestResult({ success: false, error: err?.message || 'Test failed' });
      toast.error(err?.message || 'Connection test failed');
    } finally {
      setAzuraTesting(false);
    }
  };

  const handleAzuraRestart = async () => {
    if (!confirm('Restart the AzuraCast station? This will briefly interrupt the stream.')) return;
    try {
      const res = await api.restartAzuraCastStation();
      if (res.success) {
        toast.success('Station restart initiated');
      } else {
        toast.error(res.error || 'Restart failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Restart failed');
    }
  };

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

        {/* ═══════ AZURACAST SERVER (PRIMARY) ═══════ */}
        <Card className="bg-[#141414] border-[#00d9ff]/20 p-4 sm:p-6 relative overflow-hidden">
          {/* Accent glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00d9ff] via-[#00ffaa] to-[#00d9ff]" />

          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Cloud className="size-5 sm:size-6 text-[#00d9ff] flex-shrink-0" />
              <div>
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white font-righteous">AzuraCast Server</h3>
                <p className="text-[10px] sm:text-xs text-white/40 mt-0.5">Primary streaming server with Auto DJ</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {azuraStatus?.status === 'online' && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                  <Activity className="size-3 mr-1" />
                  Live
                </Badge>
              )}
              <button
                onClick={() => handleAzuraChange('enabled', !azuracast.enabled)}
                className={`relative w-12 h-7 sm:w-14 sm:h-8 rounded-full transition-colors flex-shrink-0 ${
                  azuracast.enabled ? 'bg-[#00d9ff]' : 'bg-white/20'
                }`}
              >
                <motion.div
                  className="absolute top-0.5 sm:top-1 left-0.5 sm:left-1 w-6 h-6 bg-white rounded-full shadow-lg"
                  animate={{ x: azuracast.enabled ? (typeof window !== 'undefined' && window.innerWidth >= 640 ? 24 : 20) : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>

          {/* Live status banner */}
          {azuraStatus?.nowPlaying && (
            <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-[#00d9ff]/10 to-[#00ffaa]/10 border border-[#00d9ff]/20">
              <div className="flex items-center gap-3">
                {azuraStatus.nowPlaying.art && (
                  <img src={azuraStatus.nowPlaying.art} alt="" className="w-10 h-10 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#00d9ff]">Now Playing on AzuraCast</p>
                  <p className="text-sm text-white font-medium truncate">{azuraStatus.nowPlaying.artist} — {azuraStatus.nowPlaying.title}</p>
                </div>
                <div className="flex items-center gap-1 text-[#00ffaa]">
                  <Headphones className="size-3.5" />
                  <span className="text-sm font-mono">{azuraStatus.listeners?.total ?? 0}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 sm:space-y-4">
            {/* Base URL + Station ID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                  AzuraCast Panel URL
                </label>
                <input
                  type="text"
                  value={azuracast.baseUrl}
                  onChange={(e) => handleAzuraChange('baseUrl', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00d9ff] transition-colors font-mono"
                  placeholder="http://187.77.85.42"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                  Station ID
                </label>
                <input
                  type="number"
                  value={azuracast.stationId}
                  onChange={(e) => handleAzuraChange('stationId', parseInt(e.target.value) || 1)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00d9ff] transition-colors font-mono"
                />
              </div>
            </div>

            {/* Short name */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                Station Short Name
              </label>
              <input
                type="text"
                value={azuracast.stationShortName}
                onChange={(e) => handleAzuraChange('stationShortName', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00d9ff] transition-colors font-mono"
                placeholder="soul_fm_"
              />
            </div>

            {/* Stream URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                  <Signal className="size-3 inline mr-1" />
                  HTTPS Stream URL <span className="text-[#00ffaa]">(recommended)</span>
                </label>
                <input
                  type="text"
                  value={azuracast.streamUrlHttps}
                  onChange={(e) => handleAzuraChange('streamUrlHttps', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00d9ff] transition-colors font-mono"
                  placeholder="https://stream.soul-fm.com/soulfm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                  HTTP Stream URL <span className="text-white/30">(fallback)</span>
                </label>
                <input
                  type="text"
                  value={azuracast.streamUrlHttp}
                  onChange={(e) => handleAzuraChange('streamUrlHttp', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00d9ff] transition-colors font-mono"
                  placeholder="http://187.77.85.42:8000/soulfm"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={handleAzuraSave}
                disabled={!azuraDirty || azuraSaving}
                size="sm"
                className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black font-medium hover:opacity-90 text-xs sm:text-sm"
              >
                {azuraSaving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
                Save Config
              </Button>
              <Button
                onClick={handleAzuraTest}
                disabled={azuraTesting || !azuracast.baseUrl}
                size="sm"
                variant="outline"
                className="border-[#00d9ff]/30 text-[#00d9ff] hover:bg-[#00d9ff]/10 text-xs sm:text-sm"
              >
                {azuraTesting ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Wifi className="size-4 mr-1.5" />}
                Test Connection
              </Button>
              {azuracast.enabled && (
                <Button
                  onClick={handleAzuraRestart}
                  size="sm"
                  variant="outline"
                  className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-xs sm:text-sm"
                >
                  <RotateCcw className="size-4 mr-1.5" />
                  Restart Station
                </Button>
              )}
              {azuracast.baseUrl && (
                <a
                  href={azuracast.baseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#00d9ff]/70 hover:text-[#00d9ff] transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  Open AzuraCast Panel
                </a>
              )}
            </div>

            {/* Test Result */}
            {azuraTestResult && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-lg p-3 sm:p-4 border ${
                  azuraTestResult.success
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  {azuraTestResult.success ? (
                    <CheckCircle className="size-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="size-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    {azuraTestResult.success ? (
                      <>
                        <p className="text-green-400 font-medium text-sm">
                          Connected to {azuraTestResult.station?.name || 'AzuraCast'}
                        </p>
                        {azuraTestResult.nowPlaying && (
                          <p className="text-xs text-white/60">
                            Now Playing: <span className="text-[#00d9ff]">{azuraTestResult.nowPlaying.artist} — {azuraTestResult.nowPlaying.title}</span>
                          </p>
                        )}
                        <p className="text-xs text-white/60">
                          Listeners: <span className="text-[#00ffaa]">{azuraTestResult.listeners?.total ?? 0}</span>
                          {' '} | API Auth: {azuraTestResult.authOk ? <span className="text-green-400">OK</span> : <span className="text-yellow-400">Failed (check API Key)</span>}
                          {' '} | Stream: {azuraTestResult.streamOk ? <span className="text-green-400">OK</span> : <span className="text-yellow-400">Not reachable</span>}
                        </p>
                        {azuraTestResult.stationDetails?.mounts?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-white/40">Mounts:</p>
                            {azuraTestResult.stationDetails.mounts.map((m: any, i: number) => (
                              <p key={i} className="text-xs font-mono text-white/50">
                                {m.name} — {m.format} {m.bitrate}kbps — {m.listeners} listeners {m.isDefault ? '(default)' : ''}
                              </p>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-red-400 text-sm">{azuraTestResult.error}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </Card>

        {/* ═══════ ICECAST SERVER CONFIGURATION (Legacy) ═══════ */}
        <Card className="bg-[#141414] border-white/10 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Server className="size-5 sm:size-6 text-[#00ffaa] flex-shrink-0" />
              <div>
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white font-righteous">Icecast Direct (Legacy)</h3>
                <p className="text-[10px] sm:text-xs text-white/40 mt-0.5">Manual Icecast config — use AzuraCast above instead</p>
              </div>
            </div>
            <button
              onClick={() => handleIcecastChange('enabled', !icecast.enabled)}
              className={`relative w-12 h-7 sm:w-14 sm:h-8 rounded-full transition-colors flex-shrink-0 ${
                icecast.enabled ? 'bg-[#00ffaa]' : 'bg-white/20'
              }`}
            >
              <motion.div
                className="absolute top-0.5 sm:top-1 left-0.5 sm:left-1 w-6 h-6 bg-white rounded-full shadow-lg"
                animate={{ x: icecast.enabled ? (typeof window !== 'undefined' && window.innerWidth >= 640 ? 24 : 20) : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {/* Server URL + Port */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                  Server URL
                </label>
                <input
                  type="text"
                  value={icecast.serverUrl}
                  onChange={(e) => handleIcecastChange('serverUrl', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00ffaa] transition-colors font-mono"
                  placeholder="icecast.soulfm.azure.com"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                  Port
                </label>
                <input
                  type="number"
                  value={icecast.port}
                  onChange={(e) => handleIcecastChange('port', parseInt(e.target.value) || 8000)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00ffaa] transition-colors font-mono"
                />
              </div>
            </div>

            {/* Mount Point + SSL */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                  Mount Point
                </label>
                <input
                  type="text"
                  value={icecast.mountPoint}
                  onChange={(e) => handleIcecastChange('mountPoint', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00ffaa] transition-colors font-mono"
                  placeholder="/live"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => handleIcecastChange('ssl', !icecast.ssl)}
                  className={`w-full flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-lg border transition-colors text-sm ${
                    icecast.ssl
                      ? 'border-[#00ffaa]/50 bg-[#00ffaa]/10 text-[#00ffaa]'
                      : 'border-white/10 bg-white/5 text-white/60'
                  }`}
                >
                  <Shield className="size-4" />
                  <span>SSL / HTTPS</span>
                </button>
              </div>
            </div>

            {/* Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                  Admin User
                </label>
                <input
                  type="text"
                  value={icecast.adminUser}
                  onChange={(e) => handleIcecastChange('adminUser', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00ffaa] transition-colors font-mono"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                  Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={icecast.adminPassword}
                    onChange={(e) => handleIcecastChange('adminPassword', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00ffaa] transition-colors font-mono pr-10"
                  />
                  <button onClick={() => setShowPasswords(!showPasswords)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                  Source Password
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={icecast.sourcePassword}
                  onChange={(e) => handleIcecastChange('sourcePassword', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00ffaa] transition-colors font-mono"
                />
              </div>
            </div>

            {/* Custom Listener URL (optional) */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                Custom Listener URL <span className="text-white/30">(optional — overrides auto-generated URL)</span>
              </label>
              <input
                type="text"
                value={icecast.listenerUrl || ''}
                onChange={(e) => handleIcecastChange('listenerUrl', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00ffaa] transition-colors font-mono"
                placeholder="https://stream.soulfm.radio/live"
              />
              <p className="text-[10px] sm:text-xs text-white/30 mt-1">
                Auto: {icecast.serverUrl ? `${icecast.ssl ? 'https' : 'http'}://${icecast.serverUrl.replace(/^https?:\/\//, '')}:${icecast.port}${icecast.mountPoint}` : '—'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={handleIcecastSave}
                disabled={!icecastDirty || icecastSaving}
                size="sm"
                className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black font-medium hover:opacity-90 text-xs sm:text-sm"
              >
                {icecastSaving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
                Save Icecast Config
              </Button>
              <Button
                onClick={handleIcecastTest}
                disabled={icecastTesting || !icecast.serverUrl}
                size="sm"
                variant="outline"
                className="border-[#00ffaa]/30 text-[#00ffaa] hover:bg-[#00ffaa]/10 text-xs sm:text-sm"
              >
                {icecastTesting ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Wifi className="size-4 mr-1.5" />}
                Test Connection
              </Button>
            </div>

            {/* Test Result */}
            {icecastTestResult && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-lg p-3 sm:p-4 border ${
                  icecastTestResult.success
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  {icecastTestResult.success ? (
                    <CheckCircle className="size-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="size-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    {icecastTestResult.success ? (
                      <>
                        <p className="text-green-400 font-medium text-sm">
                          Connected to {icecastTestResult.server?.serverId || 'Icecast'}
                        </p>
                        <p className="text-xs text-white/60">
                          Mount {icecast.mountPoint}: {icecastTestResult.mountActive ? (
                            <span className="text-green-400">Active — {icecastTestResult.mountInfo?.listeners ?? 0} listeners, {icecastTestResult.mountInfo?.bitrate || '?'}</span>
                          ) : (
                            <span className="text-yellow-400">No source connected</span>
                          )}
                        </p>
                        <p className="text-xs text-white/40">
                          Admin auth: {icecastTestResult.adminAuth ? <span className="text-green-400">OK</span> : <span className="text-yellow-400">Failed</span>}
                        </p>
                        {icecastTestResult.listenerUrl && (
                          <p className="text-xs font-mono text-[#00d9ff] truncate">
                            {icecastTestResult.listenerUrl}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-red-400 text-sm">{icecastTestResult.error}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
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