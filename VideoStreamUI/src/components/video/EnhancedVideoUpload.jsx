import React, { useState, useRef, useCallback } from "react";
import { FaCloudUploadAlt, FaTimes, FaCheck, FaExclamationTriangle, FaVideo, FaImage, FaFileVideo, FaSpinner } from "react-icons/fa";
import { Button, Label, TextInput, Textarea, Progress, Alert, Badge } from "flowbite-react";
import { motion, AnimatePresence } from "framer-motion";
import { videoAPI } from "../../utils/api";
import { validateVideoFile, validateImageFile, formatFileSize } from "../../utils/videoUtils";
import toast from "react-hot-toast";

function EnhancedVideoUpload() {
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [meta, setMeta] = useState({
    title: "",
    description: "",
    tags: "",
    isPublic: true
  });
  const [validationErrors, setValidationErrors] = useState({});
  const videoInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        handleVideoFileSelect(file);
      } else if (file.type.startsWith('image/')) {
        handleImageFileSelect(file);
      } else {
        toast.error("Unsupported file type. Please upload a video or image.");
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
    
    // Create preview
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    
    // Auto-fill title if empty
    if (!meta.title) {
      setMeta(prev => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, "")
      }));
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
    
    // Create preview
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleVideoInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleVideoFileSelect(file);
    }
  };

  const handleImageInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageFileSelect(file);
    }
  };

  const handleMetaChange = (e) => {
    const { name, value } = e.target;
    setMeta(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!selectedVideoFile) {
      errors.videoFile = "Please select a video file";
    }
    
    if (!selectedImageFile) {
      errors.imageFile = "Please select a thumbnail image";
    }

    if (!meta.title.trim()) {
      errors.title = "Title is required";
    }
    
    if (meta.title.length > 100) {
      errors.title = "Title must be less than 100 characters";
    }
    
    if (meta.description.length > 500) {
      errors.description = "Description must be less than 500 characters";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: 'uploading', message: 'Uploading video and thumbnail...' });

    try {
      const formData = new FormData();
      formData.append("title", meta.title.trim());
      formData.append("description", meta.description.trim());
      formData.append("tags", meta.tags.trim());
      formData.append("isPublic", meta.isPublic);
      formData.append("videoFile", selectedVideoFile);
      formData.append("thumbnailFile", selectedImageFile);

      const response = await videoAPI.upload(formData, (progress) => {
        setUploadProgress(progress);
      });

      setUploadStatus({
        type: 'success',
        message: `Video uploaded successfully! Video ID: ${response.videoId}`,
        videoId: response.videoId
      });
      
      toast.success("Video uploaded successfully!");
      resetForm();
      
    } catch (error) {
      console.error('Upload error:', error);
      
      let errorMessage = 'Upload failed. Please try again.';
      
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        errorMessage = 'Network error. Please check your connection and ensure the server is running.';
      } else if (error.response?.status === 413) {
        errorMessage = 'File too large. Please reduce the file size and try again.';
      } else if (error.response?.status === 415) {
        errorMessage = 'Unsupported file type. Please use supported video formats.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to upload videos.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setUploadStatus({
        type: 'error',
        message: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedVideoFile(null);
    setSelectedImageFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    setMeta({
      title: "",
      description: "",
      tags: "",
      isPublic: true
    });
    setUploadProgress(0);
    setUploadStatus(null);
    setValidationErrors({});
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const removeVideoFile = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    setSelectedVideoFile(null);
    setValidationErrors(prev => ({ ...prev, videoFile: null }));
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  const removeImageFile = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    setSelectedImageFile(null);
    setValidationErrors(prev => ({ ...prev, imageFile: null }));
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
          {/* Video File Upload */}
          <div>
            <Label htmlFor="video-file-upload" value="Video File" className="mb-3 text-base font-semibold text-gray-900 dark:text-white" />
            <div
              className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${
                isDragOver
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.01] shadow-lg"
                  : validationErrors.videoFile
                  ? "border-red-300 dark:border-red-600 bg-red-50/50 dark:bg-red-900/10"
                  : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50/50 dark:bg-gray-700/30"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !selectedVideoFile && videoInputRef.current?.click()}
            >
              <input
                ref={videoInputRef}
                id="video-file-upload"
                name="videoFile"
                type="file"
                accept="video/*"
                onChange={handleVideoInputChange}
                className="hidden"
              />
              
              <AnimatePresence mode="wait">
                {selectedVideoFile ? (
                  <motion.div
                    key="selected"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-6"
                  >
                    <div className="flex items-start gap-4">
                      {videoPreview ? (
                        <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                          <video
                            src={videoPreview}
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <FaFileVideo className="text-white text-xl" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-32 h-20 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <FaVideo className="text-white text-2xl" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {selectedVideoFile.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {formatFileSize(selectedVideoFile.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeVideoFile();
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <FaTimes />
                          </button>
                        </div>
                        <Badge color="success" size="sm" className="mt-2">
                          <FaCheck className="mr-1" />
                          Video selected
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-12 text-center cursor-pointer"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
                        <FaCloudUploadAlt className="text-3xl text-blue-500 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          MP4, WebM, AVI up to 500MB
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {validationErrors.videoFile && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
              >
                <FaExclamationTriangle className="text-xs" />
                {validationErrors.videoFile}
              </motion.p>
            )}
          </div>

          {/* Thumbnail Upload */}
          <div>
            <Label htmlFor="image-file-upload" value="Thumbnail Image" className="mb-3 text-base font-semibold text-gray-900 dark:text-white" />
            <div
              className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${
                isDragOver
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.01]"
                  : validationErrors.imageFile
                  ? "border-red-300 dark:border-red-600 bg-red-50/50 dark:bg-red-900/10"
                  : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50/50 dark:bg-gray-700/30"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !selectedImageFile && imageInputRef.current?.click()}
            >
              <input
                ref={imageInputRef}
                id="image-file-upload"
                name="imageFile"
                type="file"
                accept="image/*"
                onChange={handleImageInputChange}
                className="hidden"
              />
              
              <AnimatePresence mode="wait">
                {selectedImageFile ? (
                  <motion.div
                    key="selected"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-6"
                  >
                    <div className="flex items-start gap-4">
                      {imagePreview ? (
                        <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                          <img
                            src={imagePreview}
                            alt="Thumbnail preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-32 h-20 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                          <FaImage className="text-white text-2xl" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {selectedImageFile.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {formatFileSize(selectedImageFile.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImageFile();
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <FaTimes />
                          </button>
                        </div>
                        <Badge color="success" size="sm" className="mt-2">
                          <FaCheck className="mr-1" />
                          Thumbnail selected
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8 text-center cursor-pointer"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-900/30 dark:to-teal-900/30 flex items-center justify-center">
                        <FaImage className="text-xl text-green-500 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          PNG, JPG, GIF up to 5MB
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {validationErrors.imageFile && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
              >
                <FaExclamationTriangle className="text-xs" />
                {validationErrors.imageFile}
              </motion.p>
            )}
          </div>

          {/* Video Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="title" value="Title" className="mb-2 text-sm font-semibold" />
              <TextInput
                id="title"
                name="title"
                value={meta.title}
                onChange={handleMetaChange}
                placeholder="Enter video title"
                color={validationErrors.title ? "failure" : "gray"}
                helperText={validationErrors.title}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="tags" value="Tags (optional)" className="mb-2 text-sm font-semibold" />
              <TextInput
                id="tags"
                name="tags"
                value={meta.tags}
                onChange={handleMetaChange}
                placeholder="e.g., tech, tutorial, music"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description" value="Description (optional)" className="mb-2 text-sm font-semibold" />
            <Textarea
              id="description"
              name="description"
              value={meta.description}
              onChange={handleMetaChange}
              placeholder="Tell viewers about your video..."
              rows={4}
              color={validationErrors.description ? "failure" : "gray"}
              helperText={validationErrors.description}
            />
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
            <input
              type="checkbox"
              id="isPublic"
              name="isPublic"
              checked={meta.isPublic}
              onChange={(e) => setMeta(prev => ({ ...prev, isPublic: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <Label htmlFor="isPublic" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Make this video public
            </Label>
          </div>

          {/* Upload Progress */}
          <AnimatePresence>
            {isUploading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <FaSpinner className="animate-spin" />
                    <span className="font-medium">Uploading...</span>
                  </div>
                  <span className="font-semibold text-blue-700 dark:text-blue-300">{uploadProgress}%</span>
                </div>
                <Progress progress={uploadProgress} color="blue" size="lg" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload Status */}
          <AnimatePresence>
            {uploadStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Alert
                  color={uploadStatus.type === 'success' ? 'success' : uploadStatus.type === 'error' ? 'failure' : 'info'}
                  className="rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {uploadStatus.type === 'success' ? (
                      <FaCheck className="text-green-500" />
                    ) : uploadStatus.type === 'error' ? (
                      <FaExclamationTriangle className="text-red-500" />
                    ) : (
                      <FaCloudUploadAlt className="text-blue-500" />
                    )}
                    <span className="text-sm">{uploadStatus.message}</span>
                  </div>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              color="gray"
              onClick={resetForm}
              disabled={isUploading}
              className="px-6"
            >
              Reset
            </Button>
            
            <Button
              type="submit"
              color="blue"
              disabled={!selectedVideoFile || !selectedImageFile || isUploading}
              className="px-8 min-w-[140px]"
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <FaSpinner className="animate-spin" />
                  Uploading...
                </span>
              ) : (
                "Upload Video"
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default EnhancedVideoUpload;
