
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { safelyUnwrapResponse } from '@/services/supabaseHelpers';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
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
    // First set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log(`Auth state changed: ${event}`, currentSession?.user?.id || 'No user');
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Cache user ID for offline use
        cacheUserId(currentSession?.user?.id ?? null);
        
        setIsLoading(false);
      }
    );

    // Then check for existing session
    const getInitialSession = async () => {
      try {
        setIsLoading(true);
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user ?? null);
        
        // Cache user ID for offline use
        cacheUserId(data.session?.user?.id ?? null);
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

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

  const signOut = async () => {
    try {
      setIsLoading(true);
      console.log("Attempting to sign out");
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Sign out error:", error.message);
        throw error;
      }
      
      // Clear cached user ID on sign out
      cacheUserId(null);
      
      console.log("Sign out successful");
      showToast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      console.error("Sign out error caught:", error);
      showToast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message || "An error occurred while signing out",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    session,
    user,
    isLoading,
    signIn,
    signUp,
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
