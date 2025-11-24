package com.CodeWithRishu.Video_Streaming_App.service;

import com.CodeWithRishu.Video_Streaming_App.dto.response.OttResponse;
import com.CodeWithRishu.Video_Streaming_App.entity.OttToken;
import com.CodeWithRishu.Video_Streaming_App.entity.Provider;
import com.CodeWithRishu.Video_Streaming_App.entity.User;
import com.CodeWithRishu.Video_Streaming_App.repository.OttTokenRepository;
import com.CodeWithRishu.Video_Streaming_App.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
public class OttService {

    private static final String OTT_LOGIN_PATH = "/api/v1/ott/login";
    private static final String TOKEN_PARAM = "token";
    private static final String EMAIL_SUBJECT = "Your VideoStream Sign-In Link";

    private final JavaMailSender javaMailSender;
    private final OttTokenRepository ottTokenRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    private final String appBaseUrl;
    private final String mailFrom;
    private final long tokenExpirySeconds;

    public OttService(
            JavaMailSender javaMailSender,
            OttTokenRepository ottTokenRepository,
            UserRepository userRepository,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            @Value("${app.base-url}") String appBaseUrl,
            @Value("${spring.mail.from}") String mailFrom,
            @Value("${ott.token.expiry.seconds}") long tokenExpirySeconds) {
        this.javaMailSender = javaMailSender;
        this.ottTokenRepository = ottTokenRepository;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.appBaseUrl = appBaseUrl;
        this.mailFrom = mailFrom;
        this.tokenExpirySeconds = tokenExpirySeconds;

        log.info("OttService initialized - Base URL: {}, Token expiry: {} seconds",
                appBaseUrl, tokenExpirySeconds);
    }

    @Transactional
    public void generateMagicLink(String email) {
        log.info("Magic link generation requested for email: {}", email);

        User user = findUserByEmail(email);
        invalidateExistingTokens(user);

        OttToken ottToken = createAndSaveOttToken(user, UUID.randomUUID().toString());
        String magicLink = buildMagicLink(ottToken.getToken());

        log.info("Magic link generated for user '{}' - Valid until: {}",
                user.getEmail(), ottToken.getExpiresAt());

        sendMagicLinkEmail(user, magicLink);
    }

    @Transactional
    public OttResponse loginWithOttToken(String token) {
        log.info("OTT login attempt with token: {}", maskToken(token));
        OttToken ottToken = findAndValidateOttToken(token);

        User user = ottToken.getUser();

        log.debug("OTT token validated for user: {}", user.getEmail());

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = refreshTokenService.createRefreshTokenForOtt(user.getName()).getReplacedByToken();

        log.debug("OTT token consumed and deleted for user: {}", user.getEmail());
        log.info("User '{}' successfully logged in via OTT", user.getEmail());

        return new OttResponse(accessToken, refreshToken);
    }

    private User findUserByEmail(String email) {
        log.debug("Looking up user by email: {}", email);

        return userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Magic link generation failed - User not found: {}", email);
                    return new IllegalArgumentException("User not found: " + email);
                });
    }

    private void invalidateExistingTokens(User user) {
        log.debug("Invalidating existing OTT tokens for user: {}", user.getEmail());

        try {
            ottTokenRepository.deleteByUser(user);
            log.debug("Existing OTT tokens deleted for user: {}", user.getEmail());
        } catch (Exception e) {
            log.error("Failed to delete existing OTT tokens for user: {}", user.getEmail(), e);
            throw new RuntimeException("Failed to invalidate existing tokens", e);
        }
    }

    private OttToken createAndSaveOttToken(User user, String tokenValue) {
        Instant expiryDate = Instant.now().plusSeconds(tokenExpirySeconds);

        log.debug("Creating OTT token for user: {} - Expires at: {}", user.getEmail(), expiryDate);

        OttToken ottToken = OttToken.builder()
                .token(tokenValue)
                .user(User.builder().provider(Provider.OTT).build())
                .expiresAt(expiryDate)
                .user(user)
                .build();

        try {
            OttToken saved = ottTokenRepository.save(ottToken);
            log.debug("OTT token saved successfully for user: {}", user.getEmail());
            return saved;
        } catch (Exception e) {
            log.error("Failed to save OTT token for user: {}", user.getEmail(), e);
            throw new RuntimeException("Failed to create token", e);
        }
    }

    private String buildMagicLink(String token) {
        log.trace("Building magic link URL");

        String magicLink = UriComponentsBuilder.fromHttpUrl(appBaseUrl)
                .path(OTT_LOGIN_PATH)
                .queryParam(TOKEN_PARAM, token)
                .toUriString();

        log.trace("Magic link URL built: {}", maskUrl(magicLink));
        return magicLink;
    }

    private void sendMagicLinkEmail(User user, String magicLink) {
        log.debug("Sending magic link email to: {}", user.getEmail());

        try {
            SimpleMailMessage message = buildEmailMessage(user, magicLink);
            javaMailSender.send(message);
            log.info("Magic link email sent successfully to: {}", user.getEmail());
        } catch (MailException e) {
            log.error("Failed to send magic link email to: {} - Error: {}",
                    user.getEmail(), e.getMessage(), e);
            throw new RuntimeException("Failed to send magic link email. Please try again later.", e);
        }
    }

    private SimpleMailMessage buildEmailMessage(User user, String magicLink) {
        log.trace("Building email message for user: {}", user.getEmail());

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(user.getEmail());
        message.setSubject(EMAIL_SUBJECT);
        message.setText(formatEmailBody(user, magicLink));

        return message;
    }

    private String formatEmailBody(User user, String magicLink) {
        long expiryMinutes = tokenExpirySeconds / 60;

        return String.format("""
                Hello %s,
                
                Click the link below to sign in to your SnapBuy account:
                
                %s
                
                This link is valid for %d minutes. If you did not request this, please ignore this email.

                Best regards,
                The SnapBuy Team
                """, user.getName(), magicLink, expiryMinutes);
    }

    private OttToken findAndValidateOttToken(String token) {
        log.debug("Validating OTT token: {}", maskToken(token));

        OttToken ottToken = ottTokenRepository.findByToken(token)
                .orElseThrow(() -> {
                    log.warn("OTT login failed - Invalid token: {}", maskToken(token));
                    return new IllegalArgumentException("Invalid or expired token. Please request a new one.");
                });

        if (isTokenExpired(ottToken)) {
            log.warn("OTT login failed - Token expired at: {} for user: {}",
                    ottToken.getExpiresAt(), ottToken.getUser().getEmail());

            ottTokenRepository.delete(ottToken);
            log.debug("Expired OTT token deleted: {}", maskToken(token));

            throw new IllegalArgumentException("Token expired. Please request a new one.");
        }

        log.debug("OTT token validated successfully for user: {}", ottToken.getUser().getEmail());
        ottTokenRepository.save(ottToken);
        return ottToken;
    }

    private boolean isTokenExpired(OttToken ottToken) {
        return ottToken.getExpiresAt().isBefore(Instant.now());
    }

    private String maskToken(String token) {
        if (token == null || token.length() < 8) {
            return "***";
        }
        return token.substring(0, 4) + "..." + token.substring(token.length() - 4);
    }

    private String maskUrl(String url) {
        if (url == null) {
            return "***";
        }
        int tokenIndex = url.indexOf(TOKEN_PARAM + "=");
        if (tokenIndex == -1) {
            return url;
        }
        return url.substring(0, tokenIndex + TOKEN_PARAM.length() + 1) + "***";
    }

}