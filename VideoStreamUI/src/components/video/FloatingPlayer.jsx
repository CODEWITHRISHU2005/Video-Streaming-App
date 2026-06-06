// src/components/video/FloatingPlayer.jsx

import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaPause, FaVolumeMute, FaVolumeUp, FaTimes, FaExpandArrowsAlt } from 'react-icons/fa';
import Hls from 'hls.js';
import { useVideo } from '../../context/VideoContext';

export default function FloatingPlayer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    currentVideo, 
    isPlaying, 
    setIsPlaying, 
    nextVideo, 
    userPreferences,
    playVideo
  } = useVideo();

  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const lastSaveRef = useRef(0);

  const [isHovered, setIsHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  const isWatchPage = location.pathname.startsWith('/watch');

  // Load / change video source
  useEffect(() => {
    if (isWatchPage || !currentVideo) return;

    const videoEl = videoRef.current;
    if (!videoEl) return;

    const src = currentVideo.hlsUrl || currentVideo.url;
    const isHls = /\.m3u8(\?.*)?$/i.test(src);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Set muted state to match player preference
    videoEl.muted = isMuted;

    // Load progress from localStorage
    const savedTime = localStorage.getItem(`video_progress_${currentVideo.id}`);
    if (savedTime) {
      const time = parseFloat(savedTime);
      if (!isNaN(time) && time > 0) {
        videoEl.currentTime = time;
      }
    } else {
      videoEl.currentTime = 0;
    }

    if (isHls && !videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      if (Hls.isSupported()) {
        const token = localStorage.getItem('authToken');
        const hls = new Hls({
          xhrSetup: (xhr) => {
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
          }
        });
        hls.loadSource(src);
        hls.attachMedia(videoEl);
        hlsRef.current = hls;
      }
    } else {
      videoEl.src = src;
    }

    // Auto-resume playback if was playing
    if (isPlaying) {
      videoEl.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentVideo, isWatchPage]);

  // Sync play/pause changes from global state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isWatchPage) return;

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, isWatchPage]);

  if (isWatchPage || !currentVideo) return null;

  const handlePlayToggle = (e) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleClose = (e) => {
    e.stopPropagation();
    setIsPlaying(false);
    // Clear playback from global context
    playVideo(null);
  };

  const handleExpand = () => {
    // Save current time before navigating
    if (videoRef.current) {
      localStorage.setItem(`video_progress_${currentVideo.id}`, videoRef.current.currentTime.toString());
    }
    navigate(`/watch/${currentVideo.id}`);
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    // Save playback position (throttled)
    const now = Date.now();
    if (now - lastSaveRef.current > 2000) {
      localStorage.setItem(`video_progress_${currentVideo.id}`, video.currentTime.toString());
      lastSaveRef.current = now;
    }

    // Set progress bar value
    const duration = video.duration || 0;
    if (duration > 0) {
      setProgress((video.currentTime / duration) * 100);
    }
  };

  const onVideoEnded = () => {
    localStorage.removeItem(`video_progress_${currentVideo.id}`);
    setIsPlaying(false);
    if (userPreferences?.autoplay && nextVideo) {
      nextVideo();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 50 }}
        transition={{ type: "spring", damping: 20, stiffness: 220 }}
        className="fixed bottom-6 right-6 z-50 w-72 sm:w-80 rounded-2xl overflow-hidden shadow-2xl bg-white/90 dark:bg-[#07080a]/90 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/80 flex flex-col group/player select-none cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleExpand}
      >
        {/* Header with Title and Close Button */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200/40 dark:border-neutral-850/40">
          <p className="text-xs font-bold truncate flex-1 pr-3 text-slate-800 dark:text-neutral-200">
            {currentVideo.title}
          </p>
          <button
            onClick={handleClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-all"
            title="Close Player"
          >
            <FaTimes size={12} />
          </button>
        </div>

        {/* Video Area */}
        <div className="relative aspect-video bg-black flex-shrink-0 w-full overflow-hidden">
          <video
            ref={videoRef}
            onTimeUpdate={onTimeUpdate}
            onEnded={onVideoEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="w-full h-full object-contain pointer-events-none"
            playsInline
            crossOrigin="anonymous"
          />

          {/* Hover Control Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 flex flex-col justify-between p-3"
          >
            {/* Top Right Expand Icon */}
            <div className="flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExpand();
                }}
                className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-indigo-600 transition-colors shadow"
                title="Expand to Full Screen"
              >
                <FaExpandArrowsAlt size={12} />
              </button>
            </div>

            {/* Play, Mute buttons in Center/Bottom */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handlePlayToggle}
                className="p-3 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} />}
              </button>
              <button
                onClick={handleMuteToggle}
                className="p-3 rounded-full bg-black/60 text-white hover:bg-black/80 active:scale-95 transition-all shadow-lg border border-white/10"
              >
                {isMuted ? <FaVolumeMute size={14} /> : <FaVolumeUp size={14} />}
              </button>
            </div>

            {/* Mini Progress Bar */}
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-100" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>

          {/* Bottom simple static progress bar (when not hovered) */}
          {!isHovered && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-800/50">
              <div 
                className="h-full bg-indigo-500 transition-all duration-100" 
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
