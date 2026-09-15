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
  loginWithData: (data: AuthUser) => void;
  logout: () => void;
  getToken: () => string;
}

// Pull the auth token from a user object regardless of the field name used
export function extractToken(user: AuthUser | null): string {
  if (!user) return "";
  const u = user as Record<string, unknown>;
  const nested = (u.user ?? u.data ?? {}) as Record<string, unknown>;
  return String(
    u.token ??
      u.access_token ??
      u.accessToken ??
      u.authToken ??
      u.jwt ??
      nested.token ??
      nested.access_token ??
      nested.accessToken ??
      ""
  );
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

  // Store authenticated user data (e.g. after OTP verification)
  const loginWithData = useCallback((data: AuthUser) => {
    setUser(data);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const getToken = useCallback(() => extractToken(user), [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithData,
        logout,
        getToken,
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
