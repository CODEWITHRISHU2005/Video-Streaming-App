package com.CodeWithRishu.Video_Streaming_App.service;

import com.CodeWithRishu.Video_Streaming_App.dto.request.OtpRequest;
import com.CodeWithRishu.Video_Streaming_App.dto.response.OtpResponse;
import com.CodeWithRishu.Video_Streaming_App.entity.OtpVerification;
import com.CodeWithRishu.Video_Streaming_App.entity.User;
import com.CodeWithRishu.Video_Streaming_App.repository.OtpVerificationRepository;
import com.CodeWithRishu.Video_Streaming_App.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class OtpService {

    private final OtpVerificationRepository otpRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${brevo.api.key}")
    private String brevoApiKey;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.otp.expiration-ms:300000}")
    private long otpExpiration;

    @Value("${app.otp.length:6}")
    private int otpLength;

    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public OtpResponse sendOtp(OtpRequest otpRequest) {
        log.info("Preparing to send Brevo OTP email to: {}", maskEmail(otpRequest.email()));

        try {
            User user = userRepository.findByEmail(otpRequest.email())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + otpRequest.email()));

            String otp = generateOtp();
            Instant expiresAt = Instant.now().plusMillis(otpExpiration);
            String phoneNumber = formatPhone(otpRequest.phone());

            OtpVerification verification = OtpVerification.builder()
                    .phone(phoneNumber)
                    .otp(otp)
                    .verified(false)
                    .expiresAt(expiresAt)
                    .user(user)
                    .build();

            otpRepository.save(verification);

            boolean emailSent = sendEmailOtp(user.getEmail(), user.getName(), otp);

            if (emailSent) {
                log.info("OTP successfully dispatched via Brevo to {}", maskEmail(user.getEmail()));
                return new OtpResponse(true, "OTP sent successfully to your registered email address", expiresAt);
            } else {
                log.error("Brevo failed to dispatch HTTP request.");
                return new OtpResponse(false, "Failed to send OTP email. Please try again.", null);
            }

        } catch (Exception e) {
            log.error("Error processing OTP generation pipeline", e);
            return new OtpResponse(false, "Error sending OTP: " + e.getMessage(), null);
        }
    }

    @Transactional
    public OtpResponse verifyOtp(OtpRequest otpVerifyRequest) {
        log.info("Verifying OTP input for email: {}", maskEmail(otpVerifyRequest.email()));

        try {
            User user = userRepository.findByEmail(otpVerifyRequest.email())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + otpVerifyRequest.email()));

            Optional<OtpVerification> verificationOpt = otpRepository
                    .findTopByPhoneAndVerifiedFalseOrderByCreatedAtDesc(formatPhone(otpVerifyRequest.phone()));

            if (verificationOpt.isEmpty()) {
                return new OtpResponse(false, "No OTP tracking record found. Please request a new one.", null);
            }

            OtpVerification verification = verificationOpt.get();

            if (verification.getExpiresAt().isBefore(Instant.now())) {
                return new OtpResponse(false, "OTP session lifetime expired. Please request a new one.", null);
            }

            if (verification.getOtp().equals(otpVerifyRequest.otp())) {
                otpRepository.deleteByUserAndVerifiedTrue(user);
                otpRepository.flush();

                verification.setVerified(true);
                verification.setUser(user);
                otpRepository.save(verification);

                log.info("OTP validated successfully for user session: {}", maskEmail(user.getEmail()));
                return new OtpResponse(true, "Authentication successful!", verification.getExpiresAt());
            } else {
                log.warn("Invalid matching verification code evaluated for user: {}", maskEmail(user.getEmail()));
                return new OtpResponse(false, "Invalid verification code. Please try again.", null);
            }

        } catch (Exception e) {
            log.error("Exception handling user code evaluation matrix", e);
            return new OtpResponse(false, "Error verifying code: " + e.getMessage(), null);
        }
    }

    @Transactional
    public OtpResponse resendOtp(OtpRequest otpRequest) {
        log.info("Invalidating old sessions to resend to: {}", maskEmail(otpRequest.email()));
        otpRepository.deleteByPhoneAndVerifiedFalse(formatPhone(otpRequest.phone()));
        return sendOtp(otpRequest);
    }

    public boolean isPhoneVerified(String phone) {
        return otpRepository.findTopByPhoneAndVerifiedTrueOrderByCreatedAtDesc(formatPhone(phone)).isPresent();
    }

    private String formatPhone(String phone) {
        if (phone != null && !phone.startsWith("+91")) {
            return "+91" + phone;
        }
        return phone;
    }

    private String generateOtp() {
        StringBuilder otp = new StringBuilder();
        for (int i = 0; i < otpLength; i++) {
            otp.append(secureRandom.nextInt(10));
        }
        return otp.toString();
    }

    private boolean sendEmailOtp(String toEmail, String name, String otp) {
        try {
            String htmlContent = String.format(
                    "<div style='font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 8px;'>" +
                            "  <h2 style='color: #333;'>Security Verification</h2>" +
                            "  <p style='font-size: 15px; color: #555;'>Hello %s,</p>" +
                            "  <p style='font-size: 15px; color: #555;'>Your one-time authorization code for VideoStream is below:</p>" +
                            "  <div style='text-align: center; margin: 30px 0;'>" +
                            "    <span style='font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #E50914; background-color: #f7f7f7; padding: 12px 25px; border-radius: 6px; display: inline-block; border: 1px dashed #ccc;'>%s</span>" +
                            "  </div>" +
                            "  <p style='font-size: 13px; color: #888;'>This code remains active for %d minutes. Never share this code with anyone.</p>" +
                            "</div>",
                    name, otp, (otpExpiration / 1000) / 60
            );

            Map<String, Object> payload = Map.of(
                    "sender", Map.of("name", "VideoStream Security", "email", fromEmail),
                    "to", List.of(Map.of("email", toEmail)),
                    "subject", otp + " is your VideoStream verification code",
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
                return true;
            } else {
                log.error("Brevo API rejected the request. Status: {}, Body: {}", response.statusCode(), response.body());
                return false;
            }
        } catch (Exception e) {
            log.error("HTTP relay transmission anomaly via Brevo failed to email: {}", toEmail, e);
            return false;
        }
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "******";
        int index = email.indexOf("@");
        return email.substring(0, Math.min(index, 3)) + "********" + email.substring(index);
    }

    @Scheduled(fixedRateString = "${app.otp.cleanup-rate:300000}")
    @Transactional
    public void cleanupExpiredOtp() {
        int deleted = otpRepository.deleteByExpiresAtBefore(Instant.now());
        if (deleted > 0) {
            log.info("Cleaned up {} expired database OTP entries", deleted);
        }
    }

}