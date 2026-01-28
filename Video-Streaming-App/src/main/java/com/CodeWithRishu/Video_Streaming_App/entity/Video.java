package com.CodeWithRishu.Video_Streaming_App.entity;

import com.CodeWithRishu.Video_Streaming_App.utils.StringListConverter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.List;

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

    @Lob
    @Basic(fetch = FetchType.LAZY)
    private String description;

    private String status;

    private String contentType;

    private String filePath;

    private String url;

    private String thumbnailUrl;

    @CreationTimestamp
    @Column(name = "upload_date", nullable = false, updatable = false)
    private Instant uploadDate;

    private double duration;

    @Convert(converter = StringListConverter.class)
    private List<String> tags;

}