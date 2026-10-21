import { createContext, useContext, useState, useEffect } from "react";
import { apiFetch, refreshAccessToken } from "../api/client";

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

// Must match the lifetime of the refresh cookie set by the API (7 days).
const REFRESH_COOKIE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem("authToken");
      const tokenExpiry = storedToken ? getTokenExpiryMs(storedToken) : null;
      // A stored token that is still valid for a few seconds can be used as is.
      const tokenUsable = storedToken !== null && tokenExpiry !== null && tokenExpiry > Date.now() + 5_000;
      // The refresh cookie is httpOnly, so we remember when it expires (7 days after login).
      const canRefresh = Number(localStorage.getItem("hasSession")) > Date.now();

      // Nothing usable: do not call the API at all (no 401 in the console).
      if (!tokenUsable && !canRefresh) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("hasSession");
        setIsLoading(false);
        return;
      }
      try {
        const sessionToken = tokenUsable ? storedToken : await refreshAccessToken();
        const me = await apiFetch<User>("/users/me", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        setToken(localStorage.getItem("authToken") ?? sessionToken);
        setUser(me);
      } catch {
        localStorage.removeItem("authToken");
        localStorage.removeItem("hasSession");
      }
      setIsLoading(false);
    }

    restoreSession();
  }, []);

  // Refresh before access-token expiry so an active session continues seamlessly.
  useEffect(() => {
    if (!token) return;
    const expiry = getTokenExpiryMs(token);
    if (expiry === null) return;

    let timeout: number;
    const refresh = async () => {
      try {
        setToken(await refreshAccessToken());
      } catch (error: unknown) {
        const remaining = expiry - Date.now();
        if (remaining > 0) {
          timeout = window.setTimeout(() => void refresh(), remaining + 1000);
          return;
        }
        console.error("Unable to refresh authentication session.", error);
        localStorage.removeItem("authToken");
        localStorage.removeItem("hasSession");
        setToken(null);
        setUser(null);
      }
    };
    timeout = window.setTimeout(() => void refresh(), Math.max(expiry - Date.now() - 60_000, 0));

    return () => window.clearTimeout(timeout);
  }, [token]);

  // Saves the session: used by the normal login AND by the 2FA verification
  function saveSession(newToken: string, newUser: User) {
    localStorage.setItem("authToken", newToken);
    localStorage.setItem("hasSession", String(Date.now() + REFRESH_COOKIE_TTL_MS));
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
    localStorage.removeItem("hasSession");
    setToken(null);
    setUser(null);
    void apiFetch<void>("/auth/logout", { method: "POST" }).catch((error: unknown) => {
      console.error("Failed to clear the refresh-token cookie.", error);
    });
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