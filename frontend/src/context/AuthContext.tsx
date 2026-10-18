import React, { createContext, useContext, useState, useEffect } from "react";
import { api, authStorage, User } from "../api/client";
import { DEMO_TOKEN, readDemo, saveDemo } from "../api/demo";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  localDemoLogin: () => Promise<void>;
  logout: () => void;
  activeCourseId: string | null;
  setActiveCourseId: (id: string | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);

  const fetchProfile = async () => {
    const token = authStorage.getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const u = await api.auth.getMe();
      setUser(u);
    } catch {
      authStorage.clearToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    const token = authStorage.getToken();
    const request = token ? api.auth.getMe() : Promise.resolve(null);
    request
      .then((profile) => {
        if (alive) setUser(profile);
      })
      .catch(() => {
        if (alive) {
          authStorage.clearToken();
          setUser(null);
        }
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.auth.login({ email, password: pass });
    authStorage.setToken(res.access_token);
    await fetchProfile();
  };

  const register = async (email: string, pass: string, name: string) => {
    const res = await api.auth.register({
      email,
      password: pass,
      full_name: name,
    });
    authStorage.setToken(res.access_token);
    await fetchProfile();
  };

  const demoLogin = async () => {
    const res = await api.auth.demoLogin();
    authStorage.setToken(res.access_token);
    await fetchProfile();
  };

  const logout = () => {
    authStorage.clearToken();
    setUser(null);
    setActiveCourseId(null);
  };
  const localDemoLogin = async () => {
    saveDemo(readDemo());
    authStorage.setToken(DEMO_TOKEN);
    setActiveCourseId(readDemo().courses[0]?.id || null);
    await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        demoLogin,
        localDemoLogin,
        logout,
        activeCourseId,
        setActiveCourseId,
        refreshUser: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// The shared hook intentionally lives beside its provider.
// oxlint-disable-next-line react/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
