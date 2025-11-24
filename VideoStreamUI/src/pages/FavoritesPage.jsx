import React from 'react';
import { FaHeart } from 'react-icons/fa';
import VideoGrid from '../components/video/VideoGrid';
import { useVideo } from '../context/VideoContext';

function FavoritesPage() {
  const { favorites } = useVideo();

  return (
    <div className="space-y-6">
      <div className="page-hero">
        <div className="relative z-10 flex items-center space-x-3">
          <FaHeart className="text-3xl text-pink-300" />
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Favorites</h1>
            <p className="text-white/90">Your favorite videos ({favorites.length})</p>
          </div>
        </div>
      </div>

      <VideoGrid 
        videos={favorites} 
        title="Favorite Videos"
        showViewToggle={true}
      />
    </div>
  );
}

export default FavoritesPage; 