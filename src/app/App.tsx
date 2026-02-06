import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AppProvider, useApp } from '../context/AppContext';
import { Navigation } from './components/Navigation';
import { RadioPlayer } from './components/RadioPlayer';
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
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ShowsPodcastsPage } from './pages/ShowsPodcastsPage';
import { PodcastDetailPage } from './pages/PodcastDetailPage';
import { AboutPage } from './pages/AboutPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { TracksManagement } from './pages/admin/TracksManagement';
import { PlaylistsManagement } from './pages/admin/PlaylistsManagement';
import { AdminSetupPage } from './pages/AdminSetupPage';
import { PublicPlayer } from './pages/PublicPlayer';
import { Toaster } from './components/ui/sonner';
import soulFmLogo from 'figma:asset/7dc3be36ef413fc4dd597274a640ba655b20ab3d.png';

// Protected Route Component
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
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Public Layout Component
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628]">
      <Navigation />
      {children}
      <RadioPlayer />
    </div>
  );
}

// Admin Layout Component
function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628]">
      <Navigation />
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
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/stream" element={<PublicLayout><StreamPlayer /></PublicLayout>} />
        
        {/* Public Player Route - NO LAYOUT */}
        <Route path="/play/:uniqueId" element={<PublicPlayer />} />
        
        {/* Public Admin Setup Route (for initial setup before any user exists) */}
        <Route path="/setup" element={<AdminSetupPage />} />
        
        {/* Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <PublicLayout>
                <DashboardPage />
              </PublicLayout>
            </ProtectedRoute>
          } 
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tracks"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <TracksManagement />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/playlists"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <PlaylistsManagement />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/schedule"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <div className="text-white">
                  <h1 className="text-3xl font-bold mb-4">Schedule Management</h1>
                  <p className="text-white/70">Manage your broadcast schedule.</p>
                </div>
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/shows"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <div className="text-white">
                  <h1 className="text-3xl font-bold mb-4">Show Management</h1>
                  <p className="text-white/70">Manage shows and podcasts.</p>
                </div>
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/news"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <div className="text-white">
                  <h1 className="text-3xl font-bold mb-4">News Management</h1>
                  <p className="text-white/70">Create and publish news articles.</p>
                </div>
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/donations"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <div className="text-white">
                  <h1 className="text-3xl font-bold mb-4">Donation Management</h1>
                  <p className="text-white/70">Track supporter contributions.</p>
                </div>
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin Setup Route */}
        <Route
          path="/admin/setup"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminSetupPage />
              </AdminLayout>
            </ProtectedRoute>
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
