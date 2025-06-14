
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, User } from "lucide-react";

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
    <Card className="w-full shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50">
            <TabsTrigger 
              value="login" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger 
              value="signup"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="mt-0">
            <CardContent className="p-0">
              <form onSubmit={(e) => handleSubmit(e, 'login')} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        placeholder="you@example.com"
                        className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all duration-200"
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="password" 
                        name="password" 
                        type="password" 
                        placeholder="Enter your password"
                        className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all duration-200"
                        required 
                      />
                    </div>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={isDisabled}
                >
                  {isDisabled ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </CardContent>
          </TabsContent>

          <TabsContent value="signup" className="mt-0">
            <CardContent className="p-0">
              <form onSubmit={(e) => handleSubmit(e, 'signup')} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                        First Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="firstName" 
                          name="firstName" 
                          type="text" 
                          placeholder="John"
                          className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all duration-200"
                          required 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                        Last Name
                      </Label>
                      <Input 
                        id="lastName" 
                        name="lastName" 
                        type="text" 
                        placeholder="Doe"
                        className="h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all duration-200"
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium text-foreground">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="signup-email" 
                        name="email" 
                        type="email" 
                        placeholder="you@example.com"
                        className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all duration-200"
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium text-foreground">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="signup-password" 
                        name="password" 
                        type="password" 
                        placeholder="Create a strong password"
                        className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all duration-200"
                        required 
                        minLength={6}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground ml-1">
                      Minimum 6 characters required
                    </p>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={isDisabled}
                >
                  {isDisabled ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </CardContent>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
};
