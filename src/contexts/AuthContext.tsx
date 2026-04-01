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
  const fetchedProfileForRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Safety timeout: if loading hasn't resolved in 5 seconds, force it to false.
    // This prevents the app from being permanently stuck on "Loading session..."
    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[Auth] Loading timeout reached (5s). Forcing loading=false.');
        setLoading(false);
      }
    }, 5000);

    // Use onAuthStateChange — it fires INITIAL_SESSION synchronously
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[Auth] onAuthStateChange:', event, session ? 'has session' : 'no session');

        if (session) {
          setUser(session.user);

          // Only fetch profile once per unique user to prevent duplicate calls
          if (fetchedProfileForRef.current !== session.user.id) {
            fetchedProfileForRef.current = session.user.id;
            // Use setTimeout(0) to avoid blocking the auth state change callback
            // This is critical because Supabase can hang if the callback is async
            setTimeout(() => {
              if (isMounted) {
                fetchProfile(session.user.id);
              }
            }, 0);
          } else {
            // Already fetched profile for this user
            if (isMounted) setLoading(false);
          }
        } else {
          // No session
          if (event === 'SIGNED_OUT') {
            fetchedProfileForRef.current = null;
            if (isMounted) {
              setUser(null);
              setUserProfile(null);
            }
          }
          if (isMounted) setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProfile = async (userId: string) => {
    console.log('[Auth] Fetching profile for', userId);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('[Auth] Profile query result:', { data: !!data, error: error?.code });

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist yet - create it
        console.log('[Auth] Creating new profile...');
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
            console.log('[Auth] Profile created successfully');
            setUserProfile(createdProfile as UserProfile);
          } else {
            console.error('[Auth] Failed to create profile:', createError);
          }
        }
      } else if (error) {
        // Some other error (not "row not found")
        console.error('[Auth] Profile fetch error:', error.message, error.code);
      } else if (data) {
        console.log('[Auth] Profile loaded, onboardingCompleted:', data.onboardingCompleted);
        setUserProfile(data as UserProfile);
      }
    } catch (error) {
      console.error('[Auth] fetchProfile exception:', error);
    } finally {
      console.log('[Auth] Setting loading=false');
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
