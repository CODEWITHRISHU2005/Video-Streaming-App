package com.CodeWithRishu.Video_Streaming_App.utils;

import com.CodeWithRishu.Video_Streaming_App.dto.VideoMetaDataDto;
import com.CodeWithRishu.Video_Streaming_App.entity.Video;

public interface Serialization {
    static VideoMetaDataDto mapVideoToDto(Video video) {
        VideoMetaDataDto dto = new VideoMetaDataDto();
        dto.setId(video.getVideoId());
        dto.setTitle(video.getTitle());
        dto.setDescription(video.getDescription());
        dto.setContentType(video.getContentType());
        return dto;
    }
}
