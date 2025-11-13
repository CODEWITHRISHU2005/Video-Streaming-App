package com.CodeWithRishu.Video_Streaming_App.utils;

import com.CodeWithRishu.Video_Streaming_App.dto.VideoMetaDataDto;
import com.CodeWithRishu.Video_Streaming_App.entity.Video;

public interface Serialization {
    static VideoMetaDataDto mapVideoToDto(Video video) {
        return new VideoMetaDataDto(
                video.getVideoId(),
                video.getTitle(),
                video.getDescription(),
                video.getContentType(),
                video.getDuration()
        );
    }
}
