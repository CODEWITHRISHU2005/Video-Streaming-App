package com.CodeWithRishu.Video_Streaming_App.service;

import com.CodeWithRishu.Video_Streaming_App.dto.request.RefreshTokenRequest;
import com.CodeWithRishu.Video_Streaming_App.dto.response.JwtResponse;
import com.CodeWithRishu.Video_Streaming_App.entity.RefreshToken;
import com.CodeWithRishu.Video_Streaming_App.entity.User;
import com.CodeWithRishu.Video_Streaming_App.repository.RefreshTokenRepository;
import com.CodeWithRishu.Video_Streaming_App.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String CUSTOM_REFRESH_HEADER = "X-Refresh-Token";
    private static final int REFRESH_TOKEN_EXPIRY_MINUTES = 60 * 24 * 15;
    private static final long REFRESH_TOKEN_EXPIRY_SECONDS = 60L * 60 * 24 * 15;
    private static final int ACCESS_TOKEN_EXPIRY_SECONDS = 900;

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final CookieService cookieService;
    private final UserRepository userRepository;

    @Transactional
    public ResponseEntity<JwtResponse> createRefreshToken(RefreshTokenRequest body,
                                                          HttpServletRequest request,
                                                          HttpServletResponse response) {
        String token = extractRefreshToken(body, request);

        if (!jwtService.isRefreshToken(token)) {
            throw new BadCredentialsException("Invalid token type");
        }

        String jti = jwtService.getJti(token);
        UUID userId = jwtService.getUserId(token);

        RefreshToken storedToken = refreshTokenRepository.findByJti(jti)
                .orElseThrow(() -> new BadCredentialsException("Refresh token not recognized"));

        validateTokenStatus(storedToken);
        validateTokenOwnership(storedToken, userId);

        User user = storedToken.getUser();
        String newJti = UUID.randomUUID().toString();

        storedToken.setRevoked(true);
        storedToken.setReplacedByToken(newJti);
        refreshTokenRepository.save(storedToken);

        Instant now = Instant.now();
        RefreshToken newRefreshToken = RefreshToken.builder()
                .jti(newJti)
                .user(user)
                .createdAt(now)
                .expiresAt(now.plusSeconds(REFRESH_TOKEN_EXPIRY_SECONDS))
                .revoked(false)
                .build();
        refreshTokenRepository.save(newRefreshToken);

        String newAccessToken = jwtService.generateAccessToken(user);
        String newRefreshTokenString = jwtService.generateRefreshToken(user, newJti);

        cookieService.attachRefreshCookie(response, newRefreshTokenString, REFRESH_TOKEN_EXPIRY_MINUTES);
        cookieService.addNoStoreHeaders(response);

        return ResponseEntity.ok()
                .header(HttpHeaders.AUTHORIZATION, BEARER_PREFIX + newAccessToken)
                .body(JwtResponse.bearer(newAccessToken, newRefreshTokenString, ACCESS_TOKEN_EXPIRY_SECONDS));
    }

    @Transactional
    public RefreshToken createRefreshTokenForOtt(String username) {
        User user = userRepository.findByName(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        refreshTokenRepository.findByUser(user)
                .ifPresent(refreshTokenRepository::delete);

        Instant now = Instant.now();
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .jti(UUID.randomUUID().toString())
                .revoked(false)
                .replacedByToken(UUID.randomUUID().toString())
                .createdAt(now)
                .expiresAt(now.plusSeconds(REFRESH_TOKEN_EXPIRY_SECONDS))
                .build();

        return refreshTokenRepository.save(refreshToken);
    }

    private String extractRefreshToken(RefreshTokenRequest body, HttpServletRequest request) {
        return readRefreshTokenFromRequest(body, request)
                .orElseThrow(() -> new BadCredentialsException("Refresh token missing"));
    }

    private void validateTokenStatus(RefreshToken token) {
        if (token.isRevoked()) {
            throw new CredentialsExpiredException("Refresh token has been revoked");
        }
        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new CredentialsExpiredException("Refresh token expired");
        }
    }

    private void validateTokenOwnership(RefreshToken token, UUID userId) {
        if (!token.getUser().getId().equals(userId)) {
            throw new BadCredentialsException("Token subject mismatch");
        }
    }

    private Optional<String> readRefreshTokenFromRequest(RefreshTokenRequest body, HttpServletRequest request) {
        return readFromCookie(request)
                .or(() -> readFromRequestBody(body))
                .or(() -> readFromCustomHeader(request))
                .or(() -> readFromAuthorizationHeader(request));
    }

    private Optional<String> readFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return Optional.empty();

        return Arrays.stream(request.getCookies())
                .filter(cookie -> cookieService.getRefreshCookieName().equals(cookie.getName()))
                .map(Cookie::getValue)
                .filter(value -> value != null && !value.isBlank())
                .findFirst();
    }

    private Optional<String> readFromRequestBody(RefreshTokenRequest body) {
        if (body == null || body.refreshToken() == null || body.refreshToken().isBlank()) {
            return Optional.empty();
        }
        return Optional.of(body.refreshToken().trim());
    }

    private Optional<String> readFromCustomHeader(HttpServletRequest request) {
        String headerValue = request.getHeader(CUSTOM_REFRESH_HEADER);
        return headerValue != null && !headerValue.isBlank()
                ? Optional.of(headerValue.trim())
                : Optional.empty();
    }

    private Optional<String> readFromAuthorizationHeader(HttpServletRequest request) {
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.regionMatches(true, 0, BEARER_PREFIX, 0, 7)) {
            return Optional.empty();
        }

        String candidate = authHeader.substring(BEARER_PREFIX.length()).trim();
        if (candidate.isEmpty()) return Optional.empty();

        try {
            return jwtService.isRefreshToken(candidate) ? Optional.of(candidate) : Optional.empty();
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}