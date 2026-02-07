import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Users, Music, Radio, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { api } from '../../../lib/api';
import { motion } from 'motion/react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { InitDataButton } from '../../components/InitDataButton';

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [donationStats, setDonationStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [analyticsData, donationsData] = await Promise.all([
        api.getAnalytics(),
        api.getDonationStats(),
      ]);

      setAnalytics(analyticsData.analytics || {});
      setDonationStats(donationsData.stats || {});
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading dashboard...</div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Current Listeners',
      value: analytics.currentListeners || 0,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      change: '+12%',
    },
    {
      title: 'Peak Listeners',
      value: analytics.peakListeners || 0,
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      change: '+8%',
    },
    {
      title: 'Total Tracks',
      value: analytics.totalTracks || 0,
      icon: Music,
      color: 'from-purple-500 to-pink-500',
      change: '+24',
    },
    {
      title: 'Monthly Donations',
      value: `$${donationStats?.total || 0}`,
      icon: DollarSign,
      color: 'from-orange-500 to-red-500',
      change: `${((donationStats?.total / donationStats?.monthlyGoal) * 100 || 0).toFixed(0)}%`,
    },
  ];

  // Mock data for charts
  const listenerData = [
    { time: '00:00', listeners: 45 },
    { time: '04:00', listeners: 28 },
    { time: '08:00', listeners: 89 },
    { time: '12:00', listeners: 156 },
    { time: '16:00', listeners: 234 },
    { time: '20:00', listeners: 312 },
    { time: '23:59', listeners: 178 },
  ];

  const genreData = [
    { name: 'Soul', value: 35 },
    { name: 'Funk', value: 25 },
    { name: 'Jazz', value: 20 },
    { name: 'Disco', value: 12 },
    { name: 'Reggae', value: 8 },
  ];

  const COLORS = ['#FF8C42', '#FF6347', '#00CED1', '#FF69B4', '#4CAF50'];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-righteous text-white mb-2">Dashboard</h1>
        <p className="text-white/70">Welcome back! Here's what's happening with Soul FM Hub today.</p>
      </motion.div>

      {/* Init Data Button */}
      <InitDataButton />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`bg-gradient-to-br ${stat.color} p-6 text-white`}>
                <div className="flex items-start justify-between mb-4">
                  <Icon className="w-8 h-8 opacity-80" />
                  <span className="text-sm font-semibold bg-white/20 px-2 py-1 rounded">
                    {stat.change}
                  </span>
                </div>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm opacity-90">{stat.title}</div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Listeners Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Listeners Today</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={listenerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="listeners"
                  stroke="#FF8C42"
                  strokeWidth={3}
                  dot={{ fill: '#FF8C42', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Genre Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Genre Distribution</h3>
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      {/* Top Tracks and Shows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tracks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Top Tracks (7 days)</h3>
            <div className="space-y-3">
              {analytics.topTracks?.slice(0, 5).map((track: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="text-2xl font-bold text-white/50 min-w-[30px]">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">
                      {track.title}
                    </div>
                    <div className="text-white/70 text-sm truncate">
                      {track.artist}
                    </div>
                  </div>
                  <div className="text-white/60 text-sm">
                    {track.plays} plays
                  </div>
                </div>
              )) || (
                <div className="text-white/50 text-center py-8">No data available</div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Top Shows */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Top Shows</h3>
            <div className="space-y-3">
              {analytics.topShows?.slice(0, 5).map((show: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="text-2xl font-bold text-white/50 min-w-[30px]">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">
                      {show.name}
                    </div>
                    <div className="text-white/70 text-sm truncate">
                      {show.host}
                    </div>
                  </div>
                  <div className="text-white/60 text-sm">
                    {show.avgListeners} avg
                  </div>
                </div>
              )) || (
                <div className="text-white/50 text-center py-8">No data available</div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Stream Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Activity className="w-8 h-8 text-green-500" />
              <div>
                <h3 className="text-xl font-bold text-white">Stream Status</h3>
                <p className="text-white/70">All systems operational</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">99.8%</div>
                <div className="text-sm text-white/70">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">128kbps</div>
                <div className="text-sm text-white/70">Bitrate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">●</div>
                <div className="text-sm text-white/70">Online</div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}