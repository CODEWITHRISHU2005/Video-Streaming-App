package com.CodeWithRishu.Video_Streaming_App.handler;

import com.CodeWithRishu.Video_Streaming_App.config.CustomUserDetails;
import com.CodeWithRishu.Video_Streaming_App.config.CustomUserDetailsService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailSender;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.security.authentication.ott.OneTimeToken;
import org.springframework.security.web.authentication.ott.OneTimeTokenGenerationSuccessHandler;
import org.springframework.security.web.authentication.ott.RedirectOneTimeTokenGenerationSuccessHandler;
import org.springframework.security.web.util.UrlUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.concurrent.CompletableFuture;

@Component
@Slf4j
@RequiredArgsConstructor
public class MagicLinkOttGenerationSuccessHandler implements OneTimeTokenGenerationSuccessHandler {
    private final CustomUserDetailsService userDetailsService;
    private final MailSender mailSender;

    @Value("${ott.token.expiry.seconds}")
    private int magicLinkExpirySeconds;

    private final OneTimeTokenGenerationSuccessHandler redirectHandler = new RedirectOneTimeTokenGenerationSuccessHandler("/ott/sent");

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, OneTimeToken oneTimeToken)
            throws IOException, ServletException {

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl(UrlUtils.buildFullRequestUrl(request))
                .replacePath(request.getContextPath())
                .replaceQuery(null)
                .fragment(null)
                .path("/login/ott")
                .queryParam("token", oneTimeToken.getTokenValue());

        String magicLink = builder.toUriString();
        log.info("Generated magic link for user {}: {}", oneTimeToken.getUsername(), magicLink);

        String userEmail = getUserEmail(oneTimeToken.getUsername());

        CompletableFuture.runAsync(() -> sendMagicLinkEmail(userEmail, magicLink, oneTimeToken.getUsername()))
                .exceptionally(throwable -> {
                    log.error("Failed to send magic link email to user: {}", oneTimeToken.getUsername(), throwable);
                    return null;
                });
        this.redirectHandler.handle(request, response, oneTimeToken);
    }

    private String getUserEmail(String username) {
        try {
            var userDetails = userDetailsService.loadUserByUsername(username);
            if (userDetails instanceof CustomUserDetails customUser)
                return customUser.getEmail();
        } catch (Exception e) {
            log.error("Error retrieving email for username: {}", username, e);
            throw new RuntimeException("Could not retrieve user email", e);
        }
        return "";
    }

    private void sendMagicLinkEmail(String recipientEmail, String magicLink, String username) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(recipientEmail);
            message.setSubject("Your SnapBuy Magic Link - Sign In Securely");
            message.setText(buildEmailContent(magicLink, username));
            message.setFrom("noreply@snapbuy.com"); // Configure this in application.properties

            mailSender.send(message);
            log.info("Magic link email sent successfully to: {}", recipientEmail);

        } catch (Exception e) {
            log.error("Failed to send magic link email to: {}", recipientEmail, e);
            throw new RuntimeException("Failed to send magic link email", e);
        }
    }

    private String buildEmailContent(String magicLink, String username) {
        return String.format("""
                Hi %s,
                
                You requested to sign in to your SnapBuy account. Click the secure link below to sign in:
                
                %s
                
                This link will expire in %d minutes for your security.
                
                If you didn't request this login, please ignore this email.
                
                Best regards,
                The SnapBuy Team
                
                ---
                This is an automated message. Please do not reply to this email.
                """, username, magicLink, magicLinkExpirySeconds / 60);
    }

}