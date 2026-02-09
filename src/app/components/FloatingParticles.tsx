import React from 'react';
import { motion } from 'motion/react';

export function FloatingParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Large Floating Orbs */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full"
          style={{
            width: 100 + Math.random() * 100,
            height: 100 + Math.random() * 100,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 2 === 0 
              ? 'radial-gradient(circle, rgba(0, 217, 255, 0.1) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(0, 255, 170, 0.1) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
          animate={{
            x: [0, Math.random() * 60 - 30, 0],
            y: [0, Math.random() * 60 - 30, 0],
            opacity: [0.25, 0.45, 0.25],
            scale: [1, 1.12, 1],
          }}
          transition={{
            duration: 14 + Math.random() * 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 4
          }}
        />
      ))}

      {/* Small Glowing Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 ? '#00d9ff' : i % 3 === 1 ? '#00ffaa' : '#00f5ff',
            boxShadow: `0 0 6px ${i % 3 === 0 ? '#00d9ff' : i % 3 === 1 ? '#00ffaa' : '#00f5ff'}`,
          }}
          animate={{
            y: [0, -80 - Math.random() * 60],
            x: [0, Math.random() * 30 - 15],
            opacity: [0, 0.7, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: 7 + Math.random() * 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 6
          }}
        />
      ))}

      {/* Light Rays */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`ray-${i}`}
          className="absolute origin-center"
          style={{
            width: '1.5px',
            height: '25%',
            background: 'linear-gradient(to bottom, rgba(0, 217, 255, 0.2), transparent)',
            top: '38%',
            left: '50%',
            transform: `rotate(${(i * 360) / 6}deg)`,
            filter: 'blur(1px)',
          }}
          animate={{
            opacity: [0.15, 0.35, 0.15],
            scaleY: [1, 1.1, 1],
          }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.4
          }}
        />
      ))}
    </div>
  );
}
