package com.CodeWithRishu.Video_Streaming_App.service;

import com.CodeWithRishu.Video_Streaming_App.dto.UserMetaDataDto;
import com.CodeWithRishu.Video_Streaming_App.dto.request.RegisterRequest;
import com.CodeWithRishu.Video_Streaming_App.dto.response.JwtResponse;
import com.CodeWithRishu.Video_Streaming_App.dto.response.RegisterResponse;
import com.CodeWithRishu.Video_Streaming_App.entity.Provider;
import com.CodeWithRishu.Video_Streaming_App.entity.RefreshToken;
import com.CodeWithRishu.Video_Streaming_App.entity.User;
import com.CodeWithRishu.Video_Streaming_App.repository.RefreshTokenRepository;
import com.CodeWithRishu.Video_Streaming_App.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    private final JwtService jwtService;
    private final CookieService cookieService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private static final int REFRESH_TOKEN_EXPIRY_DAYS = 15;
    private static final int REFRESH_TOKEN_EXPIRY_MINUTES = 60 * 24 * REFRESH_TOKEN_EXPIRY_DAYS;
    private static final int ACCESS_TOKEN_EXPIRY_SECONDS = 900;

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        log.info("Registration attempt initiated");

        validateRegistrationRequest(request);

        String normalizedEmail = normalizeEmail(request.getEmail());
        log.debug("Normalized email for registration: {}", normalizedEmail);

        if (userRepository.existsByEmail(normalizedEmail)) {
            log.warn("Registration failed - email already exists: {}", normalizedEmail);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        String encodedPassword = encodePasswordIfPresent(request.getPassword());

        User user = buildUser(request, normalizedEmail, encodedPassword);
        User savedUser = userRepository.save(user);

        log.info("User registered successfully with ID: {} and email: {}", savedUser.getId(), normalizedEmail);

        return buildRegisterResponse(savedUser);
    }

    public ResponseEntity<JwtResponse> login(@Email @NotBlank String email,
                                             @NotBlank String password,
                                             HttpServletResponse response) {
        log.info("Login attempt for email: {}", email);

        User user = findUserByEmail(email);
        validateUserForLogin(user);

        String jti = UUID.randomUUID().toString();
        log.debug("Generated JTI for refresh token: {}", jti);

        RefreshToken refreshTokenEntity = createAndSaveRefreshToken(user, jti);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user, jti);

        log.debug("Generated access and refresh tokens for user: {}", user.getEmail());

        attachTokensToResponse(response, accessToken, refreshToken);

        log.info("User logged in successfully: {}", user.getEmail());

        return buildLoginResponse(accessToken, refreshToken, user);
    }

    // ==================== Private Helper Methods ====================

    private void validateRegistrationRequest(RegisterRequest request) {
        if (request == null) {
            log.error("Registration request is null");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            log.error("Registration request missing email");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private String encodePasswordIfPresent(String password) {
        if (password != null && !password.isBlank()) {
            log.debug("Encoding password for user");
            return passwordEncoder.encode(password);
        }
        log.debug("No password provided - OAuth-only user");
        return null;
    }

    private User buildUser(RegisterRequest request, String normalizedEmail, String encodedPassword) {
        return User.builder()
                .email(normalizedEmail)
                .name(request.getName())
                .provider(Provider.LOCAL)
                .password(encodedPassword)
                .image(request.getImage())
                .enabled(true)
                .build();
    }

    private RegisterResponse buildRegisterResponse(User user) {
        return RegisterResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .image(user.getImage())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Login failed - user not found: {}", email);
                    return new BadCredentialsException("Invalid Credential");
                });
    }

    private void validateUserForLogin(User user) {
        if (user.getPassword() == null) {
            log.warn("Login failed - no password set for user: {}", user.getEmail());
            throw new BadCredentialsException("Password login is not available for this account");
        }

        if (!user.isEnabled()) {
            log.warn("Login failed - user disabled: {}", user.getEmail());
            throw new DisabledException("User is disabled");
        }
    }

    private RefreshToken createAndSaveRefreshToken(User user, String jti) {
        Instant now = Instant.now();
        RefreshToken token = RefreshToken.builder()
                .jti(jti)
                .user(user)
                .createdAt(now)
                .expiresAt(now.plusSeconds(60L * 60 * 24 * REFRESH_TOKEN_EXPIRY_DAYS))
                .revoked(false)
                .build();

        refreshTokenRepository.save(token);
        log.debug("Refresh token saved for user: {}", user.getEmail());

        return token;
    }

    private void attachTokensToResponse(HttpServletResponse response, String accessToken, String refreshToken) {
        cookieService.attachRefreshCookie(response, refreshToken, REFRESH_TOKEN_EXPIRY_MINUTES);
        cookieService.addNoStoreHeaders(response);
    }

    private ResponseEntity<JwtResponse> buildLoginResponse(String accessToken, String refreshToken, User user) {
        UserMetaDataDto userMetaDataDto = new UserMetaDataDto(
                user.getName(),
                user.getEmail(),
                user.isEnabled(),
                user.getImage(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .body(JwtResponse.bearerWithUser(
                        accessToken,
                        refreshToken,
                        ACCESS_TOKEN_EXPIRY_SECONDS,
                        userMetaDataDto
                ));
    }

    public void logout(HttpServletRequest request, HttpServletResponse response) {
        cookieService.readRefreshTokenFromRequest(request).ifPresent(token -> {
            try {
                if (jwtService.isRefreshToken(token)) {
                    String jti = jwtService.getJti(token);
                    refreshTokenRepository.findByJti(jti).ifPresent(rt -> {
                        rt.setRevoked(true);
                        refreshTokenRepository.save(rt);
                    });
                }
            } catch (JwtException ignored) {
                log.warn("Invalid refresh token during logout");
            }
        });

        cookieService.clearRefreshCookie(response);
        cookieService.addNoStoreHeaders(response);
        SecurityContextHolder.clearContext();
    }

    public User saveUserIfNotExit(String googleId, String email, String name, String image, Provider provider) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .email(email)
                    .name(name)
                    .provider(provider)
                    .image(image)
                    .enabled(true)
                    .build();
            log.info("Saving new OAuth user: {}", email);
            return userRepository.save(newUser);
        });
    }
}