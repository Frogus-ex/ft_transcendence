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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      //lire le token dans localStorage (clé "authToken")
      const storedToken = localStorage.getItem("authToken");
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      //check si token toujours valide
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

  // Enregistre la session : utilisé par le login normal ET par la 2FA
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
    // 2FA active : pas encore de vrai token, on renvoie le token temporaire à la page
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

  // Met à jour l'état 2FA après activation/désactivation depuis le profil
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
