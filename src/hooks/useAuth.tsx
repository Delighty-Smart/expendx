
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { safelyUnwrapResponse } from '@/services/supabaseHelpers';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage for immediate (though potentially stale) session recovery
  const [session, setSession] = useState<Session | null>(() => {
    try {
      // Supabase uses a predictable key for storing the session in many versions:
      // it's usually `sb-${projectRef}-auth-token` where projectRef is the first part of the URL.
      // However, it's safer to rely on the SDK's internal mechanisms or try the most common keys.

      const possibleKeys = Object.keys(localStorage).filter(key =>
        key.startsWith('sb-') && key.endsWith('-auth-token')
      );

      // Add default potential keys if filter returns empty
      if (possibleKeys.length === 0) {
        possibleKeys.push('supabase.auth.token', 'sb-auth-token');
      }

      for (const key of possibleKeys) {
        const cached = localStorage.getItem(key);
        if (cached) {
          console.log(`Checking session key: ${key}`);
          const parsed = JSON.parse(cached);
          const recoveredSession = parsed?.currentSession || parsed || null;
          if (recoveredSession?.user) {
            console.log(`Recovered session from ${key}`);
            return recoveredSession;
          }
        }
      }
    } catch (e) {
      console.warn("Early session recovery failed:", e);
    }
    return null;
  });
  const [user, setUser] = useState<User | null>(() => session?.user ?? null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to cache user ID for offline use
  const cacheUserId = (userId: string | null) => {
    try {
      if (userId) {
        localStorage.setItem('cached_user_id', userId);
      } else {
        localStorage.removeItem('cached_user_id');
      }
    } catch (error) {
      console.error("Error managing cached user ID:", error);
    }
  };

  // Helper function to show toast notifications safely
  const showToast = (options: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
    // Dynamically import and use toast to avoid circular dependencies
    import('@/hooks/use-toast').then(({ toast }) => {
      toast(options);
    }).catch((error) => {
      console.error('Failed to show toast:', error);
    });
  };

  useEffect(() => {
    // Set up state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log(`Auth state change [${event}]:`, currentSession?.user?.id || 'No user');
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        cacheUserId(currentSession?.user?.id ?? null);
        setIsLoading(false);
      }
    );

    // Initial session check
    const checkSession = async () => {
      try {
        console.log("Checking initial session...");

        // Timeout for session retrieval
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session retrieval timed out')), 7000);
        });

        const sessionPromise = supabase.auth.getSession();
        const { data: { session: currentSession }, error } = await (Promise.race([sessionPromise, timeoutPromise]) as any);

        if (error) throw error;

        if (currentSession) {
          console.log("Session recovered successfully:", currentSession.user.id);
          setSession(currentSession);
          setUser(currentSession.user);
          cacheUserId(currentSession.user.id);
        } else {
          console.log("No session found during check");
        }
      } catch (error) {
        console.error("Session recovery error or timeout:", error);
      } finally {
        console.log("Setting isLoading to false in useAuth");
        setIsLoading(false);
      }
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("Attempting sign in with email:", email);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error("Sign in error:", error.message);
        showToast({
          variant: "destructive",
          title: "Login failed",
          description: error.message || "Invalid email or password",
        });
        throw error;
      }

      console.log("Sign in successful, user:", data.user?.id);

      // Cache user ID immediately after successful sign in
      if (data.user) {
        cacheUserId(data.user.id);
      }

      showToast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    } catch (error: any) {
      console.error("Sign in error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    try {
      setIsLoading(true);
      console.log("Attempting sign up with email:", email, "metadata:", metadata);

      // Add detailed debugging for the signup process
      console.log("Signup metadata being sent:", JSON.stringify(metadata, null, 2));

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        console.error("Sign up error details:", error);
        showToast({
          variant: "destructive",
          title: "Signup failed",
          description: error.message || "An error occurred during signup",
        });
        throw error;
      }

      console.log("Sign up successful, response:", JSON.stringify(data, null, 2));

      // Cache user ID immediately after successful sign up
      if (data.user) {
        cacheUserId(data.user.id);
      }

      showToast({
        title: "Account created",
        description: "Your account has been created successfully.",
      });
    } catch (error: any) {
      console.error("Sign up error caught:", error);
      console.error("Error details:", error.message, error.stack);
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
      console.log("Attempting Google sign in");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        console.error("Google sign in error:", error.message);
        showToast({
          variant: "destructive",
          title: "Google login failed",
          description: error.message || "Could not connect to Google",
        });
        throw error;
      }
    } catch (error: any) {
      console.error("Google sign in error caught:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log("Starting immediate sign out");

      // 1. Clear local state IMMEDIATELY for instant UI response
      setSession(null);
      setUser(null);
      cacheUserId(null);
      sessionStorage.removeItem('expendx_onboarding_seen');

      // 2. Clear Supabase session in the background/awaited but without blocking UI progress
      // We don't set isLoading(true) here because we already know the user is "logged out" locally
      await supabase.auth.signOut();

      console.log("Sign out successful");
      showToast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      console.error("Sign out error caught:", error);
      // We still consider the user logged out locally
      showToast({
        variant: "destructive",
        title: "Sign out completed with notice",
        description: "You have been signed out locally. Some server sessions may persist.",
      });
    }
  };

  const value: AuthContextType = {
    session,
    user,
    isLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut
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
