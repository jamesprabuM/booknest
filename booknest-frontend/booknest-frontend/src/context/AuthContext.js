import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    let active = true;

    const token = localStorage.getItem('access_token');
    const saved = localStorage.getItem('user');
    let savedUser = null;
    const boot = async () => {
      if (!token) {
        if (active) setLoading(false);
        return;
      }

      if (saved) {
        try {
          savedUser = JSON.parse(saved);
          if (active) setUser(savedUser);
        } catch {
          localStorage.removeItem('user');
        }
      }

      // Always fetch latest profile so role flags like is_admin stay in sync.
      try {
        const { data } = await authAPI.profile();
        const mergedUser = {
          ...(savedUser || {}),
          ...data,
        };
        localStorage.setItem('user', JSON.stringify(mergedUser));
        if (active) setUser(mergedUser);
      } catch {
        // Keep existing local session on transient failures.
        if (!savedUser) {
          localStorage.clear();
          if (active) setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    boot();

    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    try {
      const { data: profile } = await authAPI.profile();
      const mergedUser = { ...data.user, ...profile };
      localStorage.setItem('user', JSON.stringify(mergedUser));
      setUser(mergedUser);
    } catch {
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    }
    return data;
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      await authAPI.logout({ refresh });
    } catch {}
    localStorage.clear();
    setUser(null);
  };

  const updateUser = (updated) => {
    const merged = { ...user, ...updated };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
