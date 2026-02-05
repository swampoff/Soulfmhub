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
import { SupportPage } from './pages/SupportPage';
import { AuthPage } from './pages/AuthPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { TracksManagement } from './pages/admin/TracksManagement';
import { PlaylistsManagement } from './pages/admin/PlaylistsManagement';
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

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Admin Layout
function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useApp();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628]">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-[#0f1c2e]/80 backdrop-blur-sm border-r border-[#00d9ff]/20 min-h-screen p-6">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <img 
                src={soulFmLogo} 
                alt="Soul FM" 
                className="h-12 w-auto"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(0, 217, 255, 0.3))'
                }}
              />
            </div>
            <div className="text-[#00d9ff] text-sm font-semibold mb-1">Admin Panel</div>
            <div className="text-xs text-gray-400">{user?.name}</div>
          </div>

          <nav className="space-y-2">
            <a
              href="/admin"
              className="block px-4 py-3 rounded-lg text-white bg-white/10 hover:bg-white/20 transition-colors"
            >
              📊 Dashboard
            </a>
            <a
              href="/admin/tracks"
              className="block px-4 py-3 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
            >
              🎵 Tracks
            </a>
            <a
              href="/admin/playlists"
              className="block px-4 py-3 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
            >
              📀 Playlists
            </a>
            <a
              href="/admin/schedule"
              className="block px-4 py-3 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
            >
              📅 Schedule
            </a>
            <a
              href="/admin/shows"
              className="block px-4 py-3 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
            >
              📻 Shows
            </a>
            <a
              href="/admin/news"
              className="block px-4 py-3 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
            >
              📰 News
            </a>
            <a
              href="/admin/donations"
              className="block px-4 py-3 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
            >
              💰 Donations
            </a>
            <div className="my-4 border-t border-white/10" />
            <a
              href="/"
              className="block px-4 py-3 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
            >
              ← Back to Site
            </a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

// Public Layout
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a1628]">
      <Navigation />
      <main className="pb-20">{children}</main>
      <RadioPlayer />
    </div>
  );
}

// Placeholder pages
function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-[#00d9ff] mb-4">About Soul FM Hub</h1>
        <p className="text-gray-300">The Wave of Your Soul - Discover our story and mission.</p>
      </div>
    </div>
  );
}

function PodcastsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-[#00d9ff] mb-4">Podcasts</h1>
        <p className="text-gray-300">Listen to our archive of recorded shows and exclusive content.</p>
      </div>
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
        <Route path="/podcasts" element={<PublicLayout><PodcastsPage /></PublicLayout>} />
        <Route path="/music" element={<PublicLayout><MusicLibraryPage /></PublicLayout>} />
        <Route path="/news" element={<PublicLayout><NewsPage /></PublicLayout>} />
        <Route path="/news/:id" element={<PublicLayout><ArticleDetailPage /></PublicLayout>} />
        <Route path="/support" element={<PublicLayout><SupportPage /></PublicLayout>} />
        <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
        <Route path="/auth" element={<AuthPage />} />

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