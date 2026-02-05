import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  TrendingUp,
  Radio,
  Music2,
  DollarSign,
  Globe,
  Activity,
  Calendar,
  Clock,
  Headphones,
  BarChart3,
  Download,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../../lib/api';
import { AnimatedPalm } from '../components/AnimatedPalm';

interface AnalyticsData {
  currentListeners: number;
  peakListeners: number;
  totalTracks: number;
  totalShows: number;
  totalPlaylists: number;
  topTracks: Array<{ id: string; title: string; artist: string; plays: number }>;
  topShows: Array<{ id: string; name: string; listeners: number }>;
  listenersByCountry: Record<string, number>;
}

// Mock data for demonstrations
const generateListenerData = () => {
  const data = [];
  for (let i = 23; i >= 0; i--) {
    data.push({
      time: `${i}:00`,
      listeners: Math.floor(Math.random() * 300) + 150,
      peak: Math.floor(Math.random() * 100) + 350,
    });
  }
  return data.reverse();
};

const weeklyData = [
  { day: 'Mon', listeners: 1250, hours: 8500 },
  { day: 'Tue', listeners: 1480, hours: 9200 },
  { day: 'Wed', listeners: 1320, hours: 8800 },
  { day: 'Thu', listeners: 1690, hours: 10200 },
  { day: 'Fri', listeners: 2150, hours: 12500 },
  { day: 'Sat', listeners: 2430, hours: 14200 },
  { day: 'Sun', listeners: 1980, hours: 11800 },
];

const genreData = [
  { name: 'Soul', value: 35, color: '#00d9ff' },
  { name: 'Funk', value: 25, color: '#00ffaa' },
  { name: 'Jazz', value: 20, color: '#FF8C42' },
  { name: 'Disco', value: 12, color: '#E91E63' },
  { name: 'Reggae', value: 8, color: '#9C27B0' },
];

const countryData = [
  { country: 'USA', listeners: 3245, percentage: 42 },
  { country: 'UK', listeners: 1823, percentage: 24 },
  { country: 'Germany', listeners: 987, percentage: 13 },
  { country: 'France', listeners: 654, percentage: 9 },
  { country: 'Canada', listeners: 432, percentage: 6 },
  { country: 'Others', listeners: 459, percentage: 6 },
];

const deviceData = [
  { name: 'Desktop', value: 45, color: '#00d9ff' },
  { name: 'Mobile', value: 38, color: '#00ffaa' },
  { name: 'Tablet', value: 12, color: '#FF8C42' },
  { name: 'Smart Speaker', value: 5, color: '#E91E63' },
];

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('24h');
  const [listenerData, setListenerData] = useState(generateListenerData());

  useEffect(() => {
    loadAnalytics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadAnalytics();
      setListenerData(generateListenerData());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await api.getAnalytics();
      setAnalytics(data.analytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Use mock data on error
      setAnalytics({
        currentListeners: 287,
        peakListeners: 1843,
        totalTracks: 12458,
        totalShows: 45,
        totalPlaylists: 128,
        topTracks: [
          { id: '1', title: 'Superstition', artist: 'Stevie Wonder', plays: 2543 },
          { id: '2', title: 'Ain\'t No Mountain High Enough', artist: 'Marvin Gaye', plays: 2234 },
          { id: '3', title: 'September', artist: 'Earth, Wind & Fire', plays: 2098 },
          { id: '4', title: 'Lovely Day', artist: 'Bill Withers', plays: 1987 },
          { id: '5', title: 'Use Me', artist: 'Bill Withers', plays: 1876 },
        ],
        topShows: [
          { id: '1', name: 'Funky Mornings', listeners: 8234 },
          { id: '2', name: 'Midnight Soul', listeners: 7521 },
          { id: '3', name: 'Crate Diggers', listeners: 6789 },
          { id: '4', name: 'Evening Vibes', listeners: 5432 },
          { id: '5', name: 'Soul Sessions', listeners: 4987 },
        ],
        listenersByCountry: {
          USA: 3245,
          UK: 1823,
          Germany: 987,
          France: 654,
          Canada: 432,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, change, trend }: any) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className="p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border-white/20 hover:border-[#00d9ff]/50 transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 border border-[#00d9ff]/30">
            <Icon className="w-6 h-6 text-[#00d9ff]" />
          </div>
          {change && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
              trend === 'up' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <TrendingUp className={`w-3 h-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
              {change}
            </div>
          )}
        </div>
        <div>
          <p className="text-white/60 text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
      </Card>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-[#00d9ff] animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] relative overflow-hidden py-12">
      {/* Animated Palms - Left */}
      <AnimatedPalm side="left" delay={0.3} />
      
      {/* Animated Palms - Right */}
      <AnimatedPalm side="right" delay={0.5} />

      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-[#00d9ff] rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-[#00ffaa] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-[#FF8C42] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#00d9ff]/20 to-[#00ffaa]/20 border border-[#00d9ff]/30 mb-4">
                <BarChart3 className="w-4 h-4 text-[#00d9ff]" />
                <span className="text-[#00d9ff] font-semibold text-sm">ANALYTICS</span>
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
                Station Analytics
              </h1>
              <p className="text-white/70 text-lg">
                Real-time insights and performance metrics
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <div className="flex gap-1 p-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                {(['24h', '7d', '30d', '90d'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      timeRange === range
                        ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628]'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {range.toUpperCase()}
                  </button>
                ))}
              </div>

              <Button
                onClick={loadAnalytics}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>

              <Button className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] hover:opacity-90">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            label="Current Listeners"
            value={analytics?.currentListeners.toLocaleString() || '0'}
            change="+12.5%"
            trend="up"
          />
          <StatCard
            icon={TrendingUp}
            label="Peak Listeners (24h)"
            value={analytics?.peakListeners.toLocaleString() || '0'}
            change="+8.3%"
            trend="up"
          />
          <StatCard
            icon={Music2}
            label="Total Tracks"
            value={analytics?.totalTracks.toLocaleString() || '0'}
            change="+245"
            trend="up"
          />
          <StatCard
            icon={Radio}
            label="Active Shows"
            value={analytics?.totalShows || '0'}
            change="+3"
            trend="up"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Listeners Over Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Listeners Over Time</h3>
                  <p className="text-white/60 text-sm">Last 24 hours</p>
                </div>
                <Activity className="w-6 h-6 text-[#00d9ff]" />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={listenerData}>
                  <defs>
                    <linearGradient id="colorListeners" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00d9ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10, 22, 40, 0.95)',
                      border: '1px solid rgba(0, 217, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="listeners"
                    stroke="#00d9ff"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorListeners)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Weekly Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Weekly Performance</h3>
                  <p className="text-white/60 text-sm">Listeners & listening hours</p>
                </div>
                <Calendar className="w-6 h-6 text-[#00ffaa]" />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10, 22, 40, 0.95)',
                      border: '1px solid rgba(0, 255, 170, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="listeners" fill="#00d9ff" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="hours" fill="#00ffaa" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Genre Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Genre Distribution</h3>
                  <p className="text-white/60 text-sm">Tracks played by genre</p>
                </div>
                <Music2 className="w-6 h-6 text-[#FF8C42]" />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={genreData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {genreData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10, 22, 40, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Device Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Device Distribution</h3>
                  <p className="text-white/60 text-sm">Listening platforms</p>
                </div>
                <Headphones className="w-6 h-6 text-[#E91E63]" />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10, 22, 40, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Tracks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 h-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Top Tracks</h3>
                  <p className="text-white/60 text-sm">Most played this week</p>
                </div>
                <Music2 className="w-6 h-6 text-[#00d9ff]" />
              </div>
              <div className="space-y-4">
                {analytics?.topTracks.map((track, index) => (
                  <div key={track.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center">
                      <span className="text-[#00d9ff] font-bold text-sm">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{track.title}</p>
                      <p className="text-white/60 text-sm truncate">{track.artist}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#00ffaa] font-bold">{track.plays.toLocaleString()}</p>
                      <p className="text-white/40 text-xs">plays</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Top Shows */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 h-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Top Shows</h3>
                  <p className="text-white/60 text-sm">Most popular shows</p>
                </div>
                <Radio className="w-6 h-6 text-[#00ffaa]" />
              </div>
              <div className="space-y-4">
                {analytics?.topShows.map((show, index) => (
                  <div key={show.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ffaa]/20 to-[#00d9ff]/20 flex items-center justify-center">
                      <span className="text-[#00ffaa] font-bold text-sm">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{show.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#00d9ff] font-bold">{show.listeners.toLocaleString()}</p>
                      <p className="text-white/40 text-xs">listeners</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Geography */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 h-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Top Countries</h3>
                  <p className="text-white/60 text-sm">Listeners by location</p>
                </div>
                <Globe className="w-6 h-6 text-[#FF8C42]" />
              </div>
              <div className="space-y-4">
                {countryData.map((country) => (
                  <div key={country.country}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-semibold">{country.country}</span>
                      <span className="text-white/70">{country.listeners.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] rounded-full transition-all duration-500"
                        style={{ width: `${country.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}