import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { RealtimeChannel } from '@supabase/supabase-js';

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

interface AppContextType {
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

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);

  // Realtime channel для глобального обновления Now Playing
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    console.log('🔌 [AppContext] Setting up Realtime channel');

    // Initial load
    refreshNowPlaying();

    // Subscribe to Realtime updates
    channel = supabase.channel('radio-updates-global', {
      config: {
        broadcast: { self: false }
      }
    });

    channel.on('broadcast', { event: 'track-changed' }, (payload) => {
      console.log('🎵 [AppContext] Track changed via Realtime:', payload);
      // Update nowPlaying immediately
      refreshNowPlaying();
    });

    channel.subscribe((status) => {
      console.log('📡 [AppContext] Realtime channel status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ [AppContext] Connected to radio-updates-global channel');
      }
    });

    // Cleanup
    return () => {
      console.log('🔌 [AppContext] Cleaning up Realtime channel');
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        api.getProfile().then((data) => {
          if (data.profile) {
            setUser(data.profile);
          }
        });
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        api.getProfile().then((data) => {
          if (data.profile) {
            setUser(data.profile);
          }
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshNowPlaying = async () => {
    try {
      const data = await api.getNowPlaying();
      if (data.nowPlaying) {
        setNowPlaying(data.nowPlaying);
      }
      if (data.streamStatus) {
        setStreamStatus(data.streamStatus);
      }
    } catch (error) {
      console.error('Error fetching now playing:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('[AppContext] signIn called with email:', email);
    const { data, error } = await api.signIn(email, password);
    if (error) {
      console.error('[AppContext] signIn error:', error);
      throw error;
    }
    console.log('[AppContext] signIn success, user:', data?.user?.email);
    
    // Load profile immediately after sign in
    console.log('[AppContext] Loading user profile...');
    try {
      const profileData = await api.getProfile();
      console.log('[AppContext] Profile data:', profileData);
      if (profileData.profile) {
        setUser(profileData.profile);
        console.log('[AppContext] User state updated:', profileData.profile);
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
    console.log('[AppContext] Loading user profile...');
    try {
      const profileData = await api.getProfile();
      console.log('[AppContext] Profile data:', profileData);
      if (profileData.profile) {
        setUser(profileData.profile);
        console.log('[AppContext] User state updated:', profileData.profile);
      }
    } catch (profileError) {
      console.error('[AppContext] Error loading profile:', profileError);
    }
    
    return data;
  };

  const signOut = async () => {
    await api.signOut();
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

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}