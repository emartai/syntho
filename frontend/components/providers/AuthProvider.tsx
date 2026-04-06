'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'pro' | 'growth';
  role: 'user' | 'admin';
  jobs_used_this_month: number;
  quota_reset_at: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use singleton client to avoid lock conflicts
  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        return null;
      }
      return data as Profile;
    } catch {
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Failsafe: if we're still loading after 8 seconds, force stop.
    // This prevents the user from being stuck indefinitely if Supabase hangs.
    const loadingTimeout = setTimeout(() => {
      if (mounted && isLoading) {
        setIsLoading(false);
      }
    }, 8000);

    async function initializeAuth() {
      try {
        // Step 1: Read cached session from localStorage — instant, no network.
        // Unblocks page rendering immediately while we validate in background.
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          setUser(session.user);
          setIsLoading(false);
          clearTimeout(loadingTimeout);
          // Fetch profile without blocking — page is already visible
          fetchProfile(session.user.id).then(p => { if (mounted) setProfile(p); });
        }

        // Step 2: Validate JWT with Supabase server in background (security).
        const { data: { user: verifiedUser } } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!verifiedUser) {
          // Token was invalid or expired — clear state
          setUser(null);
          setProfile(null);
        }
      } catch {
        // Auth init failed — user remains unauthenticated
      } finally {
        if (mounted) {
          setIsLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        // Handle specific events
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const p = await fetchProfile(currentUser.id);
          if (mounted) setProfile(p);
        } else {
          setProfile(null);
        }

        if (mounted) {
          setIsLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []); // Empty deps - supabase is now a singleton

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
