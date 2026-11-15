import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';

import { updateUserStreak, getUserProfile } from '@/lib/streak';
import { ONBOARDING_PENDING_KEY, ONBOARDING_SEEN_KEY } from '@/lib/auth-constants';

export interface AppUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  [key: string]: any;
}

interface AuthContextType {
  session: { user: AppUser } | null;
  user: AppUser | null;
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
  const [session, setSession] = useState<{ user: AppUser } | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);

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

  const formatUser = (fbUser: FirebaseUser | null): AppUser | null => {
    if (!fbUser) return null;
    return {
      id: fbUser.uid,
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      photoURL: fbUser.photoURL,
      ...fbUser
    };
  };

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      try {
        GoogleSignIn.initialize({
          clientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || 'YOUR_WEB_CLIENT_ID_HERE',
        });
      } catch (e) {
        console.error("Failed to initialize GoogleSignIn", e);
      }
    }

    // Set up Firebase Auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      const appUser = formatUser(fbUser);
      console.log(`Auth state change:`, appUser?.id || 'No user');

      setUser(appUser);
      setSession(appUser ? { user: appUser } : null);

      if (appUser) {
        cacheUserData(appUser.id);
        await fetchProfile(appUser.id);
      } else {
        setProfile(null);
        setIsAdmin(false);
        cacheUserData(null);
      }

      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const appUser = formatUser(userCredential.user);
      if (appUser) {
        cacheUserData(appUser.id);
        await fetchProfile(appUser.id);
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
    }
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      const firstName = (metadata?.firstName as string)?.trim() || '';
      const lastName = (metadata?.lastName as string)?.trim() || '';
      const username = fbUser.email?.split('@')[0] || 'user';
      const displayName = [firstName, lastName].filter(Boolean).join(' ') || username;

      // Keep the Firebase Auth display name in sync with the profile
      if (fbUser.displayName !== displayName) {
        await updateProfile(fbUser, { displayName }).catch((err) =>
          console.error('Failed to update display name:', err)
        );
      }

      // Flag this session so the Auth page can route the user through onboarding
      try {
        localStorage.setItem(ONBOARDING_PENDING_KEY, fbUser.uid);
      } catch {
        // Storage can be unavailable in private mode — onboarding still works without the flag
      }

      // Create the Firestore profile document up-front so the rest of the app has a record immediately
      const now = new Date().toISOString();
      const newProfile = {
        id: fbUser.uid,
        email: fbUser.email || '',
        username,
        first_name: firstName || null,
        last_name: lastName || null,
        display_name: displayName,
        avatar_url: null,
        role: 'free',
        created_at: now,
        updated_at: now,
      };

      await setDoc(doc(db, 'user_profiles', fbUser.uid), newProfile).catch((err) =>
        console.error('Failed to create user profile:', err)
      );

      const appUser = formatUser(fbUser);
      if (appUser) {
        cacheUserData(appUser.id, newProfile);
        setProfile(newProfile);
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
    }
  };

  const signInWithGoogle = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          const result = await GoogleSignIn.signIn();
          if (result && result.idToken) {
            const credential = GoogleAuthProvider.credential(result.idToken);
            const userCredential = await signInWithCredential(auth, credential);
            const appUser = formatUser(userCredential.user);
            if (appUser) {
              cacheUserData(appUser.id);
              await fetchProfile(appUser.id);
            }
            showToast({ title: "Welcome back!" });
            return;
          }
        } catch (nativeErr: any) {
          console.warn("Native GoogleSignIn unavailable, falling back to popup:", nativeErr);
        }
      }

      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const appUser = formatUser(userCredential.user);
      if (appUser) {
        cacheUserData(appUser.id);
        await fetchProfile(appUser.id);
      }
      showToast({ title: "Welcome back!" });
    } catch (error: any) {
      console.error("Google sign in error caught:", error);
      showToast({
        variant: "destructive",
        title: "Google login failed",
        description: error.message || "Could not connect to Google",
      });
    }
  };

  const signOut = async () => {
    try {
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      cacheUserData(null);
      sessionStorage.removeItem(ONBOARDING_SEEN_KEY);
      try { localStorage.removeItem(ONBOARDING_PENDING_KEY); } catch {
        // Ignore storage failures on sign out
      }

      await firebaseSignOut(auth);
      if (Capacitor.isNativePlatform()) {
        try { await GoogleSignIn.signOut(); } catch {
          // Native sign-out is best effort
        }
      }

      showToast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      console.error("Sign out error caught:", error);
      showToast({
        variant: "destructive",
        title: "Sign out completed with notice",
        description: "You have been signed out locally.",
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
