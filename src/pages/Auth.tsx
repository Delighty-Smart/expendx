
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
        first_name: firstName,
        last_name: lastName,
        isNewUser: true
      };
      
      console.log("Signup metadata:", metadata);
      await signUp(email, password, metadata);
      console.log("Signup successful, attempting signin");
      await signIn(email, password);
    } catch (error) {
      console.error("Signup error:", error);
    } finally {
      setProcessingAuth(false);
    }
  };

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    navigate('/');
    return Promise.resolve();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium text-foreground">Loading...</p>
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/5 dark:bg-secondary/10 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl font-bold text-primary-foreground">E</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">ExpendX</h1>
          <p className="text-muted-foreground">Your Smart Finance Companion</p>
        </div>

        {/* Auth Form */}
        <AuthForm 
          onLogin={handleLogin} 
          onSignup={handleSignup}
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
