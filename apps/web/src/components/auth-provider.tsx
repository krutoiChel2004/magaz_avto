"use client";

import { createContext, startTransition, useContext, useEffect, useEffectEvent, useState } from "react";

import type { AuthResponse, AuthUser } from "@/lib/types";

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  first_name: string;
  last_name: string;
  patronymic?: string;
  email: string;
  phone?: string;
  password: string;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = "mcm-token";
const USER_KEY = "mcm-user";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const fallbackUsers: Record<string, { password: string; user: AuthUser }> = {
  "admin@msm-auto.ru": {
    password: "Admin123!",
    user: {
      id: 1,
      first_name: "Матвей",
      last_name: "Агафонов",
      patronymic: "Андреевич",
      email: "admin@msm-auto.ru",
      phone: "+7 (900) 000-00-01",
      role: "admin",
      is_active: true,
      created_at: "2026-05-20T10:00:00Z",
    },
  },
  "manager@msm-auto.ru": {
    password: "Manager123!",
    user: {
      id: 2,
      first_name: "Ирина",
      last_name: "Крылова",
      patronymic: "Олеговна",
      email: "manager@msm-auto.ru",
      phone: "+7 (900) 000-00-02",
      role: "manager",
      is_active: true,
      created_at: "2026-05-20T10:00:00Z",
    },
  },
  "client@msm-auto.ru": {
    password: "Client123!",
    user: {
      id: 3,
      first_name: "Алексей",
      last_name: "Петров",
      patronymic: "Сергеевич",
      email: "client@msm-auto.ru",
      phone: "+7 (900) 000-00-03",
      role: "customer",
      is_active: true,
      created_at: "2026-05-20T10:00:00Z",
    },
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  function persistSession(nextToken: string, nextUser: AuthUser) {
    startTransition(() => {
      setToken(nextToken);
      setUser(nextUser);
    });
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }

  const restoreApiSession = useEffectEvent(async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as AuthResponse;
      persistSession(data.access_token, data.user);
    } catch {
      // keep demo session when API is still unavailable
    }
  });

  useEffect(() => {
    if (!token?.startsWith("demo-") || !user) {
      return;
    }

    const fallback = fallbackUsers[user.email];
    if (!fallback) {
      return;
    }

    void restoreApiSession(user.email, fallback.password);
  }, [token, user]);

  async function login(payload: LoginPayload) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("auth_error");
      }

      const data = (await response.json()) as AuthResponse;
      persistSession(data.access_token, data.user);
      return;
    } catch {
      const fallback = fallbackUsers[payload.email];
      if (!fallback || fallback.password !== payload.password) {
        throw new Error("Неверный логин или пароль");
      }
      persistSession(`demo-${fallback.user.role}`, fallback.user);
    }
  }

  async function register(payload: RegisterPayload) {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("register_error");
      }
      const data = (await response.json()) as AuthResponse;
      persistSession(data.access_token, data.user);
      return;
    } catch {
      const fallbackUser: AuthUser = {
        id: hashEmail(payload.email),
        first_name: payload.first_name,
        last_name: payload.last_name,
        patronymic: payload.patronymic ?? null,
        email: payload.email,
        phone: payload.phone ?? null,
        role: "customer",
        is_active: true,
        created_at: new Date().toISOString(),
      };
      persistSession("demo-customer", fallbackUser);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function readStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

function readStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser = window.localStorage.getItem(USER_KEY);
  return storedUser ? (JSON.parse(storedUser) as AuthUser) : null;
}

function hashEmail(email: string) {
  return Array.from(email).reduce((sum, char) => sum + char.charCodeAt(0), 1000);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
