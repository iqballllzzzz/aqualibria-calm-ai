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
    // Timeout lebih pendek (1.5s) agar tidak stuck di blank screen
    const timeout = setTimeout(() => {
      console.warn("Auth timeout - forcing loading=false");
      setLoading(false);
    }, 1500);

    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = onAuthChange((authUser) => {
        console.log("Auth state changed:", authUser ? "User logged in" : "User logged out");
        setUser(authUser);
        setLoading(false);
        clearTimeout(timeout);
        // Auto-set nigown plan for admin
        if (authUser?.email === "qwertyuiop@aqualibrya.id") {
          const sub = getSubscription();
          if (sub.plan !== "nigown") {
            saveSubscription({ plan: "nigown", purchasedAt: new Date() });
          }
        }
      });
    } catch (err) {
      console.error("Auth init error:", err);
      setLoading(false);
      clearTimeout(timeout);
    }

    return () => {
      clearTimeout(timeout);
      unsubscribe?.();
    };
  }, []);

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
