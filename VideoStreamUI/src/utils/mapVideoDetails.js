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
  const id = details?.video_id ?? details?.id;
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

    return {
      id,
      title: details.title,
      description: details.description || "",
      duration: duration,
      uploadDate: uploadDate,
    fileSize: details.fileSize ?? details.file_size,
    views: details.views ?? 0,
    likes: details.likes ?? details.likeCount ?? details.like_count ?? 0,
    comments: details.comments ?? details.commentCount ?? details.comment_count ?? 0,
    tags: Array.isArray(details.tags) 
      ? details.tags 
      : (typeof details.tags === 'string' ? details.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
    category: details.category || details.genre || 'General',
    thumbnailUrl:
      details.thumbnailUrl ?? details.thumbnail_url ?? `${API_BASE}/thumbnail/${id}`,
    contentType: details.contentType ?? details.content_type ?? 'video/mp4',
    url: details.url || buildStreamUrl(details, id),
    hlsUrl: buildHlsUrl(details, id),
  };
}
