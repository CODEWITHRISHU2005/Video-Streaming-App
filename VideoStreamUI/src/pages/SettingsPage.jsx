import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FaCog, FaVolumeUp, FaPlay, FaDownload, FaEye, 
  FaTrash, FaRedo, FaMoon, FaSun, FaBell, FaShieldAlt 
} from 'react-icons/fa';
import { Card, Label, Button, Select } from 'flowbite-react';
import { useVideo } from '../context/VideoContext';
import { qualityOptions, playbackSpeedOptions } from '../utils/videoUtils';
import toast from 'react-hot-toast';

// Modern Toggle Switch Component
const ToggleSwitch = ({ id, checked, onChange, label, description, disabled = false, className = "" }) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex-1 pr-4">
        <Label htmlFor={id} className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer select-none">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
      </label>
    </div>
  );
};

function SettingsPage() {
  const { userPreferences, updateUserPreferences } = useVideo();
  const [settings, setSettings] = useState(userPreferences);
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark') || 
    localStorage.getItem('theme') === 'dark'
  );

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateUserPreferences(newSettings);
  };

  const handleDarkModeToggle = (checked) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const resetSettings = () => {
    const defaultSettings = {
      playbackSpeed: 1,
      quality: 'auto',
      autoplay: true,
      volume: 1
    };
    setSettings(defaultSettings);
    updateUserPreferences(defaultSettings);
    toast.success('Settings reset to defaults');
  };

  const clearWatchHistory = () => {
    if (window.confirm('Are you sure you want to clear your watch history?')) {
      localStorage.removeItem('recentlyPlayed');
      toast.success('Watch history cleared');
    }
  };

  const clearFavorites = () => {
    if (window.confirm('Are you sure you want to clear all favorites?')) {
      localStorage.removeItem('favorites');
      toast.success('Favorites cleared');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black font-sans text-neutral-900 dark:text-white relative overflow-hidden transition-colors duration-300">
      {/* Animated Background Blobs */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-[30rem] h-[30rem] rounded-full opacity-30 blur-3xl animate-pulse"
           style={{ background: 'radial-gradient(circle at 30% 30%, rgba(79,70,229,0.6), rgba(79,70,229,0) 60%)', animationDuration: '4s' }} />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[36rem] h-[36rem] rounded-full opacity-25 blur-3xl animate-pulse"
           style={{ background: 'radial-gradient(circle at 70% 70%, rgba(236,72,153,0.55), rgba(236,72,153,0) 60%)', animationDelay: '1s', animationDuration: '5s' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-600 blur-xl opacity-50 rounded-full animate-pulse"></div>
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <FaCog className="text-4xl text-white animate-spin-slow" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-600 to-gray-900 dark:from-white dark:via-blue-400 dark:to-white animate-gradient-x">
              Settings
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            Personalize your viewing experience to match your unique style.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Video Player Settings */}
          <motion.div variants={itemVariants}>
            <div className="h-full rounded-3xl bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
              <div className="p-1 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                    <FaPlay className="text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                      Video Player
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Configure your playback experience
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <ToggleSwitch
                    id="autoplay"
                    checked={settings.autoplay}
                    onChange={(e) => handleSettingChange('autoplay', e.target.checked)}
                    label="Autoplay videos"
                    description="Automatically play the next video"
                  />

                  <ToggleSwitch
                    id="enableCaptions"
                    checked={settings.enableCaptions}
                    onChange={(e) => handleSettingChange('enableCaptions', e.target.checked)}
                    label="Enable Captions"
                    description="Always show captions when available"
                  />

                  <div className="py-2">
                    <Label htmlFor="quality" className="text-sm font-semibold text-gray-900 dark:text-white mb-2 block">
                      Default Video Quality
                    </Label>
                    <Select
                      id="quality"
                      value={settings.quality}
                      onChange={(e) => handleSettingChange('quality', e.target.value)}
                      className="mt-2 w-full bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    >
                      {qualityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="py-2">
                    <Label htmlFor="playbackSpeed" className="text-sm font-semibold text-gray-900 dark:text-white mb-2 block">
                      Default Playback Speed
                    </Label>
                    <Select
                      id="playbackSpeed"
                      value={settings.playbackSpeed}
                      onChange={(e) => handleSettingChange('playbackSpeed', parseFloat(e.target.value))}
                      className="mt-2 w-full bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    >
                      {playbackSpeedOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="py-4">
                    <Label htmlFor="volume" className="text-sm font-semibold text-gray-900 dark:text-white mb-3 block flex justify-between">
                      <span>Default Volume</span>
                      <span className="text-blue-600 dark:text-blue-400 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded-full text-xs">
                        {Math.round(settings.volume * 100)}%
                      </span>
                    </Label>
                    <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                      <FaVolumeUp className="text-gray-400 text-lg" />
                      <input
                        type="range"
                        id="volume"
                        min={0}
                        max={1}
                        step={0.1}
                        value={settings.volume}
                        onChange={(e) => handleSettingChange('volume', parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500 hover:accent-blue-400 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Interface Settings */}
          <motion.div variants={itemVariants}>
            <div className="h-full rounded-3xl bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
              <div className="p-1 h-1 bg-gradient-to-r from-green-500 to-teal-400 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3.5 rounded-2xl bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 group-hover:bg-green-500 group-hover:text-white transition-colors duration-300">
                    <FaEye className="text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-green-500 dark:group-hover:text-green-400 transition-colors">
                      Interface
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Customize look and feel
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <ToggleSwitch
                    id="darkMode"
                    checked={isDarkMode}
                    onChange={(e) => handleDarkModeToggle(e.target.checked)}
                    label="Dark Mode"
                    description="Easier on the eyes in low light"
                  />

                  <ToggleSwitch
                    id="reducedMotion"
                    checked={settings.reducedMotion}
                    onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
                    label="Reduced Motion"
                    description="Minimize animations for accessibility"
                  />

                  <ToggleSwitch
                    id="compactMode"
                    checked={settings.compactMode}
                    onChange={(e) => handleSettingChange('compactMode', e.target.checked)}
                    label="Compact Mode"
                    description="Show more content with less spacing"
                  />

                  <ToggleSwitch
                    id="notifications"
                    checked={settings.notifications}
                    onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                    label="Enable Notifications"
                    description="Receive updates and alerts"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Download Settings */}
          <motion.div variants={itemVariants}>
            <div className="h-full rounded-3xl bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
              <div className="p-1 h-1 bg-gradient-to-r from-purple-500 to-pink-400 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3.5 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                    <FaDownload className="text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors">
                      Downloads
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Manage offline content
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <ToggleSwitch
                    id="allowDownloads"
                    checked={true}
                    onChange={() => {}}
                    label="Allow video downloads"
                    description="Save videos for offline viewing"
                    disabled={true}
                  />

                  <div className="py-2">
                    <Label htmlFor="downloadQuality" className="text-sm font-semibold text-gray-900 dark:text-white mb-2 block">
                      Download Quality
                    </Label>
                    <Select
                      id="downloadQuality"
                      value="original"
                      disabled
                      className="mt-2 w-full bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl opacity-70 cursor-not-allowed"
                    >
                      <option value="original">Original Quality</option>
                      <option value="720p">High (720p)</option>
                      <option value="480p">Standard (480p)</option>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Data Management */}
          <motion.div variants={itemVariants}>
            <div className="h-full rounded-3xl bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
              <div className="p-1 h-1 bg-gradient-to-r from-orange-500 to-red-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3.5 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                    <FaShieldAlt className="text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors">
                      Data & Privacy
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Control your data
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group/item">
                    <div className="flex-1">
                      <Label className="text-sm font-bold text-gray-900 dark:text-white group-hover/item:text-red-600 dark:group-hover/item:text-red-400 cursor-pointer">
                        Clear Watch History
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Remove all recently played videos
                      </p>
                    </div>
                    <Button 
                      size="xs" 
                      color="failure" 
                      onClick={clearWatchHistory}
                      className="ml-4 transition-transform active:scale-95"
                    >
                      <FaTrash className="mr-2" /> Clear
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group/item">
                    <div className="flex-1">
                      <Label className="text-sm font-bold text-gray-900 dark:text-white group-hover/item:text-red-600 dark:group-hover/item:text-red-400 cursor-pointer">
                        Clear Favorites
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Remove all favorite videos
                      </p>
                    </div>
                    <Button 
                      size="xs" 
                      color="failure" 
                      onClick={clearFavorites}
                      className="ml-4 transition-transform active:scale-95"
                    >
                      <FaTrash className="mr-2" /> Clear
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group/item">
                    <div className="flex-1">
                      <Label className="text-sm font-bold text-gray-900 dark:text-white group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 cursor-pointer">
                        Reset All Settings
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Restore default configuration
                      </p>
                    </div>
                    <Button 
                      size="xs" 
                      color="light" 
                      onClick={resetSettings}
                      className="ml-4 transition-transform active:scale-95 border-gray-300 dark:border-gray-600"
                    >
                      <FaRedo className="mr-2" /> Reset
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default SettingsPage;
