import { createBrowserRouter } from 'react-router';
import { RootLayout, PublicLayout, AdminAccessLayout } from './layouts';

// ── Public Pages ─────────────────────────────────────────────────────
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
import { RequestSongPage } from './pages/RequestSongPage';
import { SendShoutoutPage } from './pages/SendShoutoutPage';
import { ContactPage } from './pages/ContactPage';
import { EventsPage } from './pages/EventsPage';
import { MerchPage } from './pages/MerchPage';
import { FAQPage } from './pages/FAQPage';
import { DJProfilesPage } from './pages/DJProfilesPage';
import { CommunityPage } from './pages/CommunityPage';
import { NotFoundPage } from './pages/NotFoundPage';

// ── Standalone Pages (no public layout) ──────────────────────────────
import { PublicPlayer } from './pages/PublicPlayer';
import { AdminSetupPage } from './pages/AdminSetupPage';
import BeachCarDemo from './pages/BeachCarDemo';

// ── Dashboard / Protected ────────────────────────────────────────────
import { ListenerDashboard } from './pages/dashboards/ListenerDashboard';

// ── Admin Pages ──────────────────────────────────────────────────────
import { AdminHomePage } from './pages/admin/AdminHomePage';
import { TracksManagement } from './pages/admin/TracksManagement';
import { TrackEditPage } from './pages/admin/TrackEditPage';
import { MediaLibraryManagement } from './pages/admin/MediaLibraryManagement';
import { PlaylistsManagement } from './pages/admin/PlaylistsManagement';
import { ScheduleManagement } from './pages/admin/ScheduleManagement';
import { ShowsPodcastsManagement } from './pages/admin/ShowsPodcastsManagement';
import { NewsManagement } from './pages/admin/NewsManagement';
import ContentAutomationDashboard from './pages/dashboards/ContentAutomationDashboard';
import { StreamSettings } from './pages/dashboards/StreamSettings';
import { AnalyticsPage as AdminAnalyticsPage } from './pages/admin/AnalyticsPage';
import { NewsInjection } from './pages/admin/NewsInjection';
import { LiveDJConsole } from './pages/admin/LiveDJConsole';
import { TrackUpload } from './pages/dashboards/TrackUpload';
import { LiveStreamPlaylist } from './pages/dashboards/LiveStreamPlaylist';
import { SongRequestsManagement } from './pages/admin/SongRequestsManagement';
import { ShoutoutsManagement } from './pages/admin/ShoutoutsManagement';
import { CallQueueManagement } from './pages/admin/CallQueueManagement';
import { DonationsManagement } from './pages/admin/DonationsManagement';
import { SystemTest } from './pages/admin/SystemTest';
import { UploadTestPage } from './pages/admin/UploadTestPage';
import { UsersManagement } from './pages/dashboards/UsersManagement';
import { LogsAuditPage } from './pages/admin/LogsAuditPage';
import { BackupExportPage } from './pages/admin/BackupExportPage';
import { BrandingPage } from './pages/admin/BrandingPage';
import { FeedbackManagement } from './pages/admin/FeedbackManagement';
import { AIDevTeamPage } from './pages/admin/AIDevTeamPage';
import { BroadcastTeamPage } from './pages/admin/BroadcastTeamPage';
import { EditorialDepartmentPage } from './pages/admin/EditorialDepartmentPage';

// ── Router ───────────────────────────────────────────────────────────
export const router = createBrowserRouter([
  // ═══════════════════ Public Site ═══════════════════
  {
    Component: RootLayout,
    children: [
      {
        Component: PublicLayout,
        children: [
          { index: true, Component: HomePage },
          { path: 'schedule', Component: SchedulePage },
          { path: 'shows', Component: ShowsPage },
          { path: 'shows/:id', Component: ShowDetailPage },
          { path: 'podcasts', Component: ShowsPodcastsPage },
          { path: 'podcasts/:slug', Component: PodcastDetailPage },
          { path: 'music', Component: MusicLibraryPage },
          { path: 'news', Component: NewsPage },
          { path: 'news/:id', Component: ArticleDetailPage },
          { path: 'support', Component: SupportPage },
          { path: 'about', Component: AboutPage },
          { path: 'team', Component: ProfilesPage },
          { path: 'team/:slug', Component: ProfileDetailPage },
          { path: 'analytics', Component: AnalyticsPage },
          { path: 'stream', Component: StreamPlayer },
          // Interactive — Public
          { path: 'request-song', Component: RequestSongPage },
          { path: 'send-shoutout', Component: SendShoutoutPage },
          // New Public Pages
          { path: 'contact', Component: ContactPage },
          { path: 'events', Component: EventsPage },
          { path: 'merch', Component: MerchPage },
          { path: 'faq', Component: FAQPage },
          { path: 'djs', Component: DJProfilesPage },
          { path: 'community', Component: CommunityPage },
          // Dashboard (public, requires auth via ProtectedRoute internally)
          { path: 'dashboard', Component: ListenerDashboard },
          // 404 inside public layout
          { path: '*', Component: NotFoundPage },
        ],
      },

      // ═══════════════════ Standalone Pages (no layout) ═══════════════════
      { path: 'play/:uniqueId', Component: PublicPlayer },
      { path: 'demo/beach-car', Component: BeachCarDemo },
    ],
  },

  // ═══════════════════ Admin Panel (separate top-level route) ═══════════════════
  {
    path: '/admin',
    Component: AdminAccessLayout,
    children: [
      // Home
      { index: true, Component: AdminHomePage },
      { path: 'home', Component: AdminHomePage },

      // Content Management
      { path: 'tracks', Component: TracksManagement },
      { path: 'tracks/:id/edit', Component: TrackEditPage },
      { path: 'media', Component: MediaLibraryManagement },
      { path: 'playlists', Component: PlaylistsManagement },
      { path: 'schedule', Component: ScheduleManagement },
      { path: 'shows', Component: ShowsPodcastsManagement },
      { path: 'news', Component: NewsManagement },

      // Radio & DJ
      { path: 'automation', Component: ContentAutomationDashboard },
      { path: 'jingles', Component: ContentAutomationDashboard },
      { path: 'stream-settings', Component: StreamSettings },
      { path: 'news-injection', Component: NewsInjection },
      { path: 'live-dj-console', Component: LiveDJConsole },
      { path: 'track-upload', Component: TrackUpload },
      { path: 'live-playlist', Component: LiveStreamPlaylist },

      // Interactive
      { path: 'song-requests', Component: SongRequestsManagement },
      { path: 'shoutouts', Component: ShoutoutsManagement },
      { path: 'call-queue', Component: CallQueueManagement },
      { path: 'donations', Component: DonationsManagement },

      // System
      { path: 'analytics', Component: AdminAnalyticsPage },
      { path: 'system-test', Component: SystemTest },
      { path: 'upload-test', Component: UploadTestPage },
      { path: 'users', Component: UsersManagement },

      // New Admin Pages
      { path: 'logs', Component: LogsAuditPage },
      { path: 'backup', Component: BackupExportPage },
      { path: 'branding', Component: BrandingPage },
      { path: 'feedback', Component: FeedbackManagement },

      // AI Dev Team
      { path: 'ai-team', Component: AIDevTeamPage },

      // Broadcast Team
      { path: 'broadcast-team', Component: BroadcastTeamPage },

      // Editorial Department (Эфирный Отдел)
      { path: 'editorial', Component: EditorialDepartmentPage },

      // Admin-side interactive views
      { path: 'request-song', Component: RequestSongPage },
      { path: 'send-shoutout', Component: SendShoutoutPage },

      // Admin setup
      { path: 'setup', Component: AdminSetupPage },
    ],
  },
]);
