import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FaUserCircle, FaSignOutAlt, FaEdit, 
    FaVideo, FaList, FaInfoCircle, FaShareAlt, 
    FaCamera, FaCrown 
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { Button, Modal, Label, TextInput, Textarea } from 'flowbite-react';
import { useNavigate } from 'react-router-dom';
import { videoAPI, userAPI } from '../utils/api';
import VideoGrid from '../components/video/VideoGrid';
import { processProfileImage } from '../utils/imageParser';
import toast from 'react-hot-toast';

// Modern Tab Component with Framer Motion
const TabButton = ({ active, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 z-10 ${
            active 
                ? 'text-white' 
                : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
    >
        {active && (
            <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-lg shadow-purple-900/40"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
        )}
        <span className="relative z-10 flex items-center gap-2">
            <Icon className={active ? "text-white" : ""} />
            {label}
        </span>
    </button>
);

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
};



function ProfilePage() {
    const { user, logout, login, refreshUserProfile } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('videos');
    const [userVideos, setUserVideos] = useState([]);
    const [loadingVideos, setLoadingVideos] = useState(false);
    
    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editFormData, setEditFormData] = useState({
        name: '',
        bio: '',
        phone: ''
    });

    useEffect(() => {
        refreshUserProfile();
    }, []);

    useEffect(() => {
        if (activeTab === 'videos' && user) {
            fetchUserVideos();
        }
    }, [activeTab, user]);

    // Initialize form data when user data is available
    useEffect(() => {
        if (user) {
            setEditFormData({
                name: user.name || '',
                bio: user.bio || '',
                phone: user.phone || '',
                profileImage: '', // Don't pre-fill with existing URL, only send if changed
                previewImage: null // For local preview only
            });
        }
    }, [user, isEditModalOpen]); // Reset when modal opens/closes or user changes

    const fetchUserVideos = async () => {
        try {
            setLoadingVideos(true);
            const response = await videoAPI.getAll({ author: user.id });
            setUserVideos(response.content || []); 
        } catch (error) {
            console.error("Failed to fetch videos", error);
        } finally {
            setLoadingVideos(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/signin');
    };

    const handleUpdateProfile = async () => {
        try {
            setIsUpdating(true);
            // Call API to update profile
            const updatedUser = await userAPI.updateProfile(editFormData);
            
            // Update local user context (if login function accepts user object, or we need a specific setUser)
            // Ideally AuthContext should expose a generic 'updateUser' or we re-login/set state
            // For now, let's assume we can trigger a profile refresh or just notify the user
            toast.success("Profile updated successfully!");
            setIsEditModalOpen(false);
            
             // Force reload or use context method if available to reflect changes
             await refreshUserProfile(); 
        } catch (error) {
            console.error("Failed to update profile", error);
            toast.error("Failed to update profile. Please try again.");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f1014] text-gray-900 dark:text-white selection:bg-purple-500 selection:text-white transition-colors duration-300">
            {/* Edit Profile Modal */}
            <Modal show={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} popup size="md">
                <Modal.Header />
                <Modal.Body>
                    <div className="space-y-6">
                        <h3 className="text-xl font-medium text-gray-900 dark:text-white">Edit Profile</h3>
                        
                        {/* Profile Image Upload */}
                        <div className="flex flex-col items-center justify-center mb-4">
                            <div className="relative w-24 h-24 mb-2">
                                <img
                                    src={editFormData.previewImage || processProfileImage(
                                        user?.profileImageUrl || 
                                        user?.avatar || 
                                        user?.avatarUrl || 
                                        user?.picture || 
                                        user?.image || 
                                        user?.profileImage ||
                                        user?.photo ||
                                        user?.imageUrl
                                    ) || "https://via.placeholder.com/150"}
                                    alt="Profile Preview"
                                    className="w-full h-full rounded-full object-cover border-2 border-purple-500"
                                    referrerPolicy="no-referrer"
                                />
                                <label htmlFor="profile-upload" className="absolute bottom-0 right-0 bg-white dark:bg-gray-800 p-1.5 rounded-full shadow-md cursor-pointer border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform">
                                    <FaCamera className="text-gray-600 dark:text-gray-300 w-4 h-4" />
                                </label>
                                <input
                                    type="file"
                                    id="profile-upload"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                                                toast.error("Image size should be less than 5MB");
                                                return;
                                            }
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setEditFormData({
                                                    ...editFormData,
                                                    profileImage: reader.result, // Base64 string
                                                    previewImage: reader.result
                                                });
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                            </div>
                            <span className="text-xs text-gray-500">Click icon to change</span>
                        </div>

                        <div>
                            <div className="mb-2 block">
                                <Label htmlFor="name" value="Your Name" />
                            </div>
                            <TextInput
                                id="name"
                                value={editFormData.name}
                                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <div className="mb-2 block">
                                <Label htmlFor="bio" value="Biography" />
                            </div>
                            <Textarea
                                id="bio"
                                placeholder="Tell us about yourself..."
                                value={editFormData.bio}
                                onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                                rows={4}
                            />
                        </div>
                        <div>
                            <div className="mb-2 block">
                                <Label htmlFor="phone" value="Phone Number" />
                            </div>
                            <TextInput
                                id="phone"
                                placeholder="+91 9876543210"
                                value={editFormData.phone}
                                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                            />
                        </div>
                        <div className="w-full flex justify-end gap-2">
                             <Button color="gray" onClick={() => setIsEditModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleUpdateProfile} isProcessing={isUpdating} gradientDuoTone="purpleToBlue">
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </Modal.Body>
            </Modal>

            {/* Immersive Header Background */}
            <div className="relative h-80 w-full overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200 via-gray-50 to-gray-50 dark:from-indigo-900/60 dark:via-[#0f1014] dark:to-[#0f1014] z-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-transparent to-transparent dark:from-[#0f1014] z-10" />
                
                {/* Abstract Decorative Elements */}
                <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl filter opacity-40 animate-pulse" />
                <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-3xl filter opacity-30" />
            </div>

            <motion.div 
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 -mt-40"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >




                {/* Profile Card */}
                <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-end gap-8 mb-12">
                    {/* Avatar Group */}
                    <div className="relative group">
                        <motion.div 
                            whileHover={{ scale: 1.05, rotate: 2 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-40 h-40 md:w-48 md:h-48 rounded-3xl p-1 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 shadow-2xl shadow-purple-900/20 dark:shadow-purple-900/50"
                        >
                            <div className="w-full h-full rounded-[20px] overflow-hidden bg-white dark:bg-[#1a1c24] relative">
                                {(() => {
                                    const imageSource = user?.profileImageUrl || 
                                                       user?.avatar || 
                                                       user?.avatarUrl || 
                                                       user?.picture || 
                                                       user?.image || 
                                                       user?.profileImage ||
                                                       user?.photo ||
                                                       user?.imageUrl;
                                    
                                    const processedImage = processProfileImage(imageSource);
                                    
                                    return (
                                        <>
                                            {processedImage && (
                                                <img 
                                                    src={processedImage} 
                                                    alt={user?.name || "Profile"} 
                                                    className="w-full h-full object-cover block" 
                                                    referrerPolicy="no-referrer"
                                                    onError={(e) => {
                                                        console.error("Image failed to load:", processedImage);
                                                        e.target.style.display = 'none';
                                                    }}
                                                />
                                            )}
                                            
                                            {!processedImage && (
                                                <div className="fallback-avatar w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                                                    <span className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">
                                                        {user?.name?.charAt(0) || <FaUserCircle />}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </motion.div>
                        <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="absolute -bottom-2 -right-2 p-3 bg-white dark:bg-[#1a1c24] text-gray-700 dark:text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700"
                        >
                            <FaCamera size={18} />
                        </motion.button>
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1 pb-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="flex items-center gap-3 mb-2"
                                >
                                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
                                        {user?.name || "User Name"}
                                    </h1>
                                    <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-black bg-gradient-to-r from-yellow-400 to-yellow-200 rounded-full flex items-center gap-1 shadow-sm">
                                        <FaCrown size={10} />
                                        Premium
                                    </span>
                                </motion.div>
                                <motion.p 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-gray-500 dark:text-gray-400 text-lg flex items-center gap-2"
                                >
                                    @{user?.email?.split('@')[0] || "username"}
                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                    <span>Joined {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                                </motion.p>
                            </div>

                            {/* Action Buttons */}
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                                className="flex items-center gap-3"
                            >
                                <button 
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="px-6 py-2.5 rounded-xl bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 border border-gray-200 dark:border-white/10 backdrop-blur-md transition-all text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-white shadow-sm"
                                >
                                    <FaEdit /> Edit
                                </button>
                                <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/30 transition-all text-sm font-bold flex items-center gap-2 text-white">
                                    <FaShareAlt /> Share
                                </button>
                                <button 
                                    onClick={handleLogout}
                                    className="p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all"
                                >
                                    <FaSignOutAlt />
                                </button>
                            </motion.div>
                        </div>


                    </div>
                </motion.div>

                {/* Content Section */}
                <div className="min-h-[500px]">
                    {/* Floating Tab Bar via layoutId for smooth sliding */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-lg p-1.5 rounded-2xl inline-flex border border-gray-200 dark:border-white/10 shadow-sm">
                            {[
                                { id: 'videos', label: 'My Videos', icon: FaVideo },
                                { id: 'playlists', label: 'Playlists', icon: FaList },
                                { id: 'about', label: 'About', icon: FaInfoCircle }
                            ].map((tab) => (
                                <TabButton 
                                    key={tab.id}
                                    active={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    icon={tab.icon}
                                    label={tab.label}
                                />
                            ))}
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === 'videos' && (
                                <div className="space-y-6">
                                    {loadVideosAndRender(userVideos, loadingVideos)}
                                </div>
                            )}
                            {activeTab === 'playlists' && (
                                <div className="grid place-items-center py-20 bg-white/50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-300 dark:border-white/10">
                                    <FaList className="text-6xl text-gray-300 dark:text-gray-600 mb-4" />
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Playlists Yet</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-sm">Create curated collections of your favorite content to share with the world.</p>
                                    <Button gradientDuoTone="purpleToBlue" pill>
                                        Create Playlist
                                    </Button>
                                </div>
                            )}
                            {activeTab === 'about' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="md:col-span-2 bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-100 dark:border-white/10 shadow-sm dark:shadow-none">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <FaUserCircle className="text-purple-500" /> Biography
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                                            {user?.bio || "Hello! I love creating content and sharing it with the world. Subscribe to my channel to stay updated with my latest videos."}
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-100 dark:border-white/10 h-fit shadow-sm dark:shadow-none">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Details</h3>
                                        <div className="space-y-4">
                                            {user?.phone && (
                                                <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-white/10">
                                                    <span className="text-gray-500 dark:text-gray-400">Phone</span>
                                                    <span className="text-gray-900 dark:text-white font-medium">{user.phone}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-white/10">
                                                <span className="text-gray-500 dark:text-gray-400">Location</span>
                                                <span className="text-gray-900 dark:text-white font-medium">India</span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-500 dark:text-gray-400">Joined</span>
                                                <span className="text-gray-900 dark:text-white font-medium">{new Date().toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}

function loadVideosAndRender(videos, loading) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="animate-pulse bg-gray-200 dark:bg-white/5 rounded-xl aspect-video" />
                ))}
            </div>
        );
    }
    
    if (!videos || videos.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center py-20 text-center bg-white/50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-300 dark:border-white/10">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                    <FaVideo className="text-3xl text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No videos found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8">Start your journey by uploading your first video.</p>
                <Button href="/upload" gradientDuoTone="purpleToPink" size="xl" pill>
                    Upload Video
                </Button>
            </div>
        );
    }

    return <VideoGrid videos={videos} title={null} />;
}

export default ProfilePage;
