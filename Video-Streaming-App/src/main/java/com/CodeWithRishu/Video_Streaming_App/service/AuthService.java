package com.CodeWithRishu.Video_Streaming_App.service;

import com.CodeWithRishu.Video_Streaming_App.dto.request.ProfileUpdateRequest;
import com.CodeWithRishu.Video_Streaming_App.dto.response.ProfileResponse;
import com.CodeWithRishu.Video_Streaming_App.entity.User;
import com.CodeWithRishu.Video_Streaming_App.exception.UserAlreadyExists;
import com.CodeWithRishu.Video_Streaming_App.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Base64;

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

    public ProfileResponse getUserProfileByEmail(String email) {
        User user = repository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + email));

        String profileImage = null;
        if (user.getProfileImage() != null && user.getProfileImage().length > 0) {
            String potentialUrl = new String(user.getProfileImage());
            if (potentialUrl.trim().startsWith("http")) {
                profileImage = potentialUrl.trim();
            } else {
                String base64 = Base64.getEncoder().encodeToString(user.getProfileImage());
                profileImage = "data:image/jpeg;base64," + base64;
            }
        }

        return new ProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhoneNumber(),
                profileImage,
                user.getBio()
        );
    }

    public ProfileResponse updateUserProfile(ProfileUpdateRequest updateRequest) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = repository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        user.setName(updateRequest.name() != null ? updateRequest.name() : user.getName());
        user.setPhoneNumber(updateRequest.phone() != null ? updateRequest.phone() : user.getPhoneNumber());
        user.setBio(updateRequest.bio() != null ? updateRequest.bio() : user.getBio());

        if (updateRequest.profileImage() != null && !updateRequest.profileImage().isEmpty()) {
            user.setProfileImage(updateRequest.profileImage().getBytes());
        }

        repository.save(user);
        log.info("User profile updated for: {}", email);

        return new ProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhoneNumber(),
                updateRequest.profileImage() != null && !updateRequest.profileImage().isEmpty()
                        ? "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(user.getProfileImage())
                        : null,
                user.getBio()
        );
    }

}