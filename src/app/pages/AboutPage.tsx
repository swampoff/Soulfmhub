import React from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Radio,
  Music,
  Users,
  Heart,
  Sparkles,
  Mic2,
  Calendar,
  TrendingUp,
  Headphones,
  Zap,
  Globe,
  Star,
  Play,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import soulFmLogo from '@/assets/7dc3be36ef413fc4dd597274a640ba655b20ab3d.png';
import { AnimatedPalm } from '../components/AnimatedPalm';

export function AboutPage() {
  const navigate = useNavigate();

  const stats = [
    { label: 'Listeners Worldwide', value: '50K+', icon: Users, gradient: 'from-[#00d9ff] to-[#0088cc]' },
    { label: 'Hours Streaming', value: '24/7', icon: Radio, gradient: 'from-[#00ffaa] to-[#00cc88]' },
    { label: 'Shows & Podcasts', value: '20+', icon: Mic2, gradient: 'from-[#FF8C42] to-[#FF6B1A]' },
    { label: 'Tracks in Library', value: '10K+', icon: Music, gradient: 'from-[#E91E63] to-[#C2185B]' },
  ];

  const features = [
    {
      icon: Radio,
      title: 'Live Broadcasting',
      description: 'Professional DJs spinning the finest soul, funk, and jazz around the clock.',
      color: '#00d9ff',
    },
    {
      icon: Mic2,
      title: 'Original Shows',
      description: 'Exclusive shows featuring artist interviews, deep cuts, and music history.',
      color: '#00ffaa',
    },
    {
      icon: Headphones,
      title: 'On-Demand Podcasts',
      description: 'Listen anytime to our curated podcasts and archived shows.',
      color: '#FF8C42',
    },
    {
      icon: Sparkles,
      title: 'Premium Quality',
      description: 'High-fidelity audio streaming for the best listening experience.',
      color: '#E91E63',
    },
    {
      icon: Users,
      title: 'Global Community',
      description: 'Join thousands of soul music lovers from around the world.',
      color: '#FFD700',
    },
    {
      icon: Heart,
      title: 'Listener Supported',
      description: 'Independent radio powered by music lovers like you.',
      color: '#00d9ff',
    },
  ];

  const timeline = [
    { year: '2020', title: 'Founded', description: 'Soul FM Hub launches with a mission to preserve soul music culture' },
    { year: '2022', title: '10K Listeners', description: 'Community reaches 10,000 active listeners worldwide' },
    { year: '2024', title: 'Award Winner', description: 'Recognized as Best Online Soul Radio Station' },
    { year: '2025', title: 'Going Global', description: 'Expanding to 50+ countries with mobile apps' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] relative overflow-hidden">
      {/* Animated Palms - Left */}
      <AnimatedPalm side="left" delay={0.3} />
      
      {/* Animated Palms - Right */}
      <AnimatedPalm side="right" delay={0.5} />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-96 h-96 bg-[#00d9ff] rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-[#00ffaa] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-[#FF8C42] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </div>

        <div className="container mx-auto px-4 py-20 md:py-32 max-w-6xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* Logo */}
            <div className="mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="inline-block relative"
              >
                {/* Outer glow ring - animated */}
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -inset-8 bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] rounded-full blur-2xl"
                />
                
                {/* Middle ring - animated */}
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute -inset-4 rounded-full"
                  style={{
                    background: 'conic-gradient(from 0deg, #00d9ff, #00ffaa, #00d9ff)',
                    opacity: 0.3,
                  }}
                />
                
                {/* Floating Logo with Breathing Animation */}
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative z-20"
                >
                  {/* Круглый контейнер для логотипа */}
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.5
                    }}
                    className="relative w-40 h-40 rounded-full overflow-hidden bg-gradient-to-br from-[#0a1628] to-[#0d2435] p-3 shadow-2xl"
                  >
                    <img
                      src={soulFmLogo}
                      alt="Soul FM Hub"
                      className="w-full h-full object-cover rounded-full"
                      style={{
                        filter: 'drop-shadow(0 0 20px rgba(0, 217, 255, 0.8)) drop-shadow(0 0 40px rgba(0, 255, 170, 0.5))',
                      }}
                    />
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>

            {/* Tagline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mb-6"
            >
              <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-[#00d9ff]/30 backdrop-blur-sm mb-6">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <Sparkles className="w-4 h-4 text-[#00d9ff]" />
                </motion.div>
                <span className="text-[#00d9ff] font-semibold text-sm tracking-wider uppercase">The Wave of Your Soul</span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              <span className="bg-gradient-to-r from-[#00d9ff] via-[#00ffaa] to-[#00d9ff] bg-clip-text text-transparent">
                Where Soul Music
              </span>
              <br />
              <span className="text-white">Lives Forever</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              Soul FM Hub is more than a radio station—it's a global community celebrating the timeless artistry of soul, funk, jazz, and R&B. Broadcasting 24/7 with passion, authenticity, and love for the music.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex flex-wrap justify-center gap-4"
            >
              <Button
                onClick={() => navigate('/podcasts')}
                size="lg"
                className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] hover:opacity-90 font-semibold px-8 py-6 text-lg shadow-lg shadow-[#00d9ff]/30"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Listening
              </Button>
              <Button
                onClick={() => navigate('/support')}
                size="lg"
                variant="outline"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm px-8 py-6 text-lg"
              >
                <Heart className="w-5 h-5 mr-2" />
                Support Us
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <Card className="relative overflow-hidden bg-white/5 backdrop-blur-sm border-white/10 hover:border-[#00d9ff]/50 transition-all p-6 text-center group">
                  <motion.div 
                    className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity`}
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  <motion.div 
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mx-auto mb-4`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </motion.div>
                  <motion.div 
                    className="text-3xl md:text-4xl font-bold text-white mb-2"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 + 0.2, type: "spring", stiffness: 200 }}
                  >
                    {stat.value}
                  </motion.div>
                  <div className="text-sm text-white/60 font-medium">{stat.label}</div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-20 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-family-display)' }}>
            Why Choose Soul FM Hub
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Experience the finest soul music radio with professional curation and community-driven passion
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="relative overflow-hidden bg-white/5 backdrop-blur-sm border-white/10 hover:border-[#00d9ff]/50 transition-all p-8 h-full group">
                  {/* Hover gradient overlay */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity"
                    style={{ 
                      background: `radial-gradient(circle at top left, ${feature.color}, transparent)` 
                    }}
                  />
                  
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 relative overflow-hidden group-hover:scale-110 transition-transform"
                    style={{
                      background: `linear-gradient(135deg, ${feature.color}20, ${feature.color}10)`,
                      boxShadow: `0 0 20px ${feature.color}30`
                    }}
                  >
                    <Icon className="w-7 h-7 relative z-10" style={{ color: feature.color }} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-white/60 leading-relaxed">{feature.description}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Timeline Section */}
      <div className="relative py-20 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00d9ff]/5 to-transparent" />
        
        <div className="container mx-auto px-4 max-w-5xl relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-[#00d9ff]/30 backdrop-blur-sm mb-6">
              <TrendingUp className="w-4 h-4 text-[#00d9ff]" />
              <span className="text-[#00d9ff] font-semibold text-sm tracking-wider">OUR JOURNEY</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-family-display)' }}>
              The Story So Far
            </h2>
            <p className="text-lg text-white/60">
              From passion project to global radio station
            </p>
          </motion.div>

          <div className="relative">
            {/* Timeline line */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#00d9ff] via-[#00ffaa] to-[#00d9ff] transform -translate-x-1/2" />

            <div className="space-y-12">
              {timeline.map((item, index) => (
                <motion.div
                  key={item.year}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className={`flex items-center gap-8 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  } flex-col`}
                >
                  {/* Content Card */}
                  <div className="flex-1">
                    <Card className={`bg-white/5 backdrop-blur-sm border-white/10 hover:border-[#00d9ff]/50 transition-all p-6 ${
                      index % 2 === 0 ? 'md:text-right' : 'md:text-left'
                    } text-center md:text-inherit`}>
                      <div className="inline-block px-4 py-1 rounded-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] font-bold text-sm mb-3">
                        {item.year}
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-white/60">{item.description}</p>
                    </Card>
                  </div>

                  {/* Center dot */}
                  <div className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] border-4 border-[#0a1628] flex-shrink-0 shadow-lg shadow-[#00d9ff]/50 relative z-10" />

                  {/* Spacer */}
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="container mx-auto px-4 py-20 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border-[#00d9ff]/30 p-8 md:p-12">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#00d9ff]/20 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#00ffaa]/20 to-transparent rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] flex items-center justify-center">
                  <Zap className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-6">
                Our Mission
              </h2>
              
              <p className="text-lg md:text-xl text-white/80 text-center leading-relaxed mb-8 max-w-3xl mx-auto">
                To preserve, celebrate, and share the rich heritage of soul music with the world. 
                We believe great music is timeless, and every generation deserves to experience 
                the magic of soul, funk, jazz, and R&B.
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/20">
                  <Globe className="w-4 h-4 text-[#00d9ff]" />
                  <span className="text-white text-sm font-medium">Global Community</span>
                </div>
                <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/20">
                  <Star className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-white text-sm font-medium">Quality Curation</span>
                </div>
                <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/20">
                  <Heart className="w-4 h-4 text-[#E91E63]" />
                  <span className="text-white text-sm font-medium">Passion Driven</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Final CTA */}
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-family-display)' }}>
            Join the Movement
          </h2>
          <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto">
            Be part of something special. Together, we're keeping soul music alive for generations to come.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              onClick={() => navigate('/support')}
              size="lg"
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] hover:opacity-90 font-semibold px-8 py-6 text-lg shadow-lg shadow-[#00d9ff]/30"
            >
              <Heart className="w-5 h-5 mr-2" />
              Become a Supporter
            </Button>
            <Button
              onClick={() => navigate('/team')}
              size="lg"
              variant="outline"
              className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm px-8 py-6 text-lg"
            >
              <Users className="w-5 h-5 mr-2" />
              Meet the Team
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}