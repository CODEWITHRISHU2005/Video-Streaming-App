package com.CodeWithRishu.Video_Streaming_App.impl;

import com.CodeWithRishu.Video_Streaming_App.entity.Video;
import com.CodeWithRishu.Video_Streaming_App.repository.VideoRepository;
import com.CodeWithRishu.Video_Streaming_App.service.FileStorageService;
import com.CodeWithRishu.Video_Streaming_App.service.VideoService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.scheduling.annotation.Async;
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
@Slf4j
@RequiredArgsConstructor
public class VideoServiceImpl implements VideoService {

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

            // Get video duration
            Path videoPath = Paths.get(uploadDir, videoFilename);
            double duration = getVideoDuration(videoPath);
            video.setDuration(duration);

            Video savedVideo = videoRepository.save(video);

            processVideo(savedVideo.getVideoId());

            return savedVideo;

        } catch (Exception e) {
            log.error("Error while saving video and thumbnail", e);
            throw new RuntimeException("Error while saving video and thumbnail", e);
        }
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
        Path videoPath = Paths.get(uploadDir, video.getFilePath());

        try {
            Path outputPath = Paths.get(hslDir, videoId);
            Files.createDirectories(outputPath);

            String segmentPattern = outputPath.resolve("segment_%3d.ts").toString();
            String masterPlaylist = outputPath.resolve("master.m3u8").toString();

            log.info("Starting FFmpeg processing for videoId: {}", videoId);
            log.info("Input file: {}", videoPath);
            log.info("Output directory: {}", outputPath);

            ProcessBuilder processBuilder = new ProcessBuilder(
                    "ffmpeg",
                    "-i", videoPath.toString(),
                    "-c:v", "libx264",
                    "-c:a", "aac",
                    "-strict", "-2",
                    "-f", "hls",
                    "-hls_time", "10",
                    "-hls_list_size", "0",
                    "-hls_segment_filename", segmentPattern,
                    masterPlaylist
            );

            processBuilder.redirectErrorStream(true);

            Process process = processBuilder.start();

            // Capture and log FFmpeg output
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.info("FFmpeg output: {}", line);
                }
            }

            int exitCode = process.waitFor();

            log.info("FFmpeg process completed with exit code: {}", exitCode);

            if (exitCode != 0) {
                log.error("FFmpeg failed with exit code: {}", exitCode);
                throw new RuntimeException("Video processing failed with exit code: " + exitCode);
            }

            // Verify files were created
            if (!Files.exists(Paths.get(masterPlaylist))) {
                log.error("master.m3u8 was not created at: {}", masterPlaylist);
                throw new RuntimeException("FFmpeg did not create master.m3u8");
            }

            log.info("Video processing completed successfully for videoId: {}", videoId);

        } catch (IOException ex) {
            log.error("IOException during video processing for videoId: {}", videoId, ex);
            throw new RuntimeException("Video processing failed!", ex);
        } catch (InterruptedException e) {
            log.error("InterruptedException during video processing for videoId: {}", videoId, e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Video processing was interrupted", e);
        }
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