package com.CodeWithRishu.Video_Streaming_App.dto.response;

import java.util.UUID;

public record ProfileResponse(UUID id, String name, String email, String phone, String profileImageUrl, String bio) {
}