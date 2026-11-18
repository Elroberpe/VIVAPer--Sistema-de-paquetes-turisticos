package com.visiontour.auth.service;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import com.visiontour.auth.AuthProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
@RequiredArgsConstructor
public class LoginAttemptLimiter {
    private final AuthProperties properties;
    private final Clock clock;
    private final Map<String, Window> attempts = new HashMap<>();

    public synchronized void check(String email, String remoteAddress) {
        Instant now = clock.instant();
        attempts.entrySet().removeIf(entry -> !entry.getValue().expiresAt.isAfter(now));
        reserve("ip:" + remoteAddress, Math.max(20, properties.loginMaxAttempts()), now);
        reserve("email:" + email, properties.loginMaxAttempts(), now);
    }

    private void reserve(String key, int limit, Instant now) {
        Window window = attempts.get(key);
        if (window == null) {
            if (attempts.size() >= 10000) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
            window = new Window(now.plus(properties.loginWindow()));
            attempts.put(key, window);
        }
        if (window.count >= limit) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
        window.count++;
    }

    private static class Window {
        private final Instant expiresAt;
        private int count;
        private Window(Instant expiresAt) { this.expiresAt = expiresAt; }
    }
}
