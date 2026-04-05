import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthChange } from "@/lib/firebase";
import { getSubscription, saveSubscription } from "@/lib/storage";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log("Auth timeout - setting loading to false");
        setLoading(false);
      }
    }, 3000);

    const unsubscribe = onAuthChange((user) => {
      console.log("Auth state changed:", user ? "User logged in" : "User logged out");
      setUser(user);
      setLoading(false);
      clearTimeout(timeout);
      // Auto-set nigown plan for admin
      if (user?.email === "qwertyuiop@aqualibrya.id") {
        const sub = getSubscription();
        if (sub.plan !== "nigown") {
          saveSubscription({ plan: "nigown", purchasedAt: new Date() });
        }
      }
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // With Supabase, authenticated = has a session (auto-confirm enabled)
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
