import React from 'react';
import { motion } from 'motion/react';

interface AnimatedPalmProps {
  side: 'left' | 'right';
  delay?: number;
}

export function AnimatedPalm({ side, delay = 0 }: AnimatedPalmProps) {
  const isLeft = side === 'left';
  
  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      className={`fixed ${isLeft ? 'left-0' : 'right-0'} pointer-events-none z-0 ${isLeft ? '' : 'scale-x-[-1]'}`}
      style={{ height: '140vh', width: 'auto', bottom: '-50vh' }}
    >
      <svg viewBox="0 0 300 1800" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-auto" preserveAspectRatio="xMidYMax meet">
        <defs>
          {/* Gradients for leaves */}
          <linearGradient id={`palmGradient1-${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d9ff" stopOpacity="0.9"/>
            <stop offset="50%" stopColor="#00ffaa" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#00d9ff" stopOpacity="0.6"/>
          </linearGradient>
          <linearGradient id={`palmGradient2-${side}`} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00ffaa" stopOpacity="0.8"/>
            <stop offset="50%" stopColor="#00d9ff" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#00ffaa" stopOpacity="0.6"/>
          </linearGradient>
          <linearGradient id={`trunkGradient-${side}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0d4d4d" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#083838" stopOpacity="0.9"/>
          </linearGradient>
        </defs>
        
        {/* Palm Trunk */}
        <motion.g
          animate={{ 
            rotate: [0, isLeft ? 1.5 : -1.5, 0],
            x: [0, isLeft ? 2 : -2, 0]
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: delay
          }}
          style={{ transformOrigin: '150px 1800px' }}
        >
          <path
            d="M150 1800 Q145 1700 148 1600 Q146 1500 150 1400 Q148 1300 152 1200 Q150 1100 154 1000 Q152 900 150 800 Q148 700 152 600 Q150 500 154 400 Q152 300 150 200 Q148 150 152 100"
            stroke={`url(#trunkGradient-${side})`}
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Palm Leaves - Center Top */}
          <motion.g
            animate={{ rotate: [0, isLeft ? -4 : 4, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: delay }}
            style={{ transformOrigin: '150px 100px' }}
          >
            <path
              d="M150 100 Q120 60 100 20 Q95 10 90 0"
              stroke={`url(#palmGradient1-${side})`}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M150 100 Q110 70 80 50 Q60 40 40 35"
              stroke={`url(#palmGradient1-${side})`}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
            <path
              d="M150 100 Q105 80 70 75 Q45 70 20 70"
              stroke={`url(#palmGradient1-${side})`}
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              opacity="0.7"
            />
          </motion.g>

          {/* Palm Leaves - Right Side */}
          <motion.g
            animate={{ rotate: [0, isLeft ? 6 : -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: delay + 0.5 }}
            style={{ transformOrigin: '150px 100px' }}
          >
            <path
              d="M150 100 Q180 60 200 20 Q205 10 210 0"
              stroke={`url(#palmGradient2-${side})`}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M150 100 Q190 70 220 50 Q240 40 260 35"
              stroke={`url(#palmGradient2-${side})`}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
            <path
              d="M150 100 Q195 80 230 75 Q255 70 280 70"
              stroke={`url(#palmGradient2-${side})`}
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              opacity="0.7"
            />
          </motion.g>

          {/* Palm Leaves - Top Center */}
          <motion.g
            animate={{ 
              rotate: [0, isLeft ? -2 : 2, 0],
              y: [0, -3, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: delay + 0.8 }}
            style={{ transformOrigin: '150px 100px' }}
          >
            <path
              d="M150 100 Q150 50 150 10 Q150 5 150 0"
              stroke={`url(#palmGradient1-${side})`}
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M150 100 Q145 55 140 20 Q138 10 135 0"
              stroke={`url(#palmGradient1-${side})`}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
            <path
              d="M150 100 Q155 55 160 20 Q162 10 165 0"
              stroke={`url(#palmGradient2-${side})`}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
          </motion.g>

          {/* Additional Leaves - Lower Left */}
          <motion.g
            animate={{ rotate: [0, isLeft ? -4 : 4, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: delay + 1 }}
            style={{ transformOrigin: '150px 100px' }}
          >
            <path
              d="M150 100 Q100 90 60 95 Q40 95 20 100"
              stroke={`url(#palmGradient1-${side})`}
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              opacity="0.6"
            />
            <path
              d="M150 100 Q105 100 70 110 Q50 115 30 125"
              stroke={`url(#palmGradient1-${side})`}
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              opacity="0.5"
            />
          </motion.g>

          {/* Additional Leaves - Lower Right */}
          <motion.g
            animate={{ rotate: [0, isLeft ? 4 : -4, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: delay + 1.2 }}
            style={{ transformOrigin: '150px 100px' }}
          >
            <path
              d="M150 100 Q200 90 240 95 Q260 95 280 100"
              stroke={`url(#palmGradient2-${side})`}
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              opacity="0.6"
            />
            <path
              d="M150 100 Q195 100 230 110 Q250 115 270 125"
              stroke={`url(#palmGradient2-${side})`}
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              opacity="0.5"
            />
          </motion.g>
        </motion.g>

        {/* Floating Particles around palm */}
        {[...Array(8)].map((_, i) => (
          <motion.circle
            key={i}
            cx={80 + (i % 4) * 40}
            cy={50 + Math.floor(i / 4) * 100}
            r="2"
            fill={i % 2 === 0 ? '#00d9ff' : '#00ffaa'}
            opacity="0.4"
            animate={{
              y: [0, -15, 0],
              opacity: [0.15, 0.45, 0.15],
              scale: [1, 1.3, 1]
            }}
            transition={{
              duration: 4.5 + i * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.6
            }}
          />
        ))}
      </svg>
    </motion.div>
  );
}