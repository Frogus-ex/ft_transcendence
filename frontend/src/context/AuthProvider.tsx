import { createContext, useState, type ReactNode, type Dispatch, type SetStateAction } from "react";

type Auth = {
	id?: number;
	username?: string;
	avatarUrl?: string;
	accessToken?: string;
};

type AuthContextType = {
  auth: Auth;
  setAuth: Dispatch<SetStateAction<Auth>>;
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [auth, setAuth] = useState<Auth>({});

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;