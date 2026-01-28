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
            String videoFilename = fileStorageService.storeFile(videoFile);
            String thumbnailFilename = fileStorageService.storeFile(thumbnailFile);

            video.setContentType(videoFile.getContentType());
            video.setFilePath(videoFilename);
            video.setThumbnailUrl(thumbnailFilename);
            video.setStatus("PROCESSING");

            Path videoPath = Paths.get(uploadDir, videoFilename);
            video.setDuration(getVideoDuration(videoPath));

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

                Video video = videoRepository.findById(videoId).orElse(null);
                if (video != null) {

                    String thumbFilename = video.getThumbnailUrl();
                    if (thumbFilename != null && !thumbFilename.startsWith("http")) {
                        Path thumbPath = Paths.get(uploadDir, thumbFilename);
                        if (Files.exists(thumbPath)) {
                            String thumbKey = "thumbnails/" + videoId + "/" + thumbFilename;
                            String contentType = getContentType(thumbFilename);

                            s3Client.putObject(PutObjectRequest.builder()
                                    .bucket(bucketName)
                                    .key(thumbKey)
                                    .contentType(contentType)
                                    .build(), thumbPath);

                            video.setThumbnailUrl(r2PublicUrl + "/" + thumbKey);
                            Files.deleteIfExists(thumbPath);
                        }
                    }

                    video.setStatus("COMPLETED");
                    video.setUrl(r2PublicUrl + "/videos/" + videoId + "/master.m3u8");
                    videoRepository.save(video);

                    if (video.getFilePath() != null) {
                        Files.deleteIfExists(Paths.get(uploadDir, video.getFilePath()));
                    }
                }

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

    private double getVideoDuration(Path videoPath) {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(
                    "ffprobe", "-v", "error", "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1", videoPath.toString()
            );
            Process process = processBuilder.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line = reader.readLine();
                process.waitFor();
                if (line != null) {
                    return Double.parseDouble(line);
                }
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

    private void updateVideoStatus(String videoId, String status) {
        videoRepository.findById(videoId).ifPresent(v -> {
            v.setStatus(status);
            videoRepository.save(v);
        });
    }

    private void uploadFolderToCloud(String videoId) throws IOException {
        Path hlsPath = Paths.get(hslDir, videoId);
        try (Stream<Path> paths = Files.walk(hlsPath)) {
            paths.filter(Files::isRegularFile).forEach(path -> {
                String fileName = path.getFileName().toString();
                String key = "videos/" + videoId + "/" + fileName;

                s3Client.putObject(PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .contentType(getContentType(fileName))
                        .build(), path);
            });
        }
    }

    private String getContentType(String filename) {
        if (filename.endsWith(".m3u8")) return "application/x-mpegURL";
        if (filename.endsWith(".ts")) return "video/MP2T";
        if (filename.endsWith(".mp4")) return "video/mp4";
        if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
        if (filename.endsWith(".png")) return "image/png";
        return "application/octet-stream";
    }
}