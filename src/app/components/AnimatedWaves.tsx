import React from 'react';
import { motion } from 'motion/react';

interface AnimatedWavesProps {
  position?: 'top' | 'bottom';
  opacity?: number;
}

export function AnimatedWaves({ position = 'bottom', opacity = 0.15 }: AnimatedWavesProps) {
  return (
    <div 
      className={`absolute ${position === 'top' ? 'top-0' : 'bottom-0'} left-0 right-0 pointer-events-none overflow-hidden z-0`}
      style={{ opacity }}
    >
      {/* Wave 1 - Cyan */}
      <motion.div
        className="absolute w-full"
        style={{
          [position]: '-10%',
          left: 0,
        }}
        animate={{
          x: ['-100%', '0%'],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="w-[200%] h-24"
        >
          <path
            d="M0,60 C150,90 350,30 600,60 C850,90 1050,30 1200,60 L1200,120 L0,120 Z"
            fill="url(#waveGradient1)"
          />
          <defs>
            <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00d9ff" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#00ffaa" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#00d9ff" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Wave 2 - Mint */}
      <motion.div
        className="absolute w-full"
        style={{
          [position]: '-5%',
          left: 0,
        }}
        animate={{
          x: ['0%', '-100%'],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="w-[200%] h-20"
        >
          <path
            d="M0,80 C200,40 400,100 600,70 C800,40 1000,100 1200,70 L1200,120 L0,120 Z"
            fill="url(#waveGradient2)"
          />
          <defs>
            <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00ffaa" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#00d9ff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#00ffaa" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Wave 3 - Subtle overlay */}
      <motion.div
        className="absolute w-full"
        style={{
          [position]: '0%',
          left: 0,
        }}
        animate={{
          x: ['-50%', '50%', '-50%'],
        }}
        transition={{
          duration: 32,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="w-[200%] h-16"
        >
          <path
            d="M0,50 C250,80 450,20 600,50 C750,80 950,20 1200,50 L1200,120 L0,120 Z"
            fill="url(#waveGradient3)"
          />
          <defs>
            <linearGradient id="waveGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF8C42" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#00d9ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FF8C42" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Sparkle particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-[#00d9ff] rounded-full"
          style={{
            left: `${10 + i * 12}%`,
            [position]: `${20 + (i % 3) * 15}px`,
          }}
          animate={{
            opacity: [0, 0.7, 0],
            scale: [0.6, 1.2, 0.6],
            y: position === 'bottom' ? [0, -20, 0] : [0, 20, 0],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}