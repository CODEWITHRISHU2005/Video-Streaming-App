package com.CodeWithRishu.Video_Streaming_App.dto.request;

import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
        String name,
        String profileImage,
        String bio,
        @Size(min = 10, max = 10, message = "Phone number must be 10 digit")
        String phone) {
}