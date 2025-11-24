import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    if (token) {
      // Verify token and get user profile
      userAPI.getProfile()
        .then((data) => {
          setUser(data);
          setIsAuthenticated(true);
        })
        .catch(() => {
          // Token is invalid, remove it
          localStorage.removeItem('authToken');
          setUser(null);
          setIsAuthenticated(false);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    try {
      const response = await userAPI.login(credentials);
      // Handle different response structures
      const token = response?.token || response?.data?.token || response?.accessToken;
      const userData = response?.user || response?.data?.user || { email: credentials.email };
      
      if (token) {
        localStorage.setItem('authToken', token);
        setUser(userData);
        setIsAuthenticated(true);
        toast.success('Successfully signed in!');
        return { success: true };
      } else {
        toast.error('Invalid response from server');
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to sign in. Please check your credentials.';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await userAPI.register(userData);
      // Handle different response structures
      const token = response?.token || response?.data?.token || response?.accessToken;
      const newUser = response?.user || response?.data?.user || { email: userData.email, name: userData.name };
      
      if (token) {
        localStorage.setItem('authToken', token);
        setUser(newUser);
        setIsAuthenticated(true);
        toast.success('Account created successfully!');
        return { success: true };
      } else {
        toast.error('Invalid response from server');
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to create account. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Signed out successfully');
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
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

