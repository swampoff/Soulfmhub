import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Navigation } from './components/Navigation';
import { RadioPlayer } from './components/RadioPlayer';
import { RealtimeIndicator } from './components/RealtimeIndicator';
import { Footer } from './components/Footer';
import { AnimatedPalm } from './components/AnimatedPalm';
import { Toaster } from './components/ui/sonner';
import { supabase } from '../lib/supabase';
import { AdminLoginPage } from './components/AdminLoginPage';

// ── Scroll to top on route change ────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// ── Root Layout (wraps public site) ──────────────────────────────────
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

// ── Admin Access Layout (separate top-level route with auth guard) ───
export function AdminAccessLayout() {
  const { pathname } = useLocation();
  const [isAdmin, setIsAdmin] = useState(() => {
    return sessionStorage.getItem('soul-fm-admin') === 'true';
  });
  const [checking, setChecking] = useState(!sessionStorage.getItem('soul-fm-admin'));

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  useEffect(() => {
    // Already authenticated via sessionStorage — verify session is still valid
    if (isAdmin) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          console.log('[AdminAccess] No Supabase session, keeping sessionStorage access');
        }
      });
      return;
    }

    // Not yet authenticated — check for existing Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        sessionStorage.setItem('soul-fm-admin', 'true');
        setIsAdmin(true);
      }
      setChecking(false);
    }).catch(() => {
      setChecking(false);
    });
  }, []);

  // Loading spinner while checking auth
  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#060d18]">
        <div className="w-8 h-8 border-2 border-[#00d9ff]/30 border-t-[#00d9ff] rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated — show login form
  if (!isAdmin) {
    return (
      <>
        <AdminLoginPage
          onLogin={() => {
            sessionStorage.setItem('soul-fm-admin', 'true');
            setIsAdmin(true);
          }}
        />
        <Toaster position="top-right" />
      </>
    );
  }

  // Authenticated — render admin pages
  return (
    <>
      <Outlet />
      <Toaster position="top-right" />
    </>
  );
}
