import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface BeachCarProps {
  size?: 'sm' | 'md' | 'lg';
  speed?: number; // seconds for one loop
  showWaves?: boolean;
  showPalms?: boolean;
}

export function BeachCar({ 
  size = 'md', 
  speed = 20,
  showWaves = true,
  showPalms = true 
}: BeachCarProps) {
  const [isVisible, setIsVisible] = useState(true);

  const sizeMap = {
    sm: { car: 60, scene: 200 },
    md: { car: 80, scene: 300 },
    lg: { car: 120, scene: 400 }
  };

  const dimensions = sizeMap[size];

  return (
    <div className="relative w-full overflow-hidden" style={{ height: `${dimensions.scene}px` }}>
      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-100 via-cyan-50 to-amber-50" />

      {/* Sun */}
      <motion.div
        className="absolute top-8 right-12 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 shadow-lg"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Sun rays */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 w-1 h-6 bg-yellow-300 origin-center"
            style={{
              transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-20px)`
            }}
            animate={{
              opacity: [0.4, 0.8, 0.4],
              scaleY: [1, 1.3, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut"
            }}
          />
        ))}
      </motion.div>

      {/* Clouds */}
      <motion.div
        className="absolute top-12 left-0 w-20 h-8 bg-white/60 rounded-full blur-sm"
        animate={{
          x: ["-100%", "120vw"]
        }}
        transition={{
          duration: speed * 2,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      <motion.div
        className="absolute top-20 left-0 w-16 h-6 bg-white/50 rounded-full blur-sm"
        animate={{
          x: ["-100%", "120vw"]
        }}
        transition={{
          duration: speed * 2.5,
          repeat: Infinity,
          ease: "linear",
          delay: 5
        }}
      />

      {/* Palm trees */}
      {showPalms && (
        <>
          <div className="absolute bottom-16 left-[10%]">
            <PalmTree scale={0.6} />
          </div>
          <div className="absolute bottom-16 right-[15%]">
            <PalmTree scale={0.8} />
          </div>
        </>
      )}

      {/* Beach sand */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-amber-200 to-amber-300">
        {/* Sand texture dots */}
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-amber-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
          />
        ))}
      </div>

      {/* Waves */}
      {showWaves && (
        <div className="absolute bottom-24 left-0 right-0 h-8">
          <motion.svg
            className="absolute bottom-0 left-0 w-full h-full"
            viewBox="0 0 1200 40"
            preserveAspectRatio="none"
          >
            <motion.path
              d="M0,20 Q300,10 600,20 T1200,20 L1200,40 L0,40 Z"
              fill="url(#waveGradient)"
              animate={{
                d: [
                  "M0,20 Q300,10 600,20 T1200,20 L1200,40 L0,40 Z",
                  "M0,20 Q300,30 600,20 T1200,20 L1200,40 L0,40 Z",
                  "M0,20 Q300,10 600,20 T1200,20 L1200,40 L0,40 Z"
                ]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <defs>
              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </motion.svg>
        </div>
      )}

      {/* Animated Car */}
      <motion.div
        className="absolute bottom-28 left-0"
        animate={{
          x: ["-150px", "calc(100vw + 150px)"]
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{ width: `${dimensions.car}px` }}
        onAnimationComplete={() => {
          setIsVisible(true);
        }}
      >
        <motion.div
          animate={{
            y: [0, -2, 0, -1, 0]
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Car SVG */}
          <svg viewBox="0 0 200 100" className="w-full h-auto drop-shadow-lg">
            {/* Shadow */}
            <ellipse
              cx="100"
              cy="95"
              rx="70"
              ry="8"
              fill="black"
              opacity="0.2"
            />

            {/* Car body */}
            <g>
              {/* Main body */}
              <path
                d="M 20 70 L 30 50 L 60 40 L 120 40 L 150 50 L 180 70 Z"
                fill="url(#carGradient)"
                stroke="#0891b2"
                strokeWidth="2"
              />
              
              {/* Bottom part */}
              <rect
                x="10"
                y="70"
                width="180"
                height="15"
                rx="5"
                fill="url(#carBodyGradient)"
                stroke="#0891b2"
                strokeWidth="2"
              />

              {/* Windshield */}
              <path
                d="M 70 45 L 80 50 L 110 50 L 120 45"
                fill="#67e8f9"
                opacity="0.4"
                stroke="#06b6d4"
                strokeWidth="1"
              />

              {/* Side window */}
              <path
                d="M 125 50 L 135 55 L 145 55 L 150 50"
                fill="#67e8f9"
                opacity="0.4"
                stroke="#06b6d4"
                strokeWidth="1"
              />

              {/* Headlight */}
              <circle cx="175" cy="72" r="4" fill="#fef08a" opacity="0.9" />
              
              {/* Details */}
              <line x1="90" y1="40" x2="90" y2="50" stroke="#0891b2" strokeWidth="1" />
              <line x1="110" y1="40" x2="110" y2="50" stroke="#0891b2" strokeWidth="1" />

              {/* Wheels */}
              <g>
                {/* Front wheel */}
                <motion.g
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  style={{ transformOrigin: "150px 85px" }}
                >
                  <circle cx="150" cy="85" r="12" fill="#1f2937" stroke="#374151" strokeWidth="2" />
                  <circle cx="150" cy="85" r="7" fill="#4b5563" />
                  <line x1="150" y1="78" x2="150" y2="92" stroke="#6b7280" strokeWidth="2" />
                  <line x1="143" y1="85" x2="157" y2="85" stroke="#6b7280" strokeWidth="2" />
                </motion.g>

                {/* Back wheel */}
                <motion.g
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  style={{ transformOrigin: "50px 85px" }}
                >
                  <circle cx="50" cy="85" r="12" fill="#1f2937" stroke="#374151" strokeWidth="2" />
                  <circle cx="50" cy="85" r="7" fill="#4b5563" />
                  <line x1="50" y1="78" x2="50" y2="92" stroke="#6b7280" strokeWidth="2" />
                  <line x1="43" y1="85" x2="57" y2="85" stroke="#6b7280" strokeWidth="2" />
                </motion.g>
              </g>

              {/* Surfboard on top */}
              <g transform="translate(60, 25) rotate(-20)">
                <rect
                  x="0"
                  y="0"
                  width="50"
                  height="8"
                  rx="4"
                  fill="url(#surfboardGradient)"
                  stroke="#0891b2"
                  strokeWidth="1"
                />
                <line x1="5" y1="4" x2="45" y2="4" stroke="#06b6d4" strokeWidth="1" opacity="0.5" />
              </g>
            </g>

            {/* Gradients */}
            <defs>
              <linearGradient id="carGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
              <linearGradient id="carBodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00d9ff" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="surfboardGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
          </svg>

          {/* Dust cloud behind car */}
          <motion.div
            className="absolute -left-10 bottom-2 w-12 h-8 bg-amber-300/30 rounded-full blur-md"
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </motion.div>

      {/* Beach umbrella (optional decoration) */}
      <div className="absolute bottom-28 right-[30%]">
        <BeachUmbrella />
      </div>
    </div>
  );
}

// Palm Tree Component
function PalmTree({ scale = 1 }: { scale?: number }) {
  return (
    <motion.svg
      width={60 * scale}
      height={80 * scale}
      viewBox="0 0 60 80"
      className="drop-shadow-md"
      animate={{
        rotate: [-2, 2, -2]
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {/* Trunk */}
      <path
        d="M 28 80 Q 25 50, 27 30 Q 26 20, 28 10 Q 30 20, 29 30 Q 31 50, 28 80"
        fill="#8b4513"
        stroke="#654321"
        strokeWidth="1"
      />
      
      {/* Coconuts */}
      <circle cx="26" cy="18" r="3" fill="#964B00" />
      <circle cx="30" cy="16" r="3" fill="#964B00" />

      {/* Palm leaves */}
      {[...Array(6)].map((_, i) => {
        const angle = (i * 60) - 30;
        return (
          <motion.ellipse
            key={i}
            cx="28"
            cy="15"
            rx="20"
            ry="6"
            fill="url(#palmGradient)"
            style={{
              transformOrigin: "28px 15px",
              transform: `rotate(${angle}deg)`
            }}
            animate={{
              rotate: [angle - 3, angle + 3, angle - 3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.1
            }}
          />
        );
      })}

      <defs>
        <linearGradient id="palmGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#166534" />
          <stop offset="50%" stopColor="#15803d" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

// Beach Umbrella Component
function BeachUmbrella() {
  return (
    <svg width="40" height="50" viewBox="0 0 40 50" className="drop-shadow-md">
      {/* Pole */}
      <line x1="20" y1="20" x2="20" y2="50" stroke="#8b4513" strokeWidth="2" />
      
      {/* Umbrella top */}
      <path
        d="M 5 20 Q 20 10, 35 20"
        fill="none"
        stroke="#ef4444"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M 5 20 Q 20 10, 35 20"
        fill="none"
        stroke="#dc2626"
        strokeWidth="10"
        strokeLinecap="round"
      />
      
      {/* Stripes */}
      <path d="M 12 17 Q 20 11, 28 17" fill="none" stroke="white" strokeWidth="2" opacity="0.6" />
    </svg>
  );
}

export default BeachCar;
