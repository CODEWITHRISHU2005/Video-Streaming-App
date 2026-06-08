package com.CodeWithRishu.Video_Streaming_App.config;

import com.CodeWithRishu.Video_Streaming_App.handler.JwtAuthFilter;
import com.CodeWithRishu.Video_Streaming_App.handler.MagicLinkOttGenerationSuccessHandler;
import com.CodeWithRishu.Video_Streaming_App.handler.OAuth2SuccessHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.mail.MailSender;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.authorization.AuthorizationManagerFactories;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.FactorGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.Map;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final UserDetailsService userDetailsService;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final MailSender mailSender;

    @Value("${app.auth.failure-redirect}")
    private String failureRedirectURL;
    @Value("${app.auth.success-redirect}")
    private String successRedirectURL;

    public SecurityConfig(
            UserDetailsService userDetailsService,
            MailSender mailSender,
            @Lazy OAuth2SuccessHandler oAuth2SuccessHandler
    ) {
        this.userDetailsService = userDetailsService;
        this.mailSender = mailSender;
        this.oAuth2SuccessHandler = oAuth2SuccessHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
        var mfa = AuthorizationManagerFactories.multiFactor()
                .requireFactors(
                        "OTP_AUTHORITY",
                        FactorGrantedAuthority.OTT_AUTHORITY
                )
                .build();
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/**",
                                "/api/ott/**",
                                "/api/otp/**",
                                "/api/videos/**",
                                "/actuator/health/**",
                                "/favicon.ico",
                                "/login/oauth2/code/google/**",
                                "/swagger-ui/**",
                                "/v3/api-docs/**").permitAll()
                        .anyRequest().access(mfa)
                )
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider())
                .oauth2Login(oauth2 ->
                        oauth2
                                .loginPage("/login")
                                .successHandler(oAuth2SuccessHandler)
                                .failureHandler((req, resp, e) -> {
                                    resp.setStatus(401);
                                    resp.sendRedirect(failureRedirectURL);
                                })
                )
                .logout(AbstractHttpConfigurer::disable)
                .oneTimeTokenLogin(ott -> ott
                        .tokenGenerationSuccessHandler(oneTimeTokenGenerationSuccessHandler())
                        .permitAll())
                .exceptionHandling(eh -> eh.authenticationEntryPoint((req, resp, e) -> {
                    e.printStackTrace();
                    resp.setStatus(401);
                    resp.setContentType("application/json");

                    String message = (String) req.getAttribute("exception");

                    ObjectMapper om = new ObjectMapper();

                    if (message != null && message.trim().equals("token_expired")) {
                        resp.getWriter().println(om.writeValueAsString(Map.of("message", "token_expired")));
                    } else if (message != null && message.trim().equals("invalid_token")) {
                        resp.getWriter().println(om.writeValueAsString(Map.of("message", "invalid_token")));
                    } else {
                        resp.getWriter().println(om.writeValueAsString(Map.of("message", e.getMessage())));
                    }
                }))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authenticationProvider = new DaoAuthenticationProvider(userDetailsService);
        authenticationProvider.setPasswordEncoder(passwordEncoder());
        return authenticationProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public MagicLinkOttGenerationSuccessHandler oneTimeTokenGenerationSuccessHandler() {
        return new MagicLinkOttGenerationSuccessHandler(mailSender);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("https://video-streaming-app-lac.vercel.app/", "http://localhost:5173"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Cache-Control"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

}