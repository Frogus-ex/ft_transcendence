import { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "../api/client";

export type User = {
  id: number;
  username: string;
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
};

type LoginResponse = {
  token: string | null;
  user: User | null;
  requires2fa: boolean;
  tempToken: string | null;
};

export type LoginResult = { requires2fa: true; tempToken: string } | undefined;

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verify2fa: (tempToken: string, code: string) => Promise<void>;
  setTwoFactorEnabled: (enabled: boolean) => void;
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

  // Saves the session: used by the normal login AND by the 2FA verification
  function saveSession(newToken: string, newUser: User) {
    localStorage.setItem("authToken", newToken);
    setToken(newToken);
    setUser(newUser);
  }

  async function login(email: string, password: string): Promise<LoginResult> {
    const result = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    // 2FA enabled: no real token yet, hand the temporary token back to the page
    if (result.requires2fa && result.tempToken) {
      return { requires2fa: true, tempToken: result.tempToken };
    }
    if (!result.token || !result.user) throw new Error("Login Failed");
    saveSession(result.token, result.user);
  }

  async function verify2fa(tempToken: string, code: string) {
    const result = await apiFetch<LoginResponse>("/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken, code }),
    });
    if (!result.token || !result.user) throw new Error("Verification Failed");
    saveSession(result.token, result.user);
  }

  // Updates the 2FA state after enabling/disabling it from the profile page
  function setTwoFactorEnabled(enabled: boolean) {
    setUser((current) => (current ? { ...current, twoFactorEnabled: enabled } : current));
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
    <AuthContext.Provider
      value={{ user, token, isLoading, login, verify2fa, setTwoFactorEnabled, register, logout, updateProfile }}
    >
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