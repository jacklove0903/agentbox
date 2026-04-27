"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
const TOKEN_KEY = "agentbox_token";
const USER_KEY = "agentbox_user";
const GUEST_KEY = "agentbox_guest_id";
export const AUTH_CLEARED_EVENT = "agentbox-auth-cleared";

interface AuthUser {
  username: string;
  email?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  initializing: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      ensureGuestId();
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as AuthUser);
      }
    } catch {
      // ignore malformed storage
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);
        if (!storedToken || !storedUser) {
          setToken(null);
          setUser(null);
          return;
        }
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as AuthUser);
      } catch {
        setToken(null);
        setUser(null);
      }
    };

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(AUTH_CLEARED_EVENT, syncFromStorage);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(AUTH_CLEARED_EVENT, syncFromStorage);
    };
  }, []);

  const persistAuth = (tok: string, u: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, tok);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(tok);
    setUser(u);
  };

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Login failed (${res.status})`);
    }
    const data = (await res.json()) as { token: string; username: string; email?: string };
    persistAuth(data.token, { username: data.username, email: data.email });
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Register failed (${res.status})`);
      }
      const data = (await res.json()) as { token: string; username: string; email?: string };
      persistAuth(data.token, { username: data.username, email: data.email });
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, initializing, login, register, logout }),
    [user, token, initializing, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Read the current token synchronously (useful outside React). */
export function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function readGuestId(): string | null {
  if (typeof window === "undefined") return null;
  return ensureGuestId();
}

function ensureGuestId(): string {
  const existing = localStorage.getItem(GUEST_KEY);
  if (existing && existing.length >= 8) return existing;

  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `g-${crypto.randomUUID()}`
      : `g-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(GUEST_KEY, generated);
  return generated;
}
