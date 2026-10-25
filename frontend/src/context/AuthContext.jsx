import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getErrorMessage } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('buisease_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('buisease_token'));
  const [loading, setLoading] = useState(true);

  // Sync state if storage changes
  useEffect(() => {
    const handleAuthChange = () => {
      const storedToken = localStorage.getItem('buisease_token');
      const storedUser = localStorage.getItem('buisease_user');
      setToken(storedToken);
      setUser(storedUser ? JSON.parse(storedUser) : null);
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  // Validate session on initial mount
  useEffect(() => {
    const verifySession = async () => {
      if (token) {
        try {
          const res = await api.getMe();
          setUser({ username: res.data.username, email: res.data.email });
          localStorage.setItem('buisease_user', JSON.stringify({ username: res.data.username, email: res.data.email }));
        } catch (err) {
          logout();
        }
      }
      setLoading(false);
    };

    verifySession();
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await api.login({ username, password });
      const { access_token, username: resUser, email } = res.data;
      
      const userData = { username: resUser, email };
      setToken(access_token);
      setUser(userData);
      
      localStorage.setItem('buisease_token', access_token);
      localStorage.setItem('buisease_user', JSON.stringify(userData));
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  const register = async (username, email, password) => {
    try {
      const res = await api.register({ username, email, password });
      const { access_token, username: resUser, email: resEmail } = res.data;
      
      const userData = { username: resUser, email: resEmail };
      setToken(access_token);
      setUser(userData);
      
      localStorage.setItem('buisease_token', access_token);
      localStorage.setItem('buisease_user', JSON.stringify(userData));
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  const logout = async () => {
    try {
      await api.logout({ username: user?.username });
    } catch (e) {
      // Ignore network errors during logout
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('buisease_token');
    localStorage.removeItem('buisease_user');
  };

  const updateLocalUsername = (newUsername, newToken) => {
    const updatedUser = { ...user, username: newUsername };
    setUser(updatedUser);
    localStorage.setItem('buisease_user', JSON.stringify(updatedUser));
    if (newToken) {
      setToken(newToken);
      localStorage.setItem('buisease_token', newToken);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    register,
    logout,
    updateLocalUsername,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
