import { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "../api/client";

export type User = {
  id: number;
  username: string;
  avatarUrl: string | null;
};

type LoginResponse = {
  token: string;
  user: User;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (username: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiryMs(token);
  return expiry === null || expiry <= Date.now();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem("authToken");
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      // An expired token would only produce a 401 in the console: drop it right away.
      if (isTokenExpired(storedToken)) {
        localStorage.removeItem("authToken");
        setIsLoading(false);
        return;
      }

      try {
        const me = await apiFetch<User>("/users/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        setToken(storedToken);
        setUser(me);
      } catch {
        localStorage.removeItem("authToken");
      }
      setIsLoading(false);
    }

    restoreSession();
  }, []);

  // End the session when the token expires instead of letting requests fail with 401.
  useEffect(() => {
    if (!token) return;
    const expiry = getTokenExpiryMs(token);
    if (expiry === null) return;

    const timeout = window.setTimeout(() => {
      localStorage.removeItem("authToken");
      setToken(null);
      setUser(null);
    }, Math.max(expiry - Date.now(), 0));

    return () => window.clearTimeout(timeout);
  }, [token]);

  async function login(email: string, password: string) {
    const result = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("authToken", result.token);
    setToken(result.token);
    setUser(result.user);
  }

  async function register(email: string, username: string, password: string) {
    await apiFetch<{ userId: number }>("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });
  }

  async function updateProfile(username: string) {
    if (!token) throw new Error("Not authenticated");
    const updated = await apiFetch<User>("/users/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username }),
    });
    setUser(updated);
  }

  function logout() {
    localStorage.removeItem("authToken");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un <AuthProvider>");
  }
  return context;
}