import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlay, FaPause, FaTrash, FaGripVertical, FaList, FaRandom, FaRedo } from 'react-icons/fa';
import { Button, Badge } from 'flowbite-react';
import VideoThumbnail from '../video/VideoThumbnail';
import { useVideo } from '../../context/VideoContext';
import { formatDuration } from '../../utils/videoUtils';

function VideoPlaylist({ title = "Playlist", videos = [], showControls = true }) {
  const { currentVideo, isPlaying, playPlaylist, nextVideo, previousVideo } = useVideo();
  const [playlistVideos, setPlaylistVideos] = useState(videos);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const navigate = useNavigate();

  const handleVideoClick = (video, index) => {
    setCurrentIndex(index);
    navigate(`/watch/${video.id}`);
  };

  const removeFromPlaylist = (index) => {
    const newPlaylist = playlistVideos.filter((_, i) => i !== index);
    setPlaylistVideos(newPlaylist);
    
    if (index === currentIndex && newPlaylist.length > 0) {
      const newIndex = Math.min(index, newPlaylist.length - 1);
      setCurrentIndex(newIndex);
      handleVideoClick(newPlaylist[newIndex], newIndex);
    } else if (index < currentIndex) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const shufflePlaylist = () => {
    const shuffled = [...playlistVideos];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setPlaylistVideos(shuffled);
    setIsShuffled(true);
  };

  const unshufflePlaylist = () => {
    setPlaylistVideos(videos);
    setIsShuffled(false);
  };

  const toggleRepeat = () => {
    setIsRepeating(!isRepeating);
  };

  const handleNext = () => {
    if (currentIndex < playlistVideos.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      handleVideoClick(playlistVideos[nextIndex], nextIndex);
    } else if (isRepeating) {
      setCurrentIndex(0);
      handleVideoClick(playlistVideos[0], 0);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      handleVideoClick(playlistVideos[prevIndex], prevIndex);
    }
  };

  const getTotalDuration = () => {
    return playlistVideos.reduce((total, video) => total + (video.duration || 0), 0);
  };

  if (playlistVideos.length === 0) {
    return (
      <div className="bg-neutral-800 rounded-lg shadow-md p-6 text-center text-neutral-400">
        <FaList className="mx-auto text-5xl mb-4 text-neutral-500" />
        <h3 className="text-xl font-semibold mb-2 text-white">No videos in playlist</h3>
        <p className="text-base">Add some videos to get started!</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800 rounded-lg shadow-xl">
      {/* Playlist Header */}
      <div className="p-4 border-b border-neutral-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {title}
            </h3>
            <p className="text-sm text-neutral-400">
              {playlistVideos.length} videos • {formatDuration(getTotalDuration())}
            </p>
          </div>
          
          {showControls && (
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                color="gray"
                onClick={isShuffled ? unshufflePlaylist : shufflePlaylist}
                className={`bg-neutral-700 text-white hover:bg-neutral-600 ${isShuffled ? "!bg-primary !text-white" : ""}`}
              >
                <FaRandom />
              </Button>
              <Button
                size="sm"
                color="gray"
                onClick={toggleRepeat}
                className={`bg-neutral-700 text-white hover:bg-neutral-600 ${isRepeating ? "!bg-primary !text-white" : ""}`}
              >
                <FaRedo />
              </Button>
            </div>
          )}
        </div>

        {/* Playlist Controls */}
        {showControls && (
          <div className="flex items-center justify-center space-x-4 mt-4">
            <Button
              size="sm"
              color="gray"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="bg-neutral-700 text-white hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPlay className="rotate-180" />
            </Button>
            
            <Button
              size="sm"
              color="primary"
              onClick={() => handleVideoClick(playlistVideos[currentIndex], currentIndex)}
              className="bg-primary text-white hover:bg-primary-dark"
            >
              {isPlaying ? <FaPause /> : <FaPlay />}
            </Button>
            
            <Button
              size="sm"
              color="gray"
              onClick={handleNext}
              disabled={currentIndex === playlistVideos.length - 1}
              className="bg-neutral-700 text-white hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPlay />
            </Button>
          </div>
        )}
      </div>

      {/* Playlist Items */}
      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        {playlistVideos.map((video, index) => (
          <div
            key={`${video.id}-${index}`}
            className={`flex items-center space-x-3 p-3 transition-colors cursor-pointer ${index === currentIndex ? 'bg-primary-dark bg-opacity-20 border-l-4 border-primary' : 'hover:bg-neutral-700'}`}
            onClick={() => handleVideoClick(video, index)}
          >
            {/* Drag Handle */}
            <div className="text-neutral-500 cursor-grab active:cursor-grabbing">
              <FaGripVertical />
            </div>

            {/* Video Thumbnail */}
            <div className="flex-shrink-0">
              <img
                src={`http://localhost:8080/api/v1/videos/${video.id}/thumbnail`}
                alt={video.title}
                className="w-20 h-14 object-cover rounded"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA2NCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAxNkwzMiAyNEwyNCAzMlYxNloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                }}
              />
            </div>

            {/* Video Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-medium text-white truncate">
                {video.title}
              </h4>
              <p className="text-xs text-neutral-400 truncate">
                {video.description}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                {video.duration && (
                  <span className="text-xs text-neutral-400">
                    {formatDuration(video.duration)}
                  </span>
                )}
                {index === currentIndex && isPlaying && (
                  <Badge color="success" size="xs" className="bg-secondary text-white">
                    Playing
                  </Badge>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              <Button
                size="xs"
                color="gray"
                onClick={(e) => { e.stopPropagation(); handleVideoClick(video, index); }}
                className="bg-neutral-700 text-white hover:bg-neutral-600"
              >
                <FaPlay />
              </Button>
              
              <Button
                size="xs"
                color="red"
                onClick={(e) => { e.stopPropagation(); removeFromPlaylist(index); }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                <FaTrash />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Playlist Footer */}
      <div className="p-4 border-t border-neutral-700 bg-neutral-900">
        <div className="flex items-center justify-between text-sm text-neutral-400">
          <span>
            {currentIndex + 1} of {playlistVideos.length} videos
          </span>
          <span>
            {formatDuration(getTotalDuration())} total
          </span>
        </div>
      </div>
    </div>
  );
}

export default VideoPlaylist; 