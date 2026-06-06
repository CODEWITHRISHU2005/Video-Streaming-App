import React, { useState, useEffect, useMemo } from 'react';
import { FaPlay, FaClock, FaEye, FaUpload, FaThumbsUp, FaCommentDots, FaHeart, FaBookmark, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Button, Card } from 'flowbite-react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoGrid from '../components/video/VideoGrid';
import { useVideo } from '../context/VideoContext';
import { formatUploadDate, formatDuration } from '../utils/videoUtils';
import { mapVideoDetails } from '../utils/mapVideoDetails';
import { Link, useNavigate } from 'react-router-dom';

export default function HomePage() {
  const {
    videos: rawVideos,
    isLoading,
    playVideo,
    favorites,
    toggleFavorite,
    watchLater,
    addToWatchLater,
    removeFromWatchLater,
  } = useVideo();
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);

  const videos = useMemo(
    () =>
      rawVideos.map(video => {
        // If video is already mapped, use it directly, otherwise map it
        const mapped = video.id && video.title ? video : mapVideoDetails(video);
        
        // Preserve duration from original video if mapped version doesn't have it
        const finalDuration = mapped.duration ?? 
                              video.duration ?? 
                              video.videoDuration ?? 
                              video.video_duration ?? 
                              video.length ?? 
                              0;
        
        // Debug in development
        if (process.env.NODE_ENV === 'development' && !finalDuration && rawVideos.indexOf(video) === 0) {
          // Create a preview of the raw video object showing all values
          const videoPreview = {};
          Object.keys(video).forEach(key => {
            const value = video[key];
            if (typeof value === 'object' && value !== null) {
              videoPreview[key] = `[${Array.isArray(value) ? 'Array' : 'Object'}] ${JSON.stringify(value).substring(0, 150)}`;
            } else {
              videoPreview[key] = value;
            }
          });
          
          console.warn('HomePage - Video duration issue:', {
            mappedDuration: mapped.duration,
            videoDuration: video.duration,
            videoKeys: Object.keys(video),
            mappedKeys: Object.keys(mapped),
            rawVideoPreview: videoPreview
          });
        }
        
        return {
          ...mapped,
          thumbnailUrl: mapped.thumbnailUrl, // Use direct thumbnail URL from CDN
          duration: finalDuration
        };
      }),
    [rawVideos]
  );

  const featuredVideos = useMemo(() => videos.slice(0, 6), [videos]);

  const slides = useMemo(() => {
    const defaultSlides = [
      {
        id: 'default-1',
        title: 'Unleash the Future of Video Streaming',
        description: 'Experience ultra-high-definition playback, global creator networks, and interactive real-time communities.',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop',
        tags: ['Streaming', 'Future', 'Tech'],
        isDefault: true,
        link: '/upload'
      },
      {
        id: 'default-2',
        title: 'Cinematic Masterpieces & Curated Shorts',
        description: 'Dive into award-winning indie short films, stunning community vlogs, and custom visual art.',
        imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1600&auto=format&fit=crop',
        tags: ['Cinema', 'Art', 'Creative'],
        isDefault: true,
        link: '/'
      },
      {
        id: 'default-3',
        title: 'Share Your Story with the World',
        description: 'Empowering independent filmmakers and daily creators. Upload in seconds and reach your audience.',
        imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1600&auto=format&fit=crop',
        tags: ['Community', 'Creator', 'Share'],
        isDefault: true,
        link: '/upload'
      }
    ];

    if (featuredVideos && featuredVideos.length > 0) {
      const videoSlides = featuredVideos.map((video, idx) => ({
        id: video.id,
        title: video.title,
        description: video.description || 'Watch this amazing featured video on our platform.',
        imageUrl: video.thumbnailUrl || defaultSlides[idx % defaultSlides.length].imageUrl,
        tags: video.tags && video.tags.length > 0 ? video.tags : ['Featured'],
        isVideo: true,
        video: video
      }));
      return [...videoSlides, ...defaultSlides].slice(0, 5);
    }

    return defaultSlides;
  }, [featuredVideos]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    const sections = document.querySelectorAll('section');
    sections.forEach((section, index) => {
      section.style.animationDelay = `${index * 0.1}s`;
      section.classList.add('animate-fade-in');
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-tr from-gray-100 via-gray-200 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center animate-pulse">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
          <p className="mt-6 text-xl font-bold text-gray-700 dark:text-gray-300">
            Loading awesome content...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[90rem] mx-auto space-y-16 pt-4 pb-16 px-6 sm:px-8 lg:px-12 min-h-screen font-sans text-slate-900 dark:text-slate-100 relative overflow-hidden">
      <section className="relative text-white rounded-3xl shadow-2xl h-[420px] sm:h-[480px] md:h-[520px] overflow-hidden animate-fade-in-up" aria-label="Trending Carousel Banner">
        {/* Background Image Carousel with Fading Crossfade */}
        <div className="absolute inset-0 w-full h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 w-full h-full"
            >
              <img
                src={slides[activeSlide].imageUrl}
                alt={slides[activeSlide].title}
                className="w-full h-full object-cover select-none"
                loading="eager"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop';
                }}
              />
              {/* Premium dark gradient layers */}
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: 'linear-gradient(to right, rgba(7, 8, 10, 0.95) 0%, rgba(7, 8, 10, 0.75) 40%, rgba(7, 8, 10, 0.3) 70%, rgba(7, 8, 10, 0) 100%)',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07080a] via-transparent to-[#07080a]/30" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating background elements for depth */}
        <div className="absolute -left-20 -top-20 w-72 h-72 rounded-full border border-white/10 animate-pulse pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-blue-400 rounded-full blur-md animate-pulse opacity-40 pointer-events-none" style={{ animationDelay: '0.5s' }} />

        {/* Carousel Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-6 sm:p-10 md:p-12">
          {/* Top Info Badges */}
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-md shadow-red-500/20">
              Trending
            </span>
            <div className="flex gap-2">
              {slides[activeSlide].tags.map((tag, idx) => (
                <span 
                  key={idx} 
                  className="text-[11px] text-white/90 font-medium bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/5 shadow-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Middle Details */}
          <div className="max-w-2xl space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="space-y-3"
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight drop-shadow-md bg-gradient-to-r from-white via-slate-100 to-white bg-clip-text text-transparent">
                  {slides[activeSlide].title}
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-slate-300 line-clamp-3 leading-relaxed drop-shadow-sm font-light">
                  {slides[activeSlide].description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Carousel Interactive Buttons */}
            <div className="pt-2 flex flex-wrap gap-4 items-center">
              {slides[activeSlide].isVideo ? (
                <Button
                  size="lg"
                  gradientDuoTone="purpleToBlue"
                  className="group relative transition-all duration-300 hover:scale-105 rounded-full font-bold shadow-lg shadow-blue-500/20"
                  onClick={() => {
                    const mapped = mapVideoDetails(slides[activeSlide].video);
                    playVideo(mapped);
                    navigate(`/watch/${slides[activeSlide].id}`);
                  }}
                >
                  <FaPlay className="mr-2 inline-block text-xs" /> Watch Now
                </Button>
              ) : (
                <Link to={slides[activeSlide].link}>
                  <Button
                    size="lg"
                    gradientDuoTone="purpleToBlue"
                    className="group relative transition-all duration-300 hover:scale-105 rounded-full font-bold shadow-lg shadow-purple-500/20"
                  >
                    <FaUpload className="mr-2 inline-block text-xs" /> Upload Video
                  </Button>
                </Link>
              )}
              <Button
                size="lg"
                color="gray"
                className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md rounded-full font-semibold transition-colors duration-200"
                onClick={() => {
                  navigate('/upload');
                }}
              >
                Explore Creator Hub
              </Button>
            </div>
          </div>

          {/* Bottom Indicators & Manual Controls */}
          <div className="flex items-center justify-between mt-4">
            {/* Slide Navigation Dots */}
            <div className="flex gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeSlide === idx ? "w-8 bg-blue-500" : "w-2 bg-white/35 hover:bg-white/50"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Slider Arrow Buttons */}
            <div className="flex gap-2.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevSlide();
                }}
                className="p-2.5 bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 backdrop-blur-md rounded-full text-white transition-all shadow-md"
                aria-label="Previous Slide"
              >
                <FaChevronLeft className="text-xs sm:text-sm" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextSlide();
                }}
                className="p-2.5 bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 backdrop-blur-md rounded-full text-white transition-all shadow-md"
                aria-label="Next Slide"
              >
                <FaChevronRight className="text-xs sm:text-sm" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6 animate-fade-in-up" aria-label="Featured Videos">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-yellow-400 flex items-center gap-2">
            <FaPlay className="text-yellow-300" /> Featured Videos
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredVideos.map(video => {
            const isFavorite = favorites.some(fav => fav.id === video.id);
            const isInWatchLater = watchLater.some(v => v.id === video.id);
            return (
              <div
                key={video.id}
                className="glass-card rounded-2xl overflow-hidden cursor-pointer animate-fade-in-up"
                onClick={() => {
                  const mapped = mapVideoDetails(video);
                  playVideo(mapped);
                  navigate(`/watch/${video.id}`);
                }}
                aria-label={`Watch ${video.title}`}
              >
                <div className="relative">
                  <img
                    src={video.thumbnailUrl}
                    alt={`Thumbnail of ${video.title}`}
                    className="h-48 w-full object-cover transition-all duration-200"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1521335629791-ce4aec67dd53?q=80&w=600&auto=format&fit=crop';
                    }}
                  />
                  {video.duration !== undefined && video.duration !== null && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs font-semibold">
                      <span className="bg-black/75 text-white px-2 py-1 rounded-md">
                        {formatDuration(video.duration)}
                      </span>
                    </div>
                  )}

                  {/* Watch Later Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isInWatchLater) {
                        removeFromWatchLater(video.id);
                      } else {
                        addToWatchLater(video);
                      }
                    }}
                    className={`absolute top-2 right-12 p-2 rounded-full transition-all duration-300 transform ${isInWatchLater ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'bg-neutral-700/80 text-neutral-300 hover:bg-blue-500 hover:text-white shadow-md'}`}
                    title={isInWatchLater ? 'Remove from Watch Later' : 'Watch Later'}
                  >
                    <FaBookmark className="text-base" />
                  </button>

                  {/* Favorite Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(video);
                    }}
                    className={`absolute top-2 right-2 p-2 rounded-full transition-all duration-300 transform ${isFavorite ? 'bg-red-600 text-white scale-110 shadow-lg' : 'bg-neutral-700/80 text-neutral-300 hover:bg-red-500 hover:text-white shadow-md'}`}
                    title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  >
                    <FaHeart className="text-base" />
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="text-lg font-semibold line-clamp-2 dark:text-white">{video.title}</h3>
                  <p className="text-sm text-gray-650 dark:text-gray-400 line-clamp-2">
                    {video.description}
                  </p>
                  {/* Tags for Featured Videos */}
                  {video.tags && video.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {video.tags.slice(0, 3).map((tag, index) => (
                        <span 
                          key={index} 
                          className="text-[10px] bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300 px-2 py-1 rounded-md font-medium border border-pink-100 dark:border-pink-850/50"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <FaClock /> {formatUploadDate(video.uploadDate) || 'Just now'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-6 animate-fade-in-up" aria-label="All Videos">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
            All Videos
          </h2>
        </div>
        <VideoGrid
          videos={videos}
          showControls
          showUploadButton
          showFavorites
          showRecentlyPlayed
          showSearch
          showViewToggle
        />
      </section>
    </div>
  );
}