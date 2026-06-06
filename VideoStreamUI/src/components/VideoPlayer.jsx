// Import warning suppression first, before any VideoJS plugins
import '../utils/suppressVideoJSWarnings';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import videojs from 'video.js';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'framer-motion';
import { FaVolumeUp, FaVolumeMute, FaBackward, FaForward } from 'react-icons/fa';

import 'video.js/dist/video-js.css';

// Import qualityLevels plugin - it auto-registers on import
// Warning suppression is handled by suppressVideoJSWarnings.js
import 'videojs-contrib-quality-levels';

// Register hlsQualitySelector plugin dynamically to avoid load-time errors
// (Handled in useEffect below)

// Static HLS config to avoid changing reference
const HLS_CONFIG = {
  autoStartLoad: true,
  maxBufferLength: 30,
  maxMaxBufferLength: 120,
  maxBufferHole: 0.5,
  maxBufferStallLength: 5.0,
  maxFragLookUpTolerance: 0.25,
  startPosition: -1,
  liveSyncDurationCount: 3,
  fragLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 5000,
      maxLoadTimeMs: 30000,
      timeoutMs: 35000,
      retry: {
        maxNumRetry: 3,
        retryDelayMs: 1000,
        maxRetryDelayMs: 8000,
      },
      backoff: 'exponential',
    },
  },
};

export default function VideoPlayer({
  videoData,
  userPreferences = { autoplay: false },
  isPlaying,
  onEnded,
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const hlsRef = useRef(null);
  const qualitySelectorInitialized = useRef(false);
  const onEndedRef = useRef(onEnded);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);
  const stallRetriesRef = useRef(0);

  const [isBuffering, setIsBuffering] = useState(false);
  const [showPlayPauseOverlay, setShowPlayPauseOverlay] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const [seekIndicator, setSeekIndicator] = useState({ visible: false, direction: 'forward' });
  const [volumeIndicator, setVolumeIndicator] = useState({ visible: false, volume: 1, muted: false });
  const seekTimeoutRef = useRef(null);
  const volumeTimeoutRef = useRef(null);

  const triggerSeekIndicator = React.useCallback((direction) => {
    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    setSeekIndicator({ visible: true, direction });
    seekTimeoutRef.current = setTimeout(() => {
      setSeekIndicator({ visible: false, direction });
    }, 650);
  }, []);

  const triggerVolumeIndicator = React.useCallback((volume, muted) => {
    if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
    setVolumeIndicator({ visible: true, volume, muted });
    volumeTimeoutRef.current = setTimeout(() => {
      setVolumeIndicator(p => ({ ...p, visible: false }));
    }, 1000);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input fields
      const activeEl = document.activeElement;
      if (
        activeEl && 
        (activeEl.tagName === 'INPUT' || 
         activeEl.tagName === 'TEXTAREA' || 
         activeEl.isContentEditable)
      ) {
        return;
      }

      const player = playerRef.current;
      if (!player) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (player.paused()) {
            player.play().catch(() => {});
          } else {
            player.pause();
          }
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          const newTimeLeft = Math.max(0, player.currentTime() - 10);
          player.currentTime(newTimeLeft);
          triggerSeekIndicator('backward');
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          const newTimeRight = Math.min(player.duration() || 0, player.currentTime() + 10);
          player.currentTime(newTimeRight);
          triggerSeekIndicator('forward');
          break;
        case 'ArrowUp':
          e.preventDefault();
          const newVolUp = Math.min(1, player.volume() + 0.05);
          player.volume(newVolUp);
          player.muted(false);
          triggerVolumeIndicator(newVolUp, false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          const newVolDown = Math.max(0, player.volume() - 0.05);
          player.volume(newVolDown);
          if (newVolDown === 0) {
            player.muted(true);
            triggerVolumeIndicator(0, true);
          } else {
            triggerVolumeIndicator(newVolDown, false);
          }
          break;
        case 'm':
          e.preventDefault();
          const newMuted = !player.muted();
          player.muted(newMuted);
          triggerVolumeIndicator(player.volume(), newMuted);
          break;
        case 'f':
          e.preventDefault();
          if (player.isFullscreen()) {
            player.exitFullscreen();
          } else {
            player.requestFullscreen();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
      if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
    };
  }, [triggerSeekIndicator, triggerVolumeIndicator]);

  // Dynamically load HlsQualitySelector
  useEffect(() => {
    const loadPlugin = async () => {
      if (!videojs.getPlugin('hlsQualitySelector')) {
        try {
          // Ensure videojs is available globally for plugins that might need it
          if (!window.videojs) window.videojs = videojs;
          
          const module = await import('videojs-hls-quality-selector/dist/videojs-hls-quality-selector.js');
          const HlsQualitySelector = module.default || module;
          
          if (!videojs.getPlugin('hlsQualitySelector')) {
            videojs.registerPlugin('hlsQualitySelector', HlsQualitySelector);
          }
        } catch (error) {
          console.error('Failed to load HlsQualitySelector plugin:', error);
        }
      }
    };
    
    loadPlugin();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || videoRef.current) return;

    const videoEl = document.createElement('video');
    videoEl.className = 'video-js vjs-default-skin';
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('crossorigin', 'anonymous');
    videoEl.setAttribute('tabIndex', '0');
    videoEl.setAttribute('aria-label', videoData?.title || 'Video player');

    container.appendChild(videoEl);
    videoRef.current = videoEl;

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      qualitySelectorInitialized.current = false;
      stallRetriesRef.current = 0;

      videoRef.current?.remove();
      videoRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.setAttribute('aria-label', videoData?.title || 'Video player');
  }, [videoData?.title]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || playerRef.current) return;

    const shouldAutoplay = Boolean(userPreferences?.autoplay);

    const player = videojs(videoEl, {
      controls: true,
      autoplay: shouldAutoplay,
      muted: false,
      preload: 'auto',
      fluid: true,
      aspectRatio: '16:9',
      playbackRates: [0.5, 1, 1.5, 2],
      techOrder: ['html5'],
    });

    player.on('error', () => {
      const err = player.error();
      console.error('Video.js error', err?.code, err?.message);
    });

    player.on('play', () => {
      setShowPlayPauseOverlay(true);
      setTimeout(() => setShowPlayPauseOverlay(false), 500);
    });

    player.on('pause', () => {
      setShowPlayPauseOverlay(true);
      setTimeout(() => setShowPlayPauseOverlay(false), 500);
    });

    player.on('fullscreenchange', () => {
      setIsFullScreen(player.isFullscreen());
    });

    player.on('ratechange', () => {
      setPlaybackSpeed(player.playbackRate());
    });

    player.on('ended', () => {
      onEndedRef.current?.();
    });

    playerRef.current = player;

    return () => {
      playerRef.current?.dispose();
      playerRef.current = null;

      hlsRef.current?.destroy();
      hlsRef.current = null;
      qualitySelectorInitialized.current = false;
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const shouldAutoplay = Boolean(userPreferences?.autoplay);
    player.autoplay(shouldAutoplay);
    player.muted(false);
  }, [userPreferences?.autoplay]);

  useEffect(() => {
    const player = playerRef.current;
    const videoEl = videoRef.current;
    if (!player || !videoEl) return undefined;

    if (!videoData?.url) {
      setIsBuffering(false);
      player.pause();
      player.poster('');
      hlsRef.current?.destroy();
      hlsRef.current = null;
      qualitySelectorInitialized.current = false;
      return undefined;
    }

    const src = videoData.hlsUrl || videoData.url;
    const isHls = /\.m3u8(\?.*)?$/i.test(src);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    stallRetriesRef.current = 0;
    setIsBuffering(false);
    qualitySelectorInitialized.current = false;

    player.poster(videoData.thumbnailUrl || '');

    let cleanup;

    if (isHls) {
      if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        player.src({ src, type: 'application/vnd.apple.mpegurl' });
      } else if (Hls.isSupported()) {
        // Check for auth token
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          console.warn('VideoPlayer: No auth token found in localStorage. HLS playback might fail for protected content.');
        } else {
          // console.debug('VideoPlayer: Auth token found, configuring HLS...');
        }

        // Merge auth token into HLS config
        const hlsConfigWithAuth = {
          ...HLS_CONFIG,
          xhrSetup: (xhr, url) => {
             if (token) {
               xhr.setRequestHeader('Authorization', `Bearer ${token}`);
             }
          }
        };

        const hls = new Hls(hlsConfigWithAuth);
        hlsRef.current = hls;

        const onManifestParsed = () => {
          if (!qualitySelectorInitialized.current) {
            try {
              player.qualityLevels();
              player.hlsQualitySelector({ displayCurrentQuality: true });
              qualitySelectorInitialized.current = true;
            } catch (e) {
              console.error('Quality selector init failed:', e);
            }
          }
        };

        const onFragBuffered = () => {
          setIsBuffering(false);
          stallRetriesRef.current = 0;
        };

        const onError = (evt, data) => {
          console.error(
            `[HLS.js error] event=${evt}, type=${data.type}, details=${data.details}, fatal=${data.fatal}`
          );

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          } else {
            switch (data.details) {
              case Hls.ErrorDetails.BUFFER_STALLED_ERROR:
                setIsBuffering(true);
                hls.recoverMediaError();
                break;
              case Hls.ErrorDetails.BUFFER_SEEK_OVER_HOLE: {
                const currentTime = videoEl.currentTime;
                if (stallRetriesRef.current < 2) {
                  hls.recoverMediaError();
                  videoEl.currentTime = currentTime + 0.1;
                  stallRetriesRef.current++;
                } else {
                  hls.swapAudioCodec();
                  hls.recoverMediaError();
                  stallRetriesRef.current = 0;
                }
                break;
              }
              case Hls.ErrorDetails.FRAG_LOAD_ERROR:
              case Hls.ErrorDetails.FRAG_LOAD_TIMEOUT:
                hls.startLoad();
                break;
              default:
                break;
            }
          }
        };

        hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
        hls.on(Hls.Events.FRAG_BUFFERED, onFragBuffered);
        hls.on(Hls.Events.ERROR, onError);

        hls.loadSource(src);
        hls.attachMedia(videoEl);

        cleanup = () => {
          hls.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
          hls.off(Hls.Events.FRAG_BUFFERED, onFragBuffered);
          hls.off(Hls.Events.ERROR, onError);
          hls.destroy();
          if (hlsRef.current === hls) {
            hlsRef.current = null;
          }
        };
      } else {
        console.error('HLS not supported');
        player.src({ src, type: videoData.contentType || 'video/mp4' });
      }
    } else {
      player.src({
        src,
        type: videoData.contentType || 'video/mp4',
      });
    }

    return cleanup;
  }, [videoData]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || player.isDisposed()) return;

    if (isPlaying) {
      player.play().catch((e) => {
        if (e.name !== 'AbortError') {
          console.error('Playback failed:', e);
        }
      });
    } else {
      player.pause();
    }
  }, [isPlaying]);

  return (
    <div className="video-container">
      <div className="video-wrapper">
        <div ref={containerRef} className="video-host" />
        <div className="video-overlay-layer">
          <AnimatePresence>
            {/* Seek Indicators */}
            {seekIndicator.visible && seekIndicator.direction === 'backward' && (
              <motion.div
                key="seek-backward"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute left-0 top-0 bottom-0 w-1/3 bg-gradient-to-r from-black/60 to-transparent flex flex-col items-center justify-center text-white pointer-events-none z-20"
              >
                <motion.div
                  animate={{ x: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                >
                  <FaBackward className="text-3xl" />
                </motion.div>
                <span className="text-xs font-bold mt-2 bg-black/40 px-2 py-0.5 rounded-full">-10s</span>
              </motion.div>
            )}

            {seekIndicator.visible && seekIndicator.direction === 'forward' && (
              <motion.div
                key="seek-forward"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-black/60 to-transparent flex flex-col items-center justify-center text-white pointer-events-none z-20"
              >
                <motion.div
                  animate={{ x: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                >
                  <FaForward className="text-3xl" />
                </motion.div>
                <span className="text-xs font-bold mt-2 bg-black/40 px-2 py-0.5 rounded-full">+10s</span>
              </motion.div>
            )}

            {/* Volume HUD Indicator */}
            {volumeIndicator.visible && (
              <motion.div
                key="volume-hud"
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md rounded-full px-4 py-2.5 flex items-center gap-3 text-white text-sm shadow-2xl z-30 pointer-events-none border border-white/10"
              >
                {volumeIndicator.muted ? (
                  <FaVolumeMute className="text-red-400 text-lg flex-shrink-0" />
                ) : (
                  <FaVolumeUp className="text-blue-400 text-lg flex-shrink-0" />
                )}
                <div className="w-20 h-1.5 bg-white/20 rounded-full overflow-hidden flex-shrink-0">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-100" 
                    style={{ width: `${volumeIndicator.muted ? 0 : volumeIndicator.volume * 100}%` }}
                  />
                </div>
                <span className="font-semibold w-8 text-right text-xs">
                  {volumeIndicator.muted ? 'Muted' : `${Math.round(volumeIndicator.volume * 100)}%`}
                </span>
              </motion.div>
            )}

            {isBuffering && (
              <motion.div
                key="buffering"
                className="buffering-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="spinner"></div>
                <span>Buffering…</span>
              </motion.div>
            )}

            {showPlayPauseOverlay && (
              <motion.div
                key="playpause"
                className="play-pause-overlay"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              >
                {isPlaying ? (
                  <svg className="play-icon" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg className="pause-icon" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                )}
              </motion.div>
            )}

            {isFullScreen && (
              <motion.div
                key="fullscreen"
                className="fullscreen-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <span>Fullscreen</span>
              </motion.div>
            )}

            {playbackSpeed !== 1 && (
              <motion.div
                key="speed"
                className="playback-speed-overlay"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
              >
                <span>{playbackSpeed}x</span>
              </motion.div>
            )}
          </AnimatePresence>

          {!videoData?.url && (
            <div className="video-empty-overlay">
              <span>No video available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
