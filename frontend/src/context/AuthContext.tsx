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
        if (!storedToken){
            setIsLoading(false);
            return;
        }
      //check si token toujours valide
        try {
            const me = await apiFetch<User>("/users/me",  {
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

  async function login(email: string, password: string) {
    const result = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("authToken", result.token);
    setToken(result.token);
    setUser(result.user);
  }

  async function register(email: string, username: string, password: string) {
    await apiFetch<{ userId: number}>("/auth/register", {
        method: "POST",
        headers: {"Content-Type": "application/json" },
        body: JSON.stringify({email, username, password }),
    });
  }

  function logout() {
    localStorage.removeItem("authToken");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
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