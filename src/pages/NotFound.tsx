import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-foreground/5 border border-border flex items-center justify-center">
          <span className="text-4xl font-light text-foreground-muted">404</span>
        </div>
        <h1 className="text-2xl font-medium text-foreground mb-3">
          Page not found
        </h1>
        <p className="text-foreground-muted mb-8 max-w-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-medium hover:bg-foreground/90 transition-all btn-press"
        >
          <Home className="w-4 h-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
