import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Radio,
  Music,
  Calendar,
  Mic2,
  Settings,
  BarChart3,
  ListMusic,
  Menu,
  X,
  ChevronRight,
  TestTube,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import soulFmLogo from 'figma:asset/7dc3be36ef413fc4dd597274a640ba655b20ab3d.png';

interface AdminLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'default' | 'wide' | 'full';
}

export function AdminLayout({ children, maxWidth = 'default' }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'home', label: 'Home', icon: Radio, path: '/admin' },
    { id: 'media', label: 'Media', icon: Music, path: '/admin/media' },
    { id: 'playlists', label: 'Playlists', icon: ListMusic, path: '/admin/playlists' },
    { id: 'schedule', label: 'Schedule', icon: Calendar, path: '/admin/schedule' },
    { id: 'jingles', label: 'Jingles', icon: Mic2, path: '/admin/jingles' },
    { id: 'stream', label: 'Stream', icon: Settings, path: '/admin/stream-settings' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
    { id: 'test', label: 'Test', icon: TestTube, path: '/admin/system-test' },
  ];

  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case 'wide':
        return 'max-w-[1600px]';
      case 'full':
        return 'max-w-full';
      default:
        return 'max-w-7xl';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Top Navigation */}
      <div className="border-b border-white/10 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-md z-50">
        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo */}
            <div
              onClick={() => navigate('/')}
              className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] p-0.5 hover:scale-110 transition-transform duration-300">
                <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                  <img
                    src={soulFmLogo}
                    alt="Soul FM"
                    className="w-full h-full object-cover rounded-full"
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(0, 217, 255, 0.4))'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Tabs - Desktop only */}
            <div className="hidden lg:flex items-center gap-1 flex-1 justify-center overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = location.pathname === tab.path;

                return (
                  <button
                    key={tab.id}
                    onClick={() => navigate(tab.path)}
                    className={`
                      px-3 xl:px-4 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap
                      ${isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <Icon className="size-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>

              {/* User Menu */}
              <div className="hidden sm:block text-right">
                <div className="text-xs sm:text-sm font-medium">Admin</div>
                <div className="text-[10px] sm:text-xs text-white/40">Super Admin</div>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] flex items-center justify-center text-xs sm:text-sm font-bold text-black">
                A
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-white/10 bg-[#0a0a0a]"
            >
              <div className="px-3 py-2 space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = location.pathname === tab.path;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        navigate(tab.path);
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center justify-between p-3 rounded-lg transition-all
                        ${isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="size-5" />
                        <span className="text-sm font-medium">{tab.label}</span>
                      </div>
                      <ChevronRight className="size-4" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className={`mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 ${getMaxWidthClass()} w-full`}>
        {children}
      </div>
    </div>
  );
}