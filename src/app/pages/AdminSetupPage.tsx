import React from 'react';
import { AdminSetup } from '../components/AdminSetup';
import { FloatingParticles } from '../components/FloatingParticles';
import { AnimatedWaves } from '../components/AnimatedWaves';
import soulFmLogo from '@/assets/7dc3be36ef413fc4dd597274a640ba655b20ab3d.png';

export function AdminSetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] relative overflow-hidden">
      {/* Background Effects */}
      <FloatingParticles />
      <AnimatedWaves />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <img 
            src={soulFmLogo} 
            alt="Soul FM" 
            className="h-24 w-auto mx-auto mb-6"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(0, 217, 255, 0.5))',
              animation: 'float 3s ease-in-out infinite'
            }}
          />
          <h1 className="text-5xl font-righteous text-white mb-4">
            Soul FM Hub
          </h1>
          <p className="text-xl text-[#00d9ff]">
            Initial Administrator Setup
          </p>
        </div>

        <AdminSetup />

        <div className="text-center mt-12">
          <a 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-[#00ffaa] hover:text-white transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}
