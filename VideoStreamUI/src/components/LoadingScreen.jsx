import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = () => {
  // Stagger variants for the title letters
  const logoText = "StreamFlow";
  
  const textContainerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.6,
      }
    }
  };

  const letterVariants = {
    initial: { y: 15, opacity: 0 },
    animate: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "spring", 
        stiffness: 120,
        damping: 10
      } 
    }
  };

  const glowOrbVariants = {
    animate1: {
      scale: [1, 1.15, 1],
      x: [0, 30, 0],
      y: [0, -20, 0],
      transition: {
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    animate2: {
      scale: [1, 1.2, 1],
      x: [0, -40, 0],
      y: [0, 30, 0],
      transition: {
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0, 
        y: -100,
        scale: 0.97,
        transition: { 
          duration: 0.8, 
          ease: [0.76, 0, 0.24, 1] 
        } 
      }}
      className="fixed inset-0 flex flex-col items-center justify-center bg-[#07080a] z-50 overflow-hidden select-none"
    >
      {/* Background Radial Glow Blobs */}
      <motion.div 
        variants={glowOrbVariants}
        animate="animate1"
        className="absolute w-[45rem] h-[45rem] rounded-full opacity-20 blur-[130px] pointer-events-none"
        style={{
          top: '-15%',
          right: '-10%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, rgba(99,102,241,0) 70%)'
        }}
      />
      <motion.div 
        variants={glowOrbVariants}
        animate="animate2"
        className="absolute w-[50rem] h-[50rem] rounded-full opacity-15 blur-[140px] pointer-events-none"
        style={{
          bottom: '-20%',
          left: '-15%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, rgba(236,72,153,0) 70%)'
        }}
      />

      {/* Center Animated Logo & Text Container */}
      <div className="relative flex flex-col items-center z-10">
        
        {/* Animated StreamFlow SVG Logo */}
        <div className="relative flex items-center justify-center mb-8">
          {/* Animated concentric rings under the logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.25 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute w-44 h-44 rounded-full border border-indigo-500/30"
          />
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ 
              scale: [1, 1.08, 1], 
              opacity: [0.15, 0.25, 0.15] 
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="absolute w-36 h-36 rounded-full border border-pink-500/20"
          />

          <svg 
            width="120" 
            height="120" 
            viewBox="0 0 64 64" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_0_25px_rgba(99,102,241,0.5)]"
          >
            <defs>
              <linearGradient id="sfLoaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00BCD4"/>
                <stop offset="50%" stopColor="#3B82F6"/>
                <stop offset="100%" stopColor="#7C4DFF"/>
              </linearGradient>
              <linearGradient id="sfLoaderGradSec" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00E5FF"/>
                <stop offset="100%" stopColor="#C084FC"/>
              </linearGradient>
            </defs>

            {/* Glowing background ring */}
            <motion.circle 
              cx="32" 
              cy="32" 
              r="28" 
              stroke="url(#sfLoaderGrad)" 
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.25"
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />

            {/* Path S - Stream - Drawing transition */}
            <motion.path 
              d="M20 18 C20 15, 22 13, 25 13 C27 13, 29 14, 30 15 C31 16, 31 17, 30 18 C29 19, 27 19, 25 19 C23 19, 21 20, 21 22 C21 24, 23 25, 25 25 C27 25, 29 26, 30 27 C31 28, 31 29, 30 30 C29 31, 27 31, 25 31 C22 31, 20 29, 20 26" 
              stroke="url(#sfLoaderGrad)" 
              strokeWidth="3.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: 0.1 }}
            />

            {/* Path F - Flow - Drawing transition */}
            <motion.path 
              d="M38 13 L38 31 M38 13 L47 13 M38 22 L46 22" 
              stroke="url(#sfLoaderGrad)" 
              strokeWidth="3.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: 0.3 }}
            />

            {/* Inner Play ring - Fades/scales in */}
            <motion.circle 
              cx="32" 
              cy="42" 
              r="6" 
              stroke="url(#sfLoaderGradSec)" 
              strokeWidth="2" 
              fill="none"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.8 }}
              transition={{ type: "spring", stiffness: 100, delay: 1 }}
            />

            {/* Inner play triangle - Fades in */}
            <motion.path 
              d="M30 42 L33 44 L33 40 Z" 
              fill="url(#sfLoaderGradSec)" 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 1.2 }}
            />

            {/* Streaming waves - Smooth wave path drawing */}
            <motion.path 
              d="M16 50 Q20 48, 24 50 T32 50 T40 50 T48 50" 
              stroke="url(#sfLoaderGradSec)" 
              strokeWidth="2" 
              strokeLinecap="round" 
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.8 }}
              transition={{ duration: 1.2, ease: "easeInOut", delay: 0.8 }}
            />
          </svg>
        </div>

        {/* Brand Title: StreamFlow Letter-by-Letter Stagger Animation */}
        <motion.div 
          variants={textContainerVariants}
          initial="initial"
          animate="animate"
          className="flex space-x-1"
        >
          {logoText.split("").map((letter, index) => (
            <motion.span
              key={index}
              variants={letterVariants}
              className="text-white text-4xl sm:text-5xl font-black tracking-tight"
              style={{
                background: index < 6 
                  ? 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)' 
                  : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {letter}
            </motion.span>
          ))}
        </motion.div>

        {/* Elegant pulsing status line */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: [0.4, 0.85, 0.4] }}
          transition={{ 
            opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 0.6, delay: 1.4 }
          }}
          className="text-slate-400 text-sm font-medium tracking-wide mt-4"
        >
          Loading your experience...
        </motion.p>
      </div>

      {/* Premium progress bar at the bottom */}
      <div className="absolute bottom-12 w-64 h-[3px] bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 2.8, ease: "easeInOut" }}
          className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 rounded-full"
        />
      </div>
    </motion.div>
  );
};

export default LoadingScreen;
