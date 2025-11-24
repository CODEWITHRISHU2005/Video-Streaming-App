package com.CodeWithRishu.Video_Streaming_App.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "yt_videos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Video {
    @Id
    @JsonProperty("video_id")
    private String videoId;

    private String title;

    private String description;

    private String contentType;

    private String filePath;

    private String thumbnailUrl;

    private double duration;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

}