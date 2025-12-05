package com.CodeWithRishu.Video_Streaming_App.service;

import com.CodeWithRishu.Video_Streaming_App.entity.User;
import com.CodeWithRishu.Video_Streaming_App.exception.UserAlreadyExists;
import com.CodeWithRishu.Video_Streaming_App.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;

    public void register(User userInfo) {
        log.info("Adding new user: {}", userInfo.getEmail());
        if (repository.findByEmail(userInfo.getEmail()).isPresent()) {
            throw new UserAlreadyExists("User already exists with email: " + userInfo.getEmail());
        }

        userInfo.setPassword(passwordEncoder.encode(userInfo.getPassword()));

        repository.save(userInfo);
        log.info("User '{}' added successfully", userInfo.getEmail());
    }

    public void registerForGoogle(User user) {
        log.info("Adding new Google user: {}", user.getEmail());
        if (repository.findByEmail(user.getEmail()).isPresent()) {
            log.info("User already exists with email: {}", user.getEmail());
            return;
        }

        repository.save(user);
        log.info("Google user '{}' added successfully", user.getEmail());
    }

}