import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Clock,
  Radio,
  CheckCircle,
  MessageCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../../lib/api';

const SOCIAL_LINKS = [
  { icon: Instagram, label: 'Instagram', handle: '@soulfmhub', color: '#E4405F', href: '#' },
  { icon: Twitter, label: 'Twitter', handle: '@soulfmhub', color: '#1DA1F2', href: '#' },
  { icon: Facebook, label: 'Facebook', handle: 'Soul FM Hub', color: '#1877F2', href: '#' },
  { icon: Youtube, label: 'YouTube', handle: 'Soul FM Hub', color: '#FF0000', href: '#' },
];

const SUBJECTS = [
  'General Inquiry',
  'Song Request',
  'Show Feedback',
  'Partnership / Advertising',
  'Technical Issue',
  'Volunteer / Join Us',
  'Other',
];

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: SUBJECTS[0],
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSending(true);
    try {
      const result = await api.submitFeedback({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        rating: 3,
        category: formData.subject,
      });
      if (result.error) {
        throw new Error(result.error);
      }
      setSent(true);
      toast.success('Message sent! We\'ll get back to you soon.');
      setFormData({ name: '', email: '', subject: SUBJECTS[0], message: '' });
      setTimeout(() => setSent(false), 4000);
    } catch (error: any) {
      console.error('[Contact] Submit error:', error);
      toast.error(`Failed to send: ${error.message || 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00d9ff]/10 border border-[#00d9ff]/30 mb-6">
            <Mail className="w-4 h-4 text-[#00d9ff]" />
            <span className="text-sm text-[#00d9ff] font-medium">Get In Touch</span>
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: 'Righteous, cursive' }}
          >
            Contact <span className="text-[#00d9ff]">Soul FM</span>
          </h1>
          <p className="text-cyan-100/60 text-lg max-w-2xl mx-auto">
            We'd love to hear from you! Whether it's a song request, feedback, or partnership inquiry — drop us a message.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3"
          >
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm p-6 md:p-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#00d9ff]" />
                Send us a Message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-white/70 mb-1.5 block">Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 mb-1.5 block">Email *</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-1.5 block">Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full rounded-md border border-white/10 bg-white/5 text-white px-3 py-2 text-sm outline-none focus:border-[#00d9ff]/50"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s} className="bg-[#0a1628] text-white">{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-1.5 block">Message *</label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us what's on your mind..."
                    rows={5}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={sending || sent}
                  className="w-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold py-3 hover:opacity-90 disabled:opacity-50"
                >
                  {sent ? (
                    <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Message Sent!</span>
                  ) : sending ? (
                    <span className="flex items-center gap-2"><Send className="w-4 h-4 animate-pulse" /> Sending...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Send className="w-4 h-4" /> Send Message</span>
                  )}
                </Button>
              </form>
            </Card>
          </motion.div>

          {/* Contact Info Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Station Info Card */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#00ffaa]" />
                Station Info
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00d9ff]/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-[#00d9ff]" />
                  </div>
                  <div>
                    <div className="text-sm text-white/50">Email</div>
                    <div className="text-white text-sm">hello@soul-fm.com</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00ffaa]/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-[#00ffaa]" />
                  </div>
                  <div>
                    <div className="text-sm text-white/50">Studio Hotline</div>
                    <div className="text-white text-sm">+1 (555) SOUL-FM</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FF8C42]/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-[#FF8C42]" />
                  </div>
                  <div>
                    <div className="text-sm text-white/50">Location</div>
                    <div className="text-white text-sm">Miami Beach, FL</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E91E63]/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-[#E91E63]" />
                  </div>
                  <div>
                    <div className="text-sm text-white/50">Broadcasting</div>
                    <div className="text-white text-sm">24/7 — Always On Air</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Social Links Card */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm p-6">
              <h3 className="text-lg font-bold text-white mb-4">Follow Us</h3>
              <div className="grid grid-cols-2 gap-3">
                {SOCIAL_LINKS.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                    >
                      <Icon className="w-4 h-4" style={{ color: social.color }} />
                      <div>
                        <div className="text-xs text-white group-hover:text-white/90">{social.label}</div>
                        <div className="text-[10px] text-white/40">{social.handle}</div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </Card>

            {/* Studio Map Placeholder */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden">
              <div className="h-40 bg-gradient-to-br from-[#00d9ff]/10 to-[#00ffaa]/10 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-[#00d9ff]/40 mx-auto mb-2" />
                  <div className="text-sm text-white/40">Miami Beach, FL</div>
                  <div className="text-xs text-white/25">Studio Location</div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}