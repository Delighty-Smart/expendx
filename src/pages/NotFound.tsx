
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, RefreshCw } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleGoHome = () => {
    navigate("/", { replace: true });
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
          <p className="text-gray-600 mb-6">
            The page you're looking for doesn't exist or may have been moved.
          </p>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={handleGoHome}
            className="w-full flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleRefresh}
            className="w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Page
          </Button>
        </div>
        
        <p className="text-sm text-gray-500 mt-6">
          Route: <code className="bg-gray-100 px-2 py-1 rounded">{location.pathname}</code>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
