import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  email: string;
  onboardingCompleted: boolean;
  experience?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (data: { experience: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to fetch or create profile
  const fetchProfile = async (sessionUser: User) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Not found, let's create a default profile
        const defaultProfile = {
          id: sessionUser.id,
          email: sessionUser.email || '',
          onboardingCompleted: false,
        };
        const { data: inserted, error: insertError } = await supabase
          .from('users')
          .insert([defaultProfile])
          .select()
          .single();

        if (insertError) {
          console.error('[Auth] Failed to insert new user profile, using local fallback:', insertError);
          // Set local fallback so user isn't stuck
          setUserProfile(defaultProfile as UserProfile);
        } else {
          setUserProfile(inserted as UserProfile);
        }
      } else if (data) {
        setUserProfile(data as UserProfile);
      } else if (error) {
        console.error('[Auth] Database error when fetching profile:', error);
      }
    } catch (err) {
      console.error('[Auth] Exception in fetchProfile:', err);
    } finally {
      // Very important: finally unblock the UI
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Safety timeout in case Supabase hangs
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[Auth] Safety timeout triggered. Forcing loading to false to prevent blank screen.');
        setLoading(false);
      }
    }, 4000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth Event]', event);
      if (session) {
        setUser(session.user);
        // Dispatch profile fetch asynchronously to prevent blocking Supabase event handler
        setTimeout(() => {
          if (isMounted) fetchProfile(session.user);
        }, 0);
      } else {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
        }
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });
    if (error) throw error;
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signUp({ email, password: pass });
    if (error) throw error;
  };

  const completeOnboarding = async (data: { experience: string }) => {
    if (!user) return;
    
    const payload = {
      id: user.id,
      email: user.email || '',
      experience: data.experience,
      onboardingCompleted: true,
    };

    // Upsert so if the row didn't exist it gets created anyway!
    const { error } = await supabase.from('users').upsert([payload]);
    if (error) {
      console.error('[Auth] completeOnboarding upsert failed:', error);
      throw error;
    }

    // Force local state update
    setUserProfile(prev => ({
      ...prev,
      ...payload,
    }) as UserProfile);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      logout,
      completeOnboarding
    }}>
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
