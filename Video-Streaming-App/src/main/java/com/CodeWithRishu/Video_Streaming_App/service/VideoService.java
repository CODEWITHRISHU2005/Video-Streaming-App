package com.CodeWithRishu.Video_Streaming_App.service;

import com.CodeWithRishu.Video_Streaming_App.entity.Video;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface VideoService {

    Video save(Video video, MultipartFile file, MultipartFile thumbnailFile);

    Video get(String videoId);

    List<Video> getAll();

    void processVideo(String videoId);

    Resource getThumbnailResource(String videoId);

    Resource getVideoResource(String videoId);

    Resource getHlsResource(String videoId, String fileName);

}
