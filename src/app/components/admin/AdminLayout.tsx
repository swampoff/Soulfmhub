import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
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
  ChevronDown,
  TestTube,
  Newspaper,
  Headphones,
  MessageCircle,
  Heart,
  Phone,
  DollarSign,
  Sparkles,
  Globe,
  Home,
  FileAudio,
  Tv,
  Upload,
  Users,
  FileText,
  Archive,
  Palette,
  MessageSquare,
  Bot,
  Clapperboard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
const soulFmLogo = '/favicon.ico';

// ── All admin navigation items, organized by group ──────────────────

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const PRIMARY_TABS: NavItem[] = [
  { id: 'home',      label: 'Home',      icon: Home,     path: '/admin' },
  { id: 'media',     label: 'Media',     icon: Music,    path: '/admin/media' },
  { id: 'playlists', label: 'Playlists', icon: ListMusic, path: '/admin/playlists' },
  { id: 'schedule',  label: 'Schedule',  icon: Calendar, path: '/admin/schedule' },
  { id: 'shows',     label: 'Shows',     icon: Tv,       path: '/admin/shows' },
  { id: 'news',      label: 'News',      icon: Newspaper, path: '/admin/news' },
];

const MORE_GROUPS: NavGroup[] = [
  {
    id: 'radio',
    label: 'Radio & DJ',
    items: [
      { id: 'automation',     label: 'Automation & Jingles', icon: Sparkles,    path: '/admin/automation' },
      { id: 'live-dj',        label: 'Live DJ Console',      icon: Headphones,  path: '/admin/live-dj-console' },
      { id: 'track-upload',   label: 'Track Upload',         icon: Upload,      path: '/admin/track-upload' },
      { id: 'live-playlist',  label: 'Live Playlist',        icon: Radio,       path: '/admin/live-playlist' },
      { id: 'stream',         label: 'Stream Settings',      icon: Settings,    path: '/admin/stream-settings' },
      { id: 'news-injection', label: 'News Injection',       icon: Globe,       path: '/admin/news-injection' },
    ],
  },
  {
    id: 'interactive',
    label: 'Interactive',
    items: [
      { id: 'song-requests', label: 'Song Requests', icon: MessageCircle, path: '/admin/song-requests' },
      { id: 'shoutouts',     label: 'Shoutouts',     icon: Heart,         path: '/admin/shoutouts' },
      { id: 'call-queue',    label: 'Call Queue',     icon: Phone,         path: '/admin/call-queue' },
      { id: 'donations',     label: 'Donations',     icon: DollarSign,    path: '/admin/donations' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'analytics',   label: 'Analytics',    icon: BarChart3,      path: '/admin/analytics' },
      { id: 'users',       label: 'Users',        icon: Users,          path: '/admin/users' },
      { id: 'logs',        label: 'Logs & Audit', icon: FileText,       path: '/admin/logs' },
      { id: 'backup',      label: 'Backup & Export', icon: Archive,     path: '/admin/backup' },
      { id: 'branding',    label: 'Branding',     icon: Palette,        path: '/admin/branding' },
      { id: 'feedback',    label: 'Feedback',     icon: MessageSquare,  path: '/admin/feedback' },
      { id: 'ai-team',     label: 'AI Dev Team',  icon: Bot,            path: '/admin/ai-team' },
      { id: 'broadcast-team', label: 'Broadcast Team', icon: Radio,     path: '/admin/broadcast-team' },
      { id: 'editorial',    label: 'Editorial Dept', icon: Clapperboard,  path: '/admin/editorial' },
      { id: 'system-test', label: 'System Test',  icon: TestTube,       path: '/admin/system-test' },
      { id: 'upload-test', label: 'Upload Test',  icon: FileAudio,      path: '/admin/upload-test' },
    ],
  },
];

// Flatten all items for mobile menu
const ALL_ITEMS: NavItem[] = [
  ...PRIMARY_TABS,
  ...MORE_GROUPS.flatMap(g => g.items),
];

// ── "More" dropdown component ────────────────────────────────────────

function MoreDropdown({ currentPath }: { currentPath: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Is the active page inside "More"?
  const isMoreActive = MORE_GROUPS.some(g => g.items.some(i => currentPath === i.path || currentPath.startsWith(i.path + '/')));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`
          px-3 xl:px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap text-sm font-medium
          ${isMoreActive
            ? 'bg-white/10 text-white'
            : 'text-white/60 hover:text-white hover:bg-white/5'
          }
        `}
      >
        More
        <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 bg-[#141414] border border-white/10 rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50"
          >
            {MORE_GROUPS.map((group, gi) => (
              <div key={group.id}>
                {gi > 0 && <div className="border-t border-white/5" />}
                <div className="px-3 pt-3 pb-1">
                  <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                    {group.label}
                  </span>
                </div>
                {group.items.map(item => {
                  const Icon = item.icon;
                  const active = currentPath === item.path || currentPath.startsWith(item.path + '/');
                  return (
                    <button
                      key={item.id}
                      onClick={() => { navigate(item.path); setOpen(false); }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors
                        ${active
                          ? 'bg-[#00d9ff]/10 text-[#00d9ff]'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }
                      `}
                    >
                      <Icon className="size-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main layout ──────────────────────────────────────────────────────

interface AdminLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'default' | 'wide' | 'full';
}

export function AdminLayout({ children, maxWidth = 'default' }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case 'wide':  return 'max-w-[1600px]';
      case 'full':  return 'max-w-full';
      default:      return 'max-w-7xl';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Top Navigation */}
      <div className="border-b border-white/10 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-md z-50">
        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo — click goes to public home */}
            <Link
              to="/"
              className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] p-0.5 hover:scale-110 transition-transform duration-300">
                <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                  <img
                    src={soulFmLogo}
                    alt="Soul FM"
                    className="w-full h-full object-cover rounded-full"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(0, 217, 255, 0.4))' }}
                  />
                </div>
              </div>
            </Link>

            {/* Desktop Tabs */}
            <div className="hidden lg:flex items-center gap-1 flex-1 justify-center overflow-x-auto scrollbar-hide">
              {PRIMARY_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = location.pathname === tab.path
                  || (tab.path === '/admin' && location.pathname === '/admin/home')
                  || (tab.path !== '/admin' && location.pathname.startsWith(tab.path + '/'));

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

              {/* More dropdown */}
              <MoreDropdown currentPath={location.pathname} />
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

              {/* Back to public site */}
              <Link
                to="/"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
              >
                <Radio className="size-3.5" />
                <span>Site</span>
              </Link>

              {/* User */}
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

        {/* Mobile Menu — full grouped list */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-white/10 bg-[#0a0a0a] max-h-[70vh] overflow-y-auto"
            >
              <div className="px-3 py-2 space-y-0.5">
                {/* Primary items */}
                {PRIMARY_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = location.pathname === tab.path
                    || (tab.path === '/admin' && location.pathname === '/admin/home');
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { navigate(tab.path); setMobileMenuOpen(false); }}
                      className={`
                        w-full flex items-center justify-between p-3 rounded-lg transition-all
                        ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}
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

                {/* Grouped sections */}
                {MORE_GROUPS.map(group => (
                  <div key={group.id}>
                    <div className="px-3 pt-4 pb-1">
                      <span className="text-[10px] uppercase tracking-wider text-white/25 font-semibold">
                        {group.label}
                      </span>
                    </div>
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                      return (
                        <button
                          key={item.id}
                          onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                          className={`
                            w-full flex items-center justify-between p-3 rounded-lg transition-all
                            ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="size-5" />
                            <span className="text-sm font-medium">{item.label}</span>
                          </div>
                          <ChevronRight className="size-4" />
                        </button>
                      );
                    })}
                  </div>
                ))}
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