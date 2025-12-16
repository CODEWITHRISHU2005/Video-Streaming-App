package com.CodeWithRishu.Video_Streaming_App.controller;

import com.CodeWithRishu.Video_Streaming_App.dto.response.JwtResponse;
import com.CodeWithRishu.Video_Streaming_App.service.OttService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ott")
public class OttController {
    private final OttService ottService;

    @PostMapping("/sent")
    public ResponseEntity<String> sendOtt(@RequestParam String email) {
        ottService.generateMagicLink(email);
        return ResponseEntity.ok("Magic link sent to your email. Please check your inbox.");
    }

    @GetMapping("/login")
    public ResponseEntity<JwtResponse> loginWithOtt(@RequestParam String token) {
        JwtResponse response = ottService.loginWithOttToken(token);
        return ResponseEntity.ok(response);
    }

}