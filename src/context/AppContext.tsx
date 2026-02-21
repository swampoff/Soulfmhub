import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type UserRole = 'listener' | 'super_admin';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface NowPlaying {
  track: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    cover?: string;
    duration?: number;
  };
  show?: {
    id: string;
    name: string;
    host: string;
    isLive: boolean;
  };
  startTime: string;
}

interface StreamStatus {
  status: 'online' | 'offline';
  listeners: number;
  bitrate: string;
  uptime: number;
}

export interface AppContextType {
  user: User | null;
  loading: boolean;
  nowPlaying: NowPlaying | null;
  streamStatus: StreamStatus | null;
  isPlaying: boolean;
  volume: number;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, name: string, role?: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshNowPlaying: () => Promise<void>;
}

// Default context value - used when provider is not available (e.g., HMR edge case)
const defaultContextValue: AppContextType = {
  user: null,
  loading: false,
  nowPlaying: null,
  streamStatus: null,
  isPlaying: false,
  volume: 0.7,
  setIsPlaying: () => {},
  setVolume: () => {},
  signIn: async () => ({ data: null, error: new Error('AppProvider not available') }),
  signUp: async () => ({ data: null, error: new Error('AppProvider not available') }),
  signOut: async () => {},
  refreshNowPlaying: async () => {},
};

// Provide default value so useContext never returns undefined
const AppContext = createContext<AppContextType>(defaultContextValue);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);

  const refreshNowPlaying = async () => {
    try {
      const data = await api.getNowPlaying();
      if (data?.nowPlaying) {
        setNowPlaying(data.nowPlaying);
      }
      if (data?.streamStatus) {
        setStreamStatus(data.streamStatus);
      }
    } catch (error) {
      // Silently handle — server may be cold-starting or offline
      // Don't spam console on initial page load
      console.warn('[AppContext] Now playing fetch failed (server may be starting)');
    }
  };

  // Realtime channel for global Now Playing updates
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    try {
      console.log('[AppContext] Setting up Realtime channel');

      // Initial load
      refreshNowPlaying();

      // Subscribe to Realtime updates
      channel = supabase.channel('radio-updates-global', {
        config: {
          broadcast: { self: false }
        }
      });

      channel.on('broadcast', { event: 'track-changed' }, (payload) => {
        console.log('[AppContext] Track changed via Realtime:', payload);
        refreshNowPlaying();
      });

      channel.subscribe((status) => {
        console.log('[AppContext] Realtime channel status:', status);
      });
    } catch (error) {
      console.error('[AppContext] Error setting up Realtime channel:', error);
    }

    // Cleanup
    return () => {
      try {
        if (channel) {
          supabase.removeChannel(channel);
        }
      } catch (error) {
        console.error('[AppContext] Error cleaning up Realtime channel:', error);
      }
    };
  }, []);

  useEffect(() => {
    let subscription: any = null;

    try {
      // Check active session — validate the token locally first to avoid
      // sending expired JWTs to the Supabase gateway (which rejects them
      // before our Hono server can even see the request).
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && session?.access_token) {
          // Quick local expiry check so we don't fire a doomed request
          let tokenOk = false;
          try {
            const payload = JSON.parse(atob(session.access_token.split('.')[1]));
            tokenOk = Date.now() < (payload.exp * 1000) - 10_000; // 10s margin
          } catch { /* malformed — not ok */ }

          if (tokenOk) {
            api.getProfile().then((data) => {
              if (data.profile) {
                setUser(data.profile);
              }
            }).catch((err) => {
              console.error('[AppContext] Error loading profile:', err);
            });
          } else {
            // Token expired — try refreshing; if that fails, sign out
            console.warn('[AppContext] Cached session has expired token — attempting refresh');
            supabase.auth.refreshSession().then(({ data }) => {
              if (data?.session?.access_token) {
                api.getProfile().then((profileData) => {
                  if (profileData.profile) setUser(profileData.profile);
                }).catch(() => {});
              } else {
                console.warn('[AppContext] Refresh failed — clearing stale session');
                supabase.auth.signOut().catch(() => {});
                setUser(null);
              }
            }).catch(() => {
              supabase.auth.signOut().catch(() => {});
              setUser(null);
            });
          }
        }
        setLoading(false);
      }).catch((err) => {
        console.error('[AppContext] Error getting session:', err);
        setLoading(false);
      });

      // Listen for auth changes
      const result = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          api.getProfile().then((data) => {
            if (data.profile) {
              setUser(data.profile);
            }
          }).catch((err) => {
            console.error('[AppContext] Error loading profile on auth change:', err);
          });
        } else {
          setUser(null);
        }
      });
      subscription = result.data.subscription;
    } catch (error) {
      console.error('[AppContext] Error in auth setup:', error);
      setLoading(false);
    }

    return () => {
      try {
        if (subscription) {
          subscription.unsubscribe();
        }
      } catch (err) {
        console.error('[AppContext] Error unsubscribing:', err);
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('[AppContext] signIn called with email:', email);
    const { data, error } = await api.signIn(email, password);
    if (error) {
      console.error('[AppContext] signIn error:', error);
      throw error;
    }
    console.log('[AppContext] signIn success, user:', data?.user?.email);
    
    // Load profile immediately after sign in
    try {
      const profileData = await api.getProfile();
      if (profileData.profile) {
        setUser(profileData.profile);
      }
    } catch (profileError) {
      console.error('[AppContext] Error loading profile:', profileError);
    }
    
    return data;
  };

  const signUp = async (email: string, password: string, name: string, role: string = 'listener') => {
    console.log('[AppContext] signUp called:', { email, name, role });
    const { data, error } = await api.signUp(email, password, name, role);
    if (error) {
      console.error('[AppContext] signUp error:', error);
      throw error;
    }
    console.log('[AppContext] signUp success');
    
    // Load profile immediately after sign up
    try {
      const profileData = await api.getProfile();
      if (profileData.profile) {
        setUser(profileData.profile);
      }
    } catch (profileError) {
      console.error('[AppContext] Error loading profile:', profileError);
    }
    
    return data;
  };

  const signOut = async () => {
    try {
      await api.signOut();
    } catch (error) {
      console.error('[AppContext] Error signing out:', error);
    }
    setUser(null);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        nowPlaying,
        streamStatus,
        isPlaying,
        volume,
        setIsPlaying,
        setVolume,
        signIn,
        signUp,
        signOut,
        refreshNowPlaying,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  return useContext(AppContext);
}
