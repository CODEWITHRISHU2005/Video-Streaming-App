package com.CodeWithRishu.Video_Streaming_App.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.ott.OneTimeToken;
import org.springframework.security.web.authentication.ott.OneTimeTokenGenerationSuccessHandler;
import org.springframework.security.web.util.UrlUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

@Component
@Slf4j
public class MagicLinkOttGenerationSuccessHandler implements OneTimeTokenGenerationSuccessHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ott.token.expiry.seconds}")
    private int magicLinkExpirySeconds;
    @Value("${app.frontend.url}")
    private String frontendUrl;
    @Value("${msg91.auth-key}")
    private String authKey;

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, OneTimeToken oneTimeToken)
            throws IOException, ServletException {

        String magicLink = buildMagicLink(request, oneTimeToken);
        String username = oneTimeToken.getUsername();
        String phoneNumber = username; // assuming username holds phone number

        log.info("Generated magic link for user {}: {}", username, magicLink);

        sendMagicLinkSms(phoneNumber, magicLink, username);

        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("application/json");
        response.getWriter().write(objectMapper.writeValueAsString(
                Map.of(
                        "success", true,
                        "message", "Magic link sent via SMS"
                )
        ));
    }

    private String buildMagicLink(HttpServletRequest request, OneTimeToken oneTimeToken) {
        return UriComponentsBuilder
                .fromUriString(UrlUtils.buildFullRequestUrl(request))
                .replacePath(request.getContextPath())
                .replaceQuery(null)
                .fragment(null)
                .path("/login/ott")
                .queryParam("token", oneTimeToken.getTokenValue())
                .toUriString();
    }

    private void sendMagicLinkSms(String phoneNumber, String magicLink, String username) {
        try {
            String message = String.format(
                    "Hello %s,\nClick to sign in: %s\nValid for %d minutes.",
                    username, magicLink, magicLinkExpirySeconds / 60
            );

            String payload = String.format(
                    "{\"authkey\":\"%s\",\"mobiles\":\"%s\",\"message\":\"%s\",\"sender\":\"TESTID\",\"route\":\"4\"}",
                    authKey, phoneNumber, message.replace("\"", "\\\"")
            );

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.msg91.com/api/v5/sms"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("Magic link SMS sent to {}. Response: {}", phoneNumber, response.body());

        } catch (Exception e) {
            log.error("Failed to send magic link SMS to {}: {}", phoneNumber, e.getMessage(), e);
        }
    }
}