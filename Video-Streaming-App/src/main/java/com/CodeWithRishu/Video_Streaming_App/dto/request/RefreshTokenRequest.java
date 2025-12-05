package com.CodeWithRishu.Video_Streaming_App.dto.request;

import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(@NotBlank(message = "token must be there") String token) {
}