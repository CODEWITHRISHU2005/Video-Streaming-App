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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtService jwtService;
    private final OtpService otpService;
    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;

    @PostMapping("/signIn")
    @ResponseStatus(HttpStatus.OK)
    public JwtResponse authenticateAndGetToken(@Valid @RequestBody OtpRequest otpRequest) {
        OtpResponse verifyOtpResponse = otpService.verifyOtp(otpRequest);

        if (!verifyOtpResponse.success()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    verifyOtpResponse.message()
            );
        }

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(otpRequest.email());
        User user = refreshToken.getUserInfo();

        return JwtResponse.builder()
                .accessToken(jwtService.generateToken(user))
                .refreshToken(refreshToken.getToken()).build();
    }

    @PostMapping("/signUp")
    @ResponseStatus(HttpStatus.CREATED)
    public JwtResponse registerAndGetAccessAndRefreshToken(@Valid @RequestBody User userInfo) {
        authService.register(userInfo);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(userInfo.getEmail());

        return JwtResponse.builder()
                .accessToken(jwtService.generateToken(userInfo))
                .refreshToken(refreshToken.getToken()).build();
    }

    @PostMapping("/refreshToken")
    @ResponseStatus(HttpStatus.OK)
    public JwtResponse getRefreshToken(@Valid @RequestBody RefreshTokenRequest refreshTokenRequest) {
        return refreshTokenService.findByToken(refreshTokenRequest.token())
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUserInfo)
                .map(userInfo -> {
                    String accessToken = jwtService.generateToken(userInfo);
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