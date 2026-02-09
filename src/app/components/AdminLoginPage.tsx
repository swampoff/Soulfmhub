import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ArrowLeft, Lock, Eye, EyeOff, Radio, Headphones, Waves } from 'lucide-react';
import soulFmLogo from 'figma:asset/7dc3be36ef413fc4dd597274a640ba655b20ab3d.png';

interface AdminLoginPageProps {
  onLogin: () => void;
}

// Floating particle component for background ambience
function FloatingOrb({ delay, size, x, y }: { delay: number; size: number; x: string; y: string }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: `radial-gradient(circle, rgba(0, 217, 255, 0.12) 0%, transparent 70%)`,
      }}
      animate={{
        y: [0, -30, 0, 20, 0],
        x: [0, 15, -10, 5, 0],
        opacity: [0.3, 0.6, 0.4, 0.7, 0.3],
        scale: [1, 1.1, 0.95, 1.05, 1],
      }}
      transition={{
        duration: 12 + delay * 2,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  );
}

export function AdminLoginPage({ onLogin }: AdminLoginPageProps) {
  const navigate = useNavigate();
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [showPin, setShowPin] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // The master PIN — in production, this would be server-validated
  const MASTER_PIN = '0000';

  useEffect(() => {
    // Auto-focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handlePinChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // only digits

    const newPin = [...pin];
    
    // Handle paste of full PIN
    if (value.length > 1) {
      const digits = value.slice(0, 4).split('');
      digits.forEach((d, i) => {
        if (i < 4) newPin[i] = d;
      });
      setPin(newPin);
      const nextEmpty = newPin.findIndex(d => d === '');
      if (nextEmpty === -1) {
        inputRefs.current[3]?.focus();
        setFocusedIndex(3);
      } else {
        inputRefs.current[nextEmpty]?.focus();
        setFocusedIndex(nextEmpty);
      }
      return;
    }

    newPin[index] = value;
    setPin(newPin);
    setError('');

    // Auto-advance to next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }

    // Auto-submit when all 4 digits entered
    if (value && index === 3 && newPin.every(d => d !== '')) {
      setTimeout(() => validatePin(newPin.join('')), 150);
    }
  }, [pin]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
      const newPin = [...pin];
      newPin[index - 1] = '';
      setPin(newPin);
    }
    if (e.key === 'Enter') {
      const code = pin.join('');
      if (code.length === 4) {
        validatePin(code);
      }
    }
  }, [pin]);

  const validatePin = (code: string) => {
    if (code === MASTER_PIN) {
      setShowSuccess(true);
      setError('');
      setTimeout(() => {
        onLogin();
      }, 800);
    } else {
      setError('Invalid PIN code');
      setShake(true);
      setAttempts(prev => prev + 1);
      setTimeout(() => {
        setShake(false);
        setPin(['', '', '', '']);
        inputRefs.current[0]?.focus();
        setFocusedIndex(0);
      }, 600);
    }
  };

  const handleQuickEnter = () => {
    // Quick enter — fill PIN and login
    setPin(['0', '0', '0', '0']);
    setShowSuccess(true);
    setTimeout(() => {
      onLogin();
    }, 600);
  };

  const isFilled = pin.every(d => d !== '');

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#060d18]">
      {/* Animated background */}
      <div className="absolute inset-0">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#060d18] via-[#0a1628] to-[#081020]" />
        
        {/* Animated gradient orbs */}
        <FloatingOrb delay={0} size={400} x="10%" y="20%" />
        <FloatingOrb delay={2} size={300} x="70%" y="10%" />
        <FloatingOrb delay={4} size={350} x="50%" y="60%" />
        <FloatingOrb delay={1} size={250} x="20%" y="70%" />
        <FloatingOrb delay={3} size={200} x="80%" y="50%" />
        
        {/* Radial glow behind the card */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(0, 217, 255, 0.06) 0%, rgba(0, 255, 170, 0.03) 40%, transparent 70%)',
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 217, 255, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 217, 255, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Back to radio link */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-white/40 hover:text-[#00d9ff] transition-colors group z-10"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Radio</span>
      </motion.button>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20, mass: 0.8 }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        <div className="relative">
          {/* Card glow */}
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#00d9ff]/20 via-[#00d9ff]/5 to-[#00ffaa]/10 blur-sm" />
          
          {/* Card body */}
          <div className="relative rounded-2xl bg-[#0c1829]/80 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/50 overflow-hidden">
            {/* Top accent line */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#00d9ff]/60 to-transparent" />

            <div className="px-8 pt-10 pb-8">
              {/* Round Logo — click → home */}
              <motion.div
                className="flex justify-center mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
              >
                <div
                  onClick={() => navigate('/')}
                  className="relative cursor-pointer group"
                  title="Go to Soul FM Home"
                >
                  {/* Outer glow ring */}
                  <motion.div
                    className="absolute -inset-3 rounded-full"
                    style={{
                      background: 'conic-gradient(from 0deg, #00d9ff, #00ffaa, #00d9ff)',
                      opacity: 0.15,
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  />
                  
                  {/* Pulse ring */}
                  <motion.div
                    className="absolute -inset-2 rounded-full border border-[#00d9ff]/20"
                    animate={{
                      scale: [1, 1.15, 1],
                      opacity: [0.3, 0, 0.3],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* Logo container */}
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] p-[3px] group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-[#00d9ff]/20 group-hover:shadow-[#00d9ff]/40">
                    <div className="w-full h-full rounded-full bg-[#0a1628] flex items-center justify-center overflow-hidden">
                      <img
                        src={soulFmLogo}
                        alt="Soul FM"
                        className="w-full h-full object-cover rounded-full"
                        style={{
                          filter: 'drop-shadow(0 0 12px rgba(0, 217, 255, 0.5))',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Branding */}
              <motion.div
                className="text-center mb-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <h1
                  className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] mb-1"
                  style={{ fontFamily: 'Righteous, cursive' }}
                >
                  Soul FM Hub
                </h1>
                <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Control Panel</span>
                </div>
              </motion.div>

              {/* PIN Input */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <label className="block text-xs text-white/30 uppercase tracking-wider mb-3 text-center font-medium">
                  Enter PIN Code
                </label>

                <motion.div
                  className="flex justify-center gap-3 mb-4"
                  animate={shake ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  {pin.map((digit, idx) => (
                    <div key={idx} className="relative">
                      <input
                        ref={(el) => { inputRefs.current[idx] = el; }}
                        type={showPin ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={idx === 0 ? 4 : 1}
                        value={digit}
                        onChange={(e) => handlePinChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onFocus={() => setFocusedIndex(idx)}
                        className={`
                          w-14 h-16 text-center text-2xl font-bold rounded-xl
                          bg-white/[0.04] border-2 outline-none
                          transition-all duration-200
                          ${digit
                            ? 'border-[#00d9ff]/40 text-white shadow-[0_0_15px_rgba(0,217,255,0.1)]'
                            : focusedIndex === idx
                              ? 'border-[#00d9ff]/50 text-white'
                              : 'border-white/[0.08] text-white/60'
                          }
                          ${error ? 'border-red-500/50' : ''}
                          focus:border-[#00d9ff]/60 focus:bg-white/[0.06]
                          focus:shadow-[0_0_20px_rgba(0,217,255,0.15)]
                        `}
                        style={{ caretColor: '#00d9ff' }}
                      />
                      {/* Active dot indicator */}
                      <motion.div
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00d9ff]"
                        initial={false}
                        animate={{
                          opacity: focusedIndex === idx ? 1 : digit ? 0.4 : 0,
                          scale: focusedIndex === idx ? 1 : 0.6,
                        }}
                      />
                    </div>
                  ))}
                </motion.div>

                {/* Show/Hide PIN toggle */}
                <div className="flex justify-center mb-5">
                  <button
                    onClick={() => setShowPin(!showPin)}
                    className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition-colors"
                  >
                    {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showPin ? 'Hide' : 'Show'} PIN
                  </button>
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -5, height: 0 }}
                      className="text-center mb-4"
                    >
                      <p className="text-red-400/90 text-sm">
                        {error}
                        {attempts > 2 && (
                          <span className="block text-xs text-white/30 mt-1">
                            Hint: default PIN is 0000
                          </span>
                        )}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success animation */}
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center mb-4"
                    >
                      <motion.div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ffaa]/10 border border-[#00ffaa]/20"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 0.5 }}
                      >
                        <motion.div
                          className="w-2 h-2 rounded-full bg-[#00ffaa]"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 0.4 }}
                        />
                        <span className="text-[#00ffaa] text-sm font-medium">Access Granted</span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Enter button */}
                <motion.button
                  onClick={() => {
                    const code = pin.join('');
                    if (code.length === 4) {
                      validatePin(code);
                    } else {
                      inputRefs.current[pin.findIndex(d => d === '')]?.focus();
                    }
                  }}
                  disabled={!isFilled || showSuccess}
                  className={`
                    w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider
                    transition-all duration-300 relative overflow-hidden
                    ${isFilled && !showSuccess
                      ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] hover:shadow-lg hover:shadow-[#00d9ff]/25 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-white/5 text-white/20 cursor-not-allowed'
                    }
                  `}
                  whileTap={isFilled ? { scale: 0.98 } : {}}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>{showSuccess ? 'Entering...' : 'Unlock Admin Panel'}</span>
                  </div>
                </motion.button>

                {/* Quick access divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[10px] text-white/20 uppercase tracking-widest">or</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                {/* Quick Enter */}
                <button
                  onClick={handleQuickEnter}
                  disabled={showSuccess}
                  className="w-full py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/50 hover:text-white/80 hover:bg-white/[0.05] hover:border-white/[0.15] transition-all text-sm font-medium"
                >
                  Quick Access (Demo)
                </button>
              </motion.div>
            </div>

            {/* Bottom info bar */}
            <div className="px-8 py-4 border-t border-white/[0.05] bg-white/[0.01]">
              <div className="flex items-center justify-between text-[11px] text-white/20">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Radio className="w-3 h-3" />
                    <span>Soul FM</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Headphones className="w-3 h-3" />
                    <span>Auto DJ</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Waves className="w-3 h-3" />
                  <span>v2.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
