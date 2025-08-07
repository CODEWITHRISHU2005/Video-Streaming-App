package com.CodeWithRishu.Video_Streaming_App.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoMetaDataDto {
    private String id;
    private String title;
    private String description;
    private String contentType;
}