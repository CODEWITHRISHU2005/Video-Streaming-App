package com.CodeWithRishu.Video_Streaming_App.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class Msg91OtpService {

    @Value("${msg91.auth-key}")
    private String authKey;

    public String sendOtp(String phoneNumber, String otp) throws Exception {
        String url = String.format(
                "https://api.msg91.com/api/v5/otp?authkey=%s&mobile=%s&otp=%s",
                authKey, phoneNumber, otp
        );

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        return response.body();
    }

}