import React, { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Menu, X, User, MessageCircle, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useApp } from '../../context/AppContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { SOUL_FM_LOGO } from '../../lib/assets';
import { RealtimeConnectionStatus } from './RealtimeConnectionStatus';

export function Navigation() {
  const location = useLocation();
  const { user, signOut, streamStatus } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/schedule', label: 'Schedule' },
    { path: '/podcasts', label: 'Shows & Podcasts' },
    { path: '/music', label: 'Music' },
    { path: '/news', label: 'News' },
    { path: '/djs', label: 'DJs' },
    { path: '/events', label: 'Events' },
    { path: '/community', label: 'Community' },
    { path: '/about', label: 'About' },
    { path: '/support', label: 'Support Us' },
  ];

  const isActive = (path: string) => {
    // Special case: Shows & Podcasts is active for both /podcasts and /shows routes
    if (path === '/podcasts') {
      return location.pathname.startsWith('/podcasts') || location.pathname.startsWith('/shows');
    }
    return location.pathname === path;
  };

  return (
    <nav className="bg-[#0a1628]/95 backdrop-blur-md text-white border-b border-[#00d9ff]/20 relative z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#0a1628] to-[#0d2435] p-1.5 shadow-lg border-2 border-[#00d9ff]/30 group-hover:border-[#00d9ff]/60 transition-all">
              <img 
                src={SOUL_FM_LOGO} 
                alt="Soul FM" 
                className="w-full h-full object-cover rounded-full"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(0, 217, 255, 0.5))'
                }}
              />
            </div>
            <div className="hidden sm:block">
              <div 
                className="text-xs text-[#00d9ff] opacity-80 group-hover:opacity-100 transition-opacity"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                The Wave of Your Soul
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium transition-colors relative ${
                  isActive(item.path)
                    ? 'text-[#00d9ff]'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {item.label}
                {isActive(item.path) && (
                  <div className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-[#00d9ff]"></div>
                )}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Realtime Connection Status */}
            <div className="hidden md:block">
              <RealtimeConnectionStatus showLabel={false} compact={true} />
            </div>

            {/* Interactive Feature Links */}
            <div className="hidden xl:flex items-center gap-1.5">
              <Link to="/request-song">
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-[#00d9ff]/80 hover:text-[#00d9ff] hover:bg-[#00d9ff]/10 text-xs h-8 px-2.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Request</span>
                </Button>
              </Link>
              <Link to="/send-shoutout">
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-[#00ffaa]/80 hover:text-[#00ffaa] hover:bg-[#00ffaa]/10 text-xs h-8 px-2.5"
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>Shoutout</span>
                </Button>
              </Link>
            </div>

            {/* Live Badge */}
            {streamStatus?.status === 'online' && (
              <Badge className="bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40 gap-2 px-3 py-1.5 hidden sm:flex">
                <span className="w-2 h-2 bg-[#00ff88] rounded-full animate-pulse"></span>
                <span className="font-semibold">LIVE</span>
                <span className="text-[#00ff88]/80">{streamStatus.listeners || 0}</span>
              </Badge>
            )}

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="gap-2 text-white hover:bg-white/10 border border-[#00d9ff]/30 hover:border-[#00d9ff]/50"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{user.name?.split(' ')[0] || 'User'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-[#0f1c2e] border-[#00d9ff]/30">
                  <DropdownMenuItem className="flex items-center gap-3 p-3 border-b border-white/5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] flex items-center justify-center font-bold text-[#0a1628]" style={{ fontFamily: 'var(--font-family-display)' }}>
                      {user.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <span className="block font-semibold text-white">{user.name}</span>
                      <span className="text-xs text-gray-400">{user.email}</span>
                    </div>
                  </DropdownMenuItem>
                  {user.role === 'super_admin' && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="text-[#00d9ff]">
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => signOut()} className="text-white hover:text-[#00d9ff]">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-white/10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-[#00d9ff]/20 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-[#00d9ff]/20 text-[#00d9ff]'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* Interactive links in mobile menu */}
              <div className="border-t border-[#00d9ff]/10 mt-2 pt-2">
                <div className="px-4 pb-1">
                  <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Interactive</span>
                </div>
                <Link
                  to="/request-song"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                    location.pathname === '/request-song' ? 'bg-[#00d9ff]/20 text-[#00d9ff]' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  Request a Song
                </Link>
                <Link
                  to="/send-shoutout"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                    location.pathname === '/send-shoutout' ? 'bg-[#00ffaa]/20 text-[#00ffaa]' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  Send a Shoutout
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}