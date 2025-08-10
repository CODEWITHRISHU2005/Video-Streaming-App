package com.CodeWithRishu.Video_Streaming_App.controller;

import com.CodeWithRishu.Video_Streaming_App.dto.CustomMessage;
import com.CodeWithRishu.Video_Streaming_App.dto.VideoMetaDataDto;
import com.CodeWithRishu.Video_Streaming_App.entity.Video;
import com.CodeWithRishu.Video_Streaming_App.service.VideoService;
import com.CodeWithRishu.Video_Streaming_App.utils.Serialization;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/videos")
@CrossOrigin(origins = "http://localhost:5173")
public class VideoController {

    private static final Logger logger = LoggerFactory.getLogger(VideoController.class);
    private static final long CHUNK_SIZE = 1024L * 1024L * 2L; // 2 MB

    private final VideoService videoService;

    public VideoController(VideoService videoService) {
        this.videoService = videoService;
    }

    // ─── Video & Thumbnail Upload ─────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> uploadVideo(
            @RequestParam("videoFile") MultipartFile videoFile,
            @RequestParam("thumbnailFile") MultipartFile thumbnailFile,
            @RequestParam("title") String title,
            @RequestParam("description") String description
    ) {
        logger.info("Uploading video: {}", title);

        Video video = new Video();
        video.setVideoId(UUID.randomUUID().toString());
        video.setTitle(title);
        video.setDescription(description);

        Video saved = videoService.save(video, videoFile, thumbnailFile);
        if (saved != null) {
            VideoMetaDataDto dto = Serialization.mapVideoToDto(saved);
            return ResponseEntity.status(HttpStatus.CREATED).body(dto);
        }

        logger.error("Failed to save video with title: {}", title);
        CustomMessage msg = CustomMessage.builder()
                .message("Video and thumbnail upload failed")
                .success(false)
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(msg);
    }

    // ─── List All Videos ───────────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<VideoMetaDataDto>> getAllVideos() {
        logger.info("Fetching all videos");
        List<VideoMetaDataDto> dtoList = videoService.getAll().stream()
                .map(Serialization::mapVideoToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtoList);
    }

    // ─── Video Metadata ────────────────────────────────────────────────────────────
    @GetMapping("/{videoId}")
    public ResponseEntity<VideoMetaDataDto> getVideoMetadata(@PathVariable String videoId) {
        logger.info("Fetching metadata for videoId: {}", videoId);
        Video video = videoService.get(videoId);
        if (video == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(Serialization.mapVideoToDto(video));
    }

    // ─── Thumbnail Download ────────────────────────────────────────────────────────
    @GetMapping("/thumbnail/{videoId}")
    public ResponseEntity<Resource> getThumbnail(@PathVariable String videoId) {
        logger.info("Fetching thumbnail for videoId: {}", videoId);
        try {
            // The service is now responsible for finding the file and creating the Resource
            Resource resource = videoService.getThumbnailResource(videoId);
            String contentType = Files.probeContentType(resource.getFile().toPath());
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);
        } catch (FileNotFoundException e) {
            logger.warn("Thumbnail not found for videoId: {}", videoId, e);
            return ResponseEntity.notFound().build();
        } catch (IOException ex) {
            logger.error("Error determining thumbnail content type", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ─── Byte‐Range Video Streaming ────────────────────────────────────────────────
    @GetMapping("/stream/{videoId}")
    public ResponseEntity<ResourceRegion> streamVideo(
            @PathVariable String videoId,
            @RequestHeader HttpHeaders headers
    ) {
        logger.info("Streaming video for videoId: {}", videoId);
        try {
            // The service is now responsible for finding the file and creating the Resource
            Resource videoResource = videoService.getVideoResource(videoId);
            ResourceRegion region = resourceRegion(videoResource, headers);
            MediaType mediaType = MediaTypeFactory.getMediaType(videoResource)
                    .orElse(MediaType.APPLICATION_OCTET_STREAM);

            return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                    .contentType(mediaType)
                    .body(region);
        } catch (FileNotFoundException e) {
            logger.warn("Video file not found for videoId: {}", videoId, e);
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            logger.error("Error streaming video", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ─── HLS Master Playlist ───────────────────────────────────────────────────────
    @GetMapping(path = "/{videoId}/master.m3u8", produces = "application/vnd.apple.mpegurl")
    public ResponseEntity<Resource> serveMasterPlaylist(@PathVariable String videoId) {
        logger.debug("Serving HLS master playlist for videoId: {}", videoId);
        try {
            Resource resource = videoService.getHlsResource(videoId, "master.m3u8");
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("application/vnd.apple.mpegurl"))
                    .body(resource);
        } catch (FileNotFoundException e) {
            logger.warn("HLS master playlist not found for videoId: {}", videoId, e);
            return ResponseEntity.notFound().build();
        }
    }

    // ─── HLS Segment ───────────────────────────────────────────────────────────────
    @GetMapping(path = "/{videoId}/{segmentName:.+\\.ts}", produces = "video/MP2T")
    public ResponseEntity<Resource> serveHlsSegment(
            @PathVariable String videoId,
            @PathVariable String segmentName
    ) {
        logger.debug("Serving HLS segment {} for videoId: {}", segmentName, videoId);
        try {
            Resource resource = videoService.getHlsResource(videoId, segmentName);
            long len = resource.contentLength();
            return ResponseEntity.ok()
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(len))
                    .contentType(MediaType.parseMediaType("video/MP2T"))
                    .body(resource);
        } catch (FileNotFoundException e) {
            logger.warn("HLS segment {} not found for videoId: {}", segmentName, videoId, e);
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            logger.error("Error serving HLS segment", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private ResourceRegion resourceRegion(Resource video, HttpHeaders headers) throws IOException {
        long contentLength = video.contentLength();
        long start = 0;
        long length = Math.min(CHUNK_SIZE, contentLength);

        List<HttpRange> ranges = headers.getRange();
        if (!ranges.isEmpty()) {
            HttpRange range = ranges.get(0);
            start = range.getRangeStart(contentLength);
            long end = range.getRangeEnd(contentLength);
            length = Math.min(CHUNK_SIZE, end - start + 1);
        }

        return new ResourceRegion(video, start, length);
    }
}