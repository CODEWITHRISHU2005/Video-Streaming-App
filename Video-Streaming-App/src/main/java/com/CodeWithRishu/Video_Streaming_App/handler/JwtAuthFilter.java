package com.CodeWithRishu.Video_Streaming_App.handler;

import com.CodeWithRishu.Video_Streaming_App.config.CustomUserDetailsService;
import com.CodeWithRishu.Video_Streaming_App.service.JwtService;
import jakarta.annotation.Nonnull;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Slf4j
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(
            @Nonnull HttpServletRequest request,
            @Nonnull HttpServletResponse response,
            @Nonnull FilterChain filterChain
    ) throws ServletException, IOException {

        String requestURI = request.getRequestURI();
        String authHeader = request.getHeader("Authorization");

        log.info("Processing request: {} {}", request.getMethod(), requestURI);
        log.info("Authorization header present: {}", authHeader != null);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.info("No valid Authorization header, continuing filter chain");
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String token = authHeader.substring(7);
            log.info("Extracted token (first 20 chars): {}", token.substring(0, Math.min(20, token.length())));

            String username = jwtService.extractUsername(token);
            log.info("Extracted username: {}", username);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                log.info("Loaded user details for: {}", username);

                if (Boolean.TRUE.equals(jwtService.validateToken(token, userDetails))) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.info("Successfully authenticated user: {}", username);
                } else {
                    log.warn("Token validation failed for user: {}", username);
                }
            } else {
                log.info("Authentication already exists");
            }
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            log.error("JWT token is expired", e);
            request.setAttribute("exception", "token_expired");
        } catch (io.jsonwebtoken.MalformedJwtException e) {
            log.error("JWT token is malformed", e);
            request.setAttribute("exception", "invalid_token");
        } catch (Exception e) {
            log.error("Error processing JWT token", e);
            request.setAttribute("exception", "invalid_token");
        }

        filterChain.doFilter(request, response);
    }

}