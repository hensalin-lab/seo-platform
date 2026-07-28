import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const AuthContext = createContext();

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      api.setToken(token);
    } else {
      localStorage.removeItem('token');
      api.setToken(null);
    }
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  useEffect(() => {
    if (token) api.setToken(token);
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await api.login(email, password);
      setToken(data.access_token);
      setUser(data.user);
      return data;
    } finally { setLoading(false); }
  }, []);

  const register = useCallback(async (email, username, password) => {
    setLoading(true);
    try {
      const data = await api.register(email, username, password);
      setToken(data.access_token);
      setUser(data.user);
      return data;
    } finally { setLoading(false); }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const value = { user, token, loading, isAuthenticated: !!token, login, register, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
