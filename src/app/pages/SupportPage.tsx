import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Heart,
  DollarSign,
  Check,
  Star,
  Radio,
  Music2,
  Headphones,
  Zap,
  Crown,
  Gift,
  Users,
  TrendingUp,
  Sparkles,
  Coffee,
  Disc3,
} from 'lucide-react';
import { motion } from 'motion/react';
import { SupportFAQ } from '../components/SupportFAQ';
import { AnimatedPalm } from '../components/AnimatedPalm';
import { api } from '../../lib/api';
import { toast } from 'sonner';

const DONATION_TIERS = [
  {
    id: 'coffee',
    name: 'Coffee Break',
    icon: Coffee,
    amount: 5,
    color: '#FF8C42',
    popular: false,
    benefits: [
      'Support Soul FM Hub',
      'Thank you shoutout',
      'Good karma points',
    ],
  },
  {
    id: 'vinyl',
    name: 'Vinyl Supporter',
    icon: Disc3,
    amount: 10,
    color: '#00BCD4',
    popular: false,
    benefits: [
      'All Coffee Break benefits',
      'Name in monthly credits',
      'Exclusive email newsletter',
      'Early access to shows',
    ],
  },
  {
    id: 'groove',
    name: 'Groove Master',
    icon: Headphones,
    amount: 25,
    color: '#00d9ff',
    popular: true,
    benefits: [
      'All Vinyl Supporter benefits',
      'Ad-free listening experience',
      'Request songs during shows',
      'Downloadable DJ mixes',
      'Supporter badge on profile',
    ],
  },
  {
    id: 'soul',
    name: 'Soul Patron',
    icon: Star,
    amount: 50,
    color: '#00ffaa',
    popular: false,
    benefits: [
      'All Groove Master benefits',
      'Monthly exclusive content',
      'Priority song requests',
      'Backstage show access',
      'Limited edition merchandise',
      'Meet & greet opportunities',
    ],
  },
  {
    id: 'legend',
    name: 'Radio Legend',
    icon: Crown,
    amount: 100,
    color: '#FFD700',
    popular: false,
    benefits: [
      'All Soul Patron benefits',
      'VIP event invitations',
      'Personalized playlist creation',
      'Studio tour experience',
      'Your name on our website',
      'Exclusive merchandise package',
      'Direct line to DJs',
      'Annual appreciation dinner',
    ],
  },
];

const IMPACT_STATS = [
  {
    icon: Radio,
    label: 'Hours of Broadcasting',
    value: '24/7',
    description: 'Non-stop soul, funk & jazz',
  },
  {
    icon: Music2,
    label: 'Tracks in Library',
    value: '10,000+',
    description: 'Curated music collection',
  },
  {
    icon: Users,
    label: 'Monthly Listeners',
    value: '50K+',
    description: 'Growing community',
  },
  {
    icon: TrendingUp,
    label: 'Shows per Week',
    value: '40+',
    description: 'Original programming',
  },
];

// Tier lookup for display
const TIER_LABELS: Record<string, string> = {
  coffee: 'Coffee Break',
  vinyl: 'Vinyl Supporter',
  groove: 'Groove Master',
  soul: 'Soul Patron',
  legend: 'Radio Legend',
  custom: 'Custom Supporter',
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const FUNDING_BREAKDOWN = [
  { category: 'Broadcasting Equipment', percentage: 30, color: '#00d9ff' },
  { category: 'Content Production', percentage: 25, color: '#00ffaa' },
  { category: 'Artist Payments', percentage: 20, color: '#FF8C42' },
  { category: 'Platform Costs', percentage: 15, color: '#E91E63' },
  { category: 'Marketing & Growth', percentage: 10, color: '#FFC107' },
];

export function SupportPage() {
  const [donationType, setDonationType] = useState<'once' | 'monthly'>('monthly');
  const [customAmount, setCustomAmount] = useState('');
  const [selectedTier, setSelectedTier] = useState<string | null>('groove');
  const [donorName, setDonorName] = useState('');
  const [donorMessage, setDonorMessage] = useState('');
  const [donating, setDonating] = useState(false);
  const [recentDonations, setRecentDonations] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const loadRecentDonations = () => {
    api.getRecentDonations(8).then((res) => {
      if (res.donations) {
        setRecentDonations(res.donations);
      }
    }).catch((err) => {
      console.error('Failed to load recent donations:', err);
    }).finally(() => setLoadingRecent(false));
  };

  useEffect(() => {
    loadRecentDonations();
  }, []);

  const handleDonate = async (tierId: string, amount: number) => {
    setDonating(true);
    try {
      const donation = {
        name: donorName || 'Anonymous Supporter',
        amount,
        tier: tierId,
        message: donorMessage || null,
        type: donationType,
        isAnonymous: !donorName,
      };

      const result = await api.createDonation(donation);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Thank you for your $${amount} donation! Your support keeps the music playing.`);
        setDonorName('');
        setDonorMessage('');
        setCustomAmount('');
        // Refresh the recent supporters list
        loadRecentDonations();
      }
    } catch (error: any) {
      console.error('Donation error:', error);
      toast.error(`Donation failed: ${error.message}`);
    } finally {
      setDonating(false);
    }
  };

  const handleCustomDonate = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    handleDonate('custom', amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] relative overflow-hidden py-12">
      {/* Animated Palms - Left */}
      <AnimatedPalm side="left" delay={0.3} />
      
      {/* Animated Palms - Right */}
      <AnimatedPalm side="right" delay={0.5} />

      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-[#00d9ff] rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-[#00ffaa] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-[#FF8C42] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#00d9ff]/20 to-[#00ffaa]/20 border border-[#00d9ff]/30 mb-6">
            <Heart className="w-4 h-4 text-[#00d9ff]" />
            <span className="text-[#00d9ff] font-semibold text-sm">SUPPORT SOUL FM HUB</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent mb-6" style={{ fontFamily: 'var(--font-family-display)' }}>
            Keep the Music Playing
          </h1>

          <p className="text-xl text-white/80 max-w-3xl mx-auto mb-8 leading-relaxed">
            Soul FM Hub is a labor of love, bringing you the finest soul, funk, jazz, and beyond.
            Your support helps us keep the grooves flowing 24/7, discover new artists, and build
            a vibrant community of music lovers.
          </p>

          {/* Donation Type Toggle */}
          <div className="flex justify-center gap-2 mb-8">
            <Button
              onClick={() => setDonationType('once')}
              className={`px-8 py-6 text-lg ${
                donationType === 'once'
                  ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628]'
                  : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
              }`}
            >
              <Gift className="w-5 h-5 mr-2" />
              One-Time
            </Button>
            <Button
              onClick={() => setDonationType('monthly')}
              className={`px-8 py-6 text-lg ${
                donationType === 'monthly'
                  ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628]'
                  : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
              }`}
            >
              <Zap className="w-5 h-5 mr-2" />
              Monthly
            </Button>
          </div>
        </motion.div>

        {/* Donation Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-10">
            Choose Your Support Level
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {DONATION_TIERS.map((tier, index) => {
              const Icon = tier.icon;
              const isSelected = selectedTier === tier.id;

              return (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedTier(tier.id)}
                >
                  <Card
                    className={`relative overflow-hidden transition-all cursor-pointer h-full ${
                      isSelected
                        ? 'border-2 shadow-2xl scale-105'
                        : 'bg-white/10 backdrop-blur-sm border-white/20 hover:border-white/40 hover:scale-102'
                    }`}
                    style={{
                      borderColor: isSelected ? tier.color : undefined,
                      boxShadow: isSelected ? `0 0 30px ${tier.color}40` : undefined,
                    }}
                  >
                    {/* Popular Badge */}
                    {tier.popular && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] px-4 py-1 text-xs font-bold rounded-bl-lg flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        POPULAR
                      </div>
                    )}

                    <div className="p-6">
                      {/* Icon */}
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                        style={{
                          backgroundColor: `${tier.color}20`,
                        }}
                      >
                        <Icon className="w-8 h-8" style={{ color: tier.color }} />
                      </div>

                      {/* Name */}
                      <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>

                      {/* Amount */}
                      <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold" style={{ color: tier.color }}>
                            ${tier.amount}
                          </span>
                          <span className="text-white/50 text-sm">
                            /{donationType === 'monthly' ? 'month' : 'once'}
                          </span>
                        </div>
                      </div>

                      {/* Benefits */}
                      <ul className="space-y-3 mb-6">
                        {tier.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: tier.color }} />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Button */}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDonate(tier.id, tier.amount);
                        }}
                        disabled={donating}
                        className="w-full font-semibold"
                        style={{
                          background: isSelected
                            ? `linear-gradient(to right, ${tier.color}, ${tier.color}dd)`
                            : 'rgba(255,255,255,0.1)',
                          color: isSelected ? '#0a1628' : 'white',
                        }}
                      >
                        {donating ? 'Processing...' : isSelected ? `Donate $${tier.amount}` : 'Select'}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Custom Amount */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4 text-center flex items-center justify-center gap-2">
              <DollarSign className="w-6 h-6 text-[#00d9ff]" />
              Your Donation
            </h3>
            <p className="text-white/70 text-center mb-6">
              Add your name and a message, or donate anonymously. Enter a custom amount below.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="text"
                  placeholder="Your name (optional)"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#00d9ff]"
                />
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                  <Input
                    type="number"
                    placeholder="Custom amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="pl-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#00d9ff]"
                  />
                </div>
              </div>
              <Input
                type="text"
                placeholder="Leave a message (optional)"
                value={donorMessage}
                onChange={(e) => setDonorMessage(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#00d9ff]"
              />
              <Button
                onClick={handleCustomDonate}
                disabled={donating}
                className="w-full py-6 text-lg bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] font-semibold hover:opacity-90"
              >
                {donating ? 'Processing...' : `Donate ${customAmount ? `$${customAmount}` : 'Custom Amount'}`}
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Impact Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-10">Your Impact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {IMPACT_STATS.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={index}
                  className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-[#00d9ff]" />
                  </div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-white font-semibold mb-1">{stat.label}</div>
                  <div className="text-white/60 text-sm">{stat.description}</div>
                </Card>
              );
            })}
          </div>
        </motion.div>

        {/* Where Your Money Goes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-10">
            Where Your Money Goes
          </h2>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-8 max-w-4xl mx-auto">
            <div className="space-y-6">
              {FUNDING_BREAKDOWN.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-semibold">{item.category}</span>
                    <span className="text-white/70 font-mono">{item.percentage}%</span>
                  </div>
                  <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(to right, ${item.color}, ${item.color}dd)`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-white/5 rounded-lg border border-white/10">
              <p className="text-white/80 leading-relaxed">
                <strong className="text-[#00d9ff]">100% Transparency:</strong> Every dollar you
                contribute goes directly to keeping Soul FM Hub running smoothly. We invest in
                top-quality broadcasting equipment, compensate our talented DJs and artists fairly,
                produce original content, and continuously improve our platform to serve you better.
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Recent Supporters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-10 flex items-center justify-center gap-2">
            <Heart className="w-8 h-8 text-[#E91E63]" />
            Recent Supporters
          </h2>
          <div className="max-w-3xl mx-auto">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 divide-y divide-white/10">
              {loadingRecent ? (
                <div className="p-8 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-[#00d9ff]/30 border-t-[#00d9ff] rounded-full animate-spin mb-3" />
                  <p className="text-white/50 text-sm">Loading supporters...</p>
                </div>
              ) : recentDonations.length === 0 ? (
                <div className="p-8 text-center">
                  <Heart className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/60 font-semibold mb-1">Be the first supporter!</p>
                  <p className="text-white/40 text-sm">Choose a tier above to get started.</p>
                </div>
              ) : (
                recentDonations.map((supporter: any, index: number) => (
                  <motion.div
                    key={supporter.id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.05 }}
                    className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] flex items-center justify-center text-[#0a1628] font-bold text-lg">
                        {(supporter.name || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{supporter.name}</div>
                        <div className="text-white/60 text-sm">
                          {TIER_LABELS[supporter.tier] || supporter.tier || 'Supporter'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#00d9ff] font-bold text-lg">
                        ${supporter.amount}
                      </div>
                      <div className="text-white/50 text-xs">
                        {supporter.createdAt ? timeAgo(supporter.createdAt) : ''}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </Card>

            <p className="text-center text-white/60 mt-6 text-sm">
              {recentDonations.length > 0
                ? 'Join these amazing supporters and help keep the music alive!'
                : 'Your donation will appear here instantly.'}
            </p>
          </div>
        </motion.div>

        {/* Other Ways to Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-white text-center mb-10">
            Other Ways to Support
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FF8C42]/20 to-[#FF8C42]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-[#FF8C42]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Spread the Word</h3>
              <p className="text-white/70 mb-4">
                Share Soul FM Hub with friends and family. Every new listener helps us grow!
              </p>
              <Button
                variant="outline"
                className="bg-white/5 text-white border-white/20 hover:bg-white/10"
              >
                Share Now
              </Button>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#00BCD4]/20 to-[#00BCD4]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Music2 className="w-8 h-8 text-[#00BCD4]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Submit Music</h3>
              <p className="text-white/70 mb-4">
                Are you an artist? Submit your tracks for airplay consideration.
              </p>
              <Button
                variant="outline"
                className="bg-white/5 text-white border-white/20 hover:bg-white/10"
              >
                Submit Track
              </Button>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FFC107]/20 to-[#FFC107]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Radio className="w-8 h-8 text-[#FFC107]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Become a DJ</h3>
              <p className="text-white/70 mb-4">
                Passionate about music? Apply to host your own show on Soul FM Hub.
              </p>
              <Button
                variant="outline"
                className="bg-white/5 text-white border-white/20 hover:bg-white/10"
              >
                Apply Now
              </Button>
            </Card>
          </div>
        </motion.div>

        {/* Support FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-16"
        >
          <SupportFAQ />
        </motion.div>
      </div>
    </div>
  );
}