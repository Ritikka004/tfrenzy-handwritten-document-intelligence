import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiUrl } from '../services/api.ts';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'supervisor' | 'verifier' | 'auditor';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('tfrenzy_jwt_token'));
  const [user, setUser] = useState<User | null>(() => {
    const savedToken = localStorage.getItem('tfrenzy_jwt_token');
    const savedUser = localStorage.getItem('tfrenzy_user');
    if (savedToken && savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('tfrenzy_jwt_token', newToken);
    localStorage.setItem('tfrenzy_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('tfrenzy_jwt_token');
    localStorage.removeItem('tfrenzy_user');
  };

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
      const currentToken = localStorage.getItem('tfrenzy_jwt_token');
      const resolvedInput = typeof input === 'string' && input.startsWith('/api/') ? apiUrl(input) : input;
      const rawUrl = typeof resolvedInput === 'string' ? resolvedInput : resolvedInput instanceof URL ? resolvedInput.toString() : resolvedInput.url;
      const cleanPath = rawUrl.split('?')[0].replace(/\/+$/, '');
      const isPublicEndpoint =
        cleanPath === '/api/auth/login' ||
        cleanPath === '/api/auth/register' ||
        cleanPath === '/api/health' ||
        cleanPath.endsWith('/api/auth/login') ||
        cleanPath.endsWith('/api/auth/register') ||
        cleanPath.endsWith('/api/health') ||
        cleanPath.endsWith('/auth/login') ||
        cleanPath.endsWith('/auth/register') ||
        cleanPath.endsWith('/health');

      if (!currentToken || !cleanPath.includes('/api/') || isPublicEndpoint) {
        if (isPublicEndpoint && init.headers) {
          if (init.headers instanceof Headers) {
            init.headers.delete('Authorization');
            init.headers.delete('authorization');
          } else if (Array.isArray(init.headers)) {
            init = { ...init, headers: init.headers.filter(([k]) => k.toLowerCase() !== 'authorization') };
          } else if (typeof init.headers === 'object') {
            const copy = { ...init.headers } as Record<string, string>;
            delete copy.Authorization;
            delete copy.authorization;
            init = { ...init, headers: copy };
          }
        }
        return originalFetch(resolvedInput, init);
      }
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${currentToken}`);
      return originalFetch(resolvedInput, { ...init, headers });
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  useEffect(() => {
    if (!token || !user) return;
    window.fetch('/api/auth/me').then(response => {
      if (!response.ok) logout();
    }).catch(() => logout());
  // Only validate persisted sessions when their identity changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: Boolean(token && user) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
