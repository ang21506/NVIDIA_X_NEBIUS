import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, authStorage, User } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  activeCourseId: string | null;
  setActiveCourseId: (id: string | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    fetchProfile();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.auth.login({ email, password: pass });
    authStorage.setToken(res.access_token);
    await fetchProfile();
  };

  const register = async (email: string, pass: string, name: string) => {
    const res = await api.auth.register({ email, password: pass, full_name: name });
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        demoLogin,
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

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
