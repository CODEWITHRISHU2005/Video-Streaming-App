package com.CodeWithRishu.Video_Streaming_App.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.internet.MimeMessage;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.authentication.ott.OneTimeToken;
import org.springframework.security.web.authentication.ott.OneTimeTokenGenerationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Component
@Slf4j
public class MagicLinkOttGenerationSuccessHandler implements OneTimeTokenGenerationSuccessHandler {

    private ObjectMapper objectMapper;
    private JavaMailSender mailSender;

    public MagicLinkOttGenerationSuccessHandler() {
    }

    public MagicLinkOttGenerationSuccessHandler(ObjectMapper objectMapper, JavaMailSender mailSender) {
        this.objectMapper = objectMapper;
        this.mailSender = mailSender;
    }

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${ott.token.expiry.seconds}")
    private int magicLinkExpirySeconds;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, OneTimeToken oneTimeToken)
            throws IOException, ServletException {

        String email = oneTimeToken.getUsername();
        String magicLink = buildMagicLink(oneTimeToken);

        log.info("Generated magic link for user {}: {}", email, magicLink);

        CompletableFuture.runAsync(() -> sendMagicLinkEmail(email, magicLink));

        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("application/json");
        response.getWriter().write(objectMapper.writeValueAsString(
                Map.of(
                        "success", true,
                        "message", "Magic link sent to your email successfully."
                )
        ));
    }

    private String buildMagicLink(OneTimeToken oneTimeToken) {
        return UriComponentsBuilder.fromUriString(frontendUrl)
                .path("/login")
                .queryParam("token", oneTimeToken.getTokenValue())
                .toUriString();
    }

    private void sendMagicLinkEmail(String recipientEmail, String magicLink) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String htmlContent = String.format(
                    "<div style='font-family: Arial, sans-serif; max-width: 550px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 8px;'>" +
                            "  <h2 style='color: #1a202c;'>Authentication Request</h2>" +
                            "  <p style='color: #4a5568; font-size: 16px;'>Click the button below to sign into your VideoStream account:</p>" +
                            "  <div style='text-align: center; margin: 30px 0;'>" +
                            "    <a href='%s' style='background-color: #E50914; color: white; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);'>Sign In Instantly</a>" +
                            "  </div>" +
                            "  <p style='color: #718096; font-size: 13px;'>This magic link is active for %d minutes. If the button above doesn't work, copy-paste this URL into your address bar:</p>" +
                            "  <p style='word-break: break-all; color: #3182ce; font-size: 14px;'>%s</p>" +
                            "</div>",
                    magicLink, magicLinkExpirySeconds / 60, magicLink
            );

            helper.setFrom(fromEmail, "VideoStream System");
            helper.setTo(recipientEmail);
            helper.setSubject("Sign in to your VideoStream Account");
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Magic link email delivered to: {}", recipientEmail);

        } catch (Exception e) {
            log.error("Failed to send magic link email to {}: {}", recipientEmail, e.getMessage(), e);
        }
    }
}