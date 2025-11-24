import { formatDistanceToNow } from 'date-fns';

// Format video duration from seconds to MM:SS or HH:MM:SS
export const formatDuration = (duration) => {
  if (!duration && duration !== 0) return '0:00';
  
  let seconds = 0;
  
  // Handle different input formats
  if (typeof duration === 'string') {
    // Check if it's already in HH:MM:SS or MM:SS format
    if (duration.includes(':')) {
      const parts = duration.split(':').map(Number);
      if (parts.length === 3) {
        // HH:MM:SS format
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        // MM:SS format
        seconds = parts[0] * 60 + parts[1];
      } else {
        return duration; // Return as-is if format is unknown
      }
    } else {
      // Try to parse as number string
      seconds = parseFloat(duration);
    }
  } else if (typeof duration === 'number') {
    // If duration is in milliseconds (greater than a reasonable max seconds), convert
    if (duration > 86400) { // More than 24 hours in seconds, likely milliseconds
      seconds = duration / 1000;
    } else {
      seconds = duration;
    }
  } else {
    return '0:00';
  }
  
  // Validate the converted seconds
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Format file size
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

// Format upload date
export const formatUploadDate = (date) => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

// Validate video file
export const validateVideoFile = (file) => {
  const allowedTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv'
  ];
  
  const maxSize = 500 * 1024 * 1024; // 500MB
  
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Please select a video file.' };
  }
  
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size too large. Maximum size is 500MB.' };
  }
  
  return { isValid: true, error: null };
};

// Validate image file
export const validateImageFile = (file) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp'
  ];
  
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!file) {
    return { isValid: false, error: 'No image selected' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid image type. Please select a valid image file (PNG, JPG, GIF, WebP, SVG, BMP).' };
  }
  
  if (file.size > maxSize) {
    return { isValid: false, error: 'Image size too large. Maximum size is 5MB.' };
  }
  
  return { isValid: true, error: null };
};

// Generate video thumbnail URL
export const getVideoThumbnail = (videoId) => {
  if (videoId) {
    return `http://localhost:8080/api/v1/videos/thumbnail/${videoId}`;
  }
};

// Get video stream URL - use range-based streaming for better support
export const getVideoStreamUrl = (videoId) => {
  return `http://localhost:8080/api/v1/videos/stream/range/${videoId}`;
};

// Get direct video stream URL (fallback)
export const getDirectVideoUrl = (videoId) => {
  return `http://localhost:8080/api/v1/videos/${videoId}`;
};

// Get HLS stream URL (if HLS is available)
export const getHlsStreamUrl = (videoId) => {
  return `http://localhost:8080/api/v1/videos/${videoId}/master.m3u8`;
};

// Get video download URL
export const getVideoDownloadUrl = (videoId) => {
  return `http://localhost:8080/api/v1/videos/stream/${videoId}`;
};

// Quality options for video player
export const qualityOptions = [
  { label: 'Auto', value: 'auto' },
  { label: '1080p', value: '1080' },
  { label: '720p', value: '720' },
  { label: '480p', value: '480' },
  { label: '360p', value: '360' }
];

// Playback speed options
export const playbackSpeedOptions = [
  { label: '0.5x', value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: '1x', value: 1 },
  { label: '1.25x', value: 1.25 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2 }
]; 