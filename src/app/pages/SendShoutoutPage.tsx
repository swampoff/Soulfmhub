import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import { Heart, Send, Cake, Gift, Star, MapPin, User, MessageSquare } from 'lucide-react';

export function SendShoutoutPage() {
  const [formData, setFormData] = useState({
    sender_name: '',
    sender_email: '',
    sender_location: '',
    recipient_name: '',
    occasion: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const occasions = [
    { value: '', label: 'General Shoutout', icon: Heart },
    { value: 'birthday', label: 'Birthday', icon: Cake },
    { value: 'anniversary', label: 'Anniversary', icon: Heart },
    { value: 'graduation', label: 'Graduation', icon: Star },
    { value: 'congratulations', label: 'Congratulations', icon: Gift }
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.sender_name || !formData.recipient_name || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/shoutouts/submit`,
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
        throw new Error(data.error || 'Failed to submit shoutout');
      }

      toast.success('💬 Shoutout Submitted!', {
        description: 'Your message will be reviewed and aired soon!'
      });

      // Reset form
      setFormData({
        sender_name: '',
        sender_email: '',
        sender_location: '',
        recipient_name: '',
        occasion: '',
        message: ''
      });
    } catch (error: any) {
      console.error('Error submitting shoutout:', error);
      toast.error(error.message || 'Failed to submit shoutout');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedOccasion = occasions.find(o => o.value === formData.occasion);

  return (
    <div className="text-white">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
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
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-6"
          >
            <Heart className="w-16 h-16 text-pink-400" />
          </motion.div>
          
          <h1 className="text-5xl font-bold mb-4 font-['Righteous']">
            Send a Shoutout
          </h1>
          <p className="text-xl text-gray-400">
            Celebrate someone special on Soul FM!
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gray-900/80 backdrop-blur-sm border-pink-500/30 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Your Name */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-pink-400" />
                  Your Name *
                </label>
                <input
                  type="text"
                  value={formData.sender_name}
                  onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                  placeholder="Jennifer"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-pink-500 focus:outline-none text-white"
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
                  value={formData.sender_email}
                  onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                  placeholder="jennifer@example.com"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-pink-500 focus:outline-none text-white"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-pink-400" />
                  Your Location
                </label>
                <input
                  type="text"
                  value={formData.sender_location}
                  onChange={(e) => setFormData({ ...formData, sender_location: e.target.value })}
                  placeholder="Miami, FL"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-pink-500 focus:outline-none text-white"
                />
              </div>

              {/* Recipient Name */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-400" />
                  Shoutout To *
                </label>
                <input
                  type="text"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                  placeholder="Mom (Linda)"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-pink-500 focus:outline-none text-white"
                  required
                />
              </div>

              {/* Occasion */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-pink-400" />
                  Occasion
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {occasions.map((occasion) => {
                    const Icon = occasion.icon;
                    return (
                      <button
                        key={occasion.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, occasion: occasion.value })}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          formData.occasion === occasion.value
                            ? 'border-pink-500 bg-pink-500/20'
                            : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <Icon className="w-6 h-6 mx-auto mb-2 text-pink-400" />
                        <p className="text-sm font-medium">{occasion.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-pink-400" />
                  Your Message *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Happy 60th birthday Mom! You're the best! Love you so much!"
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-pink-500 focus:outline-none text-white resize-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  This will be read on air, so keep it clean and positive! ❤️
                </p>
              </div>

              {/* Preview */}
              {formData.recipient_name && formData.message && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-pink-500/10 rounded-lg border border-pink-500/30"
                >
                  <p className="text-xs text-pink-400 mb-2 font-medium">Preview on Air:</p>
                  <p className="text-sm text-gray-300 italic">
                    "Soul FM has a special{formData.occasion && ` ${formData.occasion}`} shoutout! 
                    {formData.occasion === 'birthday' && ` Happy birthday to ${formData.recipient_name}!`}
                    {formData.occasion === 'anniversary' && ` Happy anniversary to ${formData.recipient_name}!`}
                    {!formData.occasion && ` This one goes out to ${formData.recipient_name}!`}
                    {formData.occasion && formData.occasion !== 'birthday' && formData.occasion !== 'anniversary' && ` This one's for ${formData.recipient_name}!`}
                    {' '}{formData.message} We're sending you love and soul vibes from Soul FM!"
                  </p>
                </motion.div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-lg gap-3"
              >
                {submitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Heart className="w-5 h-5" />
                    </motion.div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Shoutout
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
          <Card className="bg-gray-800/50 border-pink-500/30 p-6">
            <div className="flex items-start gap-4">
              <Heart className="w-6 h-6 text-pink-400 flex-shrink-0 mt-1" />
              <div className="text-left">
                <h3 className="font-bold mb-2">How It Works</h3>
                <p className="text-sm text-gray-400">
                  Your shoutout will be reviewed by our team and aired on Soul FM!
                  You can submit 1 shoutout every 2 hours.
                </p>
              </div>
            </div>
          </Card>

          <p className="text-sm text-gray-500">
            Shoutouts are free and will be read by our AI voice or live DJ.
          </p>
        </motion.div>
      </div>
    </div>
  );
}