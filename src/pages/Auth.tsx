
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthForm } from "@/components/AuthForm";
import { Toaster } from "@/components/ui/toaster";
import { Onboarding } from "@/components/Onboarding";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const navigate = useNavigate();
  const { user, isLoading, signIn, signUp } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    // If authenticated and not a new user, redirect to dashboard
    if (user && !isLoading && !isNewUser) {
      navigate('/');
    }
    
    // If authenticated and new user, show onboarding
    if (user && !isLoading && isNewUser) {
      setShowOnboarding(true);
      setIsNewUser(false); // Reset after handling
    }
  }, [user, isLoading, isNewUser, navigate]);

  const handleLogin = async (email: string, password: string) => {
    try {
      await signIn(email, password);
      // Navigation happens in the useEffect when auth state changes
    } catch (error) {
      // Error is handled in the signIn function
      console.error("Login error:", error);
    }
  };

  const handleSignup = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      // Set flag that this is a new user before signup
      setIsNewUser(true);
      
      // Create new user with the provided email and password
      await signUp(email, password, {
        first_name: firstName,
        last_name: lastName
      });
      
      // Onboarding will be shown via the useEffect when auth state changes
    } catch (error) {
      setIsNewUser(false); // Reset flag if error
      console.error("Signup error:", error);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    navigate('/');
  };

  // Loading state
  if (isLoading) {
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
