package com.visiontour.config;

import java.security.SecureRandom;
import java.time.Clock;
import java.util.Base64;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtConfigTests {
    private final JwtConfig config = new JwtConfig();

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "not-base64!"})
    void rejectsMissingOrMalformedSecretWithoutExposingItsValue(String secret) {
        assertThatThrownBy(() -> config.jwtSigningKey(secret))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET")
                .hasNoCause();
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 16, 31})
    void checksDecodedLengthRatherThanEncodedLength(int length) {
        String secret = Base64.getEncoder().encodeToString(randomBytes(length));
        assertThatThrownBy(() -> config.jwtSigningKey(secret))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("256 bits")
                .hasMessageNotContaining(secret);
    }

    @Test
    void acceptsRandom256BitSecretInStandardBase64() {
        byte[] bytes = randomBytes(32);
        var key = config.jwtSigningKey(Base64.getEncoder().encodeToString(bytes));
        assertThat(key.getEncoded()).isEqualTo(bytes);
        assertThat(key.getAlgorithm()).isEqualTo("HmacSHA256");
    }

    @ParameterizedTest
    @ValueSource(strings = {"HS384", "HS512"})
    void rejectsOtherHmacAlgorithmsEvenWithTheSameKey(String algorithm) {
        var key = config.jwtSigningKey(Base64.getEncoder().encodeToString(randomBytes(64)));
        var clock = Clock.systemUTC();
        var claims = JwtClaimsSet.builder().issuer("vivaair").audience(List.of("vivaair-api"))
                .subject("1").issuedAt(clock.instant()).expiresAt(clock.instant().plusSeconds(900))
                .claim("rol", "CLIENTE").build();
        var encoder = NimbusJwtEncoder.withSecretKey(key).algorithm(MacAlgorithm.from(algorithm)).build();
        String token = encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.from(algorithm)).type("at+jwt").build(), claims)).getTokenValue();
        var decoder = config.jwtDecoder(key, clock, "vivaair", "vivaair-api");
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
    }

    private byte[] randomBytes(int length) {
        byte[] bytes = new byte[length];
        new SecureRandom().nextBytes(bytes);
        return bytes;
    }
}
