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
              ? 'radial-gradient(circle, rgba(0, 217, 255, 0.15) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(0, 255, 170, 0.15) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
          animate={{
            x: [0, Math.random() * 100 - 50, 0],
            y: [0, Math.random() * 100 - 50, 0],
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 10 + Math.random() * 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 3
          }}
        />
      ))}

      {/* Small Glowing Particles */}
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 ? '#00d9ff' : i % 3 === 1 ? '#00ffaa' : '#00f5ff',
            boxShadow: `0 0 10px ${i % 3 === 0 ? '#00d9ff' : i % 3 === 1 ? '#00ffaa' : '#00f5ff'}`,
          }}
          animate={{
            y: [0, -100 - Math.random() * 100],
            x: [0, Math.random() * 50 - 25],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 5 + Math.random() * 3,
            repeat: Infinity,
            ease: "easeOut",
            delay: Math.random() * 5
          }}
        />
      ))}

      {/* Light Rays */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`ray-${i}`}
          className="absolute origin-center"
          style={{
            width: '2px',
            height: '30%',
            background: 'linear-gradient(to bottom, rgba(0, 217, 255, 0.3), transparent)',
            top: '35%',
            left: '50%',
            transform: `rotate(${(i * 360) / 8}deg)`,
            filter: 'blur(1px)',
          }}
          animate={{
            opacity: [0.2, 0.5, 0.2],
            scaleY: [1, 1.2, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  );
}
