package com.CodeWithRishu.Video_Streaming_App.handler;

import com.CodeWithRishu.Video_Streaming_App.entity.Provider;
import com.CodeWithRishu.Video_Streaming_App.entity.RefreshToken;
import com.CodeWithRishu.Video_Streaming_App.entity.User;
import com.CodeWithRishu.Video_Streaming_App.repository.RefreshTokenRepository;
import com.CodeWithRishu.Video_Streaming_App.repository.UserRepository;
import com.CodeWithRishu.Video_Streaming_App.service.JwtService;
import com.CodeWithRishu.Video_Streaming_App.service.RefreshTokenService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.Set;

@Component
@Slf4j
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${app.auth.success-redirect}")
    private String frontendSuccessRedirectURL;

    @Value("${app.auth.failure-redirect}")
    private String frontendFailureRedirectURL;

    @Transactional
    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {

        if (!(authentication instanceof OAuth2AuthenticationToken token)) {
            log.error("Unsupported authentication type: {}", authentication.getClass());
            response.sendRedirect(frontendFailureRedirectURL);
            return;
        }

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String registrationId = token.getAuthorizedClientRegistrationId();

        log.debug("OAuth2 user attributes: {}", oAuth2User.getAttributes());

        User user = processOAuth2User(oAuth2User, registrationId);

        String accessToken = jwtService.generateToken(user);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getEmail());
        refreshTokenRepository.save(refreshToken);

        String redirectUrl = String.format("%s?accessToken=%s&refreshToken=%s",
                frontendSuccessRedirectURL, accessToken, refreshToken.getToken());

        log.info("Login/Signup success for {}",
                user.getEmail());

        response.sendRedirect(redirectUrl);
    }

    private User processOAuth2User(OAuth2User oAuth2User, String registrationId) {
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String image = oAuth2User.getAttribute("picture");

        return userRepository.findByEmail(email).map(existingUser -> {
            if (existingUser.getName() == null) existingUser.setName(name);
            if (existingUser.getProfileImage() == null) {
                assert image != null;
                existingUser.setProfileImage(image.getBytes());
            }
            existingUser.setProvider(Provider.valueOf(registrationId.toUpperCase()));

            return userRepository.save(existingUser);
        }).orElseGet(() -> {
            assert image != null;
            User newUser = User.builder()
                    .email(email)
                    .name(name)
                    .provider(Provider.GOOGLE)
                    .profileImage(image.getBytes())
                    .build();
            return userRepository.save(newUser);
        });
    }

}