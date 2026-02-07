import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import { Music, Send, Heart, MapPin, User, MessageSquare } from 'lucide-react';

export function RequestSongPage() {
  const [formData, setFormData] = useState({
    requester_name: '',
    requester_email: '',
    requester_location: '',
    custom_song_title: '',
    custom_artist: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.requester_name || !formData.custom_song_title || !formData.custom_artist) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/song-requests/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      toast.success('🎵 Request Submitted!', {
        description: 'Your song request will be reviewed by our team.'
      });

      // Reset form
      setFormData({
        requester_name: '',
        requester_email: '',
        requester_location: '',
        custom_song_title: '',
        custom_artist: '',
        message: ''
      });
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] text-white">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, delay: 1 }}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto p-8 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-6"
          >
            <Music className="w-16 h-16 text-cyan-400" />
          </motion.div>
          
          <h1 className="text-5xl font-bold mb-4 font-['Righteous']">
            Request a Song
          </h1>
          <p className="text-xl text-gray-400">
            Want to hear your favorite track? Let us know!
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gray-900/80 backdrop-blur-sm border-cyan-500/30 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Your Name */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400" />
                  Your Name *
                </label>
                <input
                  type="text"
                  value={formData.requester_name}
                  onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                  placeholder="Sarah"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white"
                  required
                />
              </div>

              {/* Email (optional) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={formData.requester_email}
                  onChange={(e) => setFormData({ ...formData, requester_email: e.target.value })}
                  placeholder="sarah@example.com"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  Your Location
                </label>
                <input
                  type="text"
                  value={formData.requester_location}
                  onChange={(e) => setFormData({ ...formData, requester_location: e.target.value })}
                  placeholder="Miami, FL"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white"
                />
              </div>

              {/* Song Title */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Music className="w-4 h-4 text-cyan-400" />
                  Song Title *
                </label>
                <input
                  type="text"
                  value={formData.custom_song_title}
                  onChange={(e) => setFormData({ ...formData, custom_song_title: e.target.value })}
                  placeholder="Lovely Day"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white"
                  required
                />
              </div>

              {/* Artist */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400" />
                  Artist *
                </label>
                <input
                  type="text"
                  value={formData.custom_artist}
                  onChange={(e) => setFormData({ ...formData, custom_artist: e.target.value })}
                  placeholder="Bill Withers"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  Message (optional)
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us why you love this song..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white resize-none"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-lg gap-3"
              >
                {submitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Music className="w-5 h-5" />
                    </motion.div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Request
                  </>
                )}
              </Button>
            </form>
          </Card>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center space-y-4"
        >
          <Card className="bg-gray-800/50 border-cyan-500/30 p-6">
            <div className="flex items-start gap-4">
              <Heart className="w-6 h-6 text-pink-400 flex-shrink-0 mt-1" />
              <div className="text-left">
                <h3 className="font-bold mb-2">How It Works</h3>
                <p className="text-sm text-gray-400">
                  Your request will be reviewed by our team. If approved, it may be played on air!
                  You can only submit 1 request per hour.
                </p>
              </div>
            </div>
          </Card>

          <p className="text-sm text-gray-500">
            By submitting a request, you agree to have your name mentioned on air.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
