import React from 'react';
import { motion } from 'motion/react';

interface WaveformProps {
  data: number[]; // Array of normalized amplitudes (0-1)
  color?: string;
  height?: number;
  className?: string;
  animated?: boolean;
}

export function Waveform({ 
  data, 
  color = '#00d9ff', 
  height = 40, 
  className = '',
  animated = false 
}: WaveformProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const barWidth = 100 / data.length;
  const maxHeight = height;

  return (
    <div className={`flex items-end gap-px ${className}`} style={{ height: `${maxHeight}px` }}>
      {data.map((amplitude, index) => {
        const barHeight = Math.max(2, amplitude * maxHeight); // Minimum 2px height
        
        return animated ? (
          <motion.div
            key={index}
            initial={{ height: 0 }}
            animate={{ height: `${barHeight}px` }}
            transition={{
              duration: 0.5,
              delay: index * 0.01,
              ease: 'easeOut'
            }}
            className="flex-1 rounded-t-sm"
            style={{
              backgroundColor: color,
              minWidth: '2px'
            }}
          />
        ) : (
          <div
            key={index}
            className="flex-1 rounded-t-sm transition-all hover:opacity-80"
            style={{
              height: `${barHeight}px`,
              backgroundColor: color,
              minWidth: '2px'
            }}
          />
        );
      })}
    </div>
  );
}

interface WaveformSkeletonProps {
  height?: number;
  className?: string;
}

export function WaveformSkeleton({ height = 40, className = '' }: WaveformSkeletonProps) {
  // Generate random-looking waveform for skeleton
  const skeletonData = Array.from({ length: 50 }, () => Math.random() * 0.6 + 0.2);

  return (
    <div className={className}>
      <Waveform 
        data={skeletonData} 
        color="#334155" 
        height={height} 
      />
    </div>
  );
}
