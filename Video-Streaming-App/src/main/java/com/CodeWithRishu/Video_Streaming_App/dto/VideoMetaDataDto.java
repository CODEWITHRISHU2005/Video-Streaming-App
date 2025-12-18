package com.CodeWithRishu.Video_Streaming_App.dto;

import java.time.Instant;
import java.util.List;

public record VideoMetaDataDto(String id, String title, String description, String contentType, double duration, Instant uploadDate, List<String> tags) {}