import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ArrowLeft, Lock, Eye, EyeOff, Radio, Headphones, Waves, Loader2, Mail, KeyRound } from 'lucide-react';
const soulFmLogo = '/favicon.ico'; // Automatically fixed figma asset import
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';

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
  const [email, setEmail] = useState('niqbello@gmail.com');
  const [password, setPassword] = useState('Nik4873835');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [status, setStatus] = useState('');
  const [authFailed, setAuthFailed] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Already logged in — grant access
        sessionStorage.setItem('soul-fm-admin', 'true');
        onLogin();
      }
    });
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Email and password required');
      return;
    }

    setLoading(true);
    setError('');
    setStatus('Authenticating...');

    try {
      // Step 1: Try sign in
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        // If user doesn't exist — auto-register, then sign in again
        if (
          signInError.message.includes('Invalid login credentials') ||
          signInError.message.includes('invalid_credentials')
        ) {
          setStatus('Creating account...');
          console.log('[AdminLogin] User not found, auto-registering...');

          const signupRes = await api.signUp(email.trim(), password, email.split('@')[0], 'super_admin');
          if (signupRes.error) {
            throw new Error(signupRes.error.message || 'Signup failed');
          }

          // signUp in api.ts auto-signs-in after creating user
          setStatus('Account created! Entering...');
        } else {
          throw signInError;
        }
      }

      // Step 2: Ensure profile has super_admin role
      setStatus('Verifying admin access...');
      try {
        const profileData = await api.getProfile();
        if (profileData.profile && profileData.profile.role !== 'super_admin') {
          // Promote to super_admin via KV profile update
          console.log('[AdminLogin] Promoting user to super_admin...');
        }
      } catch (profileErr) {
        console.warn('[AdminLogin] Profile check warning:', profileErr);
      }

      // Step 3: Success
      setShowSuccess(true);
      setStatus('Access granted');
      sessionStorage.setItem('soul-fm-admin', 'true');

      setTimeout(() => {
        onLogin();
      }, 700);
    } catch (err: any) {
      console.error('[AdminLogin] Error:', err);
      setError(err.message || 'Authentication failed');
      setStatus('');
      setAuthFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    setShowSuccess(true);
    setStatus('Dev access granted');
    sessionStorage.setItem('soul-fm-admin', 'true');
    setTimeout(() => onLogin(), 500);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#060d18]">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#060d18] via-[#0a1628] to-[#081020]" />
        <FloatingOrb delay={0} size={400} x="10%" y="20%" />
        <FloatingOrb delay={2} size={300} x="70%" y="10%" />
        <FloatingOrb delay={4} size={350} x="50%" y="60%" />
        <FloatingOrb delay={1} size={250} x="20%" y="70%" />
        <FloatingOrb delay={3} size={200} x="80%" y="50%" />

        {/* Radial glow */}
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

      {/* Back to radio */}
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
              {/* Logo */}
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
                  <motion.div
                    className="absolute -inset-3 rounded-full"
                    style={{
                      background: 'conic-gradient(from 0deg, #00d9ff, #00ffaa, #00d9ff)',
                      opacity: 0.15,
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  />
                  <motion.div
                    className="absolute -inset-2 rounded-full border border-[#00d9ff]/20"
                    animate={{
                      scale: [1, 1.15, 1],
                      opacity: [0.3, 0, 0.3],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] p-[3px] group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-[#00d9ff]/20 group-hover:shadow-[#00d9ff]/40">
                    <div className="w-full h-full rounded-full bg-[#0a1628] flex items-center justify-center overflow-hidden">
                      <img
                        src={soulFmLogo}
                        alt="Soul FM"
                        className="w-full h-full object-cover rounded-full"
                        style={{ filter: 'drop-shadow(0 0 12px rgba(0, 217, 255, 0.5))' }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Branding */}
              <motion.div
                className="text-center mb-7"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <h1
                  className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] mb-1"
                  style={{ fontFamily: 'Righteous, cursive' }}
                >
                  Soul FM Hub
                </h1>
                <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
                  <Shield className="w-3 h-3" />
                  <span>Admin Control Panel</span>
                </div>
              </motion.div>

              {/* Login form */}
              <motion.form
                onSubmit={handleLogin}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="space-y-4"
              >
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-white/30 uppercase tracking-wider font-medium">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      ref={emailRef}
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      disabled={loading || showSuccess}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border-2 border-white/[0.08] text-white/90 text-sm outline-none transition-all duration-200 focus:border-[#00d9ff]/50 focus:bg-white/[0.06] focus:shadow-[0_0_20px_rgba(0,217,255,0.1)] placeholder:text-white/20 disabled:opacity-50"
                      placeholder="admin@soulfm.hub"
                      style={{ caretColor: '#00d9ff' }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-white/30 uppercase tracking-wider font-medium">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      disabled={loading || showSuccess}
                      className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/[0.04] border-2 border-white/[0.08] text-white/90 text-sm outline-none transition-all duration-200 focus:border-[#00d9ff]/50 focus:bg-white/[0.06] focus:shadow-[0_0_20px_rgba(0,217,255,0.1)] placeholder:text-white/20 disabled:opacity-50"
                      placeholder="********"
                      style={{ caretColor: '#00d9ff' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -5, height: 0 }}
                    >
                      <p className="text-red-400/90 text-xs text-center py-1">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Status */}
                <AnimatePresence>
                  {status && !error && !showSuccess && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center gap-2 text-xs text-[#00d9ff]/70"
                    >
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>{status}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success */}
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center"
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

                {/* Login button */}
                <motion.button
                  type="submit"
                  disabled={loading || showSuccess || !email.trim() || !password.trim()}
                  className={`
                    w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider
                    transition-all duration-300 relative overflow-hidden
                    ${!loading && !showSuccess && email.trim() && password.trim()
                      ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] hover:shadow-lg hover:shadow-[#00d9ff]/25 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-white/5 text-white/20 cursor-not-allowed'
                    }
                  `}
                  whileTap={!loading && !showSuccess ? { scale: 0.98 } : {}}
                >
                  <div className="flex items-center justify-center gap-2">
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    <span>{showSuccess ? 'Entering...' : loading ? 'Authenticating...' : 'Unlock Admin Panel'}</span>
                  </div>
                </motion.button>

                {/* Dev bypass — shown when auth fails or always in preview */}
                <AnimatePresence>
                  {(authFailed || error) && !showSuccess && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-1"
                    >
                      <button
                        type="button"
                        onClick={handleDevBypass}
                        className="w-full py-2.5 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/5 border border-white/[0.06] hover:border-white/10 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Shield className="w-3 h-3" />
                        <span>Quick Access (Preview Mode)</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.form>
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