package com.CodeWithRishu.Video_Streaming_App.impl;

import com.CodeWithRishu.Video_Streaming_App.entity.Video;
import com.CodeWithRishu.Video_Streaming_App.repository.VideoRepository;
import com.CodeWithRishu.Video_Streaming_App.service.FileStorageService;
import com.CodeWithRishu.Video_Streaming_App.service.VideoService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.FileSystemUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.stream.Stream;

@Service
@Slf4j
@RequiredArgsConstructor
public class VideoServiceImpl implements VideoService {

    @Value("${file.video.upload-dir}")
    private String uploadDir;

    @Value("${file.video.hsl-dir}")
    private String hslDir;

    @Value("${cloudflare.r2.bucket-name}")
    private String bucketName;

    @Value("${cloudflare.r2.public-url}")
    private String r2PublicUrl;

    // Optional: Add CDN URL if you have Cloudflare CDN configured
    @Value("${cloudflare.cdn.url:#{null}}")
    private String cdnUrl;

    private final VideoRepository videoRepository;
    private final FileStorageService fileStorageService;
    private final S3Client s3Client;

    private final Semaphore ffmpegSemaphore = new Semaphore(3);

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(hslDir));
            Files.createDirectories(Paths.get(uploadDir));
        } catch (IOException e) {
            throw new RuntimeException("Could not create directories", e);
        }
    }

    @Override
    public Video save(Video video, MultipartFile videoFile, MultipartFile thumbnailFile) {
        try {
            // Store files temporarily
            String videoFilename = fileStorageService.storeFile(videoFile);
            String thumbnailFilename = fileStorageService.storeFile(thumbnailFile);

            // Set basic file info
            video.setContentType(videoFile.getContentType());
            video.setFilePath(videoFilename);
            video.setThumbnailUrl(thumbnailFilename);
            video.setStatus(Video.VideoStatus.UPLOADING); // Use enum
            
            // Store original filename
            video.setOriginalFilename(videoFile.getOriginalFilename());
            
            // Store file sizes
            video.setVideoFileSize(videoFile.getSize());
            video.setThumbnailFileSize(thumbnailFile.getSize());
            
            // Set R2 bucket name
            video.setR2BucketName(bucketName);

            // Extract video metadata
            Path videoPath = Paths.get(uploadDir, videoFilename);
            extractVideoMetadata(video, videoPath);

            // Initialize engagement metrics
            video.setViewCount(0L);
            video.setLikeCount(0L);
            video.setDislikeCount(0L);
            video.setCommentCount(0L);
            
            // Set defaults if not already set
            if (video.getIsPublic() == null) video.setIsPublic(true);
            if (video.getAllowComments() == null) video.setAllowComments(true);
            if (video.getAgeRestricted() == null) video.setAgeRestricted(false);

            Video savedVideo = videoRepository.save(video);

            // Start async processing
            processVideo(savedVideo.getVideoId());

            return savedVideo;
        } catch (Exception e) {
            log.error("Error while saving video", e);
            throw new RuntimeException("Error while saving video", e);
        }
    }

    @Override
    public Video get(String videoId) {
        return videoRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found"));
    }

    @Override
    public List<Video> getAll() {
        return videoRepository.findAll();
    }

    @Override
    public void processVideo(String videoId) {
        CompletableFuture.runAsync(() -> {
            try {
                ffmpegSemaphore.acquire();

                // Update status to PROCESSING
                updateVideoStatus(videoId, Video.VideoStatus.PROCESSING);

                // Convert to HLS
                runFFmpegConversion(videoId);
                
                // Upload HLS files to R2
                uploadFolderToCloud(videoId);

                videoRepository.findById(videoId).ifPresent(video -> {
                    // Upload and update thumbnail
                    Optional.ofNullable(video.getThumbnailUrl())
                            .filter(url -> !url.startsWith("http"))
                            .map(filename -> Paths.get(uploadDir, filename))
                            .filter(Files::exists)
                            .ifPresent(path -> {
                                String thumbKey = "thumbnails/" + videoId + "/" + path.getFileName();
                                uploadFileToS3(thumbKey, path, getContentType(path.getFileName().toString()));

                                // Set R2 thumbnail key
                                video.setR2ThumbnailKey(thumbKey);
                                
                                // Set R2 URL
                                video.setThumbnailUrl(r2PublicUrl + "/" + thumbKey);
                                
                                // Set CDN URL if available
                                if (cdnUrl != null && !cdnUrl.isEmpty()) {
                                    video.setThumbnailCdnUrl(cdnUrl + "/" + thumbKey);
                                }
                                
                                // Delete local thumbnail
                                try { Files.deleteIfExists(path); } catch (IOException ignored) {}
                            });

                    // Set video URLs
                    String videoKey = "videos/" + videoId + "/master.m3u8";
                    video.setR2VideoKey(videoKey);
                    video.setVideoUrl(r2PublicUrl + "/" + videoKey);
                    
                    // Set CDN URL if available
                    if (cdnUrl != null && !cdnUrl.isEmpty()) {
                        video.setVideoCdnUrl(cdnUrl + "/" + videoKey);
                    }
                    
                    // Update URL (main playback URL)
                    video.setUrl(cdnUrl != null ? cdnUrl + "/" + videoKey : r2PublicUrl + "/" + videoKey);
                    
                    // Set status to PUBLISHED
                    video.setStatus(Video.VideoStatus.PUBLISHED);
                    
                    videoRepository.save(video);

                    // Delete local video file
                    Optional.ofNullable(video.getFilePath())
                            .map(filename -> Paths.get(uploadDir, filename))
                            .ifPresent(path -> {
                                try { Files.deleteIfExists(path); } catch (IOException ignored) {}
                            });
                });

                // Clean up temp HLS directory
                FileSystemUtils.deleteRecursively(Paths.get(hslDir, videoId));

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                updateVideoStatus(videoId, Video.VideoStatus.FAILED);
            } catch (Exception e) {
                log.error("Processing failed for {}", videoId, e);
                updateVideoStatus(videoId, Video.VideoStatus.FAILED);
            } finally {
                ffmpegSemaphore.release();
            }
        }, Executors.newVirtualThreadPerTaskExecutor());
    }

    @Override
    public Resource getThumbnailResource(String videoId) {
        throw new UnsupportedOperationException("Thumbnails are served directly from Cloudflare R2.");
    }

    @Override
    public Resource getVideoResource(String videoId) {
        throw new UnsupportedOperationException("Videos are served directly from Cloudflare R2.");
    }

    @Override
    public Resource getHlsResource(String videoId, String fileName) {
        throw new UnsupportedOperationException("HLS streaming is served directly from Cloudflare R2.");
    }

    /**
     * Extract video metadata using ffprobe
     */
    private void extractVideoMetadata(Video video, Path videoPath) {
        try {
            // Get duration
            video.setDuration(getVideoDuration(videoPath));
            
            // Get resolution
            String resolution = getVideoResolution(videoPath);
            video.setResolution(resolution);
            
            // Determine quality based on resolution
            video.setQuality(determineQuality(resolution));
            
            // Get frame rate
            Double frameRate = getVideoFrameRate(videoPath);
            video.setFrameRate(frameRate);
            
        } catch (Exception e) {
            log.error("Error extracting video metadata", e);
        }
    }

    /**
     * Get video duration in seconds using ffprobe
     */
    private Long getVideoDuration(Path videoPath) {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(
                    "ffprobe", "-v", "error", "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1", videoPath.toString()
            );
            Process process = processBuilder.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                return reader.lines()
                        .findFirst()
                        .map(s -> (long) Double.parseDouble(s))
                        .orElse(0L);
            }
        } catch (Exception e) {
            log.error("Error getting duration", e);
            return 0L;
        }
    }

    /**
     * Get video resolution using ffprobe
     */
    private String getVideoResolution(Path videoPath) {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(
                    "ffprobe", "-v", "error", "-select_streams", "v:0",
                    "-show_entries", "stream=width,height",
                    "-of", "csv=s=x:p=0", videoPath.toString()
            );
            Process process = processBuilder.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                return reader.lines()
                        .findFirst()
                        .orElse("Unknown");
            }
        } catch (Exception e) {
            log.error("Error getting resolution", e);
            return "Unknown";
        }
    }

    /**
     * Get video frame rate using ffprobe
     */
    private Double getVideoFrameRate(Path videoPath) {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(
                    "ffprobe", "-v", "error", "-select_streams", "v:0",
                    "-show_entries", "stream=r_frame_rate",
                    "-of", "default=noprint_wrappers=1:nokey=1", videoPath.toString()
            );
            Process process = processBuilder.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                return reader.lines()
                        .findFirst()
                        .map(this::parseFraction)
                        .orElse(null);
            }
        } catch (Exception e) {
            log.error("Error getting frame rate", e);
            return null;
        }
    }

    /**
     * Parse fraction string (e.g., "30000/1001") to double
     */
    private Double parseFraction(String fraction) {
        try {
            if (fraction.contains("/")) {
                String[] parts = fraction.split("/");
                return Double.parseDouble(parts[0]) / Double.parseDouble(parts[1]);
            }
            return Double.parseDouble(fraction);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Determine quality label based on resolution
     */
    private String determineQuality(String resolution) {
        if (resolution == null || resolution.equals("Unknown")) {
            return "Auto";
        }
        
        try {
            int height = Integer.parseInt(resolution.split("x")[1]);
            
            if (height >= 2160) return "4K";
            if (height >= 1440) return "2K";
            if (height >= 1080) return "FHD";
            if (height >= 720) return "HD";
            if (height >= 480) return "SD";
            return "LD";
        } catch (Exception e) {
            return "Auto";
        }
    }

    /**
     * Run FFmpeg conversion to HLS
     */
    private void runFFmpegConversion(String videoId) throws Exception {
        Video video = this.get(videoId);
        Path videoPath = Paths.get(uploadDir, video.getFilePath());
        Path outputPath = Paths.get(hslDir, videoId);
        Files.createDirectories(outputPath);

        String segmentPattern = outputPath.resolve("segment_%3d.ts").toString();
        String masterPlaylist = outputPath.resolve("master.m3u8").toString();

        ProcessBuilder pb = new ProcessBuilder(
                "ffmpeg", "-i", videoPath.toString(),
                "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
                "-threads", "1", "-c:a", "aac", "-b:a", "128k",
                "-f", "hls", "-hls_time", "6", "-hls_list_size", "0",
                "-hls_segment_filename", segmentPattern, masterPlaylist
        );

        Process process = pb.start();
        process.getInputStream().transferTo(System.out);
        int exitCode = process.waitFor();
        if (exitCode != 0) throw new RuntimeException("FFmpeg exit code " + exitCode);
    }

    /**
     * Update video status
     */
    private void updateVideoStatus(String videoId, Video.VideoStatus status) {
        videoRepository.findById(videoId).ifPresent(v -> {
            v.setStatus(status);
            videoRepository.save(v);
        });
    }

    /**
     * Upload entire HLS folder to R2
     */
    private void uploadFolderToCloud(String videoId) throws IOException {
        Path hlsPath = Paths.get(hslDir, videoId);
        try (Stream<Path> paths = Files.walk(hlsPath)) {
            paths.filter(Files::isRegularFile)
                    .forEach(path -> {
                        String fileName = path.getFileName().toString();
                        String key = "videos/" + videoId + "/" + fileName;
                        uploadFileToS3(key, path, getContentType(fileName));
                    });
        }
    }

    /**
     * Upload file to S3/R2
     */
    private void uploadFileToS3(String key, Path path, String contentType) {
        try {
            s3Client.putObject(PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(contentType)
                    .build(), path);
            log.debug("Uploaded {} to R2", key);
        } catch (Exception e) {
            log.error("Failed to upload {} to R2", key, e);
            throw new RuntimeException("Upload failed for " + key, e);
        }
    }

    /**
     * Determine content type from filename
     */
    private String getContentType(String filename) {
        if (filename.endsWith(".m3u8")) return "application/x-mpegURL";
        if (filename.endsWith(".ts")) return "video/MP2T";
        if (filename.endsWith(".mp4")) return "video/mp4";
        if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
        if (filename.endsWith(".png")) return "image/png";
        if (filename.endsWith(".webp")) return "image/webp";
        return "application/octet-stream";
    }
}
