import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, user, navigate]);

  if (isLoading) return <p className="p-6 text-gray-400">Loading...</p>;
  if (!user) return null;

  return <>{children}</>;
}

export default PrivateRoute;