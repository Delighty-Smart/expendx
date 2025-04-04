
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
  isProcessing?: boolean;
}

export const AuthForm = ({ onLogin, onSignup, isProcessing = false }: AuthFormProps) => {
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
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
