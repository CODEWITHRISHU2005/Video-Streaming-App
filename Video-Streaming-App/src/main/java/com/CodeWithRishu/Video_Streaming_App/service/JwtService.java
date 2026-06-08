package com.CodeWithRishu.Video_Streaming_App.service;

import com.CodeWithRishu.Video_Streaming_App.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

@Slf4j
@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration-ms:1296000000}")
    private long jwtExpirationMs;

    public String extractUsername(String token) {
        log.debug("Extracting username from token");
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        log.debug("Extracting expiration from token");
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        log.debug("Extracting all claims from token");
        return Jwts
                .parser()
                .verifyWith(getSignKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private Boolean isTokenExpired(String token) {
        boolean expired = extractExpiration(token).before(new Date());
        log.debug("Token expired: {}", expired);
        return expired;
    }

    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        boolean valid = (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
        log.info("Validating token for user '{}': {}", username, valid);
        return valid;
    }

    public String generateToken(User user) {
        return generateMfaToken(user, List.of());
    }

    public String generateMfaToken(User user, List<String> factors) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId());
        claims.put("name", user.getName());
        claims.put("email", user.getEmail());
        claims.put("authorities", factors);

        String token = createToken(claims, user.getEmail());

        log.info("Generated JWT for user '{}', expires at {}",
                user.getEmail(), extractExpiration(token));

        return token;
    }

    public List<String> extractFactorClaims(String token) {
        List<String> factors = extractClaim(token, claims -> claims.get("authorities", List.class));
        return factors == null ? List.of() : factors;
    }

    private String createToken(Map<String, Object> claims, String email) {
        log.debug("Creating token for user '{}'", email);
        return Jwts.builder()
                .claims(claims)
                .subject(email)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(getSignKey())
                .compact();
    }

    private SecretKey getSignKey() {
        log.debug("Getting signing key");
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}