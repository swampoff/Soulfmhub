import React from 'react';
import { motion } from 'motion/react';

export function AnimatedBeach() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none overflow-hidden">
      {/* Sand Layers */}
      <div className="absolute bottom-0 left-0 right-0 h-32">
        {/* Dark sand layer */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-full"
          style={{
            background: 'linear-gradient(to top, rgba(139, 115, 85, 0.3), rgba(160, 130, 95, 0.2))',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />
        
        {/* Light sand layer */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-20"
          style={{
            background: 'linear-gradient(to top, rgba(194, 178, 128, 0.2), transparent)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        />

        {/* Sand particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#c2b280] rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: `${Math.random() * 30}%`,
            }}
            animate={{
              opacity: [0.15, 0.3, 0.15],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* Ocean Waves - Multiple Layers */}
      
      {/* Wave 1 - Furthest back (darkest) */}
      <motion.div
        className="absolute bottom-24 left-0 right-0 h-20"
        style={{
          background: 'linear-gradient(to top, rgba(0, 100, 130, 0.15), transparent)',
        }}
        animate={{
          x: ['-100%', '0%'],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <svg
          className="absolute bottom-0 w-[200%]"
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
          style={{ height: '100%' }}
        >
          <motion.path
            d="M0,30 Q150,10 300,30 T600,30 T900,30 T1200,30 L1200,60 L0,60 Z"
            fill="rgba(0, 150, 180, 0.15)"
            animate={{
              d: [
                "M0,30 Q150,10 300,30 T600,30 T900,30 T1200,30 L1200,60 L0,60 Z",
                "M0,30 Q150,50 300,30 T600,30 T900,30 T1200,30 L1200,60 L0,60 Z",
                "M0,30 Q150,10 300,30 T600,30 T900,30 T1200,30 L1200,60 L0,60 Z",
              ],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </svg>
      </motion.div>

      {/* Wave 2 - Middle (medium blue-cyan) */}
      <motion.div
        className="absolute bottom-16 left-0 right-0 h-24"
        style={{
          background: 'linear-gradient(to top, rgba(0, 150, 200, 0.2), transparent)',
        }}
        animate={{
          x: ['0%', '-100%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <svg
          className="absolute bottom-0 w-[200%]"
          viewBox="0 0 1200 80"
          preserveAspectRatio="none"
          style={{ height: '100%' }}
        >
          <motion.path
            d="M0,40 Q200,20 400,40 T800,40 T1200,40 L1200,80 L0,80 Z"
            fill="rgba(0, 180, 220, 0.2)"
            animate={{
              d: [
                "M0,40 Q200,20 400,40 T800,40 T1200,40 L1200,80 L0,80 Z",
                "M0,40 Q200,60 400,40 T800,40 T1200,40 L1200,80 L0,80 Z",
                "M0,40 Q200,20 400,40 T800,40 T1200,40 L1200,80 L0,80 Z",
              ],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />
        </svg>
      </motion.div>

      {/* Wave 3 - Front (cyan with foam) */}
      <motion.div
        className="absolute bottom-8 left-0 right-0 h-28"
        style={{
          background: 'linear-gradient(to top, rgba(0, 217, 255, 0.25), transparent)',
        }}
        animate={{
          x: ['-100%', '0%'],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <svg
          className="absolute bottom-0 w-[200%]"
          viewBox="0 0 1200 100"
          preserveAspectRatio="none"
          style={{ height: '100%' }}
        >
          <motion.path
            d="M0,50 Q250,30 500,50 T1000,50 T1500,50 L1500,100 L0,100 Z"
            fill="rgba(0, 217, 255, 0.25)"
            animate={{
              d: [
                "M0,50 Q250,30 500,50 T1000,50 T1500,50 L1500,100 L0,100 Z",
                "M0,50 Q250,70 500,50 T1000,50 T1500,50 L1500,100 L0,100 Z",
                "M0,50 Q250,30 500,50 T1000,50 T1500,50 L1500,100 L0,100 Z",
              ],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Wave foam/highlights */}
          <motion.path
            d="M0,50 Q250,30 500,50 T1000,50 T1500,50"
            fill="none"
            stroke="rgba(0, 255, 255, 0.4)"
            strokeWidth="2"
            animate={{
              d: [
                "M0,50 Q250,30 500,50 T1000,50 T1500,50",
                "M0,50 Q250,70 500,50 T1000,50 T1500,50",
                "M0,50 Q250,30 500,50 T1000,50 T1500,50",
              ],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </svg>
      </motion.div>

      {/* Wave 4 - Closest wave (brightest cyan with white foam) */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: 'linear-gradient(to top, rgba(0, 255, 255, 0.15), transparent)',
        }}
        animate={{
          x: ['0%', '-100%'],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <svg
          className="absolute bottom-0 w-[200%]"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          style={{ height: '100%' }}
        >
          <motion.path
            d="M0,60 Q300,40 600,60 T1200,60 T1800,60 L1800,120 L0,120 Z"
            fill="rgba(0, 255, 170, 0.2)"
            animate={{
              d: [
                "M0,60 Q300,40 600,60 T1200,60 T1800,60 L1800,120 L0,120 Z",
                "M0,60 Q300,80 600,60 T1200,60 T1800,60 L1800,120 L0,120 Z",
                "M0,60 Q300,40 600,60 T1200,60 T1800,60 L1800,120 L0,120 Z",
              ],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
          />

          {/* White foam on top of wave */}
          <motion.path
            d="M0,60 Q300,40 600,60 T1200,60 T1800,60"
            fill="none"
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="3"
            strokeLinecap="round"
            animate={{
              d: [
                "M0,60 Q300,40 600,60 T1200,60 T1800,60",
                "M0,60 Q300,80 600,60 T1200,60 T1800,60",
                "M0,60 Q300,40 600,60 T1200,60 T1800,60",
              ],
              opacity: [0.4, 0.65, 0.4],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
          />
        </svg>
      </motion.div>

      {/* Sparkles on water */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`sparkle-${i}`}
          className="absolute w-2 h-2 bg-white rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: `${32 + Math.random() * 80}px`,
            boxShadow: '0 0 6px rgba(255, 255, 255, 0.6), 0 0 12px rgba(0, 255, 255, 0.4)',
          }}
          animate={{
            opacity: [0, 0.7, 0],
            scale: [0.6, 1.3, 0.6],
          }}
          transition={{
            duration: 3 + Math.random() * 2.5,
            repeat: Infinity,
            delay: Math.random() * 4,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Bubbles rising from water */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`bubble-${i}`}
          className="absolute w-3 h-3 rounded-full border-2 border-[#00ffaa]/30"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: 0,
          }}
          animate={{
            y: [-50, -120 - Math.random() * 60],
            opacity: [0.3, 0, 0],
            scale: [0.8, 1.1, 0.5],
          }}
          transition={{
            duration: 5 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 6,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}