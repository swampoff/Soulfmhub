import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Navigation } from './components/Navigation';
import { RadioPlayer } from './components/RadioPlayer';
import { RealtimeIndicator } from './components/RealtimeIndicator';
import { Footer } from './components/Footer';
import { AnimatedPalm } from './components/AnimatedPalm';
import { AdminLoginPage } from './components/AdminLoginPage';
import { Toaster } from './components/ui/sonner';
import { supabase } from '../lib/supabase';

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
import { StartExperienceOverlay } from './components/StartExperienceOverlay';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] relative">
      <StartExperienceOverlay />
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
  const [checking, setChecking] = useState(!sessionStorage.getItem('soul-fm-admin'));

  // Re-validate Supabase session on mount (sessionStorage is just a fast cache)
  useEffect(() => {
    if (isAdmin) {
      // Quick revalidation: if sessionStorage says admin, verify session exists
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          // Session expired — require re-login
          sessionStorage.removeItem('soul-fm-admin');
          setIsAdmin(false);
        }
      });
      return;
    }
    // No cached admin flag — check if there's an active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        sessionStorage.setItem('soul-fm-admin', 'true');
        setIsAdmin(true);
      }
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#060d18]">
        <div className="w-6 h-6 border-2 border-[#00d9ff]/30 border-t-[#00d9ff] rounded-full animate-spin" />
      </div>
    );
  }

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