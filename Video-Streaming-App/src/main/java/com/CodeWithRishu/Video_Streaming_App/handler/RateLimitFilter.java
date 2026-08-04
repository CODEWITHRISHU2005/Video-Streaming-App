package com.CodeWithRishu.Video_Streaming_App.handler;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;
    private static final List<String> RATE_LIMITING_PATHS = List.of(
            "/api/auth",
            "/api/otp",
            "/api/ott",
            "/api/orders",
            "/api/cart",
            "/api/products"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getServletPath();

        String key = path.startsWith("/api/auth") || path.startsWith("/api/otp") || path.startsWith("/api/ott")
                ? request.getRemoteAddr()
                : java.util.Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .filter(Authentication::isAuthenticated)
                .filter(auth -> !(auth instanceof AnonymousAuthenticationToken))
                .map(Authentication::getName)
                .orElse(request.getRemoteAddr());

        Bucket bucket = rateLimitService.resolveBucket(key, path);

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {

            response.setHeader(
                    "X-Rate-Limit-Remaining",
                    String.valueOf(probe.getRemainingTokens()));

            filterChain.doFilter(request, response);

        } else {

            response.setStatus(HttpServletResponse.SC_REQUEST_TIMEOUT);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);

            response.setHeader(
                    "Retry-After",
                    String.valueOf(probe.getNanosToWaitForRefill() / 1_000_000_000));

            response.getWriter().write("""
                    {
                      "success": false,
                      "message": "Too many requests. Please try again later."
                    }
                    """);
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {

        String path = request.getServletPath();

        if (path.startsWith("/api/oauth2/authorization")
                || path.startsWith("/api/login/oauth2/code/google")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/actuator/health")
                || path.equals("/favicon.ico")) {
            return true;
        }

        return RATE_LIMITING_PATHS.stream().noneMatch(path::startsWith);
    }

}