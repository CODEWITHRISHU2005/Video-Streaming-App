import React from 'react';
import { motion } from 'framer-motion';
import { FaCloudUploadAlt } from 'react-icons/fa';
import EnhancedVideoUpload from '../components/video/EnhancedVideoUpload';

function UploadPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative overflow-hidden transition-colors duration-300">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 opacity-40 dark:opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg transform rotate-3 hover:rotate-6 transition-transform">
            <FaCloudUploadAlt className="text-3xl text-white" />
          </div>
          
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            Upload Your Video
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Share your story with the world. Drag and drop your video files to get started.
          </p>
        </motion.div>

        {/* Upload Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <EnhancedVideoUpload />
        </motion.div>
      </div>
    </div>
  );
}

export default UploadPage;
