package com.CodeWithRishu.Video_Streaming_App.dto;

import java.time.Instant;

public record UserMetaDataDto(
        String name,
        String email,
        boolean enable,
        String image,
        Instant createdAt,
        Instant updatedAt
) {}