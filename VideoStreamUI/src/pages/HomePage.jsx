import React, { useEffect, useMemo } from 'react';
import { FaPlay, FaClock, FaEye, FaUpload, FaThumbsUp, FaCommentDots } from 'react-icons/fa';
import { Button, Card } from 'flowbite-react';
import VideoGrid from '../components/video/VideoGrid';
import { useVideo } from '../context/VideoContext';
import { getVideoThumbnail, formatUploadDate, formatDuration } from '../utils/videoUtils';
import { mapVideoDetails } from '../utils/mapVideoDetails';
import { Link, useNavigate } from 'react-router-dom';

export default function HomePage() {
  const {
    videos: rawVideos,
    isLoading,
    playVideo,
  } = useVideo();
  const navigate = useNavigate();

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
          thumbnailUrl: mapped.thumbnailUrl || getVideoThumbnail(mapped.id),
          duration: finalDuration
        };
      }),
    [rawVideos]
  );

  const featuredVideos = useMemo(() => videos.slice(0, 6), [videos]);

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
    <div className="max-w-[90rem] mx-auto space-y-20 pt-4 pb-16 px-6 sm:px-8 lg:px-12 bg-neutral-50 dark:bg-black min-h-screen font-sans text-neutral-900 dark:text-white relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-[30rem] h-[30rem] rounded-full opacity-30 blur-3xl"
           style={{ background: 'radial-gradient(circle at 30% 30%, rgba(79,70,229,0.6), rgba(79,70,229,0) 60%)' }} />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[36rem] h-[36rem] rounded-full opacity-25 blur-3xl"
           style={{ background: 'radial-gradient(circle at 70% 70%, rgba(236,72,153,0.55), rgba(236,72,153,0) 60%)' }} />

      <section className="relative text-white rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 overflow-hidden animate-fade-in-up" aria-label="Hero Section"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(17,24,39,0.9) 0%, rgba(67,56,202,0.35) 50%, rgba(236,72,153,0.25) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          backgroundSize: '200% 200%'
        }}
      >
        <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(120rem_16rem_at_80%_-20%,rgba(255,255,255,0.2),rgba(255,255,255,0))]" />

        {/* Decorative rings */}
        <div className="absolute -left-20 -top-20 w-72 h-72 rounded-full border border-white/20 animate-pulse" />
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full border border-white/10 animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Floating particles/glow effects */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400 rounded-full blur-sm animate-pulse opacity-60" style={{ animationDelay: '0s' }} />
        <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-blue-400 rounded-full blur-md animate-pulse opacity-50" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-purple-400 rounded-full blur-sm animate-pulse opacity-60" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/4 w-2.5 h-2.5 bg-pink-400 rounded-full blur-md animate-pulse opacity-50" style={{ animationDelay: '1.5s' }} />
        
        {/* Gradient glow orbs */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-cyan-400/20 via-blue-400/15 to-purple-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-gradient-to-tl from-purple-400/20 via-pink-400/15 to-rose-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 text-center space-y-8">
          {/* Enhanced Banner with Individual Word Styling */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-extrabold leading-[1.1] tracking-tight">
              <span className="inline-block animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <span 
                  className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-lg"
                  style={{
                    backgroundSize: '200% 200%',
                    animation: 'gradient-shift 3s ease infinite',
                  }}
                >
                  Stream
                </span>
              </span>
              <span className="text-white/20 mx-2 sm:mx-4">•</span>
              <span className="inline-block animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <span 
                  className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-lg"
                  style={{
                    backgroundSize: '200% 200%',
                    animation: 'gradient-shift 3s ease infinite 0.5s',
                  }}
                >
                  Connect
                </span>
              </span>
              <span className="text-white/20 mx-2 sm:mx-4">•</span>
              <span className="inline-block animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                <span 
                  className="bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent drop-shadow-lg"
                  style={{
                    backgroundSize: '200% 200%',
                    animation: 'gradient-shift 3s ease infinite 1s',
                  }}
                >
                  Inspire
                </span>
                <span className="text-white/90">.</span>
              </span>
            </h1>
            
            {/* Decorative underline with animation */}
            <div className="flex justify-center items-center gap-2 mt-4">
              <div className="h-1 w-16 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full animate-pulse" />
              <div className="h-1 w-20 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 rounded-full" />
              <div className="h-1 w-16 bg-gradient-to-r from-transparent via-purple-400 to-transparent rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
          
          <p className="text-lg sm:text-2xl md:text-3xl max-w-3xl mx-auto text-white/90 font-light leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
            Discover a world of creativity through immersive, community-powered videos.
          </p>
          
          <div className="flex justify-center animate-fade-in-up" style={{ animationDelay: '0.9s' }}>
            <Link to="/upload" aria-label="Upload Your Video">
              <Button
                size="lg"
                className="group relative bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 px-8 py-4 rounded-full font-semibold text-lg overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <FaUpload className="mr-2 inline-block" /> Upload Your Video
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Add keyframes for gradient animation */}
        <style>{`
          @keyframes gradient-shift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}</style>
      </section>

      <section className="space-y-6 animate-fade-in-up" aria-label="Featured Videos">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-yellow-400 flex items-center gap-2">
            <FaPlay className="text-yellow-300" /> Featured Videos
          </h2>
          <Button
            color="pink"
            size="sm"
            className="transition-transform hover:scale-105 shadow-sm flex items-center gap-2"
            onClick={() => navigate('/videos')}
            aria-label="View All Featured Videos"
          >
            View All
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide bg-white/20 text-white px-2 py-0.5 rounded-full">
              Explore
            </span>
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredVideos.map(video => (
            <Card
              key={video.id}
              className="rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-neutral-900 cursor-pointer"
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
                />
                {video.duration !== undefined && video.duration !== null && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs font-semibold">
                    <span className="bg-black/75 text-white px-2 py-1 rounded-md">
                      {formatDuration(video.duration)}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <h3 className="text-lg font-semibold line-clamp-2 dark:text-white">{video.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {video.description}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <FaClock /> {formatUploadDate(video.uploadDate) || 'Just now'}
                  </div>
                  {typeof video.views === 'number' && (
                    <div className="flex items-center gap-1">
                      <FaEye /> {video.views} views
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <FaThumbsUp /> {(video.likes ?? 0).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FaCommentDots /> {(video.comments ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6 animate-fade-in-up" aria-label="All Videos">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
            All Videos
          </h2>
          <Button
            color="purple"
            size="sm"
            className="transition-transform hover:scale-105 shadow-sm"
            onClick={() => navigate('/videos')}
            aria-label="View All Videos"
          >
            View All
          </Button>
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