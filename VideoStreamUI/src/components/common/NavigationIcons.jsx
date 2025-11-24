import React from 'react';

// Icon component wrapper for consistent styling
const IconWrapper = ({ children, size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

// Home - Simple house outline with peaked roof
export const HomeIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </IconWrapper>
);

// Search - Magnifying glass icon
export const SearchIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </IconWrapper>
);

// Videos/Library - Stacked layers or film reel
export const VideosIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <rect x="3" y="5" width="18" height="11" rx="1" />
    <rect x="3" y="8" width="18" height="11" rx="1" />
  </IconWrapper>
);

// Play/Watch Later - Play button within circle
export const PlayIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <circle cx="12" cy="12" r="9" />
    <polygon points="10 8 10 16 16 12" />
  </IconWrapper>
);

// Favorites - Heart outline
export const FavoritesIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </IconWrapper>
);

// Profile/Account - User avatar circle outline
export const ProfileIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </IconWrapper>
);

// Device/Mobile - Smartphone/device icon
export const DeviceIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </IconWrapper>
);

// History - Clock with counterclockwise arrow
export const HistoryIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 6 12 12 16 14" />
    <path d="M6 3l-3 3 3 3" />
  </IconWrapper>
);

// Upload - Upward arrow or cloud with upload symbol
export const UploadIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </IconWrapper>
);

// Notifications - Bell icon
export const NotificationsIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </IconWrapper>
);

// Settings - Gear/cog icon
export const SettingsIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v4m0 14v4m9-9h-4m-10 0H3m15.364-5.364l-2.828-2.828m-4.242 0L5.636 6.636m12.728 10.728l-2.828-2.828m-4.242 0L5.636 17.364" />
  </IconWrapper>
);

// Login - Door with arrow or user with plus sign
export const LoginIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </IconWrapper>
);

// Export all icons as a map for easy access
export const iconMap = {
  Home: HomeIcon,
  Search: SearchIcon,
  Videos: VideosIcon,
  'Watch Later': PlayIcon,
  Favorites: FavoritesIcon,
  Profile: ProfileIcon,
  Device: DeviceIcon,
  History: HistoryIcon,
  Upload: UploadIcon,
  Notifications: NotificationsIcon,
  Settings: SettingsIcon,
  Login: LoginIcon,
};

