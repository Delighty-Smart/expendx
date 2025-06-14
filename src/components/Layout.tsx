
import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthForm } from "./AuthForm";
import { Sidebar } from "./ui/sidebar";
import { SidebarProvider } from "./ui/sidebar";
import { SyncStatusIndicator } from "./SyncStatusIndicator";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, isLoading, signIn, signUp } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthForm 
        onLogin={signIn}
        onSignup={async (email: string, password: string, firstName: string, lastName: string) => {
          await signUp(email, password, { first_name: firstName, last_name: lastName });
        }}
      />
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          {/* Header with sync status */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <div className="container flex h-14 items-center justify-between px-4">
              <div className="flex items-center space-x-2">
                <h1 className="font-semibold">ExpendX</h1>
              </div>
              <SyncStatusIndicator />
            </div>
          </header>
          
          {/* Main content */}
          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
