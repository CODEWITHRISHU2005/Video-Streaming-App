package com.CodeWithRishu.Video_Streaming_App.controller;

import com.CodeWithRishu.Video_Streaming_App.dto.VideoMetaDataDto;
import com.CodeWithRishu.Video_Streaming_App.entity.Video;
import com.CodeWithRishu.Video_Streaming_App.service.VideoService;
import com.CodeWithRishu.Video_Streaming_App.utils.Serialization;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/videos")
public class VideoController {

    private final VideoService videoService;

    @Value("${cloudflare.r2.public-url}")
    private String r2PublicUrl;

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> uploadVideo(
            @RequestParam("videoFile") MultipartFile videoFile,
            @RequestParam("thumbnailFile") MultipartFile thumbnailFile,
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam(value = "tags", required = false) List<String> tags
    ) {
        Video video = new Video();
        video.setVideoId(UUID.randomUUID().toString());
        video.setTitle(title);
        video.setDescription(description);
        video.setTags(tags);
        video.setStatus("PROCESSING");

        Video saved = videoService.save(video, videoFile, thumbnailFile);

        if (saved != null) {
            videoService.processVideo(saved.getVideoId());
            return ResponseEntity.status(HttpStatus.CREATED).body(Serialization.mapVideoToDto(saved));
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }

    @GetMapping
    public ResponseEntity<List<VideoMetaDataDto>> getAllVideos() {
        return ResponseEntity.ok(videoService.getAll().stream()
                .map(Serialization::mapVideoToDto)
                .toList());
    }

    @GetMapping("/{videoId}")
    public ResponseEntity<VideoMetaDataDto> getVideoMetadata(@PathVariable String videoId) {
        Video video = videoService.get(videoId);
        if (video == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Serialization.mapVideoToDto(video));
    }

    @GetMapping("/{videoId}/master.m3u8")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Void> serveMasterPlaylist(@PathVariable String videoId) {
        Video video = videoService.get(videoId);
        if (video == null || !"COMPLETED".equals(video.getStatus())) {
            return ResponseEntity.notFound().build();
        }

        String cloudUrl = String.format("%s/videos/%s/master.m3u8", r2PublicUrl, videoId);

        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(cloudUrl))
                .build();
    }

    @GetMapping("/thumbnail/{videoId}")
    public ResponseEntity<Void> getThumbnail(@PathVariable String videoId) {
        String cloudUrl = String.format("%s/videos/%s/thumbnail.jpg", r2PublicUrl, videoId);

        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(cloudUrl))
                .build();
    }

}