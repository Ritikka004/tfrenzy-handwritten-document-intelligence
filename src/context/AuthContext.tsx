import React, { createContext, useContext, useState, useEffect } from 'react';

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
    const saved = localStorage.getItem('tfrenzy_user');
    return saved ? JSON.parse(saved) : {
      id: 'usr-001',
      email: 'sarah.connor@tfrenzy.ai',
      fullName: 'Sarah Connor',
      role: 'admin'
    };
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

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
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
