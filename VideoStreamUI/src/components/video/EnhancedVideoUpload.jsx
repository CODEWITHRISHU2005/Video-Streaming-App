import React, { useState, useRef, useCallback, useEffect } from "react";
import { FaCloudUploadAlt, FaTimes, FaCheck, FaExclamationTriangle, FaVideo, FaImage, FaSpinner, FaMagic, FaGlobe, FaLock, FaPlay, FaClock, FaHeart } from "react-icons/fa";
import { Button, Label, TextInput, Textarea, Progress, Alert, Badge } from "flowbite-react";
import { motion, AnimatePresence } from "framer-motion";
import { videoAPI } from "../../utils/api";
import { validateVideoFile, validateImageFile, formatFileSize } from "../../utils/videoUtils";
import toast from "react-hot-toast";

function EnhancedVideoUpload() {
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeDropZone, setActiveDropZone] = useState(null); // 'video' or 'image'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Tag management
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState("");

  const [meta, setMeta] = useState({
    title: "",
    description: "",
    isPublic: true
  });
  const [validationErrors, setValidationErrors] = useState({});
  const videoInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [videoPreview, imagePreview]);

  const handleDragOver = useCallback((e, zone) => {
    e.preventDefault();
    setIsDragOver(true);
    setActiveDropZone(zone);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    setActiveDropZone(null);
  }, []);

  const handleDrop = useCallback((e, zone) => {
    e.preventDefault();
    setIsDragOver(false);
    setActiveDropZone(null);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (zone === 'video') {
         if (file.type.startsWith('video/')) {
            handleVideoFileSelect(file);
         } else {
            toast.error("Please drop a valid video file here.");
         }
      } else if (zone === 'image') {
         if (file.type.startsWith('image/')) {
            handleImageFileSelect(file);
         } else {
            toast.error("Please drop a valid image file here.");
         }
      }
    }
  }, []);

  const handleVideoFileSelect = (file) => {
    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      toast.error(validation.error);
      setValidationErrors(prev => ({ ...prev, videoFile: validation.error }));
      return;
    }
    setSelectedVideoFile(file);
    setValidationErrors(prev => ({ ...prev, videoFile: null }));
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    if (!meta.title) {
      setMeta(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
    }
  };

  const handleImageFileSelect = (file) => {
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast.error(validation.error);
      setValidationErrors(prev => ({ ...prev, imageFile: validation.error }));
      return;
    }
    setSelectedImageFile(file);
    setValidationErrors(prev => ({ ...prev, imageFile: null }));
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleVideoInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleVideoFileSelect(file);
  };

  const handleImageInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleImageFileSelect(file);
  };

  const handleMetaChange = (e) => {
    const { name, value } = e.target;
    setMeta(prev => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' && currentTag.trim()) {
      e.preventDefault();
      if (!tags.includes(currentTag.trim())) {
        setTags([...tags, currentTag.trim()]);
      }
      setCurrentTag("");
    } else if (e.key === 'Backspace' && !currentTag && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const validateForm = () => {
    const errors = {};
    if (!selectedVideoFile) errors.videoFile = "Please select a video file";
    if (!selectedImageFile) errors.imageFile = "Please select a thumbnail image";
    if (!meta.title.trim()) errors.title = "Title is required";
    if (meta.title.length > 100) errors.title = "Title must be less than 100 characters";
    if (meta.description.length > 500) errors.description = "Description must be less than 500 characters";
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsUploading(true);
    setUploadStatus({ type: 'uploading', message: 'Uploading video and thumbnail...' });

    try {
      const formData = new FormData();
      formData.append("title", meta.title.trim());
      formData.append("description", meta.description.trim());
      formData.append("tags", tags.join(","));
      formData.append("isPublic", meta.isPublic);
      formData.append("videoFile", selectedVideoFile);
      formData.append("thumbnailFile", selectedImageFile);

      const response = await videoAPI.upload(formData, (progress) => {
        setUploadProgress(progress);
      });

      setUploadStatus({
        type: 'success',
        message: `Video uploaded successfully!`,
        videoId: response.videoId
      });
      
      toast.success("Video uploaded successfully!");
      // Don't reset immediately so user can see success state
      
    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = 'Upload failed. Please try again.';
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setUploadStatus({ type: 'error', message: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedVideoFile(null);
    setSelectedImageFile(null);
    setVideoPreview(null);
    setImagePreview(null);
    setMeta({ title: "", description: "", isPublic: true });
    setTags([]);
    setCurrentTag("");
    setUploadProgress(0);
    setUploadStatus(null);
    setValidationErrors({});
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeVideoFile = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
    setSelectedVideoFile(null);
    setValidationErrors(prev => ({ ...prev, videoFile: null }));
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const removeImageFile = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setSelectedImageFile(null);
    setValidationErrors(prev => ({ ...prev, imageFile: null }));
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-4"
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Media Uploads (7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Video Dropzone */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FaVideo className="text-blue-500" />
              Video Source
            </h3>
            
            <motion.div
              layout
              className={`relative group border-2 border-dashed rounded-2xl transition-all duration-300 overflow-hidden ${
                isDragOver && activeDropZone === 'video'
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02] shadow-xl"
                  : validationErrors.videoFile
                  ? "border-red-300 dark:border-red-600 bg-red-50/10"
                  : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50/50 dark:bg-gray-700/30"
              }`}
              style={{ minHeight: '300px' }}
              onDragOver={(e) => handleDragOver(e, 'video')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'video')}
              onClick={() => !selectedVideoFile && videoInputRef.current?.click()}
            >
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoInputChange}
                className="hidden"
              />
              
              <AnimatePresence mode="wait">
                {selectedVideoFile ? (
                  <motion.div
                    key="selected"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative w-full h-full min-h-[300px] bg-black flex items-center justify-center group"
                  >
                    {videoPreview && (
                      <video
                        src={videoPreview}
                        className="w-full h-full object-contain max-h-[400px]"
                        controls
                      />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeVideoFile();
                      }}
                      className="absolute top-4 right-4 p-3 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-700 transform hover:scale-110 z-10"
                    >
                      <FaTimes />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                      <p className="text-sm font-medium truncate">{selectedVideoFile.name}</p>
                      <p className="text-xs opacity-75">{formatFileSize(selectedVideoFile.size)}</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-8 text-center"
                  >
                    <motion.div 
                      animate={{ y: isDragOver && activeDropZone === 'video' ? -10 : 0 }}
                      className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6"
                    >
                      <FaCloudUploadAlt className="text-4xl text-blue-500" />
                    </motion.div>
                    <p className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">
                      Upload Video
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                      Drag & drop your video file here, or click to browse.
                    </p>
                    <Badge color="gray" className="mt-4">MP4, WebM, AVI (Max 500MB)</Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            {validationErrors.videoFile && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2 font-medium">
                <FaExclamationTriangle />
                {validationErrors.videoFile}
              </p>
            )}
          </div>

          {/* Thumbnail Dropzone */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FaImage className="text-green-500" />
              Thumbnail
            </h3>
            
            <motion.div
              layout
              className={`relative group border-2 border-dashed rounded-2xl transition-all duration-300 overflow-hidden ${
                isDragOver && activeDropZone === 'image'
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20 scale-[1.02] shadow-xl"
                  : validationErrors.imageFile
                  ? "border-red-300 dark:border-red-600 bg-red-50/10"
                  : "border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 bg-gray-50/50 dark:bg-gray-700/30"
              }`}
              style={{ minHeight: '220px' }}
              onDragOver={(e) => handleDragOver(e, 'image')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'image')}
              onClick={() => !selectedImageFile && imageInputRef.current?.click()}
            >
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageInputChange}
                className="hidden"
              />
              
              <AnimatePresence mode="wait">
                {selectedImageFile ? (
                  <motion.div
                    key="selected"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative w-full h-full min-h-[220px]"
                  >
                    <img
                      src={imagePreview}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover min-h-[220px]"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImageFile();
                      }}
                      className="absolute top-4 right-4 p-3 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-700 transform hover:scale-110"
                    >
                      <FaTimes />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-6"
                  >
                    <motion.div 
                       animate={{ y: isDragOver && activeDropZone === 'image' ? -10 : 0 }}
                       className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4"
                    >
                      <FaImage className="text-3xl text-green-500" />
                    </motion.div>
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                      Upload Thumbnail
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      1280x720 recommended (JPG, PNG)
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            {validationErrors.imageFile && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2 font-medium">
                <FaExclamationTriangle />
                {validationErrors.imageFile}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Metadata & Preview (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Live Preview Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Preview
            </h3>
            <div className="bg-white dark:bg-neutral-800 rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-neutral-700 transform transition-all hover:shadow-xl">
              {/* Thumbnail Area */}
              <div className="relative aspect-video bg-gray-100 dark:bg-neutral-700">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <FaImage className="text-4xl opacity-50" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">
                  00:00
                </div>
              </div>
              {/* Info Area */}
              <div className="p-4">
                 <h4 className="font-bold text-neutral-900 dark:text-white line-clamp-2 mb-1">
                   {meta.title || "Your Video Title"}
                 </h4>
                 <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-2 mb-2">
                    <span>Just now</span>
                    <span>•</span>
                    <span>0 views</span>
                 </div>
                 <div className="flex gap-2">
                    {tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                        #{tag}
                      </span>
                    ))}
                 </div>
              </div>
            </div>
          </div>

          {/* Details Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <FaMagic className="text-purple-500" />
              Details
            </h3>

            <div className="space-y-5">
              <div>
                <Label htmlFor="title" value="Title" className="mb-2" />
                <TextInput
                  id="title"
                  name="title"
                  value={meta.title}
                  onChange={handleMetaChange}
                  placeholder="Give your video a catchy title"
                  color={validationErrors.title ? "failure" : "gray"}
                  helperText={validationErrors.title}
                  className="focus:ring-2 ring-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="description" value="Description" className="mb-2" />
                <Textarea
                  id="description"
                  name="description"
                  value={meta.description}
                  onChange={handleMetaChange}
                  placeholder="What is your video about?"
                  rows={4}
                  className="resize-none focus:ring-blue-500 bg-gray-50 dark:bg-gray-700/50"
                  color={validationErrors.description ? "failure" : "gray"}
                  helperText={validationErrors.description}
                />
              </div>

              <div>
                <Label value="Tags" className="mb-2" />
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow">
                  {tags.map((tag, index) => (
                    <Badge key={index} color="indigo" size="sm" className="px-2 py-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 hover:text-red-500"
                      >
                        <FaTimes size={10} />
                      </button>
                    </Badge>
                  ))}
                  <input
                    type="text"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? "Type tags..." : ""}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-1 min-w-[80px] dark:text-white placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Label value="Visibility" className="mb-3 block" />
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => setMeta(prev => ({ ...prev, isPublic: true }))}
                    className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${
                      meta.isPublic 
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                        : "border-gray-200 dark:border-gray-600 hover:border-blue-300"
                    }`}
                  >
                    <FaGlobe className={`text-2xl ${meta.isPublic ? "text-blue-500" : "text-gray-400"}`} />
                    <span className={`text-sm font-medium ${meta.isPublic ? "text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400"}`}>Public</span>
                  </div>
                  <div 
                    onClick={() => setMeta(prev => ({ ...prev, isPublic: false }))}
                    className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${
                      !meta.isPublic 
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" 
                        : "border-gray-200 dark:border-gray-600 hover:border-purple-300"
                    }`}
                  >
                    <FaLock className={`text-2xl ${!meta.isPublic ? "text-purple-500" : "text-gray-400"}`} />
                    <span className={`text-sm font-medium ${!meta.isPublic ? "text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-400"}`}>Private</span>
                  </div>
                </div>
              </div>

              {/* Progress and Status */}
              <AnimatePresence>
                {isUploading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 mt-4"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">Uploading...</span>
                      <span className="text-gray-600 dark:text-gray-400">{uploadProgress}%</span>
                    </div>
                    <Progress progress={uploadProgress} color="blue" size="lg" />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {uploadStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                  >
                    <Alert
                      color={uploadStatus.type === 'success' ? 'success' : uploadStatus.type === 'error' ? 'failure' : 'info'}
                      className="rounded-lg shadow-sm"
                    >
                      <span className="font-medium flex items-center gap-2">
                        {uploadStatus.type === 'success' ? <FaCheck /> : uploadStatus.type === 'error' ? <FaExclamationTriangle /> : <FaSpinner className="animate-spin" />}
                        {uploadStatus.message}
                      </span>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-4 pt-6 mt-6 border-t border-gray-100 dark:border-gray-700">
                <Button color="gray" onClick={resetForm} disabled={isUploading} className="flex-1">
                  Reset
                </Button>
                <Button
                  type="submit"
                  gradientDuoTone="purpleToBlue"
                  disabled={!selectedVideoFile || !selectedImageFile || isUploading}
                  className="flex-1 shadow-lg hover:shadow-xl transition-shadow"
                  isProcessing={isUploading}
                >
                  {isUploading ? "Uploading..." : "Publish Video"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}

export default EnhancedVideoUpload;
