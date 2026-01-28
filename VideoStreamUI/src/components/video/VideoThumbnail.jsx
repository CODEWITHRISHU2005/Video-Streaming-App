import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlay, FaClock, FaHeart, FaEye, FaThumbsUp, FaComment, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { formatDuration, formatFileSize, formatUploadDate, formatCount } from '../../utils/videoUtils';
import { useVideo } from '../../context/VideoContext';

function VideoThumbnail({ video, onVideoClick, showPlayButton = true }) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isFavoriteAnimating, setIsFavoriteAnimating] = useState(false);
  const { favorites, toggleFavorite } = useVideo();
  const navigate = useNavigate();

  const isFavorite = favorites.some(fav => fav.id === video.id);

  useEffect(() => {
    if (!isFavoriteAnimating) return;
    const timeout = setTimeout(() => setIsFavoriteAnimating(false), 400);
    return () => clearTimeout(timeout);
  }, [isFavoriteAnimating]);


  const handleImageError = () => {
    setImageError(true);
  };

  const handleVideoClick = () => {
    if (onVideoClick) {
      onVideoClick(video);
    } else {
      navigate(`/watch/${video.id}`);
    }
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    setIsFavoriteAnimating(true);
    toggleFavorite(video);
  };

  const defaultThumbnail = (
    <div className="w-full h-32 bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
      <FaPlay className="text-white text-2xl" />
    </div>
  );

  return (
    <div
      className="relative group cursor-pointer bg-white dark:bg-neutral-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 hover:scale-[1.01] animate-fade-in-up"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleVideoClick}
    >
      {/* Thumbnail Image */}
      <div className="relative">
        {imageError ? (
          defaultThumbnail
        ) : (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
            onError={handleImageError}
          />
        )}


        {/* Overlay on hover */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300">
            {showPlayButton && (
              <div className="bg-primary-dark/80 rounded-full p-4 transform transition-transform duration-300 group-hover:scale-110 shadow-lg">
                <FaPlay className="text-white text-3xl" />
              </div>
            )}
          </div>
        )}

        {/* Duration Badge */}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-md font-semibold">
          {formatDuration(video.duration || 0)}
        </div>

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-2 right-2 p-2 rounded-full transition-all duration-300 transform ${isFavorite ? 'bg-red-600 text-white scale-110 shadow-lg' : 'bg-neutral-700/80 text-neutral-300 hover:bg-red-500 hover:text-white shadow-md'} ${isFavoriteAnimating ? 'favorite-animate' : ''}`}
        >
          <FaHeart className="text-base" />
        </button>
      </div>

      {/* Video Info */}
      <div className="p-4">
        {/* Status Badge - Show if processing */}
        {video.status && video.status !== 'PUBLISHED' && (
          <div className="mb-2">
            {video.status === 'PROCESSING' || video.status === 'UPLOADING' ? (
              <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-full font-medium">
                <FaSpinner className="animate-spin" />
                {video.status === 'UPLOADING' ? 'Uploading...' : 'Processing...'}
              </span>
            ) : video.status === 'DRAFT' ? (
              <span className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full font-medium">
                Draft
              </span>
            ) : null}
          </div>
        )}

        <h3 className="font-bold text-neutral-900 dark:text-white text-base line-clamp-2 mb-1 leading-tight">
          {video.title}
        </h3>

        {/* Engagement Metrics */}
        <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 mt-2">
          {video.views > 0 && (
            <div className="flex items-center gap-1">
              <FaEye className="text-sm" />
              <span>{formatCount(video.views)} views</span>
            </div>
          )}
          {video.likes > 0 && (
            <div className="flex items-center gap-1">
              <FaThumbsUp className="text-sm" />
              <span>{formatCount(video.likes)}</span>
            </div>
          )}
          {video.comments > 0 && (
            <div className="flex items-center gap-1">
              <FaComment className="text-sm" />
              <span>{formatCount(video.comments)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-2">
          <div className="flex items-center space-x-1">
            <FaClock className="text-sm" />
            <span>{formatUploadDate(video.uploadDate) || 'Recently added'}</span>
          </div>

          {/* Quality/Resolution Badge */}
          {(video.resolution || video.quality) && (
            <span className="ml-auto px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded font-medium">
              {video.resolution || video.quality}
            </span>
          )}
        </div>

        {/* Additional Info */}
        {video.description && (
          <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
            {video.description}
          </p>
        )}

        {/* Tags */}
        {video.tags && video.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {video.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index} 
                className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-md font-medium border border-blue-100 dark:border-blue-800/50"
              >
                #{tag}
              </span>
            ))}
            {video.tags.length > 3 && (
              <span className="text-[10px] text-neutral-400 flex items-center">
                +{video.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {video.processing && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
            <p className="text-sm font-semibold">Processing Video...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoThumbnail;
