package com.CodeWithRishu.Video_Streaming_App.dto.response;

import com.CodeWithRishu.Video_Streaming_App.dto.UserMetaDataDto;

public record JwtResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        String tokenType,
        UserMetaDataDto user
) {
    public static JwtResponse bearer(String accessToken, String refreshToken, long expiresIn) {
        return new JwtResponse(accessToken, refreshToken, expiresIn, "Bearer", null);
    }

    public static JwtResponse bearerWithUser(String accessToken, String refreshToken, long expiresIn, UserMetaDataDto user) {
        return new JwtResponse(accessToken, refreshToken, expiresIn, "Bearer", user);
    }

}