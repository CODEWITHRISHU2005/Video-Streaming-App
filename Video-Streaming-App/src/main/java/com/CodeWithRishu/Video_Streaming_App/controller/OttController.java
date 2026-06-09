package com.CodeWithRishu.Video_Streaming_App.controller;

import com.CodeWithRishu.Video_Streaming_App.dto.response.JwtResponse;
import com.CodeWithRishu.Video_Streaming_App.service.OttService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ott")
public class OttController {
    private final OttService ottService;

    @PostMapping("/send")
    public ResponseEntity<String> sendOtt(
            @RequestParam String email,
            @RequestParam(defaultValue = "MAGIC_LINK") String authType) {

        ottService.generateAndSendAuth(email, authType);

        String responseMessage = "OTP".equalsIgnoreCase(authType)
                ? "Verification code sent to your email. Please check your inbox."
                : "Magic link sent to your email. Please check your inbox.";

        return ResponseEntity.ok(responseMessage);
    }

    @PostMapping("/login")
    public ResponseEntity<JwtResponse> loginWithOtt(@RequestParam String token) {
        JwtResponse response = ottService.loginWithOttToken(token);
        return ResponseEntity.ok(response);
    }

}