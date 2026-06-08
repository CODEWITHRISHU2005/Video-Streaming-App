package com.CodeWithRishu.Video_Streaming_App.service;

import com.CodeWithRishu.Video_Streaming_App.dto.response.JwtResponse;
import com.CodeWithRishu.Video_Streaming_App.entity.OttToken;
import com.CodeWithRishu.Video_Streaming_App.entity.User;
import com.CodeWithRishu.Video_Streaming_App.repository.OttTokenRepository;
import com.CodeWithRishu.Video_Streaming_App.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class OttService {

    private final OttTokenRepository ottTokenRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    @Value("${msg91.auth-key}")
    private String authKey;
    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;
    @Value("${ott.token.expiry.seconds}")
    private long tokenExpirySeconds;

    @Transactional(rollbackFor = SQLException.class)
    public void generateMagicLink(String email) {
        log.info("Generating magic link for user: {}", email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("User not found: {}", email);
                    return new IllegalArgumentException("User not found: " + email);
                });

        String tokenValue = UUID.randomUUID().toString();

        ottTokenRepository.deleteByUser(user);
        log.debug("Deleted old OTT token for user: {}", user.getName());

        OttToken ottToken = OttToken.builder()
                .token(tokenValue)
                .expiresAt(Instant.now().plusSeconds(tokenExpirySeconds))
                .user(user)
                .build();

        ottTokenRepository.save(ottToken);
        log.info("Created new OTT token for user: {}", user.getName());

        String magicLink = UriComponentsBuilder.fromUriString(frontendUrl)
                .path("/login")
                .queryParam("token", tokenValue)
                .toUriString();

        log.info("Generated magic link for user {}: {}", user.getName(), magicLink);

        sendOttNotification(user, magicLink);
    }

    @Async
    public void sendOttNotification(User user, String magicLink) {
        try {
            String message = String.format(
                    "Hello %s,\n\nClick the link below to sign in to your VideoStream account:\n%s\n\nThis link is valid for %d minutes.",
                    user.getName(), magicLink, tokenExpirySeconds / 60
            );

            // Build JSON payload for MSG91 SMS API
            String payload = String.format(
                    "{\"authkey\":\"%s\",\"mobiles\":\"%s\",\"message\":\"%s\",\"sender\":\"TESTID\",\"route\":\"4\"}",
                    authKey, user.getPhoneNumber(), message.replace("\"", "\\\"")
            );

            HttpClient client = HttpClient.newHttpClient();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.msg91.com/api/v5/sms"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            log.info("Magic link SMS sent to {}. Response: {}", user.getPhoneNumber(), response.body());

        } catch (Exception e) {
            log.error("Failed to send magic link SMS to {}: {}", user.getPhoneNumber(), e.getMessage(), e);
            throw new RuntimeException("Failed to send notification SMS.", e);
        }
    }

    public JwtResponse loginWithOttToken(String token) {
        log.info("Logging in with OTT token: {}", token);
        OttToken ottToken = ottTokenRepository.findByToken(token)
                .orElseThrow(() -> {
                    log.warn("Invalid or expired OTT token: {}", token);
                    return new IllegalArgumentException("Invalid or expired token, please request a new one.");
                });

        if (ottToken.getExpiresAt().isBefore(Instant.now())) {
            ottTokenRepository.deleteByToken(token);
            log.warn("OTT token expired: {}", token);
            throw new IllegalArgumentException("Token expired, please request a new one.");
        }

        User user = ottToken.getUser();
        List<String> finalFactors = List.of("OTP_AUTHORITY", "OTT_AUTHORITY");
        String accessToken = jwtService.generateMfaToken(user, finalFactors);
        String refreshToken = refreshTokenService.createRefreshToken(user.getEmail()).getToken();

        ottTokenRepository.delete(ottToken);
        log.debug("Consumed and deleted OTT token for user: {}", user);

        return JwtResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }

}
