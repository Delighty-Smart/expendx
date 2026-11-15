import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/ui/loading-state";

interface AuthGuardProps {
    children: ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Wait for Firebase Auth to restore the session before deciding
        if (isLoading) return;

        if (!user) {
            navigate('/auth', { replace: true, state: { from: location } });
        }
    }, [user, isLoading, navigate, location]);

    // Show a loading spinner until the Firebase auth state is confirmed
    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background rounded-xl p-8">
                <LoadingState size="lg" message="Restoring session..." />
            </div>
        );
    }

    // Only render the protected components if the user is authenticated
    if (!user) {
        return null;
    }

    return <>{children}</>;
};
