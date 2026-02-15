package com.CodeWithRishu.Video_Streaming_App.controller;

import com.CodeWithRishu.Video_Streaming_App.dto.VideoMetaDataDto;
import com.CodeWithRishu.Video_Streaming_App.entity.Video;
import com.CodeWithRishu.Video_Streaming_App.service.VideoService;
import com.CodeWithRishu.Video_Streaming_App.utils.Serialization;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

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
            @RequestParam(value = "description", defaultValue = "", required = false) String description,
            @RequestParam(value = "tags", defaultValue = "", required = false) List<String> tags
    ) {
        return Optional.of(createVideo(title, description, tags))
                .map(video -> videoService.save(video, videoFile, thumbnailFile))
                .map(video -> {
                    videoService.processVideo(video.getVideoId());
                    return video;
                })
                .map(Serialization::mapVideoToDto)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build());
    }

    @GetMapping
    public ResponseEntity<List<VideoMetaDataDto>> getAllVideos() {
        return ResponseEntity.ok(videoService.getAll().stream()
                .map(Serialization::mapVideoToDto)
                .toList());
    }

    @GetMapping("/{videoId}")
    public ResponseEntity<VideoMetaDataDto> getVideoMetadata(@PathVariable String videoId) {
        return Stream.ofNullable(videoService.get(videoId))
                .map(Serialization::mapVideoToDto)
                .map(ResponseEntity::ok)
                .findFirst()
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{videoId}/master.m3u8")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Void> serveMasterPlaylist(@PathVariable String videoId) {
        return Stream.ofNullable(videoService.get(videoId))
                .filter(video -> "COMPLETED".equals(video.getStatus()))
                .map(video -> String.format("%s/videos/%s/master.m3u8", r2PublicUrl, videoId))
                .map(URI::create)
                .map(uri -> ResponseEntity.status(HttpStatus.FOUND).location(uri).<Void>build())
                .findFirst()
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/thumbnail/{videoId}")
    public ResponseEntity<Void> getThumbnail(@PathVariable String videoId) {
        return Stream.ofNullable(videoService.get(videoId))
                .map(Video::getThumbnailUrl)
                .filter(url -> !url.isEmpty())
                .map(URI::create)
                .map(uri -> ResponseEntity.status(HttpStatus.FOUND).location(uri).<Void>build())
                .findFirst()
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private Video createVideo(String title, String description, List<String> tags) {
        Video video = new Video();
        video.setVideoId(UUID.randomUUID().toString());
        video.setTitle(title);
        video.setDescription(description);
        video.setTags(tags);
        video.setStatus("PROCESSING");
        return video;
    }

}