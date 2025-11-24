package com.CodeWithRishu.Video_Streaming_App.service;

import com.CodeWithRishu.Video_Streaming_App.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

@Slf4j
@Service
public class JwtService {

    private static final String TOKEN_TYPE_CLAIM = "typ";
    private static final String TOKEN_TYPE_ACCESS = "access";
    private static final String TOKEN_TYPE_REFRESH = "refresh";
    private static final long ACCESS_TOKEN_VALIDITY_SECONDS = 15 * 60;
    private static final long REFRESH_TOKEN_VALIDITY_SECONDS = 15 * 60;

    private final String secretKey;
    private final SecretKey signingKey;

    public JwtService(@Value("${jwt.secret}") String secretKey) {
        this.secretKey = secretKey;
        this.signingKey = initializeSigningKey();
        log.info("JwtService initialized with HS512 algorithm");
    }

    public String extractUsername(String token) {
        log.debug("Extracting username from token");
        try {
            String username = extractClaim(token, Claims::getSubject);
            log.debug("Successfully extracted username: {}", username);
            return username;
        } catch (JwtException e) {
            log.error("Failed to extract username from token", e);
            throw e;
        }
    }

    public Date extractExpiration(String token) {
        log.trace("Extracting expiration from token");
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public Boolean validateToken(String token, UserDetails userDetails) {
        log.debug("Validating token for user: {}", userDetails.getUsername());

        try {
            final String username = extractUsername(token);
            boolean usernameMatches = username.equals(userDetails.getUsername());
            boolean notExpired = !isTokenExpired(token);
            boolean valid = usernameMatches && notExpired;

            if (!valid) {
                log.warn("Token validation failed for user '{}' - Username match: {}, Not expired: {}",
                        userDetails.getUsername(), usernameMatches, notExpired);
            } else {
                log.debug("Token validation successful for user '{}'", userDetails.getUsername());
            }

            return valid;
        } catch (JwtException e) {
            log.error("Token validation failed for user '{}' due to JWT exception",
                    userDetails.getUsername(), e);
            return false;
        }
    }

    public String generateAccessToken(User user) {
        log.debug("Generating access token for user: {}", user.getEmail());

        Map<String, Object> claims = new HashMap<>();
        claims.put(TOKEN_TYPE_CLAIM, TOKEN_TYPE_ACCESS);

        Instant now = Instant.now();
        Instant expiration = now.plusSeconds(ACCESS_TOKEN_VALIDITY_SECONDS);

        String token = Jwts.builder()
                .setId(UUID.randomUUID().toString())
                .setClaims(claims)
                .setSubject(user.getEmail())
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiration))
                .signWith(signingKey, SignatureAlgorithm.HS512)
                .compact();

        log.info("Access token generated for user '{}' - Expires at: {}", user.getEmail(), expiration);
        return token;
    }

    public String generateRefreshToken(User user, String jti) {
        log.debug("Generating refresh token for user: {} with JTI: {}", user.getEmail(), jti);

        Instant now = Instant.now();
        Instant expiration = now.plusSeconds(REFRESH_TOKEN_VALIDITY_SECONDS);

        String token = Jwts.builder()
                .setId(jti)
                .setSubject(user.getId().toString())
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiration))
                .claim(TOKEN_TYPE_CLAIM, TOKEN_TYPE_REFRESH)
                .signWith(signingKey, SignatureAlgorithm.HS512)
                .compact();

        log.info("Refresh token generated for user '{}' - Expires at: {}", user.getEmail(), expiration);
        return token;
    }

    public Jws<Claims> parse(String token) {
        log.trace("Parsing JWT token");

        try {
            Jws<Claims> parsed = Jwts.parserBuilder()
                    .setSigningKey(signingKey)
                    .build()
                    .parseClaimsJws(token);

            log.trace("Token parsed successfully");
            return parsed;
        } catch (ExpiredJwtException e) {
            log.warn("Token parsing failed: Token has expired");
            throw e;
        } catch (MalformedJwtException e) {
            log.error("Token parsing failed: Malformed JWT token");
            throw e;
        } catch (SignatureException e) {
            log.error("Token parsing failed: Invalid signature");
            throw e;
        } catch (JwtException e) {
            log.error("Token parsing failed: JWT exception", e);
            throw e;
        }
    }

    public boolean isAccessToken(String token) {
        log.trace("Checking if token is access token");

        try {
            Claims claims = parse(token).getBody();
            boolean isAccess = TOKEN_TYPE_ACCESS.equals(claims.get(TOKEN_TYPE_CLAIM));
            log.trace("Token type check - Is access token: {}", isAccess);
            return isAccess;
        } catch (JwtException e) {
            log.error("Failed to determine token type", e);
            return false;
        }
    }

    public boolean isRefreshToken(String token) {
        log.trace("Checking if token is refresh token");

        try {
            Claims claims = parse(token).getBody();
            boolean isRefresh = TOKEN_TYPE_REFRESH.equals(claims.get(TOKEN_TYPE_CLAIM));
            log.trace("Token type check - Is refresh token: {}", isRefresh);
            return isRefresh;
        } catch (JwtException e) {
            log.error("Failed to determine token type", e);
            return false;
        }
    }

    public UUID getUserId(String token) {
        log.debug("Extracting user ID from token");

        try {
            Claims claims = parse(token).getBody();
            UUID userId = UUID.fromString(claims.getSubject());
            log.debug("Extracted user ID: {}", userId);
            return userId;
        } catch (IllegalArgumentException e) {
            log.error("Failed to parse user ID from token subject", e);
            throw new JwtException("Invalid user ID in token", e);
        } catch (JwtException e) {
            log.error("Failed to extract user ID from token", e);
            throw e;
        }
    }

    public String getJti(String token) {
        log.trace("Extracting JTI from token");

        try {
            String jti = parse(token).getBody().getId();
            log.trace("Extracted JTI: {}", jti);
            return jti;
        } catch (JwtException e) {
            log.error("Failed to extract JTI from token", e);
            throw e;
        }
    }

    private Claims extractAllClaims(String token) {
        log.trace("Extracting all claims from token");

        try {
            return parse(token).getBody();
        } catch (JwtException e) {
            log.error("Failed to extract claims from token", e);
            throw e;
        }
    }

    private Boolean isTokenExpired(String token) {
        Date expiration = extractExpiration(token);
        boolean expired = expiration.before(new Date());

        if (expired) {
            log.debug("Token has expired at: {}", expiration);
        }

        return expired;
    }

    private SecretKey initializeSigningKey() {
        log.debug("Initializing JWT signing key");

        try {
            byte[] keyBytes = Decoders.BASE64.decode(secretKey);
            SecretKey key = Keys.hmacShaKeyFor(keyBytes);
            log.info("JWT signing key initialized successfully");
            return key;
        } catch (Exception e) {
            log.error("Failed to initialize JWT signing key", e);
            throw new IllegalStateException("Invalid JWT secret key configuration", e);
        }
    }

}