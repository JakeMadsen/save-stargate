import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, type ApiUser } from "../api.js";

type AuthContextValue = {
  user: ApiUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const data = await api<{ user: ApiUser | null }>("/api/auth/me");
    setUser(data.user);
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, refresh, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};

export const isStaff = (role?: ApiUser["role"]) => role === "owner" || role === "admin" || role === "moderator";

