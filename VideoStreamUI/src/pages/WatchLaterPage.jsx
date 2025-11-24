import React from 'react';
import { FaClock, FaInbox } from 'react-icons/fa';
import { useVideo } from '../context/VideoContext';
import VideoGrid from '../components/video/VideoGrid';

const WatchLaterPage = () => {
  const { watchLater } = useVideo();

  return (
    <div className="space-y-8">
      <section className="page-hero relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="hero-badge">
            <span className="badge-dot" />
            Saved queue
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <FaClock className="text-amber-300" /> Watch Later
          </h1>
          <p className="text-white/85 max-w-xl">
            Videos you’ve earmarked for later viewing live here. Jump back in when you’re ready.
          </p>
        </div>
        <FaInbox className="absolute -bottom-6 -right-6 text-white/10 text-8xl" aria-hidden />
      </section>

      {watchLater.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white/60 dark:bg-neutral-900/40">
          <FaClock className="text-4xl text-neutral-400 mb-4" />
          <p className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">No videos saved yet</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Tap “Watch Later” on any video to build your queue.</p>
        </div>
      ) : (
        <VideoGrid
          videos={watchLater}
          title="Your Watch Later List"
          showViewToggle
        />
      )}
    </div>
  );
};

export default WatchLaterPage;