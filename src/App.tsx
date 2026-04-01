import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { hasSeenWelcome } from "@/lib/storage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Welcome from "./pages/Welcome";
import Chat from "./pages/Chat";
import CodingPartner from "./pages/CodingPartner";
import Settings from "./pages/Settings";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import SharedChat from "./pages/SharedChat";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import StudyOnboarding from "./pages/StudyOnboarding";
import StudyDashboard from "./pages/StudyDashboard";
import AntiDevtools from "@/components/AntiDevtools";
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" /></div>;
  if (isAuthenticated) return <Navigate to={hasSeenWelcome() ? "/chat" : "/welcome"} replace />;
  return <>{children}</>;
};

const WelcomeRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (hasSeenWelcome()) return <Navigate to="/chat" replace />;
  return <>{children}</>;
};

// Admin route - checks Supabase auth + admin role
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!isAuthenticated) { setIsAdmin(false); return; }
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsAdmin(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").single();
      setIsAdmin(!!data);
    };
    if (!loading) checkAdmin();
  }, [isAuthenticated, loading]);

  if (loading || isAdmin === null) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/chat" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" /></div>;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
      <Route path="/welcome" element={<WelcomeRoute><Welcome /></WelcomeRoute>} />
      <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/chat/:sessionId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/coding" element={<ProtectedRoute><CodingPartner /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/study/chat" element={<ProtectedRoute><StudyOnboarding /></ProtectedRoute>} />
      <Route path="/study/dashboard" element={<ProtectedRoute><StudyDashboard /></ProtectedRoute>} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/shared/:shareId" element={<SharedChat />} />
      {/* Admin routes - role-based access */}
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/login" element={<AdminLogin />} />
      {/* Legacy admin routes redirect */}
      <Route path="/qwertyuiop/adminpanel/yoyoyo/loginuser" element={<Navigate to="/admin/login" replace />} />
      <Route path="/qwertyuiop/adminpanel/yoyoyo/dashboard" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
