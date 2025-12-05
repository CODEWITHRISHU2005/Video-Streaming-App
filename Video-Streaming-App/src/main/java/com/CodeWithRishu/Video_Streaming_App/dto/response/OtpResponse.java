package com.CodeWithRishu.Video_Streaming_App.dto.response;

import java.time.Instant;

public record OtpResponse(boolean success,
                          String message,
                          Instant expiresAt) {
}