import React from 'react';
import { FaHistory } from 'react-icons/fa';
import VideoGrid from '../components/video/VideoGrid';
import { useVideo } from '../context/VideoContext';

function HistoryPage() {
  const { recentlyPlayed } = useVideo();

  return (
    <div className="space-y-6">
      <div className="page-hero">
        <div className="relative z-10 flex items-center space-x-3">
          <FaHistory className="text-3xl text-blue-300" />
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Watch History</h1>
            <p className="text-white/90">Videos you've recently watched ({recentlyPlayed.length})</p>
          </div>
        </div>
      </div>

      <VideoGrid 
        videos={recentlyPlayed} 
        title="Recently Played"
        showViewToggle={true}
      />
    </div>
  );
}

export default HistoryPage; 