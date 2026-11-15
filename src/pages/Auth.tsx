
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthForm } from "@/components/AuthForm";
import { Toaster } from "@/components/ui/toaster";
import { Onboarding } from "@/components/Onboarding";
import { useAuth } from "@/hooks/useAuth";
import { ONBOARDING_PENDING_KEY, ONBOARDING_SEEN_KEY } from "@/lib/auth-constants";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";

const Auth = () => {
  const navigate = useNavigate();
  const { user, isLoading, signIn, signUp, signInWithGoogle } = useAuth();
  const [view, setView] = useState<'onboarding' | 'auth' | 'loading'>('loading');
  const [processingAuth, setProcessingAuth] = useState(false);

  useEffect(() => {
    console.log("Auth page effect - user:", user?.id, "isLoading:", isLoading);

    if (!isLoading) {
      if (user) {
        // Accounts created in this session are flagged at signup (Firebase-native, no user_metadata)
        const isNewUser = localStorage.getItem(ONBOARDING_PENDING_KEY) === user.id;
        console.log("User authenticated, is new user:", isNewUser);

        if (isNewUser) {
          console.log("Showing onboarding for new user (authenticated)");
          setView('onboarding');
        } else {
          console.log("Redirecting existing user to chat");
          navigate('/chat');
        }
      } else {
        // User not logged in, check if they've already seen onboarding in this sessions
        const hasSeenOnboarding = sessionStorage.getItem(ONBOARDING_SEEN_KEY);
        if (hasSeenOnboarding) {
          setView('auth');
        } else {
          setView('onboarding');
        }
      }
    }
  }, [user, isLoading, navigate]);

  const handleLogin = async (email: string, password: string) => {
    try {
      setProcessingAuth(true);
      console.log("Handling login for:", email);
      await signIn(email, password);
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setProcessingAuth(false);
    }
  };

  const handleSignup = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      setProcessingAuth(true);
      console.log("Handling signup for:", email, "firstName:", firstName, "lastName:", lastName);

      const metadata = {
        firstName,
        lastName
      };

      console.log("Signup metadata:", metadata);
      await signUp(email, password, metadata);
      // signUp creates the Firebase Auth user, the Firestore profile and flags the
      // session for onboarding; the onAuthStateChanged listener picks up the session.
    } catch (error) {
      console.error("Signup error:", error);
    } finally {
      setProcessingAuth(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setProcessingAuth(true);
      await signInWithGoogle();
    } catch (error) {
      console.error("Google auth error:", error);
    } finally {
      setProcessingAuth(false);
    }
  };

  const handleOnboardingComplete = async () => {
    sessionStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    try { localStorage.removeItem(ONBOARDING_PENDING_KEY); } catch {
      // Ignore storage failures
    }
    if (user) {
      // If they were already authenticated (e.g. just signed up), go to chat
      navigate('/chat');
    } else {
      // Go to login form
      setView('auth');
    }
    return Promise.resolve();
  };

  if (isLoading || view === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState size="lg" message="Loading..." />
      </div>
    );
  }

  if (view === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-pt">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/5 dark:bg-secondary/10 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <img
              src={document.documentElement.classList.contains('dark') ? "/lucent-portrait-dark.png" : "/lucent-portrait-light.png"}
              alt="Lucent"
              className="h-16 object-contain"
            />
          </div>
          <p className="text-muted-foreground">Your Smart Finance Companion</p>
        </div>

        {/* Auth Form */}
        <AuthForm
          onLogin={handleLogin}
          onSignup={handleSignup}
          onGoogleSignIn={handleGoogleSignIn}
          isProcessing={processingAuth}
        />

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Secure • Private • Reliable</p>
        </div>
      </div>

      <Toaster />
    </div>
  );
};

export default Auth;
