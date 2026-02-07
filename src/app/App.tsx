import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
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
import { DashboardPage } from './pages/DashboardPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
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
import { Toaster } from './components/ui/sonner';
import soulFmLogo from 'figma:asset/7dc3be36ef413fc4dd597274a640ba655b20ab3d.png';
import BeachCarDemo from './pages/BeachCarDemo';
import { Footer } from './components/Footer';
import { AnimatedPalm } from './components/AnimatedPalm';
import { motion } from 'motion/react';
import { Button } from './components/ui/button';

// Simple Admin Access Component (no auth required)
function AdminAccess({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  
  console.log('AdminAccess rendered, isAdmin:', isAdmin);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <img 
            src={soulFmLogo} 
            alt="Soul FM" 
            className="h-24 w-auto mx-auto mb-8"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(0, 217, 255, 0.6))'
            }}
          />
          <h1 className="text-4xl font-righteous text-transparent bg-clip-text bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] mb-4">
            Admin Panel
          </h1>
          <p className="text-cyan-100/60 mb-8">Click to enter admin dashboard</p>
          <Button
            onClick={() => {
              console.log('Enter Admin button clicked!');
              setIsAdmin(true);
            }}
            className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 text-lg px-8 py-6 hover:shadow-lg hover:shadow-cyan-500/30"
          >
            Enter Admin
          </Button>
        </motion.div>
      </div>
    );
  }

  console.log('AdminAccess rendering children...');
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

// Admin Layout Component
function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628]">
      <Navigation />
      <RealtimeIndicator />
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
      <RadioPlayer />
    </div>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
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
        
        {/* Beach Car Demo */}
        <Route path="/demo/beach-car" element={<BeachCarDemo />} />
        
        {/* Public Player Route - NO LAYOUT */}
        <Route path="/play/:uniqueId" element={<PublicPlayer />} />
        
        {/* Public Admin Setup Route (for initial setup before any user exists) */}
        <Route path="/setup" element={<AdminSetupPage />} />
        
        {/* Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />

        {/* Admin Routes - NO AUTH REQUIRED, just simple button */}
        <Route
          path="/admin"
          element={
            <AdminAccess>
              <AdminHomePage />
            </AdminAccess>
          }
        />
        
        <Route
          path="/admin/home"
          element={
            <AdminAccess>
              <AdminHomePage />
            </AdminAccess>
          }
        />
        
        <Route
          path="/admin/tracks"
          element={
            <AdminAccess>
              <AdminLayout>
                <TracksManagement />
              </AdminLayout>
            </AdminAccess>
          }
        />
        <Route
          path="/admin/media"
          element={
            <AdminAccess>
              <MediaLibraryManagement />
            </AdminAccess>
          }
        />
        <Route
          path="/admin/tracks/:id/edit"
          element={
            <AdminAccess>
              <AdminLayout>
                <TrackEditPage />
              </AdminLayout>
            </AdminAccess>
          }
        />
        <Route
          path="/admin/playlists"
          element={
            <AdminAccess>
              <AdminLayout>
                <PlaylistsManagement />
              </AdminLayout>
            </AdminAccess>
          }
        />
        <Route
          path="/admin/automation"
          element={
            <AdminAccess>
              <ContentAutomationDashboard />
            </AdminAccess>
          }
        />
        <Route
          path="/admin/schedule"
          element={
            <AdminAccess>
              <ScheduleManagement />
            </AdminAccess>
          }
        />
        <Route
          path="/admin/shows"
          element={
            <AdminAccess>
              <ShowsPodcastsManagement />
            </AdminAccess>
          }
        />
        <Route
          path="/admin/jingles"
          element={
            <AdminAccess>
              <ContentAutomationDashboard />
            </AdminAccess>
          }
        />
        <Route
          path="/admin/stream-settings"
          element={
            <AdminAccess>
              <StreamSettings />
            </AdminAccess>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <AdminAccess>
              <AdminAnalyticsPage />
            </AdminAccess>
          }
        />
        <Route
          path="/admin/news"
          element={
            <AdminAccess>
              <AdminLayout>
                <NewsManagement />
              </AdminLayout>
            </AdminAccess>
          }
        />
        <Route
          path="/admin/upload-test"
          element={
            <AdminAccess>
              <UploadTestPage />
            </AdminAccess>
          }
        />
        <Route
          path="/admin/news-injection"
          element={
            <AdminAccess>
              <NewsInjection />
            </AdminAccess>
          }
        />
        <Route
          path="/admin/system-test"
          element={
            <AdminAccess>
              <SystemTest />
            </AdminAccess>
          }
        />
        <Route
          path="/admin/donations"
          element={
            <AdminAccess>
              <AdminLayout>
                <div className="text-white">
                  <h1 className="text-3xl font-bold mb-4">Donation Management</h1>
                  <p className="text-white/70">Track supporter contributions.</p>
                </div>
              </AdminLayout>
            </AdminAccess>
          }
        />

        {/* Admin Setup Route */}
        <Route
          path="/admin/setup"
          element={
            <AdminAccess>
              <AdminLayout>
                <AdminSetupPage />
              </AdminLayout>
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
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}