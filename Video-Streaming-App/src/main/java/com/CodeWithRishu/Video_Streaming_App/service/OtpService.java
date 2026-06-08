package com.CodeWithRishu.Video_Streaming_App.service;

import com.CodeWithRishu.Video_Streaming_App.dto.request.OtpRequest;
import com.CodeWithRishu.Video_Streaming_App.dto.response.OtpResponse;
import com.CodeWithRishu.Video_Streaming_App.entity.OtpVerification;
import com.CodeWithRishu.Video_Streaming_App.entity.User;
import com.CodeWithRishu.Video_Streaming_App.repository.OtpVerificationRepository;
import com.CodeWithRishu.Video_Streaming_App.repository.UserRepository;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class OtpService {

    private final OtpVerificationRepository otpRepository;
    private final UserRepository userRepository;

    @Value("${twilio.account-sid}")
    private String accountSid;
    @Value("${twilio.auth-token}")
    private String authToken;
    @Value("${twilio.phone-number}")
    private String fromPhoneNumber;
    @Value("${app.otp.expiration-ms:300000}")
    private long otpExpiration;
    @Value("${app.otp.length}")
    private int otpLength;

    private void initTwilio() {
        Twilio.init(accountSid, authToken);
    }
    SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public OtpResponse sendOtp(OtpRequest otpRequest) {
        log.info("Sending OTP to phone: {}", maskPhone(otpRequest.phone()));

        try {
            String otp = generateOtp();

            Instant expiresAt = Instant.now().plusMillis(otpExpiration);

            String phoneNumber = otpRequest.phone();

            if (!phoneNumber.startsWith("+91"))
                phoneNumber = "+91" + phoneNumber;

            OtpVerification verification = OtpVerification.builder()
                    .phone(phoneNumber)
                    .otp(otp)
                    .verified(false)
                    .expiresAt(expiresAt)
                    .build();

            otpRepository.save(verification);

            boolean smsSent = sendSms(phoneNumber, otp);

            if (smsSent) {
                log.info("OTP sent successfully to {}", maskPhone(phoneNumber));
                return new OtpResponse(true, "OTP sent successfully to your phone number", expiresAt);
            } else {
                log.error("Failed to send OTP via SMS");
                return new OtpResponse(false, "Failed to send OTP. Please try again.", null);
            }

        } catch (Exception e) {
            log.error("Error sending OTP", e);
            return new OtpResponse(false, "Error sending OTP: " + e.getMessage(), null);
        }
    }

    @Transactional
    public OtpResponse verifyOtp(OtpRequest otpVerifyRequest) {
        String phoneNumber = otpVerifyRequest.phone();

        if (!phoneNumber.startsWith("+91")) phoneNumber = "+91" + phoneNumber;

        log.info("Verifying OTP for phone: {}", maskPhone(phoneNumber));

        try {
            Optional<OtpVerification> verificationOpt = otpRepository
                    .findTopByPhoneAndVerifiedFalseOrderByCreatedAtDesc(phoneNumber);

            User user = userRepository.findByEmail(otpVerifyRequest.email())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + otpVerifyRequest.email()));

            if (verificationOpt.isEmpty())
                return new OtpResponse(false, "No OTP found for this phone number. Please otpRequest a new OTP.", null);

            OtpVerification verification = verificationOpt.get();

            if (verification.getExpiresAt().isBefore(Instant.now()))
                return new OtpResponse(false, "OTP has expired. Please otpRequest a new OTP.", null);

            if (verification.getOtp().equals(otpVerifyRequest.otp())) {
                verification.setVerified(true);
                verification.setUser(user);
                otpRepository.save(verification);

                log.info("OTP verified successfully for {}", maskPhone(phoneNumber));
                return new OtpResponse(true, "Phone number verified successfully!", verification.getExpiresAt());
            } else {
                log.warn("Invalid OTP provided for {}", maskPhone(phoneNumber));
                return new OtpResponse(false, "Invalid OTP. Please try again.", null);
            }

        } catch (Exception e) {
            log.error("Error verifying OTP", e);
            return new OtpResponse(false, "Error verifying OTP: " + e.getMessage(), null);
        }
    }

    public boolean isPhoneVerified(String phone) {
        Optional<OtpVerification> verification = otpRepository
                .findTopByPhoneAndVerifiedTrueOrderByCreatedAtDesc(phone);
        return verification.isPresent();
    }

    public OtpResponse resendOtp(OtpRequest otpRequest) {
        log.info("Resending OTP to phone: {}", maskPhone(otpRequest.phone()));

        otpRepository.deleteByPhoneAndVerifiedFalse(otpRequest.phone());

        return sendOtp(otpRequest);
    }

    private String generateOtp() {
        StringBuilder otp = new StringBuilder();

        for (int i = 0; i < otpLength; i++)
            otp.append(secureRandom.nextInt(10));

        return otp.toString();
    }

    private boolean sendSms(String toPhone, String otp) {
        try {
            initTwilio();

            String messageBody = String.format(
                    "Your verification code is: %s%n%nThis code will expire in %d minutes.%n%nIf you didn't otpRequest this, please ignore this message.",
                    otp,
                    (otpExpiration / 1000) / 60
            );

            Message message = Message.creator(
                    new PhoneNumber(toPhone),
                    new PhoneNumber(fromPhoneNumber),
                    messageBody
            ).create();

            log.info("SMS sent successfully. SID: {}", message.getSid());
            return true;

        } catch (Exception e) {
            log.error("Error sending SMS via Twilio", e);
            return false;
        }
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) {
            return "****";
        }
        return "****" + phone.substring(phone.length() - 4);
    }

    @Scheduled(fixedRateString = "${app.otp.cleanup-rate:300000}")
    @Transactional
    public void cleanupExpiredOtps() {
        int deleted = otpRepository.deleteByExpiresAtBefore(Instant.now());

        if (deleted > 0) {
            log.info("Cleaned up {} expired OTPs", deleted);
        }
    }

}