package com.visiontour.auth.controller;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import com.visiontour.auth.AuthProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SessionCookie {
    public static final String NAME = "vivaair_refresh";
    private final AuthProperties properties;
    private final Clock clock;
    private final CookieCsrfTokenRepository csrf;

    public void guardar(HttpServletRequest request, HttpServletResponse response, String token, Instant expira) {
        long segundos = Math.max(0, Duration.between(clock.instant(), expira).toSeconds());
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(token).maxAge(segundos).build().toString());
        renovarCsrf(request, response);
    }

    public void borrar(HttpServletRequest request, HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie("").maxAge(Duration.ZERO).build().toString());
        renovarCsrf(request, response);
    }

    private ResponseCookie.ResponseCookieBuilder cookie(String valor) {
        return ResponseCookie.from(NAME, valor).httpOnly(true).secure(properties.cookieSecure())
                .sameSite("Lax").path("/api/auth");
    }

    private void renovarCsrf(HttpServletRequest request, HttpServletResponse response) {
        csrf.saveToken(csrf.generateToken(request), request, response);
    }
}
