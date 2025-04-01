
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthForm } from "@/components/AuthForm";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Onboarding } from "@/components/Onboarding";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";

interface OnboardingProps {
  onComplete: () => void;
}

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === "SIGNED_IN" && session) {
          console.log("User signed in:", session.user?.id);
          setIsAuthenticated(true);

          // Check if the user is new (just signed up) using the state
          if (isNewUser) {
            setShowOnboarding(true);
            setIsNewUser(false); // Reset after handling
          } else {
            navigate('/');
          }
        } else if (event === "SIGNED_OUT") {
          setIsAuthenticated(false);
        }
      }
    );

    // Check if user is already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        navigate('/');
      } else {
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isNewUser]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        throw error;
      }
      
      // Navigation happens in the auth state change listener
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message,
      });
    }
  };

  const handleSignup = async (email: string, password: string) => {
    try {
      // Set flag that this is a new user before signup
      setIsNewUser(true);
      
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        setIsNewUser(false); // Reset flag if error
        throw error;
      }

      toast({
        title: "Signup successful",
        description: "Please check your email to confirm your account",
      });
      
      // Onboarding will be shown via the auth state change listener
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: error.message,
      });
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    navigate('/');
  };

  // Loading state
  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left column: Authentication form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <AuthForm onLogin={handleLogin} onSignup={handleSignup} />
        </div>
      </div>

      {/* Right column: Image or branding */}
      <div className="hidden md:flex flex-1 bg-primary items-center justify-center p-6">
        <div className="max-w-lg text-white">
          <h1 className="text-4xl font-bold mb-6">Take control of your finances</h1>
          <p className="text-xl opacity-90">
            Track expenses, manage budgets, and achieve your financial goals with our intuitive budgeting tool.
          </p>
        </div>
      </div>
      <Toaster />
    </div>
  );
};

export default Auth;
