package com.CodeWithRishu.Video_Streaming_App.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.ott.OneTimeToken;
import org.springframework.security.web.authentication.ott.OneTimeTokenGenerationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Component
@Slf4j
public class MagicLinkOttGenerationSuccessHandler implements OneTimeTokenGenerationSuccessHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${brevo.api.key}")
    private String brevoApiKey;

    @Value("${ott.token.expiry.seconds}")
    private int magicLinkExpirySeconds;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    public MagicLinkOttGenerationSuccessHandler() {
    }

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

            Map<String, Object> payload = Map.of(
                    "sender", Map.of("name", "VideoStream System", "email", fromEmail),
                    "to", List.of(Map.of("email", recipientEmail)),
                    "subject", "Sign in to your VideoStream Account",
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
                log.info("Magic link email delivered to via Brevo HTTP API: {}", recipientEmail);
            } else {
                log.error("Brevo API rejected the request. Status: {}, Body: {}", response.statusCode(), response.body());
            }

        } catch (Exception e) {
            log.error("Failed to send magic link email to {}: {}", recipientEmail, e.getMessage(), e);
        }
    }
}