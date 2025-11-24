// src/pages/WatchPage.jsx

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaHeart,
  FaShareAlt,
  FaRegClock,
  FaDownload,
  FaPlayCircle,
  FaEye,
  FaClock,
  FaThumbsUp,
  FaCommentDots,
  FaBookmark,
} from 'react-icons/fa';
import { Button, ToggleSwitch } from 'flowbite-react';
import toast from 'react-hot-toast';

import VideoPlayer from '../components/VideoPlayer';
import { useVideo } from '../context/VideoContext';
import { videoAPI } from '../utils/api';
import { mapVideoDetails } from '../utils/mapVideoDetails';
import {
  formatDuration,
  formatUploadDate,
  formatFileSize,
} from '../utils/videoUtils';

export default function WatchPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const {
    playVideo,
    isPlaying,
    currentVideo,
    videos,
    favorites,
    toggleFavorite,
    watchLater,
    addToWatchLater,
    removeFromWatchLater,
    userPreferences,
    updateUserPreferences,
  } = useVideo();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isFavoriteAnimating, setIsFavoriteAnimating] = useState(false);
  const [isWatchLaterAnimating, setIsWatchLaterAnimating] = useState(false);

  const preloadedVideo = useMemo(
    () => videos.find(video => `${video.id}` === `${videoId}`),
    [videos, videoId]
  );

  const isFavorite = useMemo(
    () =>
      Boolean(
        currentVideo && favorites.some(video => video.id === currentVideo.id)
      ),
    [favorites, currentVideo]
  );

  const isInWatchLater = useMemo(
    () =>
      Boolean(
        currentVideo && watchLater.some(video => video.id === currentVideo.id)
      ),
    [watchLater, currentVideo]
  );

  const relatedVideos = useMemo(() => {
    const filtered = videos.filter(video => video.id !== currentVideo?.id);

    return filtered
      .sort((a, b) => {
        const aViews = a.views ?? 0;
        const bViews = b.views ?? 0;
        if (bViews !== aViews) return bViews - aViews;
        const aDate = new Date(a.uploadDate || 0).getTime();
        const bDate = new Date(b.uploadDate || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 8);
  }, [videos, currentVideo]);

  const fetchVideoDetails = useCallback(async () => {
    if (!videoId) {
      setError('Missing video identifier');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (preloadedVideo) {
      playVideo(preloadedVideo);
    }

    try {
      const resp = await videoAPI.getById(videoId);
      const payload = resp.data ?? resp;
      const details = payload.video ?? payload;
      const mapped = mapVideoDetails(details);

      playVideo(mapped);
    } catch (err) {
      console.error('Error fetching video details:', err);
      if (!preloadedVideo) {
        setError(err?.message || 'Failed to load video details');
        toast.error(err?.message || 'Failed to load video details');
      } else {
        toast.error('Unable to refresh video details. Playing cached version.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [videoId, playVideo, preloadedVideo]);

  useEffect(() => {
    fetchVideoDetails();
  }, [fetchVideoDetails]);

  useEffect(() => {
    if (!currentVideo?.id) return;
    setShowFullDescription(false);
  }, [currentVideo?.id]);

  useEffect(() => {
    if (!currentVideo?.title) return undefined;

    const previousTitle = document.title;
    document.title = `${currentVideo.title} • StreamFlow`;

    return () => {
      document.title = previousTitle;
    };
  }, [currentVideo?.title]);

  const handleToggleFavorite = () => {
    if (!currentVideo) return;
    setIsFavoriteAnimating(true);
    toggleFavorite(currentVideo);
  };
  const handleToggleWatchLater = () => {
    if (!currentVideo) return;
    setIsWatchLaterAnimating(true);
    if (isInWatchLater) {
      removeFromWatchLater(currentVideo.id);
    } else {
      addToWatchLater(currentVideo);
    }
  };

  useEffect(() => {
    if (!isWatchLaterAnimating) return;
    const timeout = setTimeout(() => setIsWatchLaterAnimating(false), 400);
    return () => clearTimeout(timeout);
  }, [isWatchLaterAnimating]);

  useEffect(() => {
    if (!isFavoriteAnimating) return;
    const timeout = setTimeout(() => setIsFavoriteAnimating(false), 400);
    return () => clearTimeout(timeout);
  }, [isFavoriteAnimating]);

  const handleShare = async () => {
    if (!currentVideo) return;

    const shareData = {
      title: currentVideo.title,
      text: currentVideo.description?.slice(0, 120) || 'Check out this video on StreamFlow',
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Share sheet opened');
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setCopied(true);
        toast.success('Link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('Share failed:', err);
        toast.error('Unable to share right now');
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      toast.error('Unable to copy link');
    }
  };

  const handleAutoPlayToggle = value => {
    updateUserPreferences({ autoplay: value });
    toast.success(value ? 'Autoplay enabled' : 'Autoplay disabled');
  };

  const handleNavigateToVideo = video => {
    if (!video) return;
    navigate(`/watch/${video.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-lg text-white/60">Loading your video experience…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-6">
        <div className="max-w-lg text-center space-y-4">
          <h2 className="text-2xl font-bold">We hit a snag</h2>
          <p className="text-white/60">{error}</p>
          <Button color="light" onClick={fetchVideoDetails}>
            Retry loading
          </Button>
        </div>
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <p className="text-lg text-white/60">Video not found or failed to load.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-10 py-12">
        <div className="grid gap-10 xl:gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="space-y-8">
            <div className="overflow-hidden rounded-3xl bg-neutral-900/80 border border-white/10 shadow-2xl">
              <VideoPlayer
                videoData={currentVideo}
                userPreferences={userPreferences}
                isPlaying={isPlaying}
              />
            </div>

            <section className="rounded-3xl bg-neutral-900/80 border border-white/10 p-6 sm:p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-white/50">
                  <span className="px-3 py-1 rounded-full bg-blue-600/20 border border-blue-400/40">Now Playing</span>
                  {currentVideo.uploadDate && (
                    <span className="flex items-center gap-2">
                      <FaClock className="text-sm" />
                      {formatUploadDate(currentVideo.uploadDate)}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
                  {currentVideo.title}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <FaEye className="text-base" />
                  <span>{(currentVideo.views ?? 0).toLocaleString()} views</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaThumbsUp className="text-base" />
                  <span>{(currentVideo.likes ?? 0).toLocaleString()} likes</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaCommentDots className="text-base" />
                  <span>{(currentVideo.comments ?? 0).toLocaleString()} comments</span>
                </div>
                {currentVideo.duration ? (
                  <div className="flex items-center gap-2">
                    <FaRegClock className="text-base" />
                    <span>{formatDuration(currentVideo.duration)}</span>
                  </div>
                ) : null}
                {currentVideo.fileSize ? (
                  <div className="flex items-center gap-2">
                    <FaDownload className="text-base" />
                    <span>{formatFileSize(currentVideo.fileSize)}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  className={`group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors border ${
                    isFavorite
                      ? 'bg-red-500/20 border-red-400/60 text-red-200'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  } ${isFavoriteAnimating ? 'favorite-animate' : ''}`}
                >
                  <FaHeart className="text-base" />
                  {isFavorite ? 'Added to Favorites' : 'Add to Favorites'}
                </button>

                <button
                  type="button"
                  onClick={handleToggleWatchLater}
                  className={`group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors border ${
                    isInWatchLater
                      ? 'bg-blue-500/15 border-blue-400/60 text-blue-200'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  } ${isWatchLaterAnimating ? 'favorite-animate' : ''}`}
                >
                  <FaBookmark className="text-base" />
                  {isInWatchLater ? 'Saved for Later' : 'Watch Later'}
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                >
                  <FaShareAlt className="text-base" />
                  Share
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors border ${
                    copied
                      ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-100'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <FaPlayCircle className="text-base" />
                  {copied ? 'Link Copied' : 'Copy Link'}
                </button>

                {currentVideo.url && (
                  <a
                    href={currentVideo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors bg-white text-neutral-900 hover:bg-neutral-200"
                  >
                    <FaDownload className="text-base" />
                    Open Source
                  </a>
                )}
              </div>

              {currentVideo.description && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-white">Description</h2>
                  <p
                    className={`text-sm leading-relaxed text-white/70 whitespace-pre-line ${
                      showFullDescription ? '' : 'line-clamp-4'
                    }`}
                  >
                    {currentVideo.description}
                  </p>
                  {currentVideo.description.length > 320 && (
                    <button
                      type="button"
                      onClick={() => setShowFullDescription(prev => !prev)}
                      className="text-sm font-semibold text-blue-300 hover:text-blue-200"
                    >
                      {showFullDescription ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl bg-neutral-900/80 border border-white/10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Autoplay next</h2>
                  <p className="text-sm text-white/60">Keep watching without lifting a finger.</p>
                </div>
                <ToggleSwitch
                  checked={Boolean(userPreferences?.autoplay)}
                  onChange={handleAutoPlayToggle}
                />
              </div>
            </div>

            <div className="rounded-3xl bg-neutral-900/80 border border-white/10 overflow-hidden">
              <header className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Up Next</h2>
                <span className="text-sm text-white/50">{relatedVideos.length} videos</span>
              </header>
              {relatedVideos.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {relatedVideos.map(video => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => handleNavigateToVideo(video)}
                      className="w-full text-left px-6 py-4 flex gap-4 hover:bg-white/5 transition-colors"
                    >
                      <div className="relative w-32 flex-shrink-0 aspect-video overflow-hidden rounded-xl bg-neutral-800">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <span className="absolute bottom-2 right-2 text-[11px] bg-black/70 text-white px-2 py-0.5 rounded">
                          {formatDuration(video.duration)}
                        </span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-white line-clamp-2">{video.title}</p>
                        <div className="flex items-center gap-2 text-xs text-white/60">
                          <FaClock className="text-[0.75rem]" />
                          <span>{formatUploadDate(video.uploadDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/60">
                          <FaEye className="text-[0.75rem]" />
                          <span>{(video.views ?? 0).toLocaleString()} views</span>
                        </div>
                      </div>
                      <FaPlayCircle className="text-2xl text-white/40 self-center" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-sm text-white/50">
                  No recommendations available right now.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
