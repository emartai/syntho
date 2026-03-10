'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  flutterwave_subaccount_id: string | null;
  bank_account_verified: boolean;
  api_quota: number;
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
  
  // Use a ref to store the supabase client to avoid recreating it on every render
  const [supabase] = useState(() => createClient());

  const fetchProfile = async (userId: string) => {
    console.log('AuthProvider: Fetching profile for', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('AuthProvider: Profile fetch error (may not exist yet):', error.message);
        return null;
      }
      console.log('AuthProvider: Profile fetched successfully');
      return data as Profile;
    } catch (err) {
      console.error('AuthProvider: Unexpected profile fetch error:', err);
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
        console.warn('AuthProvider: Loading timeout reached, forcing isLoading = false');
        setIsLoading(false);
      }
    }, 8000);

    async function initializeAuth() {
      console.log('AuthProvider: Initializing auth state...');
      try {
        // Use getUser() for better security and reliability than getSession()
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (!mounted) return;

        if (userError) {
          console.log('AuthProvider: No active user session');
          setUser(null);
          setProfile(null);
        } else if (currentUser) {
          console.log('AuthProvider: User detected:', currentUser.id);
          setUser(currentUser);
          const p = await fetchProfile(currentUser.id);
          if (mounted) setProfile(p);
        }
      } catch (err) {
        console.error('AuthProvider: Initialization failed:', err);
      } finally {
        if (mounted) {
          console.log('AuthProvider: Initialization complete, setting isLoading = false');
          setIsLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('AuthProvider: Auth state changed event:', event);
        
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
  }, [supabase]); // Re-run if supabase client somehow changes

  const signOut = async () => {
    console.log('AuthProvider: Signing out...');
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
