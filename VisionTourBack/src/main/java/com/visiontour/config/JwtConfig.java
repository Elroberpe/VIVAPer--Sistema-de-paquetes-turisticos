package com.visiontour.config;

import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.Set;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import com.visiontour.usuario.enums.RolNombre;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtAudienceValidator;
import org.springframework.security.oauth2.jwt.JwtTypeValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

@Configuration(proxyBeanMethods = false)
public class JwtConfig {

    @Bean
    public Clock securityClock() {
        return Clock.systemUTC();
    }

    @Bean
    public SecretKey jwtSigningKey(@Value("${app.security.jwt.secret:}") String secret) {
        if (secret.isBlank()) {
            throw new IllegalStateException("Configura JWT_SECRET con al menos 32 bytes aleatorios en Base64 estándar.");
        }
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("JWT_SECRET debe usar Base64 estándar válido.");
        }
        if (decoded.length < 32) {
            throw new IllegalStateException("JWT_SECRET debe contener al menos 32 bytes (256 bits) después de decodificar Base64.");
        }
        return new SecretKeySpec(decoded, "HmacSHA256");
    }

    @Bean
    public JwtEncoder jwtEncoder(SecretKey jwtSigningKey) {
        return NimbusJwtEncoder.withSecretKey(jwtSigningKey).algorithm(MacAlgorithm.HS256).build();
    }

    @Bean
    public JwtDecoder jwtDecoder(SecretKey jwtSigningKey, Clock clock,
            @Value("${app.security.jwt.issuer}") String issuer,
            @Value("${app.security.jwt.audience}") String audience) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(jwtSigningKey)
                .macAlgorithm(MacAlgorithm.HS256).validateType(false).build();
        JwtTimestampValidator timestamps = new JwtTimestampValidator(Duration.ZERO);
        timestamps.setClock(clock);
        OAuth2TokenValidator<Jwt> accessClaims = jwt -> {
            Object role = jwt.getClaims().get("rol");
            // El validador nativo ignora mayúsculas; el contrato actual exige esta forma exacta.
            boolean valid = "at+jwt".equals(jwt.getHeaders().get("typ"))
                    && jwt.getSubject() != null && jwt.getSubject().matches("[1-9][0-9]{0,18}")
                    && jwt.getExpiresAt() != null && jwt.getIssuedAt() != null
                    && !jwt.getIssuedAt().isAfter(clock.instant())
                    && jwt.getExpiresAt().isAfter(jwt.getIssuedAt())
                    && Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt()).compareTo(Duration.ofMinutes(15)) <= 0
                    && role instanceof String && Set.of(RolNombre.ADMIN.name(), RolNombre.EMPLEADO.name(),
                            RolNombre.CLIENTE.name()).contains(role);
            return valid ? OAuth2TokenValidatorResult.success() : OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "Access token inválido.", null));
        };
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(timestamps, new JwtIssuerValidator(issuer),
                new JwtAudienceValidator(audience), new JwtTypeValidator("at+jwt"), accessClaims));
        return decoder;
    }
}
