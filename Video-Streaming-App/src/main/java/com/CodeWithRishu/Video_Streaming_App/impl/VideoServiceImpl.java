package com.CodeWithRishu.Video_Streaming_App.impl;

import com.CodeWithRishu.Video_Streaming_App.entity.Video;
import com.CodeWithRishu.Video_Streaming_App.repository.VideoRepository;
import com.CodeWithRishu.Video_Streaming_App.service.FileStorageService;
import com.CodeWithRishu.Video_Streaming_App.service.VideoService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.FileSystemUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.function.Function;
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

    private final VideoRepository videoRepository;
    private final FileStorageService fileStorageService;
    private final software.amazon.awssdk.services.s3.S3Client s3Client;

    private final Semaphore ffmpegSemaphore = new Semaphore(3);

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(hslDir));
            log.info("HLS directory verified/created at: {}", hslDir);
        } catch (IOException e) {
            log.error("Could not create HLS directory!", e);
            throw new RuntimeException("Could not create HLS directory", e);
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
            log.error("Error while saving video", e);
            throw new RuntimeException("Error while saving video", e);
        }
    }

    @Override
    public Video get(String videoId) {
        return videoRepository.findById(videoId).orElseThrow(() -> new RuntimeException("video not found"));
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

                log.info("Virtual Thread {} started processing videoId: {}", Thread.currentThread(), videoId);
                runFFmpegConversion(videoId);
                uploadFolderToCloud(videoId);
                FileSystemUtils.deleteRecursively(Paths.get(hslDir, videoId));
                updateVideoStatus(videoId, "COMPLETED");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                updateVideoStatus(videoId, "FAILED");
            } catch (Exception e) {
                log.error("FFmpeg processing failed for {}", videoId, e);
                updateVideoStatus(videoId, "FAILED");
            } finally {
                ffmpegSemaphore.release();
            }
        }, Executors.newVirtualThreadPerTaskExecutor());
    }

    @Override
    public Resource getThumbnailResource(String videoId) throws FileNotFoundException {
        return getResourceFromVideo(videoId, Video::getThumbnailUrl, "Thumbnail URL is not set for videoId: " + videoId, "Thumbnail not found or is not readable for videoId: " + videoId);
    }

    @Override
    public Resource getVideoResource(String videoId) throws FileNotFoundException {
        return getResourceFromVideo(videoId, Video::getFilePath, "Video file path is not set for videoId: " + videoId, "Video file not found or is not readable for videoId: " + videoId);
    }

    @Override
    public Resource getHlsResource(String videoId, String fileName) throws FileNotFoundException {
        Path hlsPath = Paths.get(hslDir, videoId, fileName);
        Resource resource = new FileSystemResource(hlsPath);

        if (!resource.exists() || !resource.isReadable()) {
            throw new FileNotFoundException("HLS resource not found or is not readable: " + fileName + " for videoId: " + videoId);
        }
        return resource;
    }

    private Resource getResourceFromVideo(String videoId, Function<Video, String> pathExtractor, String pathMissingError, String fileMissingError) throws FileNotFoundException {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new FileNotFoundException("Video not found with id: " + videoId));

        String filePath = pathExtractor.apply(video);
        if (!StringUtils.hasText(filePath)) {
            throw new FileNotFoundException(pathMissingError);
        }

        Path resourcePath = Paths.get(uploadDir).resolve(filePath);
        Resource resource = new FileSystemResource(resourcePath);

        if (!resource.exists() || !resource.isReadable()) {
            throw new FileNotFoundException(fileMissingError);
        }
        return resource;
    }

    private double getVideoDuration(Path videoPath) {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(
                    "ffprobe",
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    videoPath.toString()
            );
            Process process = processBuilder.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line = reader.readLine();
            process.waitFor();
            if (line != null) {
                return Double.parseDouble(line);
            }
        } catch (IOException | InterruptedException e) {
            log.error("Error getting video duration", e);
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
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            while (reader.readLine() != null) {
            }

            int exitCode = process.waitFor();
            if (exitCode != 0) throw new RuntimeException("FFmpeg exit code " + exitCode);
        }
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
                String key = "videos/" + videoId + "/" + path.getFileName().toString();
                s3Client.putObject(PutObjectRequest.builder()
                                .bucket(bucketName)
                                .key(key)
                                .contentType(key.endsWith(".m3u8") ? "application/x-mpegURL" : "video/MP2T")
                                .build(),
                        path);
            });
        }
    }

}