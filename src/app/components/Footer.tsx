import React from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { 
  Radio, 
  Music, 
  Calendar, 
  Newspaper, 
  Heart, 
  Mail, 
  MapPin, 
  Phone,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Linkedin,
  Github
} from 'lucide-react';
import { SOUL_FM_LOGO } from '../../lib/assets';
import { AnimatedBeach } from './AnimatedBeach';
import { AnimatedWaves } from './AnimatedWaves';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const navigationLinks = [
    {
      title: 'On Air',
      links: [
        { label: 'Schedule', href: '/schedule', icon: Calendar },
        { label: 'Shows & Podcasts', href: '/shows', icon: Radio },
        { label: 'Music Library', href: '/music', icon: Music },
        { label: 'News', href: '/news', icon: Newspaper },
        { label: 'Our DJs', href: '/djs', icon: Radio },
      ]
    },
    {
      title: 'Community',
      links: [
        { label: 'Events', href: '/events', icon: Calendar },
        { label: 'Community Chat', href: '/community', icon: Heart },
        { label: 'Merch Shop', href: '/merch', icon: Heart },
        { label: 'Support Us', href: '/support', icon: Heart },
      ]
    },
    {
      title: 'Information',
      links: [
        { label: 'About Radio', href: '/about', icon: Radio },
        { label: 'Our Team', href: '/team', icon: Heart },
        { label: 'FAQ', href: '/faq', icon: Heart },
        { label: 'Contact Us', href: '/contact', icon: Mail },
      ]
    },
  ];

  const socialLinks = [
    { name: 'Instagram', icon: Instagram, href: '#', color: '#E4405F' },
    { name: 'Twitter', icon: Twitter, href: '#', color: '#1DA1F2' },
    { name: 'Facebook', icon: Facebook, href: '#', color: '#4267B2' },
    { name: 'YouTube', icon: Youtube, href: '#', color: '#FF0000' },
    { name: 'LinkedIn', icon: Linkedin, href: '#', color: '#0077B5' },
    { name: 'GitHub', icon: Github, href: '#', color: '#181717' },
  ];

  return (
    <footer className="relative bg-gradient-to-b from-[#0a1628] via-[#0d1a2d] to-[#020817] overflow-hidden">
      {/* Smooth gradient transition at top */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent via-[#0a1628]/50 to-[#0a1628] pointer-events-none -z-10" />
      
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        {/* Gradient blobs - более активные */}
        <motion.div
          className="absolute -left-32 top-10 w-[500px] h-[500px] bg-gradient-to-br from-[#00d9ff]/15 to-[#00ffaa]/15 rounded-full blur-3xl"
          animate={{
            x: [0, 60, 0],
            y: [0, 40, 0],
            scale: [1, 1.15, 1],
            rotate: [0, 90, 0]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -right-32 top-32 w-[600px] h-[600px] bg-gradient-to-br from-[#00ffaa]/15 to-[#00d9ff]/15 rounded-full blur-3xl"
          animate={{
            x: [0, -40, 0],
            y: [0, -60, 0],
            scale: [1, 1.25, 1],
            rotate: [0, -90, 0]
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute left-1/2 bottom-20 w-[400px] h-[400px] bg-gradient-to-br from-[#00d9ff]/10 to-[#00ffaa]/10 rounded-full blur-3xl"
          animate={{
            x: [-50, 50, -50],
            y: [0, -30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Floating particles - больше и активнее */}
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-cyan-400/40"
            style={{
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -40 - Math.random() * 20, 0],
              x: [0, (Math.random() - 0.5) * 30, 0],
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.3, 1]
            }}
            transition={{
              duration: 3 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut"
            }}
          />
        ))}

        {/* Gradient waves at bottom */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scaleX: [0.95, 1.05, 0.95]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Main footer content */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Top section with logo and description */}
        <div className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Link to="/" className="inline-block mb-6">
              <motion.div
                className="relative w-24 h-24 mx-auto"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.3 }}
              >
                {/* Круглая рамка с градиентом */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00d9ff] via-[#00ffaa] to-[#00d9ff] p-1"
                  animate={{
                    rotate: 360
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <div className="w-full h-full rounded-full bg-[#0a1628] p-1">
                    <img 
                      src={SOUL_FM_LOGO}
                      alt="Soul FM Hub"
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                </motion.div>

                {/* Пульсирующее свечение */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] blur-xl opacity-50"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            </Link>
            
            <motion.h3 
              className="text-3xl font-righteous text-transparent bg-clip-text bg-gradient-to-r from-[#00d9ff] via-[#00ffaa] to-[#00d9ff] mb-4"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                backgroundSize: '200% 200%'
              }}
            >
              Soul FM Hub
            </motion.h3>
            
            <p className="text-cyan-100/70 max-w-2xl mx-auto text-sm leading-relaxed">
              24/7 automated radio with smart Auto-DJ, curated playlists, live DJ's and tropical vibes in cyan-mint aesthetic
            </p>
          </motion.div>
        </div>

        {/* Navigation links */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {navigationLinks.map((section, idx) => (
            <div key={idx}>
              <h4 className="text-cyan-400 font-semibold mb-4 text-lg flex items-center gap-2">
                <motion.div 
                  className="w-1 h-6 bg-gradient-to-b from-[#00d9ff] to-[#00ffaa] rounded-full"
                  animate={{
                    scaleY: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: idx * 0.3
                  }}
                />
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link, linkIdx) => {
                  const Icon = link.icon;
                  return (
                    <li key={linkIdx}>
                      <Link
                        to={link.href}
                        className="flex items-center gap-2 text-cyan-100/60 hover:text-cyan-400 transition-all duration-300 group"
                      >
                        <motion.div
                          whileHover={{ rotate: 360, scale: 1.2 }}
                          transition={{ duration: 0.5 }}
                        >
                          <Icon className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </motion.div>
                        <span className="relative">
                          {link.label}
                          <motion.span 
                            className="absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]"
                            initial={{ width: 0 }}
                            whileHover={{ width: '100%' }}
                            transition={{ duration: 0.3 }}
                          />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </motion.div>

        {/* Divider */}
        <motion.div 
          className="relative h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent mb-8"
          animate={{
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Social media and newsletter */}
        <motion.div
          className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {/* Social links */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <h4 className="text-cyan-400 font-semibold text-sm uppercase tracking-wider">
              Follow Us
            </h4>
            <div className="flex items-center gap-3">
              {socialLinks.map((social, idx) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={idx}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group"
                    whileHover={{ scale: 1.15, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <div className="relative z-10 w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500/10 to-cyan-700/10 border border-cyan-500/20 flex items-center justify-center backdrop-blur-sm group-hover:border-cyan-400/60 transition-all duration-300">
                      <Icon className="size-5 text-cyan-400/70 group-hover:text-cyan-300 transition-colors" />
                    </div>
                    
                    {/* Glow effect on hover */}
                    <motion.div
                      className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300"
                      style={{ zIndex: 0 }}
                    />

                    {/* Rotating ring */}
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400/50 opacity-0 group-hover:opacity-100"
                      animate={{
                        rotate: 360
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                  </motion.a>
                );
              })}
            </div>
          </div>

          {/* Newsletter subscription */}
          <div className="flex flex-col items-center md:items-end gap-4 max-w-md w-full">
            <h4 className="text-cyan-400 font-semibold text-sm uppercase tracking-wider">
              Newsletter
            </h4>
            <div className="flex gap-2 w-full">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 px-4 py-2.5 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-cyan-100 placeholder:text-cyan-100/30 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 focus:bg-slate-900/70 transition-all"
              />
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0, 217, 255, 0.4)' }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2.5 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300"
              >
                Subscribe
              </motion.button>
            </div>
            <p className="text-xs text-cyan-100/40 text-center md:text-right">
              Get updates about broadcasts, new shows and special events
            </p>
          </div>
        </motion.div>

        {/* Divider */}
        <motion.div 
          className="relative h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent mb-8"
          animate={{
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />

        {/* Bottom section */}
        <motion.div
          className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-cyan-100/40"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="flex flex-col md:flex-row items-center gap-4">
            <p>© {currentYear} Soul FM Hub. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link 
                to="/about" 
                className="hover:text-cyan-400 transition-colors duration-300 relative group"
              >
                Privacy Policy
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-cyan-400 group-hover:w-full transition-all duration-300" />
              </Link>
              <span className="text-cyan-500/30">•</span>
              <Link 
                to="/about" 
                className="hover:text-cyan-400 transition-colors duration-300 relative group"
              >
                Terms of Service
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-cyan-400 group-hover:w-full transition-all duration-300" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Extra features badges */}
        {/* Removed: Made with ❤️ and AI badges section */}
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020817] to-transparent pointer-events-none -z-10" />
      
      {/* Animated Beach and Waves */}
      <AnimatedBeach />
      <AnimatedWaves />
    </footer>
  );
}