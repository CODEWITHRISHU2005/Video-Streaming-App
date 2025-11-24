import React, { useState, useCallback, useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { FaBars } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "./components/common/Logo";
import {
  HomeIcon,
  SearchIcon,
  VideosIcon,
  PlayIcon,
  FavoritesIcon,
  ProfileIcon,
  DeviceIcon,
  HistoryIcon,
  UploadIcon,
  NotificationsIcon,
  SettingsIcon,
  LoginIcon,
} from "./components/common/NavigationIcons";

// Context
import { VideoProvider, useVideo } from "./context/VideoContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Components
import VideoPlayer from "./components/VideoPlayer";
import VideoSearch from "./components/video/VideoSearch";

// Pages
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import FavoritesPage from "./pages/FavoritesPage";
import UploadPage from "./pages/UploadPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import SignInPage from "./pages/auth/SignInPage";
import SignUpPage from "./pages/auth/SignUpPage";
import WatchLaterPage from "./pages/WatchLaterPage";
import NotificationsPage from "./pages/NotificationsPage";
import WatchPage from "./pages/WatchPage";
import LandingPage from "./pages/LandingPage";
import VideosPage from "./pages/VideosPage";

const NAV_ITEMS = [
  { name: "Home", href: "/home", icon: HomeIcon, category: "main" },
  { name: "Search", href: "/search", icon: SearchIcon, category: "main" },
  { name: "Videos", href: "/videos", icon: VideosIcon, category: "content" },
  { name: "Favorites", href: "/favorites", icon: FavoritesIcon, category: "library" },
  { name: "Watch Later", href: "/watch-later", icon: PlayIcon, category: "library" },
  { name: "History", href: "/history", icon: HistoryIcon, category: "library" },
  { name: "Upload", href: "/upload", icon: UploadIcon, category: "content" },
  { name: "Notifications", href: "/notifications", icon: NotificationsIcon, category: "account" },
  { name: "Settings", href: "/settings", icon: SettingsIcon, category: "account" },
];

function AppContent() {
  const {
    videos, currentVideo, recentlyPlayed, favorites,
  } = useVideo();
  const { isAuthenticated, user, logout } = useAuth();

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // For mobile only
  const location = useLocation();

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  
  // Close sidebar on route change (mobile only)
  useEffect(() => {
    if (window.innerWidth < 1024) {
      closeSidebar();
    }
  }, [location.pathname, closeSidebar]);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        // Mobile: keep sidebar closed initially
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Handle sidebar hover state (desktop only - for expansion)
  const handleSidebarMouseEnter = useCallback(() => {
    if (!isMobile) {
      setSidebarExpanded(true);
    }
  }, [isMobile]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (!isMobile) {
      setSidebarExpanded(false);
    }
  }, [isMobile]);

  return (
    <div className="min-h-screen bg-black dark:bg-black">
      <Toaster position="top-left" />

      {/* Main Layout */}
      <div className="flex lg:flex-row flex-col-reverse">
        {/* Airtel Xstream Style Sidebar - Always visible on desktop, expandable on hover */}
        <AnimatePresence>
          {(sidebarOpen || !isMobile) && (
            <>
              {/* Sidebar */}
              <motion.aside
                initial={isMobile ? { x: -280 } : { width: 90 }}
                animate={isMobile ? { 
                  x: sidebarOpen ? 0 : -280,
                  transition: { 
                    type: "spring", 
                    damping: 30, 
                    stiffness: 300,
                    mass: 0.8
                  }
                } : {
                  width: sidebarExpanded ? 220 : 90,
                  transition: {
                    type: "spring",
                    damping: 30,
                    stiffness: 300,
                    mass: 0.8
                  }
                }}
                exit={isMobile ? { 
                  x: -280,
                  transition: {
                    type: "spring",
                    damping: 30,
                    stiffness: 300,
                    mass: 0.8
                  }
                } : false}
                onMouseEnter={handleSidebarMouseEnter}
                onMouseLeave={handleSidebarMouseLeave}
                className={`airtel-sidebar fixed z-40 top-0 left-0 h-screen overflow-hidden ${
                  isMobile ? 'w-[280px]' : ''
                } ${
                  isMobile ? 'bg-[#1a1d23]' : 'bg-transparent'
                }`}
              >
                <div className="h-full flex flex-col overflow-hidden">
                  {/* Sidebar Header with Logo - Only show on expanded or mobile */}
                  <AnimatePresence mode="wait">
                    {(sidebarExpanded || isMobile) ? (
                      <motion.div
                        key="expanded-logo"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="px-6 py-6 border-b border-[#e5e5e5]/10"
                      >
                        <Logo to="/" text={true} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="collapsed-logo"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="px-4 py-6 border-b border-[#e5e5e5]/10 flex justify-center items-center"
                      >
                        <Logo to="/" text={false} size={32} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Navigation Items */}
                  <div className={`flex-1 overflow-y-auto sidebar-scroll py-4 ${
                    !isMobile && !sidebarExpanded ? 'px-2' : 'px-4'
                  }`}>
                    <nav className="space-y-1">
                      {NAV_ITEMS.map(({ name, href, icon: Icon }, index) => {
                        const isActive = location.pathname === href || 
                          (href === "/home" && location.pathname === "/");
                        return (
                          <Link
                            key={name}
                            to={href}
                            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group overflow-hidden ${
                              isActive
                                ? "bg-[#2a2d33] text-[#ffffff]"
                                : "text-[#e5e5e5] hover:bg-[#2a2d33] hover:text-[#ffffff]"
                            } ${!isMobile && !sidebarExpanded ? 'justify-center' : ''}`}
                            title={!isMobile && !sidebarExpanded ? name : ''}
                          >
                            {/* Icon */}
                            <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                              <Icon 
                                size={24} 
                                className={`transition-colors duration-200 ${
                                  isActive 
                                    ? 'text-[#ffffff]' 
                                    : 'text-[#e5e5e5] group-hover:text-[#ffffff]'
                                }`}
                              />
                            </div>
                            
                            {/* Label - Only show when expanded or on mobile - Completely hidden when collapsed */}
                            <AnimatePresence>
                              {(!isMobile && !sidebarExpanded) ? null : (
                                <motion.span
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -10 }}
                                  transition={{ duration: 0.2, ease: "easeOut" }}
                                  className={`text-sm font-normal whitespace-nowrap ${
                                    isActive 
                                      ? 'text-[#ffffff] font-medium' 
                                      : 'text-[#e5e5e5] group-hover:text-[#ffffff]'
                                  }`}
                                >
                                  {name}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </Link>
                        );
                      })}
                      
                      {/* Log In / Sign Out */}
                      {isAuthenticated ? (
                        <button
                          onClick={logout}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg text-[#e5e5e5] hover:bg-[#2a2d33] hover:text-[#ffffff] transition-all duration-200 w-full group overflow-hidden ${
                            !isMobile && !sidebarExpanded ? 'justify-center' : ''
                          }`}
                          title={!isMobile && !sidebarExpanded ? 'Sign Out' : ''}
                        >
                          <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                            <LoginIcon 
                              size={24} 
                              className="text-[#e5e5e5] group-hover:text-[#ffffff] transition-colors duration-200"
                            />
                          </div>
                          <AnimatePresence>
                            {(!isMobile && !sidebarExpanded) ? null : (
                              <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="text-sm font-normal"
                              >
                                Sign Out
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </button>
                      ) : (
                        <Link
                          to="/signin"
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg text-[#e5e5e5] hover:bg-[#2a2d33] hover:text-[#ffffff] transition-all duration-200 group overflow-hidden ${
                            !isMobile && !sidebarExpanded ? 'justify-center' : ''
                          }`}
                          title={!isMobile && !sidebarExpanded ? 'Log In' : ''}
                        >
                          <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                            <LoginIcon 
                              size={24} 
                              className="text-[#e5e5e5] group-hover:text-[#ffffff] transition-colors duration-200"
                            />
                          </div>
                          <AnimatePresence>
                            {(!isMobile && !sidebarExpanded) ? null : (
                              <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="text-sm font-normal"
                              >
                                Log In
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </Link>
                      )}
                    </nav>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Hamburger Menu Button - Shows when sidebar is closed (mobile only) */}
        {isMobile && !sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="fixed top-4 left-4 z-50 p-3 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all duration-300"
            aria-label="Open sidebar"
          >
            <FaBars className="text-xl" />
          </button>
        )}

        {/* Main Content Area */}
        <motion.main
          animate={!isMobile ? {
            marginLeft: sidebarExpanded ? 220 : 90,
            transition: {
              type: "spring",
              damping: 30,
              stiffness: 300,
              mass: 0.8
            }
          } : {}}
          className={`flex-1 p-4 w-full bg-neutral-50 dark:bg-neutral-900 min-h-screen ${
            isMobile ? '' : ''
          }`}
        >
          <div key={location.pathname} className="animate-fade-in-up">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/watch-later" element={<WatchLaterPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/watch/:videoId" element={<WatchPage />} />
            <Route path="/videos" element={<VideosPage />} />
          </Routes>
          </div>
        </motion.main>
      </div>

      {/* Overlay (Mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.3,
              ease: "easeInOut"
            }}
            role="button"
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-30 bg-black/75 lg:hidden cursor-pointer backdrop-blur-sm"
            onClick={closeSidebar}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <VideoProvider>
        <AppContent />
      </VideoProvider>
    </AuthProvider>
  );
}

export default App;
