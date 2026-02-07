import React from 'react';
import { Link, useLocation } from 'react-router';
import {
  Home,
  Calendar,
  Music,
  Radio,
  Mic2,
  Settings,
  Users,
  BarChart3,
  Upload,
  ListMusic,
  Sparkles,
  RadioTower,
} from 'lucide-react';
import { motion } from 'motion/react';

const menuItems = [
  { path: '/admin', label: 'Home', icon: Home },
  { path: '/admin/schedule', label: 'Schedule', icon: Calendar },
  { path: '/admin/media', label: 'Media', icon: Music },
  { path: '/admin/playlists', label: 'Playlists', icon: ListMusic },
  { path: '/admin/shows', label: 'Shows & Podcasts', icon: Radio },
  { path: '/admin/automation', label: 'Automation', icon: Sparkles },
  { path: '/admin/news-injection', label: 'News Injection', icon: RadioTower },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export function AdminSidebar() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/home';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="w-64 bg-slate-900/50 border-r border-cyan-500/20 h-screen sticky top-0 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-cyan-500/20">
        <h2 className="text-2xl font-righteous text-transparent bg-clip-text bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]">
          Soul FM
        </h2>
        <p className="text-sm text-cyan-100/60 mt-1">Admin Dashboard</p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  active
                    ? 'bg-gradient-to-r from-[#00d9ff]/20 to-[#00ffaa]/20 text-[#00d9ff] border border-[#00d9ff]/30'
                    : 'text-cyan-100/70 hover:bg-slate-800/50 hover:text-cyan-100'
                }`}
              >
                <Icon className="size-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-cyan-500/20">
        <Link to="/">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-cyan-100/70 hover:text-cyan-100 transition-all">
            <Home className="size-4" />
            <span className="text-sm">Back to Site</span>
          </button>
        </Link>
      </div>
    </div>
  );
}
