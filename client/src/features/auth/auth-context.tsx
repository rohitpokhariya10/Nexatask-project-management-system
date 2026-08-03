import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  clearAccessToken,
  getAccessToken,
  request,
  requestResource,
  saveAccessToken,
} from '../../lib/api';
import type { User } from '../../types/api';

interface Credentials {
  email: string;
  password: string;
}

interface Registration extends Credentials {
  name: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (credentials: Credentials) => Promise<User>;
  register: (values: Registration) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(Boolean(getAccessToken()));
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setIsInitializing(false);
      return;
    }
    try {
      const currentUser = await requestResource<User>({ url: '/auth/me' }, 'user');
      setUser(currentUser);
    } catch {
      logout();
    } finally {
      setIsInitializing(false);
    }
  }, [logout]);

  useEffect(() => {
    void refreshUser();
    window.addEventListener('nexatask:unauthorized', logout);
    return () => window.removeEventListener('nexatask:unauthorized', logout);
  }, [logout, refreshUser]);

  const establishSession = useCallback(async (url: string, values: Credentials | Registration) => {
    const result = await request<AuthResponse>({ method: 'POST', url, data: values });
    saveAccessToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login: (credentials) => establishSession('/auth/login', credentials),
      register: (values) => establishSession('/auth/register', values),
      logout,
      refreshUser,
    }),
    [establishSession, isInitializing, logout, refreshUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
