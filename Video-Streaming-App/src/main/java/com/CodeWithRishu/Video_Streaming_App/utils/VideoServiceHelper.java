package com.CodeWithRishu.Video_Streaming_App.utils;

import com.CodeWithRishu.Video_Streaming_App.entity.Video;
import com.CodeWithRishu.Video_Streaming_App.repository.VideoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.stream.Stream;

@Component
@RequiredArgsConstructor
@Slf4j
public class VideoServiceHelper {

    @Value("${file.video.upload-dir}")
    private String uploadDir;
    @Value("${file.video.hsl-dir}")
    private String hslDir;
    @Value("${cloudflare.r2.bucket-name}")
    private String bucketName;

    private final VideoRepository videoRepository;
    private final S3Client s3Client;

    public double getVideoDuration(Path videoPath) {
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

    public void runFFmpegConversion(String videoId) throws Exception {
        Video video = videoRepository.findById(videoId).get();

        Path videoPath = Paths.get(uploadDir, video.getFilePath());
        Path outputPath = Paths.get(hslDir, videoId);
        Files.createDirectories(outputPath);

        log.info("Starting video conversion for videoId: {}", videoId);
        log.info("Input video path: {}", videoPath);
        log.info("Output HLS path: {}", outputPath);

        Files.createDirectories(outputPath.resolve("720p"));

        try {
            generateVariant(videoPath, outputPath.resolve("720p"), "1280:720", "3000k", "128k", "25");
            log.info("✓ 720p variant completed");
        } catch (Exception e) {
            log.error("✗ Failed to generate 720p variant: {}", e.getMessage());
            throw new RuntimeException("Failed to encode video: " + e.getMessage());
        }

        createSimpleMasterPlaylist(outputPath);

        log.info("Video conversion completed for videoId: {}", videoId);
    }

    public void generateVariant(Path input, Path output, String resolution,
                                String videoBitrate, String audioBitrate, String crf) throws Exception {

        log.info("Generating variant: resolution={}, bitrate={}", resolution, videoBitrate);

        ProcessBuilder pb = new ProcessBuilder(
                "ffmpeg",
                "-i", input.toString(),
                "-vf", "scale=" + resolution + ":force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
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
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.contains("frame=") && line.contains("fps=")) {
                    log.debug("FFmpeg progress: {}", line.trim());
                }
            }
        }

        int exitCode = process.waitFor();

        if (exitCode != 0) {
            log.error("FFmpeg failed for resolution {}", resolution);
            throw new RuntimeException("FFmpeg failed for resolution " + resolution + " with exit code " + exitCode);
        }

        log.info("Successfully generated {} variant", resolution);
    }

    private void createSimpleMasterPlaylist(Path outputPath) throws IOException {
        Path masterPlaylist = outputPath.resolve("master.m3u8");

        String content = "#EXTM3U\n" +
                "#EXT-X-VERSION:3\n\n" +
                "#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720\n" +
                "720p/playlist.m3u8\n";

        Files.writeString(masterPlaylist, content);
        log.info("Master playlist created (single quality)");
    }

    public void updateVideoStatus(String videoId, String status) {
        videoRepository.findById(videoId).ifPresent(v -> {
            v.setStatus(status);
            videoRepository.save(v);
        });
    }

    public void uploadFolderToCloud(String videoId) throws IOException {
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

            List<CompletableFuture<Void>> uploadFutures = filesToUpload.stream()
                    .map(path -> CompletableFuture.runAsync(() -> {
                        Path relativePath = hlsPath.relativize(path);
                        String key = "videos/" + videoId + "/" + relativePath.toString().replace("\\", "/");

                        log.info("Uploading: {}", key);
                        uploadFileToS3(key, path, getContentType(path.getFileName().toString()));
                    }, Executors.newFixedThreadPool(5))) // Reduced from 10 to 5 threads
                    .toList();

            CompletableFuture.allOf(uploadFutures.toArray(new CompletableFuture[0])).join();
        }

        log.info("Upload completed for videoId: {}", videoId);
    }

    public void uploadFileToS3(String key, Path path, String contentType) {
        s3Client.putObject(PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .build(), path);
    }

    public static String getContentType(String filename) {
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