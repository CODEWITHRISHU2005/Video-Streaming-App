package com.CodeWithRishu.Video_Streaming_App.controller;

import com.CodeWithRishu.Video_Streaming_App.dto.request.OtpRequest;
import com.CodeWithRishu.Video_Streaming_App.dto.response.OtpResponse;
import com.CodeWithRishu.Video_Streaming_App.service.OtpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/otp")
@Slf4j
@RequiredArgsConstructor
public class OtpController {

    private final OtpService otpService;

    @PostMapping("/send")
    public ResponseEntity<OtpResponse> sendOtp(@Valid @RequestBody OtpRequest request) {
        log.info("Sending OTP to phone");
        OtpResponse response = otpService.sendOtp(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify")
    public ResponseEntity<OtpResponse> verifyOtp(@Valid @RequestBody OtpRequest request) {
        log.info("Verifying OTP");
        OtpResponse response = otpService.verifyOtp(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/resend")
    public ResponseEntity<OtpResponse> resendOtp(@Valid @RequestBody OtpRequest request) {
        log.info("Resending OTP");
        OtpResponse response = otpService.resendOtp(request);
        return ResponseEntity.ok(response);
    }

}