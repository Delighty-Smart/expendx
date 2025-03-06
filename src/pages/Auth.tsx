
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthForm } from "@/components/AuthForm";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Compare the event as strings
        if (event === 'SIGNED_UP') {
          setShowOnboarding(true);
        } else {
          navigate('/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (showOnboarding) {
    // Lazy load the Onboarding component
    const Onboarding = require('@/components/Onboarding').default;
    return <Onboarding />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="mb-8 flex flex-col items-center">
        <img 
          src="/lovable-uploads/87a85edd-1a8a-44f7-92c9-dd1273fccf8c.png" 
          alt="expendX" 
          className="h-16 object-contain mb-4"
        />
        <h1 className="text-2xl font-bold text-gray-800">Welcome to ExpendX</h1>
        <p className="text-gray-600">Your personal finance management solution</p>
      </div>
      <AuthForm />
    </div>
  );
};

export default Auth;
