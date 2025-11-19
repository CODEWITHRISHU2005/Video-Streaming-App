package com.CodeWithRishu.Video_Streaming_App.exception;

import com.CodeWithRishu.Video_Streaming_App.dto.response.ErrorResponse;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.List;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(UserAlreadyExists.class)
    public ResponseEntity<ErrorResponse> userAlreadyExists(UserAlreadyExists ex, HttpServletRequest request) {
        return new ResponseEntity<>(
                new ErrorResponse(
                        LocalDateTime.now(),
                        HttpStatus.ALREADY_REPORTED.value(),
                        "UserAlreadyExistsException",
                        "UserAlreadyExists please enter different user details",
                        request.getRequestURI()
                ),
                HttpStatus.ALREADY_REPORTED
        );
    }

    @ExceptionHandler({
            UsernameNotFoundException.class,
            BadCredentialsException.class,
            CredentialsExpiredException.class,
            ExpiredJwtException.class,
            JwtException.class,
            AuthenticationException.class,

    })
    public ResponseEntity<ErrorResponse> handleAuthExceptions(Exception ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.BAD_REQUEST;
        if (ex instanceof DisabledException) {
            status = HttpStatus.FORBIDDEN;
        } else if (ex instanceof LockedException) {
            status = HttpStatus.LOCKED;
        } else if (ex instanceof BadCredentialsException) {
            status = HttpStatus.UNAUTHORIZED;
        } else if (ex instanceof AuthenticationException) {
            status = HttpStatus.UNAUTHORIZED;
        }

        log.info("Status code: {}", status.value());
        log.info("Status name: {}", ex.getClass().getName());
        ErrorResponse body = ErrorResponse.of(status, "Authentication error", safeMessage(ex), request.getRequestURI());
        return ResponseEntity.status(status)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header("Pragma", "no-cache")
                .body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String detail = buildValidationMessage(ex);
        ErrorResponse body = ErrorResponse.of(HttpStatus.BAD_REQUEST, "Validation failed", detail, request.getRequestURI());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header("Pragma", "no-cache")
                .body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleAll(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception: ", ex);
        ErrorResponse body = ErrorResponse.of(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", "An unexpected error occurred", request.getRequestURI());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header("Pragma", "no-cache")
                .body(body);
    }

    private String buildValidationMessage(MethodArgumentNotValidException ex) {
        List<String> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> String.format("%s", friendlyMessage(fe)))
                .toList();
        return String.join(", ", errors);
    }

    private String friendlyMessage(FieldError fe) {
        String defaultMessage = fe.getDefaultMessage();
        return defaultMessage != null ? defaultMessage : "is invalid";
    }

    private String safeMessage(Exception ex) {
        String msg = ex.getMessage();
        return (msg == null || msg.isBlank()) ? "Invalid or expired credentials" : msg;
    }

}