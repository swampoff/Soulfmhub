import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Play } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { motion } from 'motion/react';
import soulFmLogo from 'figma:asset/7dc3be36ef413fc4dd597274a640ba655b20ab3d.png';
import { AnimatedPalm } from '../components/AnimatedPalm';
import { FloatingParticles } from '../components/FloatingParticles';
import { AnimatedBeach } from '../components/AnimatedBeach';
import { AnimatedWaves } from '../components/AnimatedWaves';

export function HomePage() {
  const { nowPlaying, setIsPlaying } = useApp();
  const [loading, setLoading] = useState(false);

  const handleListenNow = () => {
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] relative overflow-hidden">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #00d9ff 1px, transparent 1px),
                             radial-gradient(circle at 75% 75%, #00d9ff 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        {/* Floating Stars/Particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#00d9ff]"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Floating Particles Component */}
      <FloatingParticles />

      {/* Animated Background Waves */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full border border-[#00d9ff]/10"
          style={{ x: '-50%', y: '-50%' }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-[800px] h-[800px] rounded-full border border-[#00ffaa]/10"
          style={{ x: '-50%', y: '-50%' }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.05, 0.2],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-[1000px] h-[1000px] rounded-full border border-[#00d9ff]/10"
          style={{ x: '-50%', y: '-50%' }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.15, 0.03, 0.15],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      {/* Animated Palms - Left */}
      <AnimatedPalm side="left" delay={0.3} />
      
      {/* Animated Palms - Right */}
      <AnimatedPalm side="right" delay={0.5} />

      {/* ON AIR NOW Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 pt-8 flex justify-center"
      >
        <Badge className="bg-[#00d9ff]/10 text-[#00d9ff] border border-[#00d9ff]/30 gap-3 px-6 py-2.5 text-sm backdrop-blur-sm">
          <motion.span 
            className="w-2 h-2 bg-[#00ff88] rounded-full"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [1, 0.5, 1]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <span className="font-semibold">ON AIR NOW</span>
          <span className="text-[#00d9ff]/80">• {nowPlaying?.show?.name || 'The Sunday Soul Session'}</span>
        </Badge>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] relative z-10">
        {/* Soul FM Logo with Advanced Animations */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8, type: "spring" }}
          className="mb-12"
        >
          <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center">
            {/* Rotating Outer Rings */}
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <svg className="w-full h-full" viewBox="0 0 400 400">
                <circle
                  cx="200"
                  cy="200"
                  r="190"
                  fill="none"
                  stroke="url(#ringGradient1)"
                  strokeWidth="2"
                  strokeDasharray="10 10"
                  opacity="0.3"
                />
                <defs>
                  <linearGradient id="ringGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00d9ff" />
                    <stop offset="50%" stopColor="#00ffaa" />
                    <stop offset="100%" stopColor="#00d9ff" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>

            {/* Counter-Rotating Middle Ring */}
            <motion.div
              className="absolute inset-8"
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            >
              <svg className="w-full h-full" viewBox="0 0 400 400">
                <circle
                  cx="200"
                  cy="200"
                  r="170"
                  fill="none"
                  stroke="url(#ringGradient2)"
                  strokeWidth="1.5"
                  strokeDasharray="5 15"
                  opacity="0.4"
                />
                <defs>
                  <linearGradient id="ringGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00ffaa" />
                    <stop offset="50%" stopColor="#00d9ff" />
                    <stop offset="100%" stopColor="#00ffaa" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>

            {/* Pulsating Glow Effect - Multiple Layers */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-[#00d9ff] via-[#00ffaa] to-[#00d9ff] rounded-full blur-3xl"
              animate={{
                opacity: [0.2, 0.4, 0.2],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="absolute inset-8 bg-gradient-to-br from-[#00ffaa] via-[#00d9ff] to-[#00ffaa] rounded-full blur-2xl"
              animate={{
                opacity: [0.15, 0.3, 0.15],
                scale: [1.1, 1, 1.1],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
            />

            {/* Inner Circle Border with Gradient Animation */}
            <motion.div
              className="absolute inset-12 rounded-full border-4 border-transparent"
              style={{
                background: 'linear-gradient(#0a1628, #0a1628) padding-box, linear-gradient(45deg, #00d9ff, #00ffaa, #00d9ff) border-box',
              }}
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "linear"
              }}
            />

            {/* Floating Logo with Breathing Animation - КРУГЛЫЙ */}
            <motion.div
              className="relative z-20"
              animate={{
                y: [0, -15, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {/* Logo Container with Scale Animation */}
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
                className="relative"
              >
                {/* Круглый контейнер для логотипа */}
                <div className="relative w-72 h-72 md:w-80 md:h-80 rounded-full overflow-hidden bg-gradient-to-br from-[#0a1628] to-[#0d2435] p-4 shadow-2xl">
                  <img 
                    src={soulFmLogo} 
                    alt="Soul FM" 
                    className="w-full h-full object-cover rounded-full"
                    style={{
                      filter: 'drop-shadow(0 0 30px rgba(0, 217, 255, 0.8)) drop-shadow(0 0 60px rgba(0, 255, 170, 0.5))',
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>

            {/* Orbiting Particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-[#00d9ff]"
                style={{
                  top: '50%',
                  left: '50%',
                  boxShadow: '0 0 10px #00d9ff, 0 0 20px #00d9ff',
                }}
                animate={{
                  x: [
                    Math.cos((i * Math.PI * 2) / 6) * 180,
                    Math.cos(((i * Math.PI * 2) / 6) + (Math.PI * 2)) * 180
                  ],
                  y: [
                    Math.sin((i * Math.PI * 2) / 6) * 180,
                    Math.sin(((i * Math.PI * 2) / 6) + (Math.PI * 2)) * 180
                  ],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 0.3
                }}
              />
            ))}

            {/* Sound Wave Visualizer Effect */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-1">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-gradient-to-t from-[#00d9ff] to-[#00ffaa] rounded-full"
                  animate={{
                    height: [20, 40, 20],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.1
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tagline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-center relative"
          style={{ 
            fontFamily: 'Pacifico, cursive',
            color: '#00d9ff',
            textShadow: '0 0 30px rgba(0, 217, 255, 0.5), 0 0 60px rgba(0, 217, 255, 0.3), 0 2px 10px rgba(0, 0, 0, 0.5)',
            letterSpacing: '0.02em',
          }}
        >
          The Wave of Your Soul
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-base md:text-lg text-gray-400 text-center max-w-3xl mb-12 leading-relaxed"
          style={{ 
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 400,
          }}
        >
          24/7 curated soul, funk, jazz, disco & reggae with tropical vibes. No algorithms, just pure human-selected grooves that feed your soul.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              size="lg"
              onClick={handleListenNow}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628] font-bold text-lg px-10 py-7 shadow-2xl shadow-[#00d9ff]/40 gap-3 group relative overflow-hidden rounded-2xl border-2 border-white/20"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
              <Play className="w-6 h-6 group-hover:scale-125 transition-transform relative z-10" fill="currentColor" />
              <span className="relative z-10 text-xl">Listen Now</span>
            </Button>
          </motion.div>
          <Link to="/schedule">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/20 font-bold text-lg px-10 py-7 relative overflow-hidden group rounded-2xl backdrop-blur-sm bg-[#00d9ff]/5 shadow-xl shadow-[#00d9ff]/20"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-[#00d9ff]/30 to-[#00ffaa]/30"
                  initial={{ scale: 0, opacity: 0 }}
                  whileHover={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
                <span className="relative z-10 text-xl">View Schedule</span>
              </Button>
            </motion.div>
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl w-full"
        >
          {[
            { value: '24/7', label: 'Non-Stop Music' },
            { value: '128k', label: 'HD Quality' },
            { value: '1.2K', label: 'Active Listeners' },
            { value: '5+', label: 'Music Genres' }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + i * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="text-center group cursor-default"
            >
              <motion.div 
                className="text-3xl md:text-4xl font-bold text-[#00d9ff] mb-2"
                whileHover={{
                  textShadow: '0 0 20px rgba(0, 217, 255, 0.8)'
                }}
              >
                {stat.value}
              </motion.div>
              <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 border-2 border-[#00d9ff]/30 rounded-full flex items-start justify-center p-2"
        >
          <div className="w-1.5 h-3 bg-[#00d9ff] rounded-full"></div>
        </motion.div>
      </motion.div>

      {/* Animated Beach and Waves */}
      <AnimatedBeach />
      <AnimatedWaves />
    </div>
  );
}