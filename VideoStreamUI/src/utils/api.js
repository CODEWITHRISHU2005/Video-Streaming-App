import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loops if the refresh token endpoint itself fails
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/refreshToken')) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          // call the refresh token endpoint directly using axios to avoid interceptors
          // RefreshTokenRequest DTO expects: { token: "..." }
          const response = await axios.post(`${API_BASE_URL}/auth/refreshToken`, {
            token: refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          localStorage.setItem('authToken', accessToken);
          // If the backend returns a new refresh token, store it
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }

          // Update the header and retry the original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        toast.error('Session expired. Please login again.');
        window.location.href = '/login'; // Or use a cleaner way to redirect if available
      }
    }
    
    // If it's a 401 but we can't refresh (e.g. no token or already retried), just clean up
    if (error.response?.status === 401 && !originalRequest._retry) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
    }

    return Promise.reject(error);
  }
);

// Video API functions
export const videoAPI = {
  // Upload video
  upload: async (formData, onProgress) => {
    try {
      const response = await api.post('/videos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(progress);
          }
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get all videos
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/videos', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get video by ID
  getById: async (videoId) => {
    try {
      const response = await api.get(`/videos/${videoId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Search videos
  search: async (query, params = {}) => {
    try {
      const response = await api.get('/videos/search', {
        params: { q: query, ...params },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete video
  delete: async (videoId) => {
    try {
      const response = await api.delete(`/videos/${videoId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update video metadata
  update: async (videoId, data) => {
    try {
      const response = await api.put(`/videos/${videoId}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// User API functions
export const userAPI = {
  // Login
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/signIn', credentials);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Register
  register: async (userData) => {
    try {
      const response = await api.post('/auth/signUp', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get user profile
  getProfile: async (data) => {
    try {
      const response = await api.get('/auth/profile', { params: data });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update profile
  updateProfile: async (data) => {
    try {
      const response = await api.put('/auth/profile', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Refresh Token
  refreshToken: async (tokenRequest) => {
    try {
      const response = await api.post('/auth/refreshToken', tokenRequest);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Playlist API functions
export const playlistAPI = {
  // Create playlist
  create: async (playlistData) => {
    try {
      const response = await api.post('/playlists', playlistData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get user playlists
  getUserPlaylists: async () => {
    try {
      const response = await api.get('/playlists');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add video to playlist
  addVideo: async (playlistId, videoId) => {
    try {
      const response = await api.post(`/playlists/${playlistId}/videos`, {
        videoId,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Remove video from playlist
  removeVideo: async (playlistId, videoId) => {
    try {
      const response = await api.delete(`/playlists/${playlistId}/videos/${videoId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Comments API functions
export const commentAPI = {
  // Get comments for video
  getComments: async (videoId) => {
    try {
      const response = await api.get(`/videos/${videoId}/comments`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add comment
  addComment: async (videoId, comment) => {
    try {
      const response = await api.post(`/videos/${videoId}/comments`, comment);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete comment
  deleteComment: async (videoId, commentId) => {
    try {
      const response = await api.delete(`/videos/${videoId}/comments/${commentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// OTP API functions
export const otpAPI = {
  // Send OTP
  send: async (data) => {
    try {
      // Expects OtpRequest { phone, email, ... }
      const response = await api.post('/otp/send', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Verify OTP (Standalone verification)
  verify: async (data) => {
    try {
      const response = await api.post('/otp/verify', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Resend OTP
  resend: async (data) => {
    try {
      const response = await api.post('/otp/resend', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// OTT (One Time Token) API functions
export const ottAPI = {
  // Send Magic Link
  sendLink: async (email) => {
    try {
      // Expects query param: email
      const response = await api.post('/ott/sent', null, {
        params: { email }
      });
      return response.data; // Expects String response
    } catch (error) {
      throw error;
    }
  },

  // Login with OTT Token
  login: async (token) => {
    try {
      // Expects query param: token, returns JwtResponse
      const response = await api.post('/ott/login', null, {
        params: { token }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default api; 