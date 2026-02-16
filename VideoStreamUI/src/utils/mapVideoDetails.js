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

const buildThumbnailUrl = (details, id) => {
  const directUrl = details?.thumbnailCdnUrl ||
                    details?.thumbnail_cdn_url ||
                    details?.thumbnailUrl ||
                    details?.thumbnail_url;
  
  if (directUrl) return directUrl;
  if (id) return `${API_BASE}/thumbnail/${id}`;
  return 'https://images.unsplash.com/photo-1521335629791-ce4aec67dd53?q=80&w=600&auto=format&fit=crop';
};

export function mapVideoDetails(input) {
  const details = input?.video ?? input;
  const id = details?.video_id ?? details?.videoId ?? details?.id;
  if (!id) throw new Error("Video ID missing");

  let duration = 0;
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
  
  if (durationValue !== undefined && durationValue !== null && durationValue !== '') {
    if (typeof durationValue === 'string') {
      if (durationValue.includes(':')) {
        duration = durationValue;
      } else {
        const parsed = parseFloat(durationValue);
        duration = isNaN(parsed) ? 0 : parsed;
      }
    } else if (typeof durationValue === 'number') {
      duration = durationValue;
    }
  }

  let uploadDate = details.uploadDate || details.upload_date || details.createdAt || details.created_at;
  if (typeof uploadDate === 'number' && uploadDate < 100000000000) {
    uploadDate = uploadDate * 1000;
  }

  const thumbnailUrl = buildThumbnailUrl(details, id);

  const videoUrl = details.videoCdnUrl ?? 
                   details.video_cdn_url ?? 
                   details.videoUrl ?? 
                   details.video_url ?? 
                   details.url ?? 
                   buildStreamUrl(details, id);

  const resolution = details.resolution ?? details.videoResolution ?? details.video_resolution ?? null;
  const quality = details.quality ?? details.videoQuality ?? details.video_quality ?? 'Auto';
  const frameRate = details.frameRate ?? details.frame_rate ?? details.fps ?? null;
  
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

  const viewCount = details.viewCount ?? details.view_count ?? details.views ?? 0;
  const likeCount = details.likeCount ?? details.like_count ?? details.likes ?? 0;
  const dislikeCount = details.dislikeCount ?? details.dislike_count ?? details.dislikes ?? 0;
  const commentCount = details.commentCount ?? details.comment_count ?? details.comments ?? 0;

  const status = details.status ?? 'PUBLISHED';
  const isPublic = details.isPublic ?? details.is_public ?? true;
  const allowComments = details.allowComments ?? details.allow_comments ?? true;
  const ageRestricted = details.ageRestricted ?? details.age_restricted ?? false;

  const userId = details.userId ?? details.user_id ?? details.creatorId ?? details.creator_id ?? null;
  const userName = details.userName ?? details.user_name ?? details.creatorName ?? details.creator_name ?? null;

  const publishedDate = details.publishedDate ?? details.published_date ?? details.publishDate ?? details.publish_date ?? null;
  const updatedDate = details.updatedDate ?? details.updated_date ?? details.updatedAt ?? details.updated_at ?? null;

  return {
    id,
    title: details.title || 'Untitled Video',
    description: details.description || "",
    duration: duration,
    uploadDate: uploadDate,
    publishedDate: publishedDate,
    updatedDate: updatedDate,
    fileSize: fileSize,
    originalFilename: originalFilename,
    contentType: details.contentType ?? details.content_type ?? 'video/mp4',
    resolution: resolution,
    quality: quality,
    frameRate: frameRate,
    thumbnailUrl: thumbnailUrl,
    url: videoUrl,
    hlsUrl: buildHlsUrl(details, id),
    r2VideoKey: details.r2VideoKey ?? details.r2_video_key ?? null,
    r2ThumbnailKey: details.r2ThumbnailKey ?? details.r2_thumbnail_key ?? null,
    r2BucketName: details.r2BucketName ?? details.r2_bucket_name ?? null,
    views: viewCount,
    likes: likeCount,
    dislikes: dislikeCount,
    comments: commentCount,
    tags: Array.isArray(details.tags) 
      ? details.tags 
      : (typeof details.tags === 'string' ? details.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
    category: details.category || details.genre || 'General',
    status: status,
    isPublic: isPublic,
    allowComments: allowComments,
    ageRestricted: ageRestricted,
    userId: userId,
    userName: userName,
    processing: status === 'PROCESSING' || status === 'UPLOADING',
  };
}
