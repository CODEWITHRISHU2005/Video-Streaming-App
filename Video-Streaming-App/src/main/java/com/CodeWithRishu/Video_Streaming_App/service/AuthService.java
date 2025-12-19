package com.CodeWithRishu.Video_Streaming_App.service;

import com.CodeWithRishu.Video_Streaming_App.dto.request.ProfileUpdateRequest;
import com.CodeWithRishu.Video_Streaming_App.dto.response.ProfileResponse;
import com.CodeWithRishu.Video_Streaming_App.entity.User;
import com.CodeWithRishu.Video_Streaming_App.exception.UserAlreadyExists;
import com.CodeWithRishu.Video_Streaming_App.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.Optional;

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

    public ProfileResponse getUserProfileByEmail(String email) {
        return repository.findByEmail(email)
                .map(this::mapToProfileResponse)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
    }

    public ProfileResponse updateUserProfile(ProfileUpdateRequest updateRequest) {
        String email = extractEmailFromContext();

        User user = repository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new UsernameNotFoundException("User not found in DB with email: " + email));

        Optional.ofNullable(updateRequest.name()).ifPresent(user::setName);
        Optional.ofNullable(updateRequest.phone()).ifPresent(user::setPhoneNumber);
        Optional.ofNullable(updateRequest.bio()).ifPresent(user::setBio);

        if (updateRequest.profileImage() != null && !updateRequest.profileImage().isEmpty())
            user.setProfileImage(updateRequest.profileImage().getBytes());

        repository.save(user);
        log.info("User profile updated successfully for: {}", email);

        return mapToProfileResponse(user);
    }

    private String extractEmailFromContext() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;

        final Object principal = auth.getPrincipal();

        return switch (principal) {
            case OAuth2User oAuth2User -> oAuth2User.getAttribute("email");
            case UserDetails userDetails -> userDetails.getUsername();
            default -> auth.getName();
        };
    }

    private ProfileResponse mapToProfileResponse(User user) {
        return new ProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhoneNumber(),
                formatImage(user.getProfileImage()),
                user.getBio()
        );
    }

    private String formatImage(byte[] imageBytes) {
        if (imageBytes == null || imageBytes.length == 0) return null;

        if (imageBytes.length > 4 &&
                imageBytes[0] == 'h' && imageBytes[1] == 't' && imageBytes[2] == 't' && imageBytes[3] == 'p') {
            return new String(imageBytes).trim();
        }

        return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(imageBytes);
    }

}