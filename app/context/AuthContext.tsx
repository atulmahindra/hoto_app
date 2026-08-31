"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthUser {
  mobile?: string;
  username?: string;
  token?: string;
  user_details?: {
    name?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => boolean;
  loginWithData: (data: AuthUser) => void;
  logout: () => void;
}

const AUTH_STORAGE_KEY = "hoto_auth_user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((username: string, password: string) => {
    // Simple demo auth. Replace with a real API call as needed.
    if (username.trim() && password.trim()) {
      const nextUser = { username };
      setUser(nextUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
      return true;
    }
    return false;
  }, []);

  // Store authenticated user data (e.g. after OTP verification)
  const loginWithData = useCallback((data: AuthUser) => {
    setUser(data);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithData,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
