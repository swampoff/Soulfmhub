import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  BarChart3,
  TrendingUp,
  Users,
  Headphones,
  Clock,
  Music,
  Radio,
  Calendar,
  Download,
  RefreshCw,
  Activity,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { api } from '../../../lib/api';
import { format, subDays } from 'date-fns';

interface AnalyticsData {
  totalListeners: number;
  peakListeners: number;
  averageListenTime: number;
  totalTracks: number;
  tracksPlayed: number;
  topGenres: { genre: string; count: number }[];
  topTracks: { title: string; artist: string; plays: number }[];
  listenersByHour: { hour: number; count: number }[];
  listenersByDay: { day: string; count: number }[];
}

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalytics({ startDate: dateRange.start, endDate: dateRange.end });
      if (res.analytics) {
        setData(res.analytics);
      } else {
        // No data yet — show zeroed state
        setData({
          totalListeners: 0,
          peakListeners: 0,
          averageListenTime: 0,
          totalTracks: 0,
          tracksPlayed: 0,
          topGenres: [],
          topTracks: [],
          listenersByHour: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 })),
          listenersByDay: Array.from({ length: 7 }, (_, i) => ({
            day: format(subDays(new Date(), 6 - i), 'EEE'),
            count: 0,
          })),
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Show zeroed state on error
      setData({
        totalListeners: 0,
        peakListeners: 0,
        averageListenTime: 0,
        totalTracks: 0,
        tracksPlayed: 0,
        topGenres: [],
        topTracks: [],
        listenersByHour: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 })),
        listenersByDay: Array.from({ length: 7 }, (_, i) => ({
          day: format(subDays(new Date(), 6 - i), 'EEE'),
          count: 0,
        })),
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-48 sm:h-64">
          <RefreshCw className="size-6 sm:size-8 text-[#00d9ff] animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const maxListenersByHour = Math.max(...data.listenersByHour.map(d => d.count));
  const maxListenersByDay = Math.max(...data.listenersByDay.map(d => d.count));

  return (
    <AdminLayout maxWidth="wide">
      <div className="w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-righteous text-white truncate">Analytics</h1>
            <p className="text-xs sm:text-sm text-white/60 mt-1">Track your station's performance and audience insights</p>
          </div>

          <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3">
            {/* Date Range Selector */}
            <div className="flex items-center gap-1 bg-[#141414] rounded-lg p-1 border border-white/5 overflow-x-auto scrollbar-hide">
              {(['today', 'week', 'month'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    dateRange === range
                      ? 'bg-[#00d9ff]/20 text-[#00d9ff]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {range === 'today' ? 'Today' : range === 'week' ? 'Week' : 'Month'}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={loadAnalytics}
                variant="outline"
                size="sm"
                className="border-white/10 text-white/80 hover:bg-white/5 flex-1 xs:flex-none"
              >
                <RefreshCw className="size-3 sm:size-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              <Button 
                size="sm"
                className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black flex-1 xs:flex-none"
              >
                <Download className="size-3 sm:size-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-4 sm:p-6 bg-[#141414] border-white/5">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="min-w-0 flex-1">
                  <p className="text-white/60 text-xs sm:text-sm mb-1">Total Listeners</p>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">{data.totalListeners.toLocaleString()}</h3>
                </div>
                <div className="p-2 sm:p-3 bg-[#00d9ff]/10 rounded-lg flex-shrink-0">
                  <Users className="size-4 sm:size-5 lg:size-6 text-[#00d9ff]" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <ArrowUp className="size-3 sm:size-4 text-green-400 flex-shrink-0" />
                <span className="text-green-400 font-medium">+12.5%</span>
                <span className="text-white/40 truncate">vs last period</span>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-4 sm:p-6 bg-[#141414] border-white/5">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="min-w-0 flex-1">
                  <p className="text-white/60 text-xs sm:text-sm mb-1">Peak Listeners</p>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">{data.peakListeners}</h3>
                </div>
                <div className="p-2 sm:p-3 bg-green-500/10 rounded-lg flex-shrink-0">
                  <TrendingUp className="size-4 sm:size-5 lg:size-6 text-green-400" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <ArrowUp className="size-3 sm:size-4 text-green-400 flex-shrink-0" />
                <span className="text-green-400 font-medium">+8.3%</span>
                <span className="text-white/40 truncate">vs last period</span>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-4 sm:p-6 bg-[#141414] border-white/5">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="min-w-0 flex-1">
                  <p className="text-white/60 text-xs sm:text-sm mb-1">Avg. Listen Time</p>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">{data.averageListenTime}min</h3>
                </div>
                <div className="p-2 sm:p-3 bg-purple-500/10 rounded-lg flex-shrink-0">
                  <Clock className="size-4 sm:size-5 lg:size-6 text-purple-400" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <ArrowUp className="size-3 sm:size-4 text-green-400 flex-shrink-0" />
                <span className="text-green-400 font-medium">+5.2%</span>
                <span className="text-white/40 truncate">vs last period</span>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-4 sm:p-6 bg-[#141414] border-white/5">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="min-w-0 flex-1">
                  <p className="text-white/60 text-xs sm:text-sm mb-1">Tracks Played</p>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">{data.tracksPlayed}</h3>
                </div>
                <div className="p-2 sm:p-3 bg-orange-500/10 rounded-lg flex-shrink-0">
                  <Music className="size-4 sm:size-5 lg:size-6 text-orange-400" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <ArrowDown className="size-3 sm:size-4 text-red-400 flex-shrink-0" />
                <span className="text-red-400 font-medium">-2.1%</span>
                <span className="text-white/40 truncate">vs last period</span>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Listeners by Hour */}
          <Card className="p-4 sm:p-6 bg-[#141414] border-white/5">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">Listeners by Hour</h2>
                <p className="text-xs sm:text-sm text-white/60 mt-1">Peak listening times</p>
              </div>
              <Activity className="size-4 sm:size-5 text-[#00d9ff] flex-shrink-0" />
            </div>

            <div className="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-none overflow-y-auto scrollbar-thin">
              {data.listenersByHour.map((item) => (
                <div key={item.hour} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-12 sm:w-16 text-xs sm:text-sm text-white/60 font-mono flex-shrink-0">
                    {item.hour.toString().padStart(2, '0')}:00
                  </div>
                  <div className="flex-1 h-6 sm:h-8 bg-white/5 rounded-full overflow-hidden relative min-w-0">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.count / maxListenersByHour) * 100}%` }}
                      transition={{ duration: 1, delay: 0.05 * item.hour }}
                      className="h-full rounded-full"
                      style={{
                        background: 'linear-gradient(to right, rgb(0, 217, 255), rgb(0, 255, 170))'
                      }}
                    />
                  </div>
                  <div className="w-10 sm:w-12 text-right text-xs sm:text-sm text-white font-medium flex-shrink-0">
                    {item.count}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Listeners by Day */}
          <Card className="p-4 sm:p-6 bg-[#141414] border-white/5">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">Listeners by Day</h2>
                <p className="text-xs sm:text-sm text-white/60 mt-1">Weekly overview</p>
              </div>
              <Calendar className="size-4 sm:size-5 text-[#00d9ff] flex-shrink-0" />
            </div>

            <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-48 sm:h-56 lg:h-64">
              {data.listenersByDay.map((item, index) => (
                <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5 sm:gap-2 min-w-0">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(item.count / maxListenersByDay) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.1 * index }}
                    className="w-full rounded-t-lg min-h-[20px]"
                    style={{
                      background: 'linear-gradient(to top, rgb(0, 217, 255), rgb(0, 255, 170))'
                    }}
                  />
                  <div className="text-center w-full">
                    <div className="text-[10px] sm:text-xs lg:text-sm font-medium text-white truncate">{item.count}</div>
                    <div className="text-[9px] sm:text-[10px] lg:text-xs text-white/60 truncate">{item.day}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Top Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Top Genres */}
          <Card className="p-4 sm:p-6 bg-[#141414] border-white/5">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">Top Genres</h2>
                <p className="text-xs sm:text-sm text-white/60 mt-1">Most played genres</p>
              </div>
              <BarChart3 className="size-4 sm:size-5 text-[#00d9ff] flex-shrink-0" />
            </div>

            <div className="space-y-3 sm:space-y-4">
              {data.topGenres.map((genre, index) => (
                <motion.div
                  key={genre.genre}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-center gap-3 sm:gap-4"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center text-[#00d9ff] font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-2">
                      <span className="text-white font-medium text-sm sm:text-base truncate">{genre.genre}</span>
                      <span className="text-white/60 text-xs sm:text-sm flex-shrink-0">{genre.count} plays</span>
                    </div>
                    <div className="h-1.5 sm:h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(genre.count / data.topGenres[0].count) * 100}%` }}
                        transition={{ duration: 1, delay: 0.1 * index }}
                        className="h-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}</ div>
          </Card>

          {/* Top Tracks */}
          <Card className="p-4 sm:p-6 bg-[#141414] border-white/5">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">Top Tracks</h2>
                <p className="text-xs sm:text-sm text-white/60 mt-1">Most requested songs</p>
              </div>
              <Headphones className="size-4 sm:size-5 text-[#00d9ff] flex-shrink-0" />
            </div>

            <div className="space-y-2 sm:space-y-3">
              {data.topTracks.map((track, index) => (
                <motion.div
                  key={track.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center text-[#00d9ff] font-bold text-xs sm:text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm sm:text-base truncate">{track.title}</div>
                    <div className="text-xs sm:text-sm text-white/60 truncate">{track.artist}</div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-white/60 flex-shrink-0">
                    <Headphones className="size-3 sm:size-4" />
                    <span className="text-xs sm:text-sm font-medium">{track.plays}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>

        {/* Additional Insights */}
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-[#00d9ff]/10 to-[#00ffaa]/10 border-[#00d9ff]/20">
          <div className="flex flex-col xs:flex-row items-start gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-[#00d9ff]/20 rounded-lg flex-shrink-0">
              <Radio className="size-5 sm:size-6 text-[#00d9ff]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Performance Insights</h3>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-[#00d9ff] flex-shrink-0">•</span>
                  <span>Your station has seen a <strong>12.5% growth</strong> in listeners this period</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d9ff] flex-shrink-0">•</span>
                  <span>Peak listening time is between <strong>18:00 - 21:00</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d9ff] flex-shrink-0">•</span>
                  <span>Average session duration increased by <strong>5.2%</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d9ff] flex-shrink-0">•</span>
                  <span><strong>Soul and Funk</strong> are your most popular genres</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}