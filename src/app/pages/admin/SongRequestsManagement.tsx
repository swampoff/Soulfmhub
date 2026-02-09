import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../../lib/api';
import { toast } from 'sonner';
import { 
  Music, 
  Check, 
  X, 
  ThumbsUp, 
  MapPin,
  Clock,
  User,
  MessageSquare,
  Filter,
  RefreshCw
} from 'lucide-react';

interface SongRequest {
  id: string;
  requester_name: string;
  requester_location: string;
  track_id: string;
  custom_song_title: string;
  custom_artist: string;
  message: string;
  status: string;
  votes: number;
  created_at: string;
  moderation_note?: string;
}

export function SongRequestsManagement() {
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [stats, setStats] = useState({ active: 0, nextCheck: 0 });

  useEffect(() => {
    loadRequests();
    loadStats();
    const interval = setInterval(() => {
      loadRequests();
      loadStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  async function loadRequests() {
    try {
      const headers = await getAuthHeaders();
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/song-requests${filter !== 'all' ? `?status=${filter}` : ''}`;
      
      const response = await fetch(url, {
        headers
      });

      if (!response.ok) throw new Error('Failed to load requests');

      const data = await response.json();
      setRequests(data.requests);
    } catch (error: any) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/song-requests/stats`,
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

  async function moderateRequest(requestId: string, status: 'approved' | 'rejected', priority: number = 0) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/song-requests/${requestId}/moderate`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            status,
            priority,
            note: status === 'approved' ? 'Approved for airplay' : 'Not suitable for airplay'
          })
        }
      );

      if (!response.ok) throw new Error('Failed to moderate request');

      toast.success(`Request ${status}!`);
      loadRequests();
      loadStats();
    } catch (error: any) {
      console.error('Error moderating request:', error);
      toast.error('Failed to moderate request');
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

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    approved: 'bg-green-500/20 text-green-400 border-green-500/50',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/50',
    played: 'bg-blue-500/20 text-blue-400 border-blue-500/50'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] text-white p-8">
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
                🎵 Song Requests
              </h1>
              <p className="text-gray-400">
                Moderate listener song requests
              </p>
            </div>
            
            <Button
              onClick={() => loadRequests()}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gray-800/50 border-cyan-500/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Requests</p>
                  <p className="text-2xl font-bold text-cyan-400">{stats.active}</p>
                </div>
                <Music className="w-8 h-8 text-cyan-400 opacity-50" />
              </div>
            </Card>

            <Card className="bg-gray-800/50 border-cyan-500/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Tracks Until Next</p>
                  <p className="text-2xl font-bold text-purple-400">{stats.nextCheck}/5</p>
                </div>
                <Clock className="w-8 h-8 text-purple-400 opacity-50" />
              </div>
            </Card>

            <Card className="bg-gray-800/50 border-cyan-500/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Pending Review</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {requests.filter(r => r.status === 'pending').length}
                  </p>
                </div>
                <Filter className="w-8 h-8 text-yellow-400 opacity-50" />
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['pending', 'approved', 'rejected', 'played', 'all'].map((status) => (
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
                  {requests.filter(r => r.status === status).length}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {loading ? (
            <Card className="bg-gray-800/50 border-cyan-500/30 p-8 text-center">
              <p className="text-gray-400">Loading requests...</p>
            </Card>
          ) : requests.length === 0 ? (
            <Card className="bg-gray-800/50 border-cyan-500/30 p-8 text-center">
              <Music className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">No {filter !== 'all' ? filter : ''} requests found</p>
            </Card>
          ) : (
            requests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-gray-800/50 border-cyan-500/30 p-6 hover:border-cyan-500/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Song Info */}
                      <div className="mb-3">
                        <h3 className="text-xl font-bold mb-1">
                          {request.custom_song_title || 'Track from Library'}
                        </h3>
                        <p className="text-gray-400">
                          {request.custom_artist || request.track_id}
                        </p>
                      </div>

                      {/* Requester Info */}
                      <div className="flex flex-wrap gap-4 mb-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <User className="w-4 h-4" />
                          {request.requester_name}
                        </div>
                        
                        {request.requester_location && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <MapPin className="w-4 h-4" />
                            {request.requester_location}
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-gray-400">
                          <ThumbsUp className="w-4 h-4" />
                          {request.votes} votes
                        </div>

                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock className="w-4 h-4" />
                          {formatTimeAgo(request.created_at)}
                        </div>
                      </div>

                      {/* Message */}
                      {request.message && (
                        <div className="mb-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-300">{request.message}</p>
                          </div>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[request.status as keyof typeof statusColors]}`}>
                          {request.status.toUpperCase()}
                        </span>
                        
                        {request.moderation_note && (
                          <span className="text-xs text-gray-500">
                            Note: {request.moderation_note}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {request.status === 'pending' && (
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => moderateRequest(request.id, 'approved', 10)}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 gap-2 whitespace-nowrap"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => moderateRequest(request.id, 'rejected')}
                          size="sm"
                          variant="destructive"
                          className="gap-2 whitespace-nowrap"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}