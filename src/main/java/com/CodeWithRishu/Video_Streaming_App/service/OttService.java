package com.CodeWithRishu.Video_Streaming_App.service;

import com.CodeWithRishu.Video_Streaming_App.dto.response.JwtResponse;
import com.CodeWithRishu.Video_Streaming_App.entity.OttToken;
import com.CodeWithRishu.Video_Streaming_App.entity.User;
import com.CodeWithRishu.Video_Streaming_App.repository.OttTokenRepository;
import com.CodeWithRishu.Video_Streaming_App.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.sql.SQLException;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OttService {

    private final JavaMailSender javaMailSender;
    private final OttTokenRepository ottTokenRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    @Value("${app.base-url}")
    private String appBaseUrl;
    @Value("${spring.mail.from}")
    private String mailFrom;
    @Value("${ott.token.expiry.seconds}")
    private long tokenExpirySeconds;

    @Transactional(rollbackFor = SQLException.class)
    public void generateMagicLink(String username) {
        log.info("Generating magic link for user: {}", username);
        User user = userRepository.findByName(username)
                .orElseThrow(() -> {
                    log.warn("User not found: {}", username);
                    return new IllegalArgumentException("User not found: " + username);
                });

        String tokenValue = UUID.randomUUID().toString();

        ottTokenRepository.deleteByUser(user);
        log.debug("Deleted old OTT token for user: {}", user.getName());

        OttToken ottToken = OttToken.builder()
                .token(tokenValue)
                .expiryDate(Instant.now().plusSeconds(tokenExpirySeconds))
                .user(user)
                .build();

        ottTokenRepository.save(ottToken);
        log.info("Created new OTT token for user: {}", user.getName());

        String magicLink = UriComponentsBuilder.fromHttpUrl(appBaseUrl)
                .path("/api/v1/ott/login")
                .queryParam("token", tokenValue)
                .toUriString();

        log.info("Generated magic link for user {}: {}", user.getName(), magicLink);

        sendOttNotification(user, magicLink);
    }

    private void sendOttNotification(User user, String magicLink) {
        try {
            SimpleMailMessage message = getSimpleMailMessage(user, magicLink);
            javaMailSender.send(message);
            log.info("Magic link email sent successfully to {}", user.getEmail());
        } catch (MailException e) {
            log.error("Failed to send magic link email to {}: {}", user.getEmail(), e.getMessage(), e);
            throw new RuntimeException("Failed to send notification email.", e);
        }
    }

    private SimpleMailMessage getSimpleMailMessage(User user, String magicLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(user.getEmail());
        message.setSubject("Your SnapBuy Sign-In Link");

        String messageBody = String.format("""
                 Hello %s,
                
                 Click the link below to sign in to your SnapBuy account:
                
                 %s
                
                 This link is valid for %d minutes. If you did not request this, please ignore this email.
                """, user.getName(), magicLink, tokenExpirySeconds / 60);

        message.setText(messageBody);
        return message;
    }

    public JwtResponse loginWithOttToken(String token) {
        log.info("Logging in with OTT token: {}", token);
        OttToken ottToken = ottTokenRepository.findByToken(token)
                .orElseThrow(() -> {
                    log.warn("Invalid or expired OTT token: {}", token);
                    return new IllegalArgumentException("Invalid or expired token, please request a new one.");
                });

        if (ottToken.getExpiryDate().isBefore(Instant.now())) {
            ottTokenRepository.deleteByToken(token);
            log.warn("OTT token expired: {}", token);
            throw new IllegalArgumentException("Token expired, please request a new one.");
        }

        String userName = ottToken.getUser().getName();
        String jwt = jwtService.generateToken(userName);
        log.debug("Generated JWT for user: {}", userName);
        log.info("Generated JWT for user: {}", userName);

        return JwtResponse.builder()
                .accessToken(jwt)
                .refreshToken(refreshTokenService.createRefreshToken(userName).getToken())
                .build();
    }
}