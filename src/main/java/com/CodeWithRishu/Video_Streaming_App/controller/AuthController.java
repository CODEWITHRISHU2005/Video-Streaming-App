package com.CodeWithRishu.Video_Streaming_App.controller;

import com.CodeWithRishu.Video_Streaming_App.dto.request.LoginRequest;
import com.CodeWithRishu.Video_Streaming_App.dto.request.RefreshTokenRequest;
import com.CodeWithRishu.Video_Streaming_App.dto.request.RegisterRequest;
import com.CodeWithRishu.Video_Streaming_App.dto.response.JwtResponse;
import com.CodeWithRishu.Video_Streaming_App.dto.response.RegisterResponse;
import com.CodeWithRishu.Video_Streaming_App.service.AuthService;
import com.CodeWithRishu.Video_Streaming_App.service.RefreshTokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest registerRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(authService.register(registerRequest));
    }

    @PostMapping("/signIn")
    public ResponseEntity<JwtResponse> login(@Valid @RequestBody LoginRequest loginRequest,
                                             HttpServletResponse response) {
        return authService.login(loginRequest.email(), loginRequest.password(), response);
    }

    @PostMapping("/refreshToken")
    public ResponseEntity<JwtResponse> refreshToken(@RequestBody(required = false) RefreshTokenRequest refreshToken,
                                                    HttpServletRequest request,
                                                    HttpServletResponse response) {
        return refreshTokenService.createRefreshToken(refreshToken, request, response);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        authService.logout(request, response);
    }
}