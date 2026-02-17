import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Navigation } from './components/Navigation';
import { RadioPlayer } from './components/RadioPlayer';
import { RealtimeIndicator } from './components/RealtimeIndicator';
import { Footer } from './components/Footer';
import { AnimatedPalm } from './components/AnimatedPalm';
import { AdminLoginPage } from './components/AdminLoginPage';
import { Toaster } from './components/ui/sonner';

// ── Scroll to top on route change ────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// ── Root Layout (wraps everything) ───────────────────────────────────
export function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
      <Toaster position="top-right" />
    </>
  );
}

// ── Public Layout ────────────────────────────────────────────────────
export function PublicLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] relative">
      {/* Global Animated Palms */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <AnimatedPalm side="left" delay={0} />
        <AnimatedPalm side="right" delay={0.3} />
      </div>
      {/* Content */}
      <div className="relative z-10">
        <Navigation />
        <RealtimeIndicator />
        <Outlet />
        <RadioPlayer />
        <Footer />
      </div>
    </div>
  );
}

// ── Admin Access Guard ───────────────────────────────────────────────
export function AdminAccessLayout() {
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

  return <Outlet />;
}
