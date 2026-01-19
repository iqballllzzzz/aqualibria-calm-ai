import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthChange } from "@/lib/firebase";

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
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log("Auth timeout - setting loading to false");
        setLoading(false);
      }
    }, 3000); // 3 second timeout

    const unsubscribe = onAuthChange((user) => {
      console.log("Auth state changed:", user ? "User logged in" : "User logged out");
      setUser(user);
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // Log current state for debugging
  useEffect(() => {
    console.log("Auth state:", { loading, user: user?.email || null, isAuthenticated: !!user });
  }, [loading, user]);

  const isAuthenticated = !!user && (user.emailVerified || user.providerData[0]?.providerId === "google.com");

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
