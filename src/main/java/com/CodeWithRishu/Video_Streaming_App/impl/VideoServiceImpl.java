package com.CodeWithRishu.Video_Streaming_App.impl;

import com.CodeWithRishu.Video_Streaming_App.entity.Video;
import com.CodeWithRishu.Video_Streaming_App.repository.VideoRepository;
import com.CodeWithRishu.Video_Streaming_App.service.FileStorageService;
import com.CodeWithRishu.Video_Streaming_App.service.VideoService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class VideoServiceImpl implements VideoService {

    private static final Logger logger = LoggerFactory.getLogger(VideoServiceImpl.class);

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Value("${file.video.hsl-dir}")
    private String hslDir;

    private final VideoRepository videoRepository;
    private final FileStorageService fileStorageService;

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(hslDir));
            logger.info("HLS directory verified/created at: {}", hslDir);
        } catch (IOException e) {
            logger.error("Could not create HLS directory!", e);
            throw new RuntimeException("Could not create HLS directory", e);
        }
    }

    @Override
    public Video save(Video video, MultipartFile videoFile, MultipartFile thumbnailFile) {
        try {
            String videoFilename = fileStorageService.storeFile(videoFile);
            String thumbnailFilename = fileStorageService.storeFile(thumbnailFile);

            // Update video metadata
            video.setContentType(videoFile.getContentType());
            video.setFilePath(videoFilename);
            video.setThumbnailUrl(thumbnailFilename);

            // Save the metadata to the database
            Video savedVideo = videoRepository.save(video);

            // Start the HLS conversion process
            processVideo(savedVideo.getVideoId());

            return savedVideo;

        } catch (Exception e) {
            logger.error("Error while saving video and thumbnail", e);
            throw new RuntimeException("Error while saving video and thumbnail", e);
        }
    }

    @Override
    public Video get(String videoId) {
        return videoRepository.findById(videoId).orElseThrow(() -> new RuntimeException("video not found"));
    }

    @Override
    public Video getByTitle(String title) {
        return null;
    }

    @Override
    public List<Video> getAll() {
        return videoRepository.findAll();
    }

    @Override
    @Async
    public void processVideo(String videoId) {

        Video video = this.get(videoId);
        // Reconstruct the full path from the base directory and the stored filename
        Path videoPath = Paths.get(uploadDir, video.getFilePath());

        try {
            // ffmpeg command
            Path outputPath = Paths.get(hslDir, videoId);

            Files.createDirectories(outputPath);

            String ffmpegCmd = String.format("ffmpeg -i \"%s\" -c:v libx264 -c:a aac -strict -2 -f hls -hls_time 10 -hls_list_size 0 -hls_segment_filename \"%s\\segment_%%3d.ts\" \"%s\\master.m3u8\"", videoPath, outputPath, outputPath);

            logger.info("Executing FFmpeg command for videoId: {}", videoId);
            ProcessBuilder processBuilder = new ProcessBuilder("cmd.exe", "/c", ffmpegCmd);
            processBuilder.inheritIO();
            Process process = processBuilder.start();
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                logger.error("Video processing failed with exit code: {}", exitCode);
                throw new RuntimeException("video processing failed!!");
            }
            logger.info("Video processing completed successfully for videoId: {}", videoId);

        } catch (IOException ex) {
            logger.error("IOException during video processing for videoId: {}", videoId, ex);
            throw new RuntimeException("Video processing fail!!");
        } catch (InterruptedException e) {
            logger.error("InterruptedException during video processing for videoId: {}", videoId, e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Video processing was interrupted", e);
        }
    }

    // ─── Resource Loading Implementation ───────────────────────────────────────────

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
}