import { Home, Radio, ArrowLeft, Headphones, Music } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12">
      <div className="container mx-auto px-4 max-w-lg text-center">
        {/* Animated 404 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="mb-8"
        >
          <div className="relative inline-block">
            <h1
              className="text-[120px] md:text-[160px] font-bold leading-none"
              style={{
                fontFamily: 'Righteous, cursive',
                background: 'linear-gradient(135deg, #00d9ff, #00ffaa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: 'none',
              }}
            >
              404
            </h1>
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <Headphones className="w-12 h-12 text-[#00d9ff]/20" />
            </motion.div>
          </div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Righteous, cursive' }}>
            Lost the <span className="text-[#00d9ff]">Frequency</span>
          </h2>
          <p className="text-cyan-100/50 mb-8">
            This page doesn't exist or has been moved. Let's get you back on the wave.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link to="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold hover:opacity-90 transition-opacity w-full sm:w-auto">
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
          <Link to="/schedule" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-colors w-full sm:w-auto">
            <Radio className="w-4 h-4" />
            View Schedule
          </Link>
        </motion.div>

        {/* Fun wave animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex items-center justify-center gap-1"
        >
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full bg-gradient-to-t from-[#00d9ff] to-[#00ffaa]"
              animate={{
                height: [8, 24 + Math.random() * 16, 8],
              }}
              transition={{
                duration: 1 + Math.random() * 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.1,
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}