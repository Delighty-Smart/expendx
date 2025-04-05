
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthForm } from "@/components/AuthForm";
import { Toaster } from "@/components/ui/toaster";
import { Onboarding } from "@/components/Onboarding";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { user, isLoading, signIn, signUp } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [processingAuth, setProcessingAuth] = useState(false);

  useEffect(() => {
    console.log("Auth page effect - user:", user?.id, "isLoading:", isLoading);
    
    // If authenticated, decide what to do next
    if (user && !isLoading) {
      const isNewUser = !!user.user_metadata?.isNewUser;
      console.log("User authenticated, is new user:", isNewUser);
      
      if (isNewUser) {
        console.log("Showing onboarding for new user");
        setShowOnboarding(true);
      } else {
        console.log("Redirecting existing user to dashboard");
        navigate('/');
      }
    }
  }, [user, isLoading, navigate]);

  const handleLogin = async (email: string, password: string) => {
    try {
      setProcessingAuth(true);
      console.log("Handling login for:", email);
      await signIn(email, password);
      // Navigation happens in the useEffect when auth state changes
    } catch (error) {
      console.error("Login error:", error);
      // Error is handled in the signIn function
    } finally {
      setProcessingAuth(false);
    }
  };

  const handleSignup = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      setProcessingAuth(true);
      console.log("Handling signup for:", email);
      
      // Sign up with additional metadata
      const result = await signUp(email, password, {
        first_name: firstName,
        last_name: lastName,
        isNewUser: true // Flag to identify new users
      });
      
      // After successful signup, try to sign in
      await signIn(email, password);
      
    } catch (error) {
      console.error("Signup error:", error);
      // Error is handled in the signUp function
    } finally {
      setProcessingAuth(false);
    }
  };

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    navigate('/');
    return Promise.resolve();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left column: Authentication form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <AuthForm 
            onLogin={handleLogin} 
            onSignup={handleSignup}
            isProcessing={processingAuth}
          />
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
