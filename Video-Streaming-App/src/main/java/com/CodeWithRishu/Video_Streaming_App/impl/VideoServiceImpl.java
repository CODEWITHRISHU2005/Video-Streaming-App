package com.CodeWithRishu.Video_Streaming_App.impl;

import com.CodeWithRishu.Video_Streaming_App.entity.Video;
import com.CodeWithRishu.Video_Streaming_App.repository.VideoRepository;
import com.CodeWithRishu.Video_Streaming_App.service.FileStorageService;
import com.CodeWithRishu.Video_Streaming_App.service.VideoService;
import com.CodeWithRishu.Video_Streaming_App.utils.VideoServiceHelper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.FileSystemUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;

@Service
@Slf4j
@RequiredArgsConstructor
public class VideoServiceImpl implements VideoService {

    @Value("${file.video.upload-dir}")
    private String uploadDir;
    @Value("${file.video.hsl-dir}")
    private String hslDir;
    @Value("${cloudflare.r2.public-url}")
    private String r2PublicUrl;

    private final VideoRepository videoRepository;
    private final FileStorageService fileStorageService;
    private final VideoServiceHelper helper;

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
                        double duration = helper.getVideoDuration(path);
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

                helper.runFFmpegConversion(videoId);
                helper.uploadFolderToCloud(videoId);

                videoRepository.findById(videoId).ifPresent(video -> {

                    Optional.ofNullable(video.getThumbnailUrl())
                            .filter(url -> !url.startsWith("http"))
                            .map(filename -> Paths.get(uploadDir, filename))
                            .filter(Files::exists)
                            .ifPresent(path -> {
                                String thumbKey = "thumbnails/" + videoId + "/" + path.getFileName();
                                helper.uploadFileToS3(thumbKey, path, VideoServiceHelper.getContentType(path.getFileName().toString()));

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
                helper.updateVideoStatus(videoId, "FAILED");
            } catch (Exception e) {
                log.error("Processing failed for {}", videoId, e);
                helper.updateVideoStatus(videoId, "FAILED");
            } finally {
                ffmpegSemaphore.release();
            }
        }, Executors.newVirtualThreadPerTaskExecutor());
    }

}