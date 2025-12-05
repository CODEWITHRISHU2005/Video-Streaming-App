package com.CodeWithRishu.Video_Streaming_App.service;

import com.CodeWithRishu.Video_Streaming_App.entity.RefreshToken;
import com.CodeWithRishu.Video_Streaming_App.entity.User;
import com.CodeWithRishu.Video_Streaming_App.repository.RefreshTokenRepository;
import com.CodeWithRishu.Video_Streaming_App.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    @Transactional
    public RefreshToken createRefreshToken(String email) {
        log.info("Creating refresh token for user: {}", email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("User not found: {}", email);
                    return new UsernameNotFoundException("User not found");
                });

        log.debug("Deleting old refresh token for user: {}", email);
        refreshTokenRepository.deleteByUserInfo(user);

        refreshTokenRepository.flush();

        RefreshToken refreshToken = RefreshToken.builder()
                .userInfo(user)
                .token(UUID.randomUUID().toString())
                .expiresAt(Instant.now().plusMillis(60000 * 60 * 24 * 15)) // 15 days expiry
                .build();

        RefreshToken savedToken = refreshTokenRepository.save(refreshToken);
        log.info("Refresh token created for user: {}, token: {}", email, savedToken.getToken());
        return savedToken;
    }

    public Optional<RefreshToken> findByToken(String token) {
        log.debug("Finding refresh token: {}", token);
        return refreshTokenRepository.findByToken(token)
                .map(this::verifyExpiration)
                .or(() -> {
                    log.warn("Refresh token not found or expired: {}", token);
                    return Optional.empty();
                });
    }

    public RefreshToken verifyExpiration(RefreshToken token) {
        log.debug("Verifying expiration for refresh token: {}", token.getToken());
        if (token.getExpiresAt().compareTo(Instant.now()) < 0) {
            log.warn("Refresh token expired: {}", token.getToken());
            refreshTokenRepository.delete(token);
            throw new RuntimeException(token.getToken() + " Refresh token was expired. Please make a new sign in request");
        }
        log.info("Refresh token is valid: {}", token.getToken());
        return token;
    }

}