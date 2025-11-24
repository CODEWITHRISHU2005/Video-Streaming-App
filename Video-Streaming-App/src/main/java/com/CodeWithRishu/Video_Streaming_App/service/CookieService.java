package com.CodeWithRishu.Video_Streaming_App.service;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Optional;

@Slf4j
@Component
public class CookieService {

    @Getter
    private final String refreshCookieName;
    private final boolean cookieSecure;
    private final String cookieSameSite;
    private final String cookieDomain;

    public CookieService(
            @Value("${security.jwt.refresh-cookie-name:refreshToken}") String refreshCookieName,
            @Value("${security.jwt.cookie-secure:true}") boolean cookieSecure,
            @Value("${security.jwt.cookie-same-site:Lax}") String cookieSameSite,
            @Value("${security.jwt.cookie-domain:localhost}") String cookieDomain) {
        this.refreshCookieName = refreshCookieName;
        this.cookieSecure = cookieSecure;
        this.cookieSameSite = cookieSameSite;
        this.cookieDomain = cookieDomain;

        log.info("CookieService initialized - Name: {}, Secure: {}, SameSite: {}, Domain: {}",
                refreshCookieName, cookieSecure, cookieSameSite,
                (cookieDomain != null && !cookieDomain.isBlank()) ? cookieDomain : "not set");
    }

    public Optional<String> readRefreshTokenFromRequest(HttpServletRequest request) {
        log.debug("Reading refresh token from request cookies");

        Cookie[] cookies = request.getCookies();

        if (cookies == null) {
            log.trace("No cookies found in request");
            return Optional.empty();
        }

        return Arrays.stream(cookies)
                .filter(cookie -> refreshCookieName.equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .map(value -> {
                    log.debug("Refresh token found in cookies");
                    return value;
                });
    }

    public void attachRefreshCookie(HttpServletResponse response, String value, int maxAgeSeconds) {
        log.debug("Attaching refresh cookie - MaxAge: {} seconds", maxAgeSeconds);

        if (value == null || value.isBlank()) {
            log.warn("Attempted to attach refresh cookie with null or blank value");
            return;
        }

        ResponseCookie cookie = buildCookie(refreshCookieName, value, maxAgeSeconds);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        log.debug("Refresh cookie attached successfully - Name: {}, Secure: {}, HttpOnly: true",
                refreshCookieName, cookieSecure);
    }

    public void clearRefreshCookie(HttpServletResponse response) {
        log.debug("Clearing refresh cookie: {}", refreshCookieName);

        ResponseCookie cookie = buildCookie(refreshCookieName, "", 0);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        log.debug("Refresh cookie cleared successfully");
    }

    public void addNoStoreHeaders(HttpServletResponse response) {
        log.trace("Adding no-store cache headers");

        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.setHeader("Pragma", "no-cache");
    }

    private ResponseCookie buildCookie(String name, String value, int maxAgeSeconds) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(maxAgeSeconds)
                .sameSite(cookieSameSite);

        if (hasDomainConfigured()) {
            builder.domain(cookieDomain);
            log.trace("Cookie domain set to: {}", cookieDomain);
        }

        return builder.build();
    }

    private boolean hasDomainConfigured() {
        return cookieDomain != null && !cookieDomain.isBlank();
    }
}