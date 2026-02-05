import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useApp } from '../../context/AppContext';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import soulFmLogo from 'figma:asset/7dc3be36ef413fc4dd597274a640ba655b20ab3d.png';
import { AnimatedPalm } from '../components/AnimatedPalm';

export function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useApp();
  const [loading, setLoading] = useState(false);
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '',
    role: 'listener' 
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(signInData.email, signInData.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpData.password !== signUpData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await signUp(signUpData.email, signUpData.password, signUpData.name, signUpData.role);
      toast.success('Account created! Welcome to Soul FM Hub.');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Palms - Left */}
      <AnimatedPalm side="left" delay={0.3} />
      
      {/* Animated Palms - Right */}
      <AnimatedPalm side="right" delay={0.5} />

      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-[#00d9ff] rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-[#00ffaa] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-[#FF8C42] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo Section with Animations */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-block relative mb-6"
          >
            {/* Outer glow ring - animated */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -inset-6 bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] rounded-full blur-2xl"
            />
            
            {/* Middle ring - animated */}
            <motion.div
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute -inset-3 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, #00d9ff, #00ffaa, #00d9ff)',
                opacity: 0.3,
              }}
            />
            
            {/* Floating Logo with Breathing Animation */}
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative z-20"
            >
              {/* Круглый контейнер для логотипа */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
                className="relative w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-[#0a1628] to-[#0d2435] p-2 shadow-2xl"
              >
                <img
                  src={soulFmLogo}
                  alt="Soul FM Hub"
                  className="w-full h-full object-cover rounded-full"
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(0, 217, 255, 0.8)) drop-shadow(0 0 40px rgba(0, 255, 170, 0.5))',
                  }}
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Title with Righteous */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-4xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent mb-3"
            style={{ fontFamily: 'var(--font-family-display)' }}
          >
            Soul FM Hub
          </motion.h1>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-[#00d9ff]/30 backdrop-blur-sm"
          >
            <motion.div
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <Sparkles className="w-3 h-3 text-[#00d9ff]" />
            </motion.div>
            <span className="text-[#00d9ff] font-semibold text-xs tracking-wider">The Wave of Your Soul</span>
          </motion.div>
        </div>

        <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#0a1628]">
              <TabsTrigger value="signin" className="data-[state=active]:bg-[#00d9ff] data-[state=active]:text-[#0a1628]">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-[#00d9ff] data-[state=active]:text-[#0a1628]">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="signin-email" className="text-white">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    required
                    className="bg-[#0a1628] border-[#00d9ff]/30 text-white placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <Label htmlFor="signin-password" className="text-white">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    required
                    className="bg-[#0a1628] border-[#00d9ff]/30 text-white placeholder:text-gray-500"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628] font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="signup-name" className="text-white">Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your Name"
                    value={signUpData.name}
                    onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                    required
                    className="bg-[#0a1628] border-[#00d9ff]/30 text-white placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <Label htmlFor="signup-email" className="text-white">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    required
                    className="bg-[#0a1628] border-[#00d9ff]/30 text-white placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password" className="text-white">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    required
                    className="bg-[#0a1628] border-[#00d9ff]/30 text-white placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <Label htmlFor="signup-confirm" className="text-white">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={signUpData.confirmPassword}
                    onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                    required
                    className="bg-[#0a1628] border-[#00d9ff]/30 text-white placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <Label htmlFor="signup-role" className="text-white">Role</Label>
                  <Select
                    value={signUpData.role}
                    onValueChange={(value) => setSignUpData({ ...signUpData, role: value })}
                  >
                    <SelectTrigger className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                      <SelectItem value="listener">Listener</SelectItem>
                      <SelectItem value="dj">DJ</SelectItem>
                      <SelectItem value="host">Host</SelectItem>
                      <SelectItem value="music_curator">Music Curator</SelectItem>
                      <SelectItem value="content_manager">Content Manager</SelectItem>
                      <SelectItem value="program_director">Program Director</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-white/50 mt-1">
                    Select your role. Admin roles have access to content management.
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628] font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-[#00d9ff] hover:bg-[#00d9ff]/10"
          >
            ← Back to Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}