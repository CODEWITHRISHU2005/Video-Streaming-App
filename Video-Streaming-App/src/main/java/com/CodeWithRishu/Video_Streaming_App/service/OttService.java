package com.CodeWithRishu.Video_Streaming_App.service;

import com.CodeWithRishu.Video_Streaming_App.dto.response.JwtResponse;
import com.CodeWithRishu.Video_Streaming_App.entity.OttToken;
import com.CodeWithRishu.Video_Streaming_App.entity.User;
import com.CodeWithRishu.Video_Streaming_App.repository.OttTokenRepository;
import com.CodeWithRishu.Video_Streaming_App.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.security.SecureRandom;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class OttService {

    private final OttTokenRepository ottTokenRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${brevo.api.key}")
    private String brevoApiKey;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${ott.token.expiry.seconds}")
    private long tokenExpirySeconds;

    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional(rollbackFor = SQLException.class)
    public void generateAndSendAuth(String email, String authType) {
        log.info("Generating {} validation credentials for: {}", authType, email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("User record missing for email: {}", email);
                    return new IllegalArgumentException("User not found: " + email);
                });

        String tokenValue;
        if ("OTP".equalsIgnoreCase(authType)) {
            tokenValue = generateNumericOtp();
        } else {
            tokenValue = UUID.randomUUID().toString();
        }

        ottTokenRepository.deleteByUser(user);

        OttToken ottToken = OttToken.builder()
                .token(tokenValue)
                .expiresAt(Instant.now().plusSeconds(tokenExpirySeconds))
                .user(user)
                .build();

        ottTokenRepository.save(ottToken);

        if ("OTP".equalsIgnoreCase(authType)) {
            sendOtpEmail(user, tokenValue);
        } else {
            String magicLink = UriComponentsBuilder.fromUriString(frontendUrl)
                    .path("/login")
                    .queryParam("token", tokenValue)
                    .toUriString();
            sendMagicLinkEmail(user, magicLink);
        }
    }

    @Async
    protected void sendMagicLinkEmail(User user, String magicLink) {
        String subject = "Sign in to your VideoStream Account";
        String htmlContent = String.format(
                "<div style='font-family: Arial, sans-serif; max-width: 550px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 8px;'>" +
                        "  <h2 style='color: #1a202c;'>Hey %s,</h2>" +
                        "  <p style='color: #4a5568; font-size: 16px;'>Click the button below to instantly login to your VideoStream account without entering a password:</p>" +
                        "  <div style='text-align: center; margin: 30px 0;'>" +
                        "    <a href='%s' style='background-color: #E50914; color: white; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);'>Sign In Instantly</a>" +
                        "  </div>" +
                        "  <p style='color: #718096; font-size: 13px;'>This magic link is active for %d minutes. If the button above doesn't work, copy-paste this URL into your address bar:</p>" +
                        "  <p style='word-break: break-all; color: #3182ce; font-size: 14px;'>%s</p>" +
                        "</div>",
                user.getName(), magicLink, tokenExpirySeconds / 60, magicLink
        );

        dispatchEmail(user.getEmail(), subject, htmlContent);
    }

    @Async
    protected void sendOtpEmail(User user, String otp) {
        String subject = "Your VideoStream Single-Use Verification Code";
        String htmlContent = String.format(
                "<div style='font-family: Arial, sans-serif; max-width: 550px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 8px;'>" +
                        "  <h2 style='color: #1a202c;'>Hey %s,</h2>" +
                        "  <p style='color: #4a5568; font-size: 16px;'>Use the one-time passcode below to complete your sign-in process:</p>" +
                        "  <div style='text-align: center; margin: 35px 0;'>" +
                        "    <span style='font-size: 34px; font-weight: bold; letter-spacing: 6px; color: #E50914; background: #f7fafc; padding: 12px 24px; border: 1px dashed #cbd5e0; border-radius: 6px; display: inline-block;'>%s</span>" +
                        "  </div>" +
                        "  <p style='color: #718096; font-size: 13px;'>This authorization code is valid for %d minutes. For security reasons, do not share this email with anyone.</p>" +
                        "</div>",
                user.getName(), otp, tokenExpirySeconds / 60
        );

        dispatchEmail(user.getEmail(), subject, htmlContent);
    }

    private void dispatchEmail(String recipientEmail, String subject, String htmlContent) {
        try {
            Map<String, Object> payload = Map.of(
                    "sender", Map.of("name", "VideoStream System", "email", fromEmail),
                    "to", List.of(Map.of("email", recipientEmail)),
                    "subject", subject,
                    "htmlContent", htmlContent
            );

            String jsonBody = objectMapper.writeValueAsString(payload);

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                    .header("accept", "application/json")
                    .header("api-key", brevoApiKey)
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 201) {
                log.info("Brevo engine successfully delivered authentication email context to: {}", recipientEmail);
            } else {
                log.error("Brevo API rejected the request. Status: {}, Body: {}", response.statusCode(), response.body());
                throw new RuntimeException("Failed to send system authentication notification.");
            }
        } catch (Exception e) {
            log.error("HTTP relay error pushing Brevo mail to {}: {}", recipientEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to send system authentication notification.", e);
        }
    }

    public JwtResponse loginWithOttToken(String token) {
        log.info("Verifying application login attempts via token evaluation entry point");

        OttToken ottToken = ottTokenRepository.findByToken(token)
                .orElseThrow(() -> {
                    log.warn("Lookup failed for provided token sequence.");
                    return new IllegalArgumentException("Invalid or expired credentials token, please request a new one.");
                });

        if (ottToken.getExpiresAt().isBefore(Instant.now())) {
            ottTokenRepository.delete(ottToken);
            log.warn("Target authentication token time-to-live parameter has expired.");
            throw new IllegalArgumentException("Your token/OTP has expired, please request a new one.");
        }

        User user = ottToken.getUser();
        List<String> finalFactors = List.of("OTP_AUTHORITY", "OTT_AUTHORITY");
        String accessToken = jwtService.generateMfaToken(user, finalFactors);
        String refreshToken = refreshTokenService.createRefreshToken(user.getEmail()).getToken();

        ottTokenRepository.delete(ottToken);
        log.info("Token cleanly verified and destroyed for authenticated user: {}", user.getEmail());

        return JwtResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }

    private String generateNumericOtp() {
        StringBuilder otp = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            otp.append(secureRandom.nextInt(10));
        }
        return otp.toString();
    }
}