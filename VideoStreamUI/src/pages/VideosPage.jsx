import React from 'react';
import { FaVideo, FaLayerGroup } from 'react-icons/fa';
import VideoGrid from '../components/video/VideoGrid';
import { useVideo } from '../context/VideoContext';

export default function VideosPage() {
  const { videos, isLoading } = useVideo();

  return (
    <div className="space-y-8">
      <header className="page-hero relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="hero-badge">
            <span className="badge-dot" />
            Curated Library
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight flex items-center gap-3">
            <FaVideo className="text-pink-200" />
            Explore All Videos
          </h1>
          <p className="max-w-2xl text-base sm:text-lg text-white/85">
            Browse every upload by category, popularity, or freshness. Use filters below to jump straight into what interests you most.
          </p>
        </div>
        <FaLayerGroup className="absolute -bottom-6 -right-6 text-white/10 text-8xl" aria-hidden />
      </header>

      <VideoGrid
        videos={videos}
        title="All Videos"
        showViewToggle
      />
    </div>
  );
}

