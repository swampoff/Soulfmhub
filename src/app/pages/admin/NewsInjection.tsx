import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { NewsVoiceOverManager } from '../../components/admin/NewsVoiceOverManager';
import { NewsInjectionRules } from '../../components/admin/NewsInjectionRules';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  RadioTower,
  Mic,
  Clock,
  Calendar,
  Play,
  RefreshCw,
  Activity,
  TrendingUp,
  Volume2,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { projectId } from '../../../../utils/supabase/info';
import { getAuthHeaders } from '../../../lib/api';

export function NewsInjection() {
  const [activeTab, setActiveTab] = useState('voice-overs');
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/news-injection/stats`,
        {
          headers
        }
      );

      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const runScheduling = async () => {
    setScheduling(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/news-injection/schedule/run`,
        {
          method: 'POST',
          headers
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(`Scheduled ${data.count} news injections`);
        loadStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error running scheduling:', error);
      toast.error(error.message || 'Failed to run scheduling');
    } finally {
      setScheduling(false);
    }
  };

  React.useEffect(() => {
    loadStats();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <RadioTower className="w-8 h-8 text-[#00d9ff]" />
                News Injection System
              </h1>
              <p className="text-gray-400 mt-2">
                Automatically generate and inject news into your radio stream
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={loadStats}
                disabled={loadingStats}
                className="border-gray-700 hover:bg-white/5"
              >
                {loadingStats ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
              <Button
                onClick={runScheduling}
                disabled={scheduling}
                className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black"
              >
                {scheduling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Run Scheduler
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-[#00d9ff]/10 to-[#00ffaa]/10 border border-[#00d9ff]/30 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-[#00d9ff] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white mb-1">
                How News Injection Works
              </h3>
              <div className="text-xs text-gray-300 space-y-1">
                <p>1. Generate TTS voice-overs for news articles using ElevenLabs</p>
                <p>2. Create injection rules to schedule when news should play</p>
                <p>3. The system automatically queues news based on your rules</p>
                <p>4. Auto-DJ inserts news between tracks at the right time</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Overview */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-[#141414] border-gray-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Voice-Overs</p>
                      <p className="text-2xl font-bold text-white">{stats.totalVoiceOvers}</p>
                    </div>
                    <Mic className="w-8 h-8 text-[#00d9ff] opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#141414] border-gray-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Active Rules</p>
                      <p className="text-2xl font-bold text-white">{stats.activeRules}</p>
                    </div>
                    <Clock className="w-8 h-8 text-[#00ffaa] opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#141414] border-gray-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Pending Queue</p>
                      <p className="text-2xl font-bold text-white">{stats.pendingQueue}</p>
                    </div>
                    <Play className="w-8 h-8 text-purple-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#141414] border-gray-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Most Played</p>
                      <p className="text-sm font-bold text-white truncate">
                        {stats.mostPlayed?.[0]?.news_title || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {stats.mostPlayed?.[0]?.play_count || 0} plays
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Main Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-[#141414] border border-gray-800 p-1">
              <TabsTrigger
                value="voice-overs"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00d9ff] data-[state=active]:to-[#00ffaa] data-[state=active]:text-black"
              >
                <Mic className="w-4 h-4 mr-2" />
                Voice-Overs
              </TabsTrigger>
              <TabsTrigger
                value="rules"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00d9ff] data-[state=active]:to-[#00ffaa] data-[state=active]:text-black"
              >
                <Clock className="w-4 h-4 mr-2" />
                Injection Rules
              </TabsTrigger>
              <TabsTrigger
                value="queue"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00d9ff] data-[state=active]:to-[#00ffaa] data-[state=active]:text-black"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Queue
              </TabsTrigger>
            </TabsList>

            <TabsContent value="voice-overs" className="space-y-6">
              <NewsVoiceOverManager />
            </TabsContent>

            <TabsContent value="rules" className="space-y-6">
              <NewsInjectionRules />
            </TabsContent>

            <TabsContent value="queue" className="space-y-6">
              <QueueView />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </AdminLayout>
  );
}

// Queue View Component
function QueueView() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/news-injection/queue`,
        {
          headers
        }
      );

      const data = await response.json();
      setQueue(data.queue || []);
    } catch (error) {
      console.error('Error loading queue:', error);
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#00d9ff]" />
      </div>
    );
  }

  return (
    <Card className="bg-[#141414] border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>News Queue</CardTitle>
            <CardDescription>Upcoming news injections</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={loadQueue}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {queue.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No news scheduled</p>
            <p className="text-sm mt-1">Run the scheduler to queue news injections</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map(item => (
              <div
                key={item.id}
                className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">
                      {item.news_voice_over?.news_title}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                      <span>
                        📅 {new Date(item.scheduled_time).toLocaleString()}
                      </span>
                      <Badge
                        variant={
                          item.status === 'completed' ? 'default' :
                          item.status === 'pending' ? 'secondary' :
                          'outline'
                        }
                        className={
                          item.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          ''
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}