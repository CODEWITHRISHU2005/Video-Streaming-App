import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:8080/api/v1';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      toast.error('Session expired. Please login again.');
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
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Register
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
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

export default api; 