import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { userAPI, ottAPI } from '../utils/api';
import { getEmailFromToken } from '../utils/authUtils';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const location = useLocation();

  useEffect(() => {
    const initAuth = async () => {
      // Check for tokens in URL (OAuth redirect)
      const params = new URLSearchParams(window.location.search);
      let token = params.get('accessToken');
      let refreshToken = params.get('refreshToken');
      let ottToken = params.get('token');
      
      let isFromUrl = false;
      let tokenToUse = null;

      // 1. Handle Access Token from URL
      if (token) {
        tokenToUse = token;
        isFromUrl = true;
        localStorage.setItem('authToken', token);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        // Clear URL parameters to prevent leakage (using history API to avoid reload)
        window.history.replaceState({}, document.title, window.location.pathname);
      } 
      // 2. Handle OTT Token from URL
      else if (ottToken) {
        try {
           const response = await ottAPI.login(ottToken);
           const newToken = response?.token || response?.data?.token || response?.accessToken;
           const newRefreshToken = response?.refreshToken || response?.data?.refreshToken;
           if (newToken) {
             tokenToUse = newToken;
             isFromUrl = true;
             localStorage.setItem('authToken', newToken);
             if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
             window.history.replaceState({}, document.title, window.location.pathname);
           }
        } catch (e) {
           console.error("Failed to login with OTT token from URL", e);
        }
      } 
      // 3. Handle LocalStorage Token
      else {
        tokenToUse = localStorage.getItem('authToken');
      }

      // Verify Token and Fetch Profile
      if (tokenToUse) {
        const email = getEmailFromToken(tokenToUse);
        userAPI.getProfile({ email })
          .then((data) => {
            setUser(data);
            setIsAuthenticated(true);
            if (isFromUrl) {
                toast.success("Successfully signed in!");
            }
          })
          .catch(() => {
            // Token is invalid, remove it
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
            setIsAuthenticated(false);
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await userAPI.login(credentials);
      
      // Check if Multi-Factor Authentication is required
      if (response?.mfaRequired) {
        return {
          success: true,
          mfaRequired: true,
          message: response?.message || 'OTP verified successfully. Please proceed to request a sign-in link.'
        };
      }

      // Handle different response structures
      const token = response?.token || response?.data?.token || response?.accessToken;
      const refreshToken = response?.refreshToken || response?.data?.refreshToken;
      const userData = response?.user || response?.data?.user || { email: credentials.email };
      
      if (token) {
        localStorage.setItem('authToken', token);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
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

  const loginWithOtt = async (ottToken) => {
    try {
      const response = await ottAPI.login(ottToken);
      // Handle different response structures
      const token = response?.token || response?.data?.token || response?.accessToken;
      const refreshToken = response?.refreshToken || response?.data?.refreshToken;
      // Note: User info might not be directly in the response if it's just a JwtResponse, 
      // but let's try to extract or fetch profile later. 
      // The current JwtResponse builder in AuthController includes access/refresh tokens.
      // We might need to fetch profile separately if not provided.
      
      if (token) {
        localStorage.setItem('authToken', token);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        setIsAuthenticated(true);
        
        // Fetch user profile to populate state
        try {
           const email = getEmailFromToken(token);
           const profile = await userAPI.getProfile({ email });
           setUser(profile);
        } catch(e) {
           console.error("Failed to fetch profile after OTT login", e);
           // Fallback or non-blocking error
        }

        toast.success('Successfully signed in with Magic Link!');
        return { success: true };
      } else {
        toast.error('Invalid response from server');
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to sign in with token.';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const loginWithTokens = async (accessToken, refreshToken) => {
    try {
      if (accessToken) {
        localStorage.setItem('authToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        setIsAuthenticated(true);
        
        // Fetch user profile to populate state
        try {
           const email = getEmailFromToken(accessToken);
           const profile = await userAPI.getProfile({ email });
           setUser(profile);
        } catch(e) {
           console.error("Failed to fetch profile after token login", e);
        }

        toast.success('Successfully signed in!');
        return { success: true };
      }
      return { success: false, error: 'No token provided' };
    } catch (error) {
       return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await userAPI.register(userData);
      // Handle different response structures
      const token = response?.token || response?.data?.token || response?.accessToken;
      const refreshToken = response?.refreshToken || response?.data?.refreshToken;
      const newUser = response?.user || response?.data?.user || { email: userData.email, name: userData.name };
      
      if (token) {
        localStorage.setItem('authToken', token);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
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
    localStorage.removeItem('refreshToken');
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Signed out successfully');
  };

  const refreshUserProfile = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const email = getEmailFromToken(token);
        if (email) {
            const data = await userAPI.getProfile({ email });
            setUser(data);
            return data;
        }
      } catch (error) {
        console.error("Failed to refresh user profile", error);
      }
    }
    return null;
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    loginWithOtt,
    loginWithTokens,
    register,
    logout,
    refreshUserProfile
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

