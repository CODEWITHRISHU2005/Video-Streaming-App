package com.CodeWithRishu.Video_Streaming_App.handler;

import com.CodeWithRishu.Video_Streaming_App.entity.Provider;
import com.CodeWithRishu.Video_Streaming_App.entity.RefreshToken;
import com.CodeWithRishu.Video_Streaming_App.entity.User;
import com.CodeWithRishu.Video_Streaming_App.repository.RefreshTokenRepository;
import com.CodeWithRishu.Video_Streaming_App.service.AuthService;
import com.CodeWithRishu.Video_Streaming_App.service.CookieService;
import com.CodeWithRishu.Video_Streaming_App.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;
import java.util.UUID;

@Component
@Slf4j
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final AuthService authService;
    private final CookieService cookieService;
    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${app.auth.success-redirect}")
    private String frontendRedirectURL;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, FilterChain chain, Authentication authentication) throws IOException, ServletException {
        AuthenticationSuccessHandler.super.onAuthenticationSuccess(request, response, chain, authentication);
    }

    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String registrationId = "unknown";

        if (authentication instanceof OAuth2AuthenticationToken token) {
            registrationId = token.getAuthorizedClientRegistrationId();
        }

        log.debug("OAuth2 user attributes: {}", oAuth2User.getAttributes());

        User user;
        switch (registrationId) {
            case "google" -> {
                String googleId = oAuth2User.getAttributes().getOrDefault("sub", "").toString();
                String email = oAuth2User.getAttributes().getOrDefault("email", "").toString(); // may be null if not granted
                String name = oAuth2User.getAttributes().getOrDefault("name", "").toString();
                String image = oAuth2User.getAttributes().getOrDefault("picture", "").toString();
                user = authService.saveUserIfNotExit(googleId, email, name, image, Provider.GOOGLE);
            }
            default -> {
                throw new RuntimeException("Unsupported provider: " + registrationId);
            }
        }

        String jti = UUID.randomUUID().toString();

        RefreshToken refreshToken = RefreshToken.builder()
                .jti(jti)
                .user(user)
                .revoked(false)
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60L * 60 * 24 * 15)) // 15 days
                .build();

        refreshTokenRepository.save(refreshToken);

        String generatedRefreshToken = jwtService.generateRefreshToken(user, jti);
        cookieService.attachRefreshCookie(response, generatedRefreshToken, 60 * 24 * 15); // 15 days
        response.sendRedirect(frontendRedirectURL);
    }

}