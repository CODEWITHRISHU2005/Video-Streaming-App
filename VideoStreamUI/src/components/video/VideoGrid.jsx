import React, { useState, useMemo, useEffect } from 'react';
import { differenceInDays } from 'date-fns';
import { FaTh, FaList, FaEye, FaGripLines, FaFilter, FaBolt, FaChartLine } from 'react-icons/fa';
import { Button, Spinner } from 'flowbite-react';
import VideoThumbnail from './VideoThumbnail';
import { useVideo } from '../../context/VideoContext';

function VideoGrid({
  videos = [],
  title = 'Videos',
  showViewToggle = true,
}) {
  const {
    isLoading,
  } = useVideo();

  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('latest');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [recentOnly, setRecentOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 12;
  const now = useMemo(() => new Date(), []);

  const categories = useMemo(() => {
    const unique = new Set();
    videos.forEach(video => {
      const category = video?.category || 'General';
      unique.add(category);
    });
    return ['All', ...Array.from(unique)];
  }, [videos]);

  useEffect(() => {
    if (['latest', 'recent', 'popular', 'trending'].includes(sortBy)) {
      setSortOrder('desc');
    }
  }, [sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, sortOrder, selectedCategory, recentOnly, videos.length]);

  const filteredVideos = useMemo(() => {
    let filtered = [...videos];
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(video => (video.category || 'General') === selectedCategory);
    }

    if (recentOnly) {
      filtered = filtered.filter(video => {
        if (!video.uploadDate) return false;
        const days = differenceInDays(now, new Date(video.uploadDate));
        return days <= 7;
      });
    }

    return filtered;
  }, [videos, selectedCategory, recentOnly, now]);

  const sortedVideos = useMemo(() => {
    const cloned = [...filteredVideos];
    return cloned.sort((a, b) => {
      let aValue;
      let bValue;

      switch (sortBy) {
        case 'latest':
          aValue = new Date(a.uploadDate || 0).getTime();
          bValue = new Date(b.uploadDate || 0).getTime();
          break;
        case 'recent':
          aValue = new Date(a.uploadDate || 0).getTime();
          bValue = new Date(b.uploadDate || 0).getTime();
          break;
        case 'popular':
          aValue = a.views || 0;
          bValue = b.views || 0;
          break;
        case 'trending': {
          const aDays = Math.max(1, differenceInDays(now, new Date(a.uploadDate || now)) + 1);
          const bDays = Math.max(1, differenceInDays(now, new Date(b.uploadDate || now)) + 1);
          aValue = (a.views || 0) / aDays;
          bValue = (b.views || 0) / bDays;
          break;
        }
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        case 'views':
          aValue = a.views || 0;
          bValue = b.views || 0;
          break;
        case 'date':
        default:
          aValue = new Date(a.uploadDate || 0).getTime();
          bValue = new Date(b.uploadDate || 0).getTime();
          break;
      }

      if (sortBy === 'latest' || sortBy === 'recent') {
        return bValue - aValue;
      }

      if (sortBy === 'popular' || sortBy === 'trending') {
        return bValue - aValue;
      }

      return sortOrder === 'asc'
        ? aValue > bValue ? 1 : aValue < bValue ? -1 : 0
        : aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    });
  }, [filteredVideos, sortBy, sortOrder, now]);

  const totalPages = Math.max(1, Math.ceil(sortedVideos.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedVideos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedVideos.slice(start, end);
  }, [sortedVideos, currentPage, pageSize]);

  const applySortLabel = value => {
    switch (value) {
      case 'latest':
        return 'Latest';
      case 'popular':
        return 'Most Popular';
      case 'trending':
        return 'Trending';
      case 'recent':
        return 'Recently Added';
      case 'duration':
        return 'Duration';
      case 'title':
        return 'Title';
      case 'views':
        return 'Views';
        default:
          return value;
      }
  };

  const getGridClasses = () => {
    switch (viewMode) {
      case 'list':
        return 'grid-cols-1 gap-4';
      case 'compact':
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3';
      case 'grid':
      default:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-800 bg-[length:200%_100%] animate-shimmer" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div key={idx} className="rounded-xl overflow-hidden bg-white dark:bg-neutral-800 shadow-lg">
              <div className="h-48 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700 bg-[length:200%_100%] animate-shimmer" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 rounded bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700 bg-[length:200%_100%] animate-shimmer" />
                <div className="h-3 w-1/2 rounded bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700 bg-[length:200%_100%] animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sortedVideos.length === 0) {
    return (
      <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900 rounded-lg shadow-inner">
        <FaEye className="mx-auto text-5xl text-neutral-400 mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
          No videos found
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-base">
          {title === 'Favorites'
            ? "You haven't added any videos to favorites yet. Start exploring!"
            : 'No videos available. Check back later or upload some!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 📌 Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-5 border-neutral-200 dark:border-neutral-700">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {title}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2 mt-1">
            Showing {paginatedVideos.length} of {sortedVideos.length} videos
            <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 px-2 py-0.5 rounded-full">
              Page {currentPage} of {totalPages}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mt-5 sm:mt-0 items-center justify-end">
          <div className="flex flex-wrap gap-2 items-center">
            <FaFilter className="text-neutral-400" />
            <div className="flex gap-2 overflow-x-auto max-w-[20rem] pb-1">
              {categories.map(category => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                    selectedCategory === category
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <Button
            color={recentOnly ? 'info' : 'gray'}
            size="xs"
            onClick={() => setRecentOnly(prev => !prev)}
            className="rounded-full"
          >
            <FaBolt className="mr-1" /> New This Week
          </Button>

          {/* 🔃 Sort Options */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-neutral-300 dark:border-neutral-600 rounded-full px-3 py-1.5 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-primary focus:border-primary transition-all"
              aria-label="Sort By"
            >
              <option value="latest">Latest</option>
              <option value="recent">Recently Added</option>
              <option value="popular">Most Popular</option>
              <option value="trending">Trending</option>
              <option value="title">Title</option>
              <option value="duration">Duration</option>
              <option value="views">Views</option>
            </select>

            {!['latest', 'recent', 'popular', 'trending'].includes(sortBy) && (
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="text-sm border border-neutral-300 dark:border-neutral-600 rounded-full px-3 py-1.5 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-primary focus:border-primary transition-all"
                aria-label="Sort Order"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            )}
          </div>

          {/* 🔲 View Toggle */}
          {showViewToggle && (
            <div
              className="flex items-center space-x-1 bg-neutral-200 dark:bg-neutral-700 rounded-full px-2 py-1 transition-all shadow-inner"
              role="group"
              aria-label="View Mode"
            >
              <Button
                size="sm"
                color={viewMode === 'grid' ? 'info' : 'gray'}
                onClick={() => setViewMode('grid')}
                className="px-2 py-1 rounded-full transition-all"
                aria-label="Grid View"
              >
                <FaTh />
              </Button>
              <Button
                size="sm"
                color={viewMode === 'list' ? 'info' : 'gray'}
                onClick={() => setViewMode('list')}
                className="px-2 py-1 rounded-full transition-all"
                aria-label="List View"
              >
                <FaList />
              </Button>
              <Button
                size="sm"
                color={viewMode === 'compact' ? 'info' : 'gray'}
                onClick={() => setViewMode('compact')}
                className="px-2 py-1 rounded-full transition-all"
                aria-label="Compact View"
              >
                <FaGripLines />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 🎥 Grid */}
      <div className={`grid ${getGridClasses()}`}>
        {paginatedVideos.map((video) => (
          <VideoThumbnail
            key={video.id}
            video={video}
            showPlayButton={true}
            viewMode={viewMode}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 px-4 py-3 bg-white/60 dark:bg-neutral-900/60">
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <FaChartLine className="text-neutral-400" />
            <span>{applySortLabel(sortBy)} • Page {currentPage} of {totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              color="light"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              color="light"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoGrid;
