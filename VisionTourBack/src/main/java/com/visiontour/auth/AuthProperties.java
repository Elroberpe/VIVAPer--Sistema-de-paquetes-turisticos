package com.visiontour.auth;

import java.time.Duration;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("app.auth")
public record AuthProperties(
        @DefaultValue("true") boolean cookieSecure,
        @DefaultValue("5") @Positive int loginMaxAttempts,
        @DefaultValue("15m") @NotNull Duration loginWindow) {
    public AuthProperties {
        if (loginWindow == null || loginWindow.isNegative() || loginWindow.isZero()) {
            throw new IllegalArgumentException("Las duraciones de autenticación deben ser positivas.");
        }
    }
}
