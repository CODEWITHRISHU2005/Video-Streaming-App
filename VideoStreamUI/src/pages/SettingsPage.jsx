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
const ToggleSwitch = ({ id, checked, onChange, label, description, disabled = false }) => {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <div className="flex-1">
        <Label htmlFor={id} className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg">
            <FaCog className="text-3xl text-white animate-spin-slow" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Settings
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Customize your video streaming experience with advanced controls and preferences.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Video Player Settings */}
          <motion.div variants={itemVariants}>
            <Card className="h-full shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                  <FaPlay className="text-xl text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Video Player
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Playback preferences
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <ToggleSwitch
                  id="autoplay"
                  checked={settings.autoplay}
                  onChange={(e) => handleSettingChange('autoplay', e.target.checked)}
                  label="Autoplay videos"
                  description="Automatically start playing videos when selected"
                />

                <div className="py-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <Label htmlFor="quality" className="text-sm font-semibold text-gray-900 dark:text-white mb-2 block">
                    Default Video Quality
                  </Label>
                  <Select
                    id="quality"
                    value={settings.quality}
                    onChange={(e) => handleSettingChange('quality', e.target.value)}
                    className="mt-1"
                  >
                    {qualityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="py-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <Label htmlFor="playbackSpeed" className="text-sm font-semibold text-gray-900 dark:text-white mb-2 block">
                    Default Playback Speed
                  </Label>
                  <Select
                    id="playbackSpeed"
                    value={settings.playbackSpeed}
                    onChange={(e) => handleSettingChange('playbackSpeed', parseFloat(e.target.value))}
                    className="mt-1"
                  >
                    {playbackSpeedOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="py-4">
                  <Label htmlFor="volume" className="text-sm font-semibold text-gray-900 dark:text-white mb-3 block">
                    Default Volume
                  </Label>
                  <div className="flex items-center gap-3">
                    <FaVolumeUp className="text-gray-400 text-sm" />
                    <input
                      type="range"
                      id="volume"
                      min={0}
                      max={1}
                      step={0.1}
                      value={settings.volume}
                      onChange={(e) => handleSettingChange('volume', parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                    />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-12 text-right">
                      {Math.round(settings.volume * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Interface Settings */}
          <motion.div variants={itemVariants}>
            <Card className="h-full shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 shadow-md">
                  <FaEye className="text-xl text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Interface
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Appearance & display
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <ToggleSwitch
                  id="darkMode"
                  checked={isDarkMode}
                  onChange={(e) => handleDarkModeToggle(e.target.checked)}
                  label="Dark Mode"
                  description="Use dark theme for better viewing experience"
                />

                <ToggleSwitch
                  id="showDuration"
                  checked={true}
                  onChange={() => {}}
                  label="Show video duration"
                  description="Display video length on thumbnails"
                  disabled={true}
                />

                <ToggleSwitch
                  id="showViews"
                  checked={true}
                  onChange={() => {}}
                  label="Show view count"
                  description="Display number of views on videos"
                  disabled={true}
                />
              </div>
            </Card>
          </motion.div>

          {/* Download Settings */}
          <motion.div variants={itemVariants}>
            <Card className="h-full shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-md">
                  <FaDownload className="text-xl text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Downloads
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Download preferences
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <ToggleSwitch
                  id="allowDownloads"
                  checked={true}
                  onChange={() => {}}
                  label="Allow video downloads"
                  description="Enable download functionality for videos"
                  disabled={true}
                />

                <div className="py-4">
                  <Label htmlFor="downloadQuality" className="text-sm font-semibold text-gray-900 dark:text-white mb-2 block">
                    Download Quality
                  </Label>
                  <Select
                    id="downloadQuality"
                    value="original"
                    disabled
                    className="mt-1"
                  >
                    <option value="original">Original Quality</option>
                    <option value="720p">720p</option>
                    <option value="480p">480p</option>
                  </Select>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Data Management */}
          <motion.div variants={itemVariants}>
            <Card className="h-full shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-md">
                  <FaTrash className="text-xl text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Data Management
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Clear data & reset settings
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex-1">
                    <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                      Clear Watch History
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Remove all recently played videos
                    </p>
                  </div>
                  <Button size="sm" color="red" onClick={clearWatchHistory} className="ml-4">
                    <FaTrash className="mr-2" />
                    Clear
                  </Button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex-1">
                    <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                      Clear Favorites
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Remove all favorite videos
                    </p>
                  </div>
                  <Button size="sm" color="red" onClick={clearFavorites} className="ml-4">
                    <FaTrash className="mr-2" />
                    Clear
                  </Button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex-1">
                    <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                      Reset All Settings
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Restore default settings
                    </p>
                  </div>
                  <Button size="sm" color="gray" onClick={resetSettings} className="ml-4">
                    <FaRedo className="mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default SettingsPage;
