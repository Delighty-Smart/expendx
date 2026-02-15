
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { safelyUnwrapResponse } from '@/services/supabaseHelpers';

import { updateUserStreak, getUserProfile } from '@/lib/streak';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Hydrate profile from localStorage for immediate display
  const [profile, setProfile] = useState<any | null>(() => {
    try {
      const cachedData = localStorage.getItem('cached_user_profile');
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (e) {
      console.error("Error hydrating profile from localStorage:", e);
    }
    return null;
  });

  const [isAdmin, setIsAdmin] = useState(() => profile?.role === 'admin');
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to cache user data (ID and profile)
  const cacheUserData = (userId: string | null, profileData: any | null = null) => {
    try {
      if (userId) {
        localStorage.setItem('cached_user_id', userId);
      } else if (userId === null) {
        localStorage.removeItem('cached_user_id');
      }

      if (profileData) {
        localStorage.setItem('cached_user_profile', JSON.stringify(profileData));
      } else if (userId === null) {
        localStorage.removeItem('cached_user_profile');
      }
    } catch (error) {
      console.error("Error managing cached user data:", error);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      console.log("AuthProvider: Fetching profile for", userId);
      const profileData = await getUserProfile();
      if (profileData) {
        setProfile(profileData);
        setIsAdmin(profileData.role === 'admin');
        cacheUserData(userId, profileData);

        // Also trigger streak update when profile is fetched/refreshed
        updateUserStreak().catch(err => console.error("Streak update background error:", err));
      }
    } catch (err) {
      console.error("Error fetching profile in AuthProvider:", err);
    }
  };

  // Helper function to show toast notifications safely
  const showToast = (options: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
    import('@/hooks/use-toast').then(({ toast }) => {
      toast(options);
    }).catch((error) => {
      console.error('Failed to show toast:', error);
    });
  };

  useEffect(() => {
    // Initial session check
    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          cacheUserData(initialSession.user.id);
          await fetchProfile(initialSession.user.id);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Set up state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log(`Auth state change [${event}]:`, currentSession?.user?.id || 'No user');

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          cacheUserData(currentSession.user.id);
          await fetchProfile(currentSession.user.id);
        } else {
          setProfile(null);
          setIsAdmin(false);
          cacheUserData(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        cacheUserData(data.user.id);
        await fetchProfile(data.user.id);
      }

      showToast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    } catch (error: any) {
      console.error("Sign in error:", error);
      showToast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid email or password",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;

      if (data.user) {
        cacheUserData(data.user.id);
        // Profile will be created by getUserProfile if it doesn't exist
        await fetchProfile(data.user.id);
      }

      showToast({
        title: "Account created",
        description: "Your account has been created successfully.",
      });
    } catch (error: any) {
      console.error("Sign up error caught:", error);
      showToast({
        variant: "destructive",
        title: "Signup failed",
        description: error.message || "An error occurred during signup",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Google sign in error caught:", error);
      showToast({
        variant: "destructive",
        title: "Google login failed",
        description: error.message || "Could not connect to Google",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      cacheUserData(null);
      sessionStorage.removeItem('expendx_onboarding_seen');

      await supabase.auth.signOut();

      showToast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      console.error("Sign out error caught:", error);
      showToast({
        variant: "destructive",
        title: "Sign out completed with notice",
        description: "You have been signed out locally. Some server sessions may persist.",
      });
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value: AuthContextType = {
    session,
    user,
    profile,
    isAdmin,
    isLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
