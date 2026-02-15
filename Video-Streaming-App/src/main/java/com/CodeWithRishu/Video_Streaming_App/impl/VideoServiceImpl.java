package com.CodeWithRishu.Video_Streaming_App.impl;

import com.CodeWithRishu.Video_Streaming_App.entity.Video;
import com.CodeWithRishu.Video_Streaming_App.repository.VideoRepository;
import com.CodeWithRishu.Video_Streaming_App.service.FileStorageService;
import com.CodeWithRishu.Video_Streaming_App.service.VideoService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
            String videoFilename = Optional.ofNullable(videoFile)
                    .map(fileStorageService::storeFile)
                    .orElseThrow(() -> new IllegalArgumentException("Video file cannot be null"));

            String thumbnailFilename = Optional.ofNullable(thumbnailFile)
                    .map(fileStorageService::storeFile)
                    .orElseThrow(() -> new IllegalArgumentException("Thumbnail file cannot be null"));

            video.setContentType(videoFile.getContentType());
            video.setFilePath(videoFilename);
            video.setThumbnailUrl(thumbnailFilename);
            video.setStatus("PROCESSING");

            Optional.ofNullable(videoFilename)
                    .map(filename -> Paths.get(uploadDir, filename))
                    .filter(Files::exists)
                    .ifPresent(path -> {
                        double duration = getVideoDuration(path);
                        video.setDuration(duration);
                    });

            Video savedVideo = videoRepository.save(video);

            processVideo(savedVideo.getVideoId());

            return savedVideo;
        } catch (Exception e) {
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

                runFFmpegConversion(videoId);
                uploadFolderToCloud(videoId);

                videoRepository.findById(videoId).ifPresent(video -> {

                    Optional.ofNullable(video.getThumbnailUrl())
                            .filter(url -> !url.startsWith("http"))
                            .map(filename -> Paths.get(uploadDir, filename))
                            .filter(Files::exists)
                            .ifPresent(path -> {
                                String thumbKey = "thumbnails/" + videoId + "/" + path.getFileName();
                                uploadFileToS3(thumbKey, path, getContentType(path.getFileName().toString()));

                                video.setThumbnailUrl(r2PublicUrl + "/" + thumbKey);
                                try { Files.deleteIfExists(path); } catch (IOException ignored) {}
                            });

                    video.setStatus("COMPLETED");
                    video.setUrl(r2PublicUrl + "/videos/" + videoId + "/master.m3u8");
                    videoRepository.save(video);

                    Optional.ofNullable(video.getFilePath())
                            .map(filename -> Paths.get(uploadDir, filename))
                            .ifPresent(path -> {
                                try { Files.deleteIfExists(path); } catch (IOException ignored) {}
                            });
                });

                FileSystemUtils.deleteRecursively(Paths.get(hslDir, videoId));

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                updateVideoStatus(videoId, "FAILED");
            } catch (Exception e) {
                log.error("Processing failed for {}", videoId, e);
                updateVideoStatus(videoId, "FAILED");
            } finally {
                ffmpegSemaphore.release();
            }
        }, Executors.newVirtualThreadPerTaskExecutor());
    }


    private double getVideoDuration(Path videoPath) {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(
                    "ffprobe", "-v", "error", "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1", videoPath.toString()
            );
            Process process = processBuilder.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                return reader.lines()
                        .findFirst().map(Double::parseDouble)
                        .orElse(0.0);
            }
        } catch (Exception e) {
            log.error("Error getting duration", e);
        }
        return 0.0;
    }

    private void runFFmpegConversion(String videoId) throws Exception {
        Video video = this.get(videoId);
        Path videoPath = Paths.get(uploadDir, video.getFilePath());
        Path outputPath = Paths.get(hslDir, videoId);
        Files.createDirectories(outputPath);

        log.info("Starting adaptive streaming conversion for videoId: {}", videoId);

        Files.createDirectories(outputPath.resolve("1080p"));
        Files.createDirectories(outputPath.resolve("720p"));
        Files.createDirectories(outputPath.resolve("480p"));

        try {
            generateVariant(videoPath, outputPath.resolve("1080p"), "1920:1080", "5000k", "192k", "23");
            log.info("1080p variant completed");
        } catch (Exception e) {
            log.warn("Failed to generate 1080p variant: {}", e.getMessage());
        }

        try {
            generateVariant(videoPath, outputPath.resolve("720p"), "1280:720", "3000k", "128k", "25");
            log.info("720p variant completed");
        } catch (Exception e) {
            log.warn("Failed to generate 720p variant: {}", e.getMessage());
        }

        try {
            generateVariant(videoPath, outputPath.resolve("480p"), "854:480", "1500k", "96k", "28");
            log.info("480p variant completed");
        } catch (Exception e) {
            log.warn("Failed to generate 480p variant: {}", e.getMessage());
        }

        createAdaptiveMasterPlaylist(outputPath);

        log.info("Adaptive streaming conversion completed for videoId: {}", videoId);
    }

    private void generateVariant(Path input, Path output, String resolution,
                                 String videoBitrate, String audioBitrate, String crf) throws Exception {

        log.debug("Generating variant: resolution={}, bitrate={}", resolution, videoBitrate);

        ProcessBuilder pb = new ProcessBuilder(
                "ffmpeg", "-i", input.toString(),
                "-vf", "scale=" + resolution + ":force_original_aspect_ratio=decrease",
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", crf,
                "-maxrate", videoBitrate,
                "-bufsize", String.valueOf(Integer.parseInt(videoBitrate.replace("k", "")) * 2) + "k",
                "-c:a", "aac",
                "-b:a", audioBitrate,
                "-ac", "2",
                "-f", "hls",
                "-hls_time", "6",
                "-hls_list_size", "0",
                "-hls_segment_filename", output.resolve("segment_%03d.ts").toString(),
                output.resolve("playlist.m3u8").toString()
        );

        pb.redirectErrorStream(true);
        Process process = pb.start();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            reader.lines().forEach(line -> log.debug("FFmpeg [{}]: {}", resolution, line));
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new RuntimeException("FFmpeg failed for resolution " + resolution + " with exit code " + exitCode);
        }
    }

    private void createAdaptiveMasterPlaylist(Path outputPath) throws IOException {
        Path masterPlaylist = outputPath.resolve("master.m3u8");

        StringBuilder content = new StringBuilder("#EXTM3U\n#EXT-X-VERSION:3\n\n");

        if (Files.exists(outputPath.resolve("1080p/playlist.m3u8"))) {
            content.append("#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080,NAME=\"1080p\"\n");
            content.append("1080p/playlist.m3u8\n\n");
        }

        if (Files.exists(outputPath.resolve("720p/playlist.m3u8"))) {
            content.append("#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720,NAME=\"720p\"\n");
            content.append("720p/playlist.m3u8\n\n");
        }

        if (Files.exists(outputPath.resolve("480p/playlist.m3u8"))) {
            content.append("#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480,NAME=\"480p\"\n");
            content.append("480p/playlist.m3u8\n\n");
        }

        Files.writeString(masterPlaylist, content.toString());
        log.info("Master playlist created with {} variants",
                content.toString().split("EXT-X-STREAM-INF").length - 1);
    }

    private void updateVideoStatus(String videoId, String status) {
        videoRepository.findById(videoId).ifPresent(v -> {
            v.setStatus(status);
            videoRepository.save(v);
        });
    }

    private void uploadFolderToCloud(String videoId) throws IOException {
        Path hlsPath = Paths.get(hslDir, videoId);

        Path masterPlaylist = hlsPath.resolve("master.m3u8");
        if (!Files.exists(masterPlaylist)) {
            throw new IOException("master.m3u8 not found in " + hlsPath);
        }

        log.info("Starting upload of HLS files for videoId: {}", videoId);

        try (Stream<Path> paths = Files.walk(hlsPath)) {
            List<Path> filesToUpload = paths
                    .filter(Files::isRegularFile)
                    .toList();

            log.info("Found {} files to upload", filesToUpload.size());

            filesToUpload.forEach(path -> {
                String fileName = path.getFileName().toString();
                String key = "videos/" + videoId + "/" + fileName;
                log.info("Uploading: {}", key);
                uploadFileToS3(key, path, getContentType(fileName));
            });
        }

        log.info("Upload completed for videoId: {}", videoId);
    }

    private void uploadFileToS3(String key, Path path, String contentType) {
        s3Client.putObject(PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .build(), path);
    }

    private String getContentType(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        String extension = (dotIndex > 0) ? filename.substring(dotIndex + 1).toLowerCase() : "";

        return switch (extension) {
            case "m3u8" -> "application/x-mpegURL";
            case "ts" -> "video/MP2T";
            case "mp4" -> "video/mp4";
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            default -> "application/octet-stream";
        };
    }

}