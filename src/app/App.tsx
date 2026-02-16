import React, { useState, Component, ErrorInfo, ReactNode, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { AppProvider, useApp } from '../context/AppContext';
import { Navigation } from './components/Navigation';
import { RadioPlayer } from './components/RadioPlayer';
import { RealtimeIndicator } from './components/RealtimeIndicator';
import { HomePage } from './pages/HomePage';
import { SchedulePage } from './pages/SchedulePage';
import { ShowsPage } from './pages/ShowsPage';
import { ShowDetailPage } from './pages/ShowDetailPage';
import { MusicLibraryPage } from './pages/MusicLibraryPage';
import { NewsPage } from './pages/NewsPage';
import { ArticleDetailPage } from './pages/ArticleDetailPage';
import { StreamPlayer } from './pages/StreamPlayer';
import { SupportPage } from './pages/SupportPage';
import { ProfilesPage } from './pages/ProfilesPage';
import { ProfileDetailPage } from './pages/ProfileDetailPage';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';
import { ShowsPodcastsPage } from './pages/ShowsPodcastsPage';
import { PodcastDetailPage } from './pages/PodcastDetailPage';
import { AboutPage } from './pages/AboutPage';
import { TracksManagement } from './pages/admin/TracksManagement';
import { TrackEditPage } from './pages/admin/TrackEditPage';
import { PlaylistsManagement } from './pages/admin/PlaylistsManagement';
import { MediaLibraryManagement } from './pages/admin/MediaLibraryManagement';
import { ScheduleManagement } from './pages/admin/ScheduleManagement';
import { ShowsPodcastsManagement } from './pages/admin/ShowsPodcastsManagement';
import { AdminHomePage } from './pages/admin/AdminHomePage';
import { AdminSetupPage } from './pages/AdminSetupPage';
import { PublicPlayer } from './pages/PublicPlayer';
import ContentAutomationDashboard from './pages/dashboards/ContentAutomationDashboard';
import { StreamSettings } from './pages/dashboards/StreamSettings';
import { AnalyticsPage as AdminAnalyticsPage } from './pages/admin/AnalyticsPage';
import { NewsManagement } from './pages/admin/NewsManagement';
import { UploadTestPage } from './pages/admin/UploadTestPage';
import { NewsInjection } from './pages/admin/NewsInjection';
import { SystemTest } from './pages/admin/SystemTest';
import { LiveDJConsole } from './pages/admin/LiveDJConsole';
import { SongRequestsManagement } from './pages/admin/SongRequestsManagement';
import { ShoutoutsManagement } from './pages/admin/ShoutoutsManagement';
import { CallQueueManagement } from './pages/admin/CallQueueManagement';
import { UsersManagement } from './pages/dashboards/UsersManagement';
import { TrackUpload } from './pages/dashboards/TrackUpload';
import { LiveStreamPlaylist } from './pages/dashboards/LiveStreamPlaylist';
import { ListenerDashboard } from './pages/dashboards/ListenerDashboard';
import { RequestSongPage } from './pages/RequestSongPage';
import { SendShoutoutPage } from './pages/SendShoutoutPage';
import { Toaster } from './components/ui/sonner';
import soulFmLogo from '/assets/soul-fm-logo.svg';
import BeachCarDemo from './pages/BeachCarDemo';
import { Footer } from './components/Footer';
import { AnimatedPalm } from './components/AnimatedPalm';
import { Button } from './components/ui/button';
import { AdminLoginPage } from './components/AdminLoginPage';
import { AdminLayout as AdminLayoutComponent } from './components/admin/AdminLayout';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628]">
          <div className="text-center max-w-md px-6">
            <img 
              src={soulFmLogo} 
              alt="Soul FM" 
              className="h-20 w-auto mx-auto mb-6"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(0, 217, 255, 0.4))'
              }}
            />
            <h1 className="text-2xl font-bold text-[#00d9ff] mb-3">
              Something went wrong
            </h1>
            <p className="text-cyan-100/60 mb-6 text-sm">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold px-6 py-3"
            >
              Reload App
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Simple Admin Access Component (no auth required)
function AdminAccess({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return sessionStorage.getItem('soul-fm-admin') === 'true';
  });
  
  if (!isAdmin) {
    return (
      <AdminLoginPage
        onLogin={() => {
          sessionStorage.setItem('soul-fm-admin', 'true');
          setIsAdmin(true);
        }}
      />
    );
  }

  return <>{children}</>;
}

// Protected Route Component (kept for backward compatibility with dashboard)
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { user, loading } = useApp();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628]">
        <div className="text-center">
          <img 
            src={soulFmLogo} 
            alt="Soul FM" 
            className="h-16 w-auto mx-auto mb-4 animate-pulse"
            style={{
              filter: 'drop-shadow(0 0 20px rgba(0, 217, 255, 0.4))'
            }}
          />
          <div className="text-[#00d9ff] text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Public Layout Component
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] relative">
      {/* Global Animated Palms - Behind content with z-0 */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <AnimatedPalm side="left" delay={0} />
        <AnimatedPalm side="right" delay={0.3} />
      </div>
      
      {/* Content above palms */}
      <div className="relative z-10">
        <Navigation />
        <RealtimeIndicator />
        {children}
        <RadioPlayer />
        <Footer />
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* ═══════════════════ Public Routes ═══════════════════ */}
        <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
        <Route path="/schedule" element={<PublicLayout><SchedulePage /></PublicLayout>} />
        <Route path="/shows" element={<PublicLayout><ShowsPage /></PublicLayout>} />
        <Route path="/shows/:id" element={<PublicLayout><ShowDetailPage /></PublicLayout>} />
        <Route path="/podcasts" element={<PublicLayout><ShowsPodcastsPage /></PublicLayout>} />
        <Route path="/podcasts/:id" element={<PublicLayout><PodcastDetailPage /></PublicLayout>} />
        <Route path="/music" element={<PublicLayout><MusicLibraryPage /></PublicLayout>} />
        <Route path="/news" element={<PublicLayout><NewsPage /></PublicLayout>} />
        <Route path="/news/:id" element={<PublicLayout><ArticleDetailPage /></PublicLayout>} />
        <Route path="/support" element={<PublicLayout><SupportPage /></PublicLayout>} />
        <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
        <Route path="/team" element={<PublicLayout><ProfilesPage /></PublicLayout>} />
        <Route path="/team/:slug" element={<PublicLayout><ProfileDetailPage /></PublicLayout>} />
        <Route path="/analytics" element={<PublicLayout><AnalyticsPage /></PublicLayout>} />
        <Route path="/stream" element={<PublicLayout><StreamPlayer /></PublicLayout>} />
        
        {/* Interactive Features - PUBLIC */}
        <Route path="/request-song" element={<PublicLayout><RequestSongPage /></PublicLayout>} />
        <Route path="/send-shoutout" element={<PublicLayout><SendShoutoutPage /></PublicLayout>} />
        
        {/* Beach Car Demo */}
        <Route path="/demo/beach-car" element={<BeachCarDemo />} />
        
        {/* Public Player Route - NO LAYOUT */}
        <Route path="/play/:uniqueId" element={<PublicPlayer />} />
        
        {/* Public Admin Setup Route */}
        <Route path="/setup" element={<AdminSetupPage />} />
        
        {/* Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            <PublicLayout>
              <ListenerDashboard />
            </PublicLayout>
          } 
        />

        {/* ═══════════════════ Admin Routes ═══════════════════ */}
        {/* All admin pages now self-wrap with AdminLayout from components/admin */}

        <Route path="/admin" element={<AdminAccess><AdminHomePage /></AdminAccess>} />
        <Route path="/admin/home" element={<AdminAccess><AdminHomePage /></AdminAccess>} />

        {/* Content Management */}
        <Route path="/admin/tracks" element={<AdminAccess><TracksManagement /></AdminAccess>} />
        <Route path="/admin/tracks/:id/edit" element={<AdminAccess><TrackEditPage /></AdminAccess>} />
        <Route path="/admin/media" element={<AdminAccess><MediaLibraryManagement /></AdminAccess>} />
        <Route path="/admin/playlists" element={<AdminAccess><PlaylistsManagement /></AdminAccess>} />
        <Route path="/admin/schedule" element={<AdminAccess><ScheduleManagement /></AdminAccess>} />
        <Route path="/admin/shows" element={<AdminAccess><ShowsPodcastsManagement /></AdminAccess>} />
        <Route path="/admin/news" element={<AdminAccess><NewsManagement /></AdminAccess>} />

        {/* Radio & DJ */}
        <Route path="/admin/automation" element={<AdminAccess><ContentAutomationDashboard /></AdminAccess>} />
        <Route path="/admin/jingles" element={<AdminAccess><ContentAutomationDashboard /></AdminAccess>} />
        <Route path="/admin/stream-settings" element={<AdminAccess><StreamSettings /></AdminAccess>} />
        <Route path="/admin/news-injection" element={<AdminAccess><NewsInjection /></AdminAccess>} />
        <Route path="/admin/live-dj-console" element={<AdminAccess><LiveDJConsole /></AdminAccess>} />
        <Route path="/admin/track-upload" element={<AdminAccess><TrackUpload /></AdminAccess>} />
        <Route path="/admin/live-playlist" element={<AdminAccess><LiveStreamPlaylist /></AdminAccess>} />

        {/* Interactive */}
        <Route path="/admin/song-requests" element={<AdminAccess><SongRequestsManagement /></AdminAccess>} />
        <Route path="/admin/shoutouts" element={<AdminAccess><ShoutoutsManagement /></AdminAccess>} />
        <Route path="/admin/call-queue" element={<AdminAccess><CallQueueManagement /></AdminAccess>} />
        <Route
          path="/admin/donations"
          element={
            <AdminAccess>
              <AdminLayoutComponent>
                <div className="text-white">
                  <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent">
                    Donation Management
                  </h1>
                  <p className="text-white/70">Track supporter contributions.</p>
                </div>
              </AdminLayoutComponent>
            </AdminAccess>
          }
        />

        {/* System */}
        <Route path="/admin/analytics" element={<AdminAccess><AdminAnalyticsPage /></AdminAccess>} />
        <Route path="/admin/system-test" element={<AdminAccess><SystemTest /></AdminAccess>} />
        <Route path="/admin/upload-test" element={<AdminAccess><UploadTestPage /></AdminAccess>} />
        <Route path="/admin/users" element={<AdminAccess><UsersManagement /></AdminAccess>} />

        {/* Admin Interactive (admin-side view) */}
        <Route path="/admin/request-song" element={<AdminAccess><RequestSongPage /></AdminAccess>} />
        <Route path="/admin/send-shoutout" element={<AdminAccess><SendShoutoutPage /></AdminAccess>} />

        {/* Admin Setup */}
        <Route
          path="/admin/setup"
          element={
            <AdminAccess>
              <AdminLayoutComponent>
                <AdminSetupPage />
              </AdminLayoutComponent>
            </AdminAccess>
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}