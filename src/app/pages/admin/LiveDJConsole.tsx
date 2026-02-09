import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../../lib/api';
import { toast } from 'sonner';
import { 
  Radio, 
  Square, 
  Play, 
  Pause, 
  SkipForward,
  Users,
  Music,
  PhoneCall,
  Clock,
  Activity
} from 'lucide-react';

interface DJSession {
  id: string;
  dj_name: string;
  title: string;
  started_at: string;
  tracks_played: number;
  callers_taken: number;
  requests_played: number;
  status: string;
}

export function LiveDJConsole() {
  const [isLive, setIsLive] = useState(false);
  const [currentSession, setCurrentSession] = useState<DJSession | null>(null);
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [showStartModal, setShowStartModal] = useState(false);
  const [djName, setDjName] = useState('');
  const [showTitle, setShowTitle] = useState('');
  const [loading, setLoading] = useState(false);

  // Check current DJ status
  useEffect(() => {
    checkDJStatus();
    const interval = setInterval(checkDJStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update session duration
  useEffect(() => {
    if (currentSession && isLive) {
      const interval = setInterval(() => {
        const startTime = new Date(currentSession.started_at);
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setSessionDuration(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentSession, isLive]);

  async function checkDJStatus() {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/dj-sessions/current`,
        {
          headers
        }
      );

      if (!response.ok) throw new Error('Failed to check DJ status');

      const data = await response.json();
      setIsLive(data.isLive);
      setCurrentSession(data.session);
    } catch (error: any) {
      console.error('Error checking DJ status:', error);
    }
  }

  async function startDJSession() {
    if (!djName.trim() || !showTitle.trim()) {
      toast.error('Please enter DJ name and show title');
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/dj-sessions/start`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            dj_name: djName,
            title: showTitle,
            session_type: 'live_show'
          })
        }
      );

      if (!response.ok) throw new Error('Failed to start DJ session');

      const data = await response.json();
      setIsLive(true);
      setCurrentSession(data.session);
      setShowStartModal(false);
      setDjName('');
      setShowTitle('');
      
      toast.success(`🔴 LIVE! Welcome ${djName}!`, {
        description: 'Auto-DJ is paused. You have full control.'
      });
    } catch (error: any) {
      console.error('Error starting DJ session:', error);
      toast.error('Failed to go live: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function endDJSession() {
    if (!currentSession) return;

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/dj-sessions/${currentSession.id}/end`,
        {
          method: 'POST',
          headers
        }
      );

      if (!response.ok) throw new Error('Failed to end DJ session');

      setIsLive(false);
      setCurrentSession(null);
      
      toast.success('Session ended successfully', {
        description: 'Auto-DJ has resumed programming.'
      });
    } catch (error: any) {
      console.error('Error ending DJ session:', error);
      toast.error('Failed to end session: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 font-['Righteous']">
            🎧 Live DJ Console
          </h1>
          <p className="text-gray-400">
            Take control of the airwaves
          </p>
        </motion.div>

        {/* Status Banner */}
        <AnimatePresence>
          {isLive && currentSession && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
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
                        🔴 LIVE: {currentSession.title}
                      </h2>
                      <p className="text-gray-300">
                        DJ {currentSession.dj_name} • {sessionDuration}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={endDJSession}
                    disabled={loading}
                    variant="destructive"
                    size="lg"
                    className="gap-2"
                  >
                    <Square className="w-5 h-5" />
                    End Session
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Go Live Button */}
          {!isLive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="bg-gray-800/50 border-cyan-500/30 p-8 text-center">
                <Radio className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-2xl font-bold mb-2 font-['Righteous']">
                  Ready to Go Live?
                </h3>
                <p className="text-gray-400 mb-6">
                  Take over from Auto-DJ and broadcast live
                </p>
                <Button
                  onClick={() => setShowStartModal(true)}
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 gap-2 w-full"
                >
                  <Radio className="w-5 h-5" />
                  GO LIVE
                </Button>
              </Card>
            </motion.div>
          )}

          {/* Session Stats */}
          {isLive && currentSession && (
            <>
              <Card className="bg-gray-800/50 border-cyan-500/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Music className="w-6 h-6 text-cyan-400" />
                  <h3 className="text-lg font-bold">Tracks Played</h3>
                </div>
                <p className="text-4xl font-bold text-cyan-400">
                  {currentSession.tracks_played}
                </p>
              </Card>

              <Card className="bg-gray-800/50 border-cyan-500/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-6 h-6 text-pink-400" />
                  <h3 className="text-lg font-bold">Requests Played</h3>
                </div>
                <p className="text-4xl font-bold text-pink-400">
                  {currentSession.requests_played}
                </p>
              </Card>

              <Card className="bg-gray-800/50 border-cyan-500/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <PhoneCall className="w-6 h-6 text-green-400" />
                  <h3 className="text-lg font-bold">Callers Taken</h3>
                </div>
                <p className="text-4xl font-bold text-green-400">
                  {currentSession.callers_taken}
                </p>
              </Card>

              <Card className="bg-gray-800/50 border-cyan-500/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-6 h-6 text-purple-400" />
                  <h3 className="text-lg font-bold">Duration</h3>
                </div>
                <p className="text-4xl font-bold text-purple-400">
                  {sessionDuration}
                </p>
              </Card>
            </>
          )}
        </div>

        {/* Info Cards */}
        {!isLive && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gray-800/50 border-cyan-500/30 p-6">
              <Activity className="w-8 h-8 text-cyan-400 mb-3" />
              <h3 className="font-bold mb-2">Full Control</h3>
              <p className="text-sm text-gray-400">
                Auto-DJ pauses when you go live. Pick tracks manually.
              </p>
            </Card>

            <Card className="bg-gray-800/50 border-cyan-500/30 p-6">
              <Users className="w-8 h-8 text-pink-400 mb-3" />
              <h3 className="font-bold mb-2">Take Requests</h3>
              <p className="text-sm text-gray-400">
                View approved song requests and play them live.
              </p>
            </Card>

            <Card className="bg-gray-800/50 border-cyan-500/30 p-6">
              <PhoneCall className="w-8 h-8 text-green-400 mb-3" />
              <h3 className="font-bold mb-2">Answer Calls</h3>
              <p className="text-sm text-gray-400">
                Screen and connect with listeners in real-time.
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* Start Session Modal */}
      <AnimatePresence>
        {showStartModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowStartModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-lg border border-cyan-500/30 p-8 max-w-md w-full"
            >
              <h2 className="text-2xl font-bold mb-6 font-['Righteous']">
                Start Live Session
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    DJ Name *
                  </label>
                  <input
                    type="text"
                    value={djName}
                    onChange={(e) => setDjName(e.target.value)}
                    placeholder="DJ Marcus"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Show Title *
                  </label>
                  <input
                    type="text"
                    value={showTitle}
                    onChange={(e) => setShowTitle(e.target.value)}
                    placeholder="Friday Night Soul Mix"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowStartModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={startDJSession}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 gap-2"
                >
                  <Radio className="w-5 h-5" />
                  {loading ? 'Starting...' : 'GO LIVE'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}