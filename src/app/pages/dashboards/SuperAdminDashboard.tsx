import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { api } from '../../../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { 
  Home,
  Calendar,
  Music,
  Radio,
  Cog,
  Users,
  BarChart3,
  Settings,
  Upload,
  PlayCircle,
  HardDrive,
  Activity,
  TrendingUp,
  Clock,
  ChevronRight,
  Bell,
  Sparkles
} from 'lucide-react';
import { UsersManagement } from './UsersManagement';
import { TrackUpload } from './TrackUpload';
import { LiveStreamPlaylist } from './LiveStreamPlaylist';
import { PlaylistsManagement } from './PlaylistsManagement';
import { ScheduleManagement } from './ScheduleManagement';
import { AutoDJControl } from '../../components/AutoDJControl';
import { ListenersWorldMap } from '../../components/ListenersWorldMap';
import { JinglesLibrary } from '../../components/admin/JinglesLibrary';
import { JingleAutomation } from '../../components/admin/JingleAutomation';
import { StreamSettings } from './StreamSettings';
import { useNavigate } from 'react-router';

interface Stats {
  storage: { used: number; total: number; percentage: number };
  bandwidth: { used: number; total: number; percentage: number };
  totalTracks: number;
  totalPlaylists: number;
  totalUsers: number;
  activeListeners: number;
}

export function SuperAdminDashboard() {
  const { user, signOut, nowPlaying } = useApp();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('home');
  const [stats, setStats] = useState<Stats>({
    storage: { used: 0, total: 50, percentage: 0 },
    bandwidth: { used: 0, total: 20, percentage: 0 },
    totalTracks: 0,
    totalPlaylists: 0,
    totalUsers: 0,
    activeListeners: 0
  });
  const [upcomingShows, setUpcomingShows] = useState<any[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    loadStats();
    loadUpcomingShows();
  }, []);

  const loadStats = async () => {
    try {
      const [tracksData, playlistsData, usageData] = await Promise.all([
        api.getTracks(),
        api.getPlaylists(),
        api.getUsageStats()
      ]);
      
      setStats({
        storage: usageData.storage || { used: 0, total: 50, percentage: 0 },
        bandwidth: usageData.bandwidth || { used: 0, total: 20, percentage: 0 },
        totalTracks: tracksData.tracks?.length || 0,
        totalPlaylists: playlistsData.playlists?.length || 0,
        totalUsers: usageData.totalUsers || 0,
        activeListeners: usageData.activeListeners || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUpcomingShows = async () => {
    try {
      const response = await api.getSchedule();
      const now = new Date();
      const upcoming = (response.schedule || [])
        .filter((show: any) => {
          const showTime = new Date(show.startTime);
          return showTime > now;
        })
        .sort((a: any, b: any) => 
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )
        .slice(0, 5);
      setUpcomingShows(upcoming);
    } catch (error) {
      console.error('Error loading upcoming shows:', error);
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'media', label: 'Media Library', icon: Music },
    { id: 'shows', label: 'Shows & Podcasts', icon: Radio },
    { id: 'automation', label: 'Automation', icon: Sparkles },
    { id: 'jingles', label: 'Jingles', icon: Bell },
    { id: 'playlists', label: 'Playlists', icon: Music },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const renderHome = () => (
    <div className="space-y-6">
      {/* Now Playing Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-white mb-4 font-righteous">Now playing</h2>
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm p-6">
          {nowPlaying ? (
            <div className="flex items-center gap-4">
              {nowPlaying.coverUrl && (
                <img 
                  src={nowPlaying.coverUrl} 
                  alt={nowPlaying.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white">{nowPlaying.title}</h3>
                <p className="text-slate-400">{nowPlaying.artist}</p>
              </div>
              <div className="flex items-center gap-2 text-[#00d9ff]">
                <div className="w-2 h-2 rounded-full bg-[#00d9ff] animate-pulse" />
                <span className="text-sm">Live</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-slate-400">
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <span>No show currently playing</span>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Listen Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h2 className="text-2xl font-bold text-white mb-4 font-righteous">Listen</h2>
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-slate-700/50 flex items-center justify-center">
                <Radio className="w-7 h-7 text-[#00d9ff]" />
              </div>
              <span className="text-lg text-white">
                {nowPlaying ? 'On Air' : 'Off Air'}
              </span>
            </div>
            {nowPlaying && (
              <Button 
                onClick={() => navigate('/')}
                className="bg-[#00d9ff] hover:bg-[#00bfdd] text-slate-900"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Listen Live
              </Button>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Usage Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold text-white mb-4 font-righteous">Usage</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Storage */}
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <HardDrive className="w-5 h-5 text-[#00d9ff]" />
              <h3 className="text-lg font-semibold text-white">Storage</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">
                  {stats.storage.used}GB of {stats.storage.total}GB used
                </span>
                <span className="text-white font-medium">
                  {Math.round((stats.storage.used / stats.storage.total) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.storage.used / stats.storage.total) * 100}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </div>
          </Card>

          {/* Bandwidth */}
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-[#00ffaa]" />
              <h3 className="text-lg font-semibold text-white">Bandwidth</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">
                  {stats.bandwidth.used}TB of {stats.bandwidth.total}TB used
                </span>
                <span className="text-white font-medium">
                  {Math.round((stats.bandwidth.used / stats.bandwidth.total) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#00ffaa] to-[#00d9ff]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.bandwidth.used / stats.bandwidth.total) * 100}%` }}
                  transition={{ duration: 1, delay: 0.6 }}
                />
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Upcoming Shows Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <h2 className="text-2xl font-bold text-white mb-4 font-righteous">Upcoming shows</h2>
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm p-6">
          {upcomingShows.length > 0 ? (
            <div className="space-y-3">
              {upcomingShows.map((show, index) => (
                <motion.div
                  key={show.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-slate-900" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{show.title}</h4>
                      <p className="text-sm text-slate-400">
                        {new Date(show.startTime).toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              No upcoming shows scheduled
            </div>
          )}
        </Card>
      </motion.div>

      {/* Listeners World Map */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <h2 className="text-2xl font-bold text-white mb-4 font-righteous">Live Listeners</h2>
        <ListenersWorldMap />
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="grid grid-cols-3 gap-4"
      >
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm p-4">
          <div className="text-center">
            <Music className="w-8 h-8 text-[#00d9ff] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.totalTracks}</p>
            <p className="text-sm text-slate-400">Tracks</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm p-4">
          <div className="text-center">
            <Music className="w-8 h-8 text-[#00ffaa] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.totalPlaylists}</p>
            <p className="text-sm text-slate-400">Playlists</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm p-4">
          <div className="text-center">
            <Users className="w-8 h-8 text-[#00d9ff] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
            <p className="text-sm text-slate-400">Users</p>
          </div>
        </Card>
      </motion.div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return renderHome();
      case 'schedule':
        return (
          <div>
            <Button
              onClick={() => navigate('/admin/schedule')}
              className="mb-6 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900"
            >
              <Calendar className="size-4 mr-2" />
              Open Full Schedule Manager
            </Button>
            <ScheduleManagement />
          </div>
        );
      case 'media':
        return (
          <div>
            <div className="mb-6 flex items-center gap-3">
              <Button
                onClick={() => navigate('/admin/tracks')}
                className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900"
              >
                <Music className="size-4 mr-2" />
                Tracks Management
              </Button>
            </div>
            <TrackUpload />
          </div>
        );
      case 'shows':
        return (
          <div>
            <Button
              onClick={() => navigate('/admin/shows')}
              className="mb-6 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900"
            >
              <Radio className="size-4 mr-2" />
              Open Shows & Podcasts Manager
            </Button>
            <div className="text-center py-20 text-slate-400">
              <Radio className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Click the button above to access full Shows & Podcasts management</p>
            </div>
          </div>
        );
      case 'automation':
        return (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">AI Content Automation</CardTitle>
                    <CardDescription className="text-slate-400">
                      Автоматическая генерация контента с Perplexity, Claude и ElevenLabs
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => navigate('/admin/automation')}
                    className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:opacity-90"
                  >
                    <Sparkles className="size-4 mr-2" />
                    Открыть AI Automation
                  </Button>
                </div>
              </CardHeader>
            </Card>
            <AutoDJControl />
            <LiveStreamPlaylist />
          </div>
        );
      case 'jingles':
        return (
          <div className="space-y-6">
            <JinglesLibrary />
            <JingleAutomation />
          </div>
        );
      case 'playlists':
        return <PlaylistsManagement />;
      case 'users':
        return <UsersManagement />;
      case 'reports':
        return (
          <div className="text-center py-20">
            <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Reports section coming soon</p>
          </div>
        );
      case 'settings':
        return <StreamSettings />;
      default:
        return renderHome();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628]">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800/50 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] flex items-center justify-center">
                <Radio className="w-6 h-6 text-slate-900" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#00d9ff] font-righteous">Soul</h1>
                <p className="text-xs text-[#00ffaa] font-righteous">FM</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeSection === item.id
                      ? 'bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowUploadDialog(true)}
                className="bg-[#00d9ff] hover:bg-[#00bfdd] text-slate-900 font-medium"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Media
              </Button>
              <Button
                onClick={() => navigate('/')}
                className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:opacity-90 text-slate-900 font-medium"
              >
                <Radio className="w-4 h-4 mr-2" />
                View Site
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
          >
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white font-righteous">Upload Media</h2>
              <Button
                onClick={() => setShowUploadDialog(false)}
                variant="ghost"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </Button>
            </div>
            <div className="p-6">
              <TrackUpload />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}