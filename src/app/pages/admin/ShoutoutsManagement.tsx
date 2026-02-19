import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { projectId } from '../../../../utils/supabase/info';
import { getAuthHeaders } from '../../../lib/api';
import { toast } from 'sonner';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { 
  MessageCircle, 
  Check, 
  X, 
  Calendar,
  MapPin,
  Clock,
  User,
  Heart,
  Cake,
  Gift,
  RefreshCw,
  Edit
} from 'lucide-react';

interface Shoutout {
  id: string;
  sender_name: string;
  sender_location: string;
  recipient_name: string;
  occasion: string;
  message: string;
  tts_script: string;
  status: string;
  created_at: string;
  scheduled_date?: string;
  scheduled_time?: string;
  moderation_note?: string;
}

export function ShoutoutsManagement() {
  const [shoutouts, setShoutouts] = useState<Shoutout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [stats, setStats] = useState({ pending: 0, nextCheck: 0 });
  const [editingScript, setEditingScript] = useState<string | null>(null);
  const [editedScript, setEditedScript] = useState('');

  useEffect(() => {
    loadShoutouts();
    loadStats();
    const interval = setInterval(() => {
      loadShoutouts();
      loadStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  async function loadShoutouts() {
    try {
      const headers = await getAuthHeaders();
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/shoutouts${filter !== 'all' ? `?status=${filter}` : ''}`;
      
      const response = await fetch(url, {
        headers
      });

      if (!response.ok) throw new Error('Failed to load shoutouts');

      const data = await response.json();
      setShoutouts(data.shoutouts);
    } catch (error: any) {
      console.error('Error loading shoutouts:', error);
      toast.error('Failed to load shoutouts');
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/shoutouts/stats`,
        {
          headers
        }
      );

      if (!response.ok) throw new Error('Failed to load stats');

      const data = await response.json();
      setStats(data);
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  }

  async function moderateShoutout(
    shoutoutId: string, 
    status: 'approved' | 'rejected' | 'scheduled',
    scheduledDate?: string,
    scheduledTime?: string,
    ttsScript?: string
  ) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/shoutouts/${shoutoutId}/moderate`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            status,
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
            tts_script: ttsScript,
            priority: status === 'approved' ? 10 : 0,
            note: status === 'approved' ? 'Approved for airplay' : status === 'rejected' ? 'Not suitable' : 'Scheduled'
          })
        }
      );

      if (!response.ok) throw new Error('Failed to moderate shoutout');

      toast.success(`Shoutout ${status}!`);
      setEditingScript(null);
      loadShoutouts();
      loadStats();
    } catch (error: any) {
      console.error('Error moderating shoutout:', error);
      toast.error('Failed to moderate shoutout');
    }
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  const occasionIcons: Record<string, any> = {
    birthday: Cake,
    anniversary: Heart,
    graduation: Gift,
    default: MessageCircle
  };

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    approved: 'bg-green-500/20 text-green-400 border-green-500/50',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/50',
    scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    played: 'bg-purple-500/20 text-purple-400 border-purple-500/50'
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 font-['Righteous']">
                💬 Shoutouts & Dedications
              </h1>
              <p className="text-gray-400">
                Moderate listener shoutouts
              </p>
            </div>
            
            <Button
              onClick={() => loadShoutouts()}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gray-800/50 border-cyan-500/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Pending Shoutouts</p>
                  <p className="text-2xl font-bold text-cyan-400">{stats.pending}</p>
                </div>
                <MessageCircle className="w-8 h-8 text-cyan-400 opacity-50" />
              </div>
            </Card>

            <Card className="bg-gray-800/50 border-cyan-500/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Tracks Until Next</p>
                  <p className="text-2xl font-bold text-purple-400">{stats.nextCheck}/10</p>
                </div>
                <Clock className="w-8 h-8 text-purple-400 opacity-50" />
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['pending', 'approved', 'scheduled', 'rejected', 'played', 'all'].map((status) => (
            <Button
              key={status}
              onClick={() => setFilter(status)}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              className={filter === status ? 'bg-cyan-500' : ''}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {shoutouts.filter(s => s.status === status).length}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Shoutouts List */}
        <div className="space-y-4">
          {loading ? (
            <Card className="bg-gray-800/50 border-cyan-500/30 p-8 text-center">
              <p className="text-gray-400">Loading shoutouts...</p>
            </Card>
          ) : shoutouts.length === 0 ? (
            <Card className="bg-gray-800/50 border-cyan-500/30 p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">No {filter !== 'all' ? filter : ''} shoutouts found</p>
            </Card>
          ) : (
            shoutouts.map((shoutout, index) => {
              const OccasionIcon = occasionIcons[shoutout.occasion] || occasionIcons.default;
              
              return (
                <motion.div
                  key={shoutout.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-gray-800/50 border-cyan-500/30 p-6 hover:border-cyan-500/50 transition-colors">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <OccasionIcon className="w-6 h-6 text-pink-400 mt-1 flex-shrink-0" />
                          <div>
                            <h3 className="text-xl font-bold mb-1">
                              {shoutout.occasion && `${shoutout.occasion.charAt(0).toUpperCase() + shoutout.occasion.slice(1)} shoutout for `}
                              {shoutout.recipient_name}
                            </h3>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                From: {shoutout.sender_name}
                              </div>
                              
                              {shoutout.sender_location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  {shoutout.sender_location}
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {formatTimeAgo(shoutout.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${statusColors[shoutout.status as keyof typeof statusColors]}`}>
                          {shoutout.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Original Message */}
                      <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <p className="text-sm font-medium text-gray-400 mb-2">Original Message:</p>
                        <p className="text-gray-300">{shoutout.message}</p>
                      </div>

                      {/* TTS Script */}
                      <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-cyan-400">TTS Script for Airplay:</p>
                          {shoutout.status === 'pending' && editingScript !== shoutout.id && (
                            <Button
                              onClick={() => {
                                setEditingScript(shoutout.id);
                                setEditedScript(shoutout.tts_script);
                              }}
                              size="sm"
                              variant="ghost"
                              className="gap-2 text-cyan-400 hover:text-cyan-300"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </Button>
                          )}
                        </div>
                        
                        {editingScript === shoutout.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editedScript}
                              onChange={(e) => setEditedScript(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-sm"
                              rows={4}
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => setEditingScript(null)}
                                size="sm"
                                variant="outline"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => moderateShoutout(shoutout.id, 'approved', undefined, undefined, editedScript)}
                                size="sm"
                                className="bg-green-500 hover:bg-green-600"
                              >
                                Save & Approve
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-300 text-sm italic">"{shoutout.tts_script}"</p>
                        )}
                      </div>

                      {/* Scheduling Info */}
                      {shoutout.scheduled_date && (
                        <div className="flex items-center gap-2 text-sm text-blue-400">
                          <Calendar className="w-4 h-4" />
                          Scheduled for: {shoutout.scheduled_date} at {shoutout.scheduled_time}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {shoutout.status === 'pending' && editingScript !== shoutout.id && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => moderateShoutout(shoutout.id, 'approved')}
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Approve Now
                          </Button>
                          <Button
                            onClick={() => {
                              const date = prompt('Schedule date (YYYY-MM-DD):');
                              const time = prompt('Schedule time (HH:MM:SS):', '12:00:00');
                              if (date && time) {
                                moderateShoutout(shoutout.id, 'scheduled', date, time);
                              }
                            }}
                            size="sm"
                            variant="outline"
                            className="gap-2"
                          >
                            <Calendar className="w-4 h-4" />
                            Schedule
                          </Button>
                          <Button
                            onClick={() => moderateShoutout(shoutout.id, 'rejected')}
                            size="sm"
                            variant="destructive"
                            className="gap-2"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}