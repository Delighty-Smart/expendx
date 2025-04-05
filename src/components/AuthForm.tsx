
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AuthFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  isProcessing?: boolean;
}

export const AuthForm = ({ onLogin, onSignup, onGoogleSignIn, isProcessing = false }: AuthFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, mode: 'login' | 'signup') => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      
      // Validate inputs
      if (!email || !password) {
        throw new Error("Email and password are required");
      }
      
      if (mode === 'signup') {
        const firstName = formData.get('firstName') as string;
        const lastName = formData.get('lastName') as string;
        
        if (!firstName || !lastName) {
          throw new Error("First name and last name are required");
        }
        
        await onSignup(email, password, firstName, lastName);
      } else {
        await onLogin(email, password);
      }
    } catch (error: any) {
      console.error(`Auth form ${mode} error:`, error);
      toast({
        title: "Error",
        description: error.message || "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await onGoogleSignIn();
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast({
        title: "Error",
        description: error.message || "Google authentication failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || isProcessing;

  return (
    <Card className="w-full max-w-md p-6 shadow-lg">
      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        
        <TabsContent value="login">
          <form onSubmit={(e) => handleSubmit(e, 'login')} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-expendx-blue to-expendx-green text-white" 
              disabled={isDisabled}
            >
              {isDisabled ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Login"
              )}
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <Button 
              type="button"
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleSignIn}
              disabled={isDisabled}
            >
              {isDisabled ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                </svg>
              )}
              Sign in with Google
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup">
          <form onSubmit={(e) => handleSubmit(e, 'signup')} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input id="signup-password" name="password" type="password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" name="firstName" type="text" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" name="lastName" type="text" required />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-expendx-blue to-expendx-green text-white" 
              disabled={isDisabled}
            >
              {isDisabled ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <Button 
              type="button"
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleSignIn}
              disabled={isDisabled}
            >
              {isDisabled ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                </svg>
              )}
              Sign up with Google
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
