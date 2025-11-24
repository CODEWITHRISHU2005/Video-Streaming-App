import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary-dark to-secondary-dark z-50 animate-fade-out-delay">
      <div className="text-center">
        <div className="relative flex items-center justify-center mb-8">
          {/* Outer ring */}
          <div className="absolute w-24 h-24 rounded-full border-4 border-t-4 border-primary-light animate-spin-slow"></div>
          {/* Inner ring */}
          <div className="absolute w-16 h-16 rounded-full border-4 border-t-4 border-secondary-light animate-spin-medium"></div>
          {/* Innermost ring */}
          <div className="absolute w-8 h-8 rounded-full border-4 border-t-4 border-accent animate-spin-fast"></div>
          {/* Logo/Icon Placeholder */}
          <svg
            className="w-10 h-10 text-white animate-pop-in"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            ></path>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        </div>
        <h1 className="text-white text-4xl font-bold animate-fade-in-up">StreamFlow</h1>
        <p className="text-neutral-100 text-lg mt-2 animate-fade-in-up delay-200">Loading your experience...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
