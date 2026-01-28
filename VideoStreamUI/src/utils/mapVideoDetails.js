// src/utils/mapVideoDetails.js

const API_BASE = import.meta.env.VITE_API_BASE || "/api/videos";

const buildStreamUrl = (details, id) => {
  return (
    details?.streamUrl ||
    details?.stream_url ||
    details?.playbackUrl ||
    details?.playback_url ||
    details?.videoUrl ||
    details?.video_url ||
    `${API_BASE}/stream/${id}`
  );
};

const buildHlsUrl = (details, id) => {
  return (
    details?.hlsUrl ||
    details?.hls_url ||
    `${API_BASE}/${id}/master.m3u8`
  );
};

export function mapVideoDetails(input) {
  const details = input?.video ?? input;
  const id = details?.video_id ?? details?.videoId ?? details?.id;
  if (!id) throw new Error("Video ID missing");

  // Parse duration - handle different formats and field names
  let duration = 0;
  
  // Check multiple possible field names for duration (including nested)
  const durationValue = details.duration ?? 
                       details.videoDuration ?? 
                       details.video_duration ?? 
                       details.length ?? 
                       details.videoLength ?? 
                       details.video_length ??
                       details.durationInSeconds ??
                       details.duration_in_seconds ??
                       details.durationSeconds ??
                       details.duration_seconds ??
                       details.time ??
                       details.videoTime ??
                       details.video_time ??
                       details.metadata?.duration ??
                       details.metadata?.videoDuration ??
                       details.metadata?.durationInSeconds ??
                       details.videoMetadata?.duration ??
                       details.videoMetadata?.videoDuration ??
                       details.fileMetadata?.duration ??
                       details.fileMetadata?.videoDuration ??
                       input?.duration ??
                       input?.video?.duration;
  
  // Debug logging - show actual keys and values when duration not found
  if (process.env.NODE_ENV === 'development' && !durationValue) {
    const availableKeys = Object.keys(details);
    const detailsPreview = {};
    availableKeys.forEach(key => {
      const value = details[key];
      // Show value type and first 100 chars if it's a string/object
      if (typeof value === 'object' && value !== null) {
        detailsPreview[key] = `[${Array.isArray(value) ? 'Array' : 'Object'}] ${JSON.stringify(value).substring(0, 100)}`;
      } else {
        detailsPreview[key] = value;
      }
    });
    console.warn('Video duration not found for video:', id);
    console.log('Available keys:', availableKeys);
    console.log('Details preview:', detailsPreview);
  }
  
  if (durationValue !== undefined && durationValue !== null && durationValue !== '') {
    if (typeof durationValue === 'string') {
      // If it's a string, try to parse it
      if (durationValue.includes(':')) {
        // Already in time format, keep as string for formatDuration to handle
        duration = durationValue;
      } else {
        // Try to parse as number
        const parsed = parseFloat(durationValue);
        duration = isNaN(parsed) ? 0 : parsed;
      }
    } else if (typeof durationValue === 'number') {
      duration = durationValue;
    }
  }

  // Handle uploadDate mapping with support for Java Instant (seconds or ISO string)
  let uploadDate = details.uploadDate || details.upload_date || details.createdAt || details.created_at;
  
  // If uploadDate is a number (timestamp), check if it's in seconds (Java Instant often serializes to epoch seconds)
  // A timestamp in seconds is ~10 digits, milliseconds is ~13 digits
  if (typeof uploadDate === 'number') {
    // If less than 100 billion, it's likely seconds (valid until year 5138)
    if (uploadDate < 100000000000) {
      uploadDate = uploadDate * 1000;
    }
  }

  // ========== CLOUDFLARE R2 URLS ==========
  // Prefer CDN URLs over direct R2 URLs for better performance
  const thumbnailUrl = details.thumbnailCdnUrl ?? 
                       details.thumbnail_cdn_url ?? 
                       details.thumbnailUrl ?? 
                       details.thumbnail_url ?? 
                       `${API_BASE}/thumbnail/${id}`;

  const videoUrl = details.videoCdnUrl ?? 
                   details.video_cdn_url ?? 
                   details.videoUrl ?? 
                   details.video_url ?? 
                   details.url ?? 
                   buildStreamUrl(details, id);

  // ========== VIDEO METADATA ==========
  const resolution = details.resolution ?? details.videoResolution ?? details.video_resolution ?? null;
  const quality = details.quality ?? details.videoQuality ?? details.video_quality ?? 'Auto';
  const frameRate = details.frameRate ?? details.frame_rate ?? details.fps ?? null;
  
  // ========== FILE INFO ==========
  const fileSize = details.videoFileSize ?? 
                   details.video_file_size ?? 
                   details.fileSize ?? 
                   details.file_size ?? 
                   null;

  const originalFilename = details.originalFilename ?? 
                          details.original_filename ?? 
                          details.fileName ?? 
                          details.file_name ?? 
                          null;

  // ========== ENGAGEMENT METRICS ==========
  const viewCount = details.viewCount ?? details.view_count ?? details.views ?? 0;
  const likeCount = details.likeCount ?? details.like_count ?? details.likes ?? 0;
  const dislikeCount = details.dislikeCount ?? details.dislike_count ?? details.dislikes ?? 0;
  const commentCount = details.commentCount ?? details.comment_count ?? details.comments ?? 0;

  // ========== STATUS & PRIVACY ==========
  const status = details.status ?? 'PUBLISHED';
  const isPublic = details.isPublic ?? details.is_public ?? true;
  const allowComments = details.allowComments ?? details.allow_comments ?? true;
  const ageRestricted = details.ageRestricted ?? details.age_restricted ?? false;

  // ========== USER/CREATOR ==========
  const userId = details.userId ?? details.user_id ?? details.creatorId ?? details.creator_id ?? null;
  const userName = details.userName ?? details.user_name ?? details.creatorName ?? details.creator_name ?? null;

  // ========== DATES ==========
  const publishedDate = details.publishedDate ?? details.published_date ?? details.publishDate ?? details.publish_date ?? null;
  const updatedDate = details.updatedDate ?? details.updated_date ?? details.updatedAt ?? details.updated_at ?? null;

  return {
    // Basic Info
    id,
    title: details.title || 'Untitled Video',
    description: details.description || "",
    
    // Duration & Upload Info
    duration: duration,
    uploadDate: uploadDate,
    publishedDate: publishedDate,
    updatedDate: updatedDate,
    
    // File Info
    fileSize: fileSize,
    originalFilename: originalFilename,
    contentType: details.contentType ?? details.content_type ?? 'video/mp4',
    
    // Video Metadata
    resolution: resolution,
    quality: quality,
    frameRate: frameRate,
    
    // URLs (Cloudflare R2 + CDN)
    thumbnailUrl: thumbnailUrl,
    url: videoUrl,
    hlsUrl: buildHlsUrl(details, id),
    
    // R2 Storage Keys (for debugging/admin purposes)
    r2VideoKey: details.r2VideoKey ?? details.r2_video_key ?? null,
    r2ThumbnailKey: details.r2ThumbnailKey ?? details.r2_thumbnail_key ?? null,
    r2BucketName: details.r2BucketName ?? details.r2_bucket_name ?? null,
    
    // Engagement Metrics
    views: viewCount,
    likes: likeCount,
    dislikes: dislikeCount,
    comments: commentCount,
    
    // Category & Tags
    tags: Array.isArray(details.tags) 
      ? details.tags 
      : (typeof details.tags === 'string' ? details.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
    category: details.category || details.genre || 'General',
    
    // Status & Privacy
    status: status,
    isPublic: isPublic,
    allowComments: allowComments,
    ageRestricted: ageRestricted,
    
    // Creator Info
    userId: userId,
    userName: userName,
    
    // Legacy/Fallback
    processing: status === 'PROCESSING' || status === 'UPLOADING',
  };
}
