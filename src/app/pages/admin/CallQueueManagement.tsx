import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../../lib/api';
import { toast } from 'sonner';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { 
  PhoneCall, 
  PhoneIncoming,
  PhoneOff,
  Check, 
  X,
  MapPin,
  Clock,
  User,
  MessageSquare,
  RefreshCw,
  Radio
} from 'lucide-react';

interface Call {
  id: string;
  caller_name: string;
  caller_phone: string;
  caller_location: string;
  call_reason: string;
  topic: string;
  notes: string;
  status: string;
  queue_position: number;
  created_at: string;
  screener_notes?: string;
  connected_at?: string;
  disconnected_at?: string;
  call_duration?: number;
}

export function CallQueueManagement() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    loadCalls();
    fetchCurrentDJSession();
    const interval = setInterval(loadCalls, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchCurrentDJSession() {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/dj-sessions/current`,
        {
          headers
        }
      );
      if (!response.ok) return;
      const data = await response.json();
      if (data.isLive && data.session?.id) {
        setSessionId(data.session.id);
      }
    } catch (error) {
      console.error('Error fetching DJ session:', error);
    }
  }

  async function loadCalls() {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/call-queue`,
        {
          headers
        }
      );

      if (!response.ok) throw new Error('Failed to load calls');

      const data = await response.json();
      setCalls(data.queue);
      
      // Check for active call
      const active = data.queue.find((c: Call) => c.status === 'on_air');
      setActiveCall(active || null);
    } catch (error: any) {
      console.error('Error loading calls:', error);
    } finally {
      setLoading(false);
    }
  }

  async function screenCall(callId: string, status: 'approved' | 'rejected', notes: string = '') {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/call-queue/${callId}/screen`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ status, notes })
        }
      );

      if (!response.ok) throw new Error('Failed to screen call');

      toast.success(`Call ${status}!`);
      loadCalls();
    } catch (error: any) {
      console.error('Error screening call:', error);
      toast.error('Failed to screen call');
    }
  }

  async function connectCall(callId: string) {
    if (!sessionId) {
      toast.error('No active DJ session. Go to Live DJ Console to start a session first.');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/call-queue/${callId}/connect`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ session_id: sessionId })
        }
      );

      if (!response.ok) throw new Error('Failed to connect call');

      toast.success('Call connected! 🔴 ON AIR');
      loadCalls();
    } catch (error: any) {
      console.error('Error connecting call:', error);
      toast.error('Failed to connect call');
    }
  }

  async function disconnectCall(callId: string) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/call-queue/${callId}/disconnect`,
        {
          method: 'POST',
          headers
        }
      );

      if (!response.ok) throw new Error('Failed to disconnect call');

      toast.success('Call ended');
      loadCalls();
    } catch (error: any) {
      console.error('Error disconnecting call:', error);
      toast.error('Failed to disconnect call');
    }
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  const statusColors = {
    waiting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    screened: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    approved: 'bg-green-500/20 text-green-400 border-green-500/50',
    on_air: 'bg-red-500/20 text-red-400 border-red-500/50',
    completed: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/50'
  };

  const reasonIcons: Record<string, string> = {
    request: '🎵',
    shoutout: '💬',
    question: '❓',
    comment: '💭',
    contest: '🎁'
  };

  const waitingCalls = calls.filter(c => ['waiting', 'screened', 'approved'].includes(c.status));
  const completedCalls = calls.filter(c => ['completed', 'rejected'].includes(c.status));

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
                📞 Call Queue
              </h1>
              <p className="text-gray-400">
                Screen and manage listener calls
              </p>
            </div>
            
            <Button
              onClick={() => loadCalls()}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Active Call Banner */}
        {activeCall && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-4 h-4 bg-red-500 rounded-full"
                  />
                  <div>
                    <h2 className="text-2xl font-bold font-['Righteous']">
                      🔴 ON AIR: {activeCall.caller_name}
                    </h2>
                    <p className="text-gray-300">
                      {activeCall.caller_location} • {activeCall.call_reason}
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={() => disconnectCall(activeCall.id)}
                  variant="destructive"
                  size="lg"
                  className="gap-2"
                >
                  <PhoneOff className="w-5 h-5" />
                  End Call
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Queue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gray-800/50 border-cyan-500/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Waiting</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {calls.filter(c => c.status === 'waiting').length}
                </p>
              </div>
              <PhoneCall className="w-8 h-8 text-yellow-400 opacity-50" />
            </div>
          </Card>

          <Card className="bg-gray-800/50 border-cyan-500/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Approved</p>
                <p className="text-2xl font-bold text-green-400">
                  {calls.filter(c => c.status === 'approved').length}
                </p>
              </div>
              <Check className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </Card>

          <Card className="bg-gray-800/50 border-cyan-500/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">On Air</p>
                <p className="text-2xl font-bold text-red-400">
                  {activeCall ? 1 : 0}
                </p>
              </div>
              <Radio className="w-8 h-8 text-red-400 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Call Queue */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold font-['Righteous']">Active Queue</h2>
          
          {waitingCalls.length === 0 ? (
            <Card className="bg-gray-800/50 border-cyan-500/30 p-8 text-center">
              <PhoneCall className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">No calls in queue</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {waitingCalls.map((call, index) => (
                <motion.div
                  key={call.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-gray-800/50 border-cyan-500/30 p-6 hover:border-cyan-500/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Position Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/20 rounded-full text-cyan-400 text-sm font-bold mb-3">
                          #{call.queue_position}
                        </div>

                        {/* Caller Info */}
                        <h3 className="text-xl font-bold mb-2">
                          {reasonIcons[call.call_reason] || '📞'} {call.caller_name}
                        </h3>

                        <div className="flex flex-wrap gap-4 mb-3 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <PhoneCall className="w-4 h-4" />
                            {call.caller_phone}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {call.caller_location}
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {formatTimeAgo(call.created_at)}
                          </div>
                        </div>

                        {/* Topic */}
                        {call.topic && (
                          <div className="mb-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                            <p className="text-sm text-gray-300">{call.topic}</p>
                          </div>
                        )}

                        {/* Screener Notes */}
                        {call.screener_notes && (
                          <div className="mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                            <p className="text-xs text-blue-400 mb-1">Screener Notes:</p>
                            <p className="text-sm text-gray-300">{call.screener_notes}</p>
                          </div>
                        )}

                        {/* Status Badge */}
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${statusColors[call.status as keyof typeof statusColors]}`}>
                          {call.status.toUpperCase().replace('_', ' ')}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2">
                        {call.status === 'waiting' && (
                          <>
                            <Button
                              onClick={() => {
                                const notes = prompt('Screener notes (optional):');
                                screenCall(call.id, 'approved', notes || '');
                              }}
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 gap-2 whitespace-nowrap"
                            >
                              <Check className="w-4 h-4" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => screenCall(call.id, 'rejected', 'Not suitable')}
                              size="sm"
                              variant="destructive"
                              className="gap-2 whitespace-nowrap"
                            >
                              <X className="w-4 h-4" />
                              Reject
                            </Button>
                          </>
                        )}

                        {call.status === 'approved' && (
                          <Button
                            onClick={() => connectCall(call.id)}
                            size="sm"
                            className="bg-red-500 hover:bg-red-600 gap-2 whitespace-nowrap"
                          >
                            <PhoneIncoming className="w-4 h-4" />
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Recent Calls */}
          {completedCalls.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold font-['Righteous'] mb-4">Recent Calls</h2>
              <div className="space-y-3">
                {completedCalls.slice(0, 5).map((call) => (
                  <Card key={call.id} className="bg-gray-800/30 border-gray-700/50 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs ${statusColors[call.status as keyof typeof statusColors]}`}>
                          {call.status}
                        </span>
                        <span className="text-gray-300">{call.caller_name}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-400">{call.caller_location}</span>
                      </div>
                      <div className="text-gray-500">
                        {call.call_duration && `Duration: ${formatDuration(call.call_duration)}`}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}