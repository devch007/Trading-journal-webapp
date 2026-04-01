import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  email: string;
  onboardingCompleted: boolean;
  experience?: string;
  createdAt: string;
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

  // Use a ref to track which user ID we've already fetched a profile for
  // This prevents duplicate fetches when onAuthStateChange fires multiple times
  const fetchedProfileForRef = useRef<string | null>(null);

  useEffect(() => {
    // The recommended Supabase pattern: rely solely on onAuthStateChange.
    // It fires immediately with INITIAL_SESSION on page load, which also
    // handles the OAuth hash token from Google redirect.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user);

          // Only fetch profile once per unique user ID to prevent duplicate calls
          if (fetchedProfileForRef.current !== session.user.id) {
            fetchedProfileForRef.current = session.user.id;
            await fetchProfile(session.user.id);
          } else {
            // Profile was already fetched, just ensure loading is false
            setLoading(false);
          }
        } else {
          // Clear state only when session is truly gone (e.g. SIGNED_OUT)
          if (event === 'SIGNED_OUT') {
            fetchedProfileForRef.current = null;
            setUser(null);
            setUserProfile(null);
          }
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist yet - create it
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const newProfile = {
            id: userId,
            email: userData.user.email || '',
            onboardingCompleted: false,
            createdAt: new Date().toISOString()
          };
          const { data: createdProfile, error: createError } = await supabase
            .from('users')
            .insert([newProfile])
            .select()
            .single();

          if (!createError && createdProfile) {
            setUserProfile(createdProfile as UserProfile);
          }
        }
      } else if (data) {
        setUserProfile(data as UserProfile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with email', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: pass,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing up with email', error);
      throw error;
    }
  };

  const completeOnboarding = async (data: { experience: string }) => {
    if (!user) return;

    try {
      const updates = {
        experience: data.experience,
        onboardingCompleted: true
      };

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      if (userProfile) {
        setUserProfile({
          ...userProfile,
          ...updates
        } as UserProfile);
      }
    } catch (error) {
      console.error('Error completing onboarding', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      fetchedProfileForRef.current = null;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out', error);
      throw error;
    }
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
