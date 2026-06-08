package com.CodeWithRishu.Video_Streaming_App.controller;

import com.CodeWithRishu.Video_Streaming_App.dto.request.OtpRequest;
import com.CodeWithRishu.Video_Streaming_App.dto.request.ProfileUpdateRequest;
import com.CodeWithRishu.Video_Streaming_App.dto.request.RefreshTokenRequest;
import com.CodeWithRishu.Video_Streaming_App.dto.response.JwtResponse;
import com.CodeWithRishu.Video_Streaming_App.dto.response.OtpResponse;
import com.CodeWithRishu.Video_Streaming_App.dto.response.ProfileResponse;
import com.CodeWithRishu.Video_Streaming_App.entity.RefreshToken;
import com.CodeWithRishu.Video_Streaming_App.entity.User;
import com.CodeWithRishu.Video_Streaming_App.service.AuthService;
import com.CodeWithRishu.Video_Streaming_App.service.JwtService;
import com.CodeWithRishu.Video_Streaming_App.service.OtpService;
import com.CodeWithRishu.Video_Streaming_App.service.RefreshTokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtService jwtService;
    private final OtpService otpService;
    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;

    @PostMapping("/signIn")
    public ResponseEntity<?> authenticateAndGetToken(@Valid @RequestBody OtpRequest otpRequest) {
        OtpResponse verifyOtpResponse = otpService.verifyOtp(otpRequest);

        if (!verifyOtpResponse.success()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    verifyOtpResponse.message()
            );
        }

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(otpRequest.email());
        User user = refreshToken.getUserInfo();

        String partialToken = jwtService.generateMfaToken(user, List.of("OTP_AUTHORITY"));

        return ResponseEntity.ok(Map.of(
                "success", true,
                "mfaRequired", true,
                "accessToken", partialToken,
                "message", "OTP verified successfully. Please proceed to request a sign-in link."
        ));
    }

    @PostMapping("/signUp")
    @ResponseStatus(HttpStatus.CREATED)
    public JwtResponse registerAndGetAccessAndRefreshToken(@Valid @RequestBody User userInfo) {
        authService.register(userInfo);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(userInfo.getEmail());

        List<String> authorities = List.of("OTP_AUTHORITY", "OTT_AUTHORITY");
        String accessToken = jwtService.generateMfaToken(userInfo, authorities);

        return JwtResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .build();
    }

    @PostMapping("/refreshToken")
    @ResponseStatus(HttpStatus.OK)
    public JwtResponse getRefreshToken(@Valid @RequestBody RefreshTokenRequest refreshTokenRequest) {
        return refreshTokenService.findByToken(refreshTokenRequest.token())
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUserInfo)
                .map(userInfo -> {
                    List<String> authorities = List.of("OTP_AUTHORITY", "OTT_AUTHORITY");
                    String accessToken = jwtService.generateMfaToken(userInfo, authorities);
                    return JwtResponse.builder()
                            .accessToken(accessToken)
                            .refreshToken(refreshTokenRequest.token())
                            .build();
                }).orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Refresh token is invalid, expired, or not found in database.")
                );
    }

    @GetMapping("/profile")
    @ResponseStatus(HttpStatus.OK)
    @PreAuthorize("hasRole('USER')")
    public ProfileResponse getUserProfile(@RequestParam String email) {
        return authService.getUserProfileByEmail(email);
    }

    @PutMapping("/profile")
    @ResponseStatus(HttpStatus.OK)
    @PreAuthorize("hasRole('USER')")
    public ProfileResponse updateUserProfile(@Valid @RequestBody ProfileUpdateRequest updateRequest) {
        return authService.updateUserProfile(updateRequest);
    }

}