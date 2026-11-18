package com.visiontour.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

import com.visiontour.security.jwt.AccessTokenService;
import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.EstadoUsuario;
import com.visiontour.usuario.enums.RolNombre;
import com.visiontour.usuario.repository.RolRepository;
import com.visiontour.usuario.repository.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

abstract class TokensIntegrationContract {
    @Autowired private CustomUserDetailsService userDetails;
    @Autowired private com.visiontour.security.jwt.DatabaseJwtAuthenticationConverter jwtAuthentication;
    @Autowired private AccessTokenService accessTokens;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private RolRepository roles;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactions;
    @Autowired private JwtEncoder encoder;
    @Autowired private JwtDecoder decoder;
    @Autowired private WebApplicationContext context;
    private Long userId;
    private MockMvc mockMvc;

    @Test
    void securityUserQueriesLoadTheRoleInOneRoundTrip() {
        String token = accessTokens.generar(userId);
        Jwt jwt = decoder.decode(token);
        String email = jdbc.queryForObject("SELECT email FROM usuarios WHERE id = ?", String.class, userId);
        var queries = java.util.Map.of(
                "email", com.visiontour.support.JwtTestInitializer.SqlCapture.capture(() -> userDetails.loadUserByUsername(email)),
                "emision", com.visiontour.support.JwtTestInitializer.SqlCapture.capture(() -> accessTokens.generar(userId)),
                "bearer", com.visiontour.support.JwtTestInitializer.SqlCapture.capture(() -> jwtAuthentication.convert(jwt)));
        queries.forEach((flow, sql) -> {
            org.slf4j.LoggerFactory.getLogger(getClass()).info("SQL seguridad {}: {}", flow, sql);
            assertThat(sql).hasSize(1);
            assertThat(sql.getFirst()).containsIgnoringCase("join roles");
        });
    }

    @BeforeEach
    void prepare() {
        userId = new TransactionTemplate(transactions).execute(status -> usuarios.saveAndFlush(new Usuario(
                "Prueba", "Tokens", "u" + UUID.randomUUID().toString().substring(0, 20), "999888777", UUID.randomUUID() + "@example.test", "hash-solo-prueba",
                EstadoUsuario.ACTIVO, roles.findByNombre(RolNombre.CLIENTE).orElseThrow())).getId());
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @AfterEach
    void cleanup() {
        if (userId != null) {
            new TransactionTemplate(transactions).executeWithoutResult(status -> {
                jdbc.update("DELETE FROM usuarios WHERE id = ?", userId);
            });
        }
    }

    @Test
    void generatesMinimalAccessTokenAndAuthenticatesBearer() throws Exception {
        String value = accessTokens.generar(userId);
        Jwt jwt = decoder.decode(value);
        assertThat(jwt.getSubject()).isEqualTo(userId.toString());
        assertThat(Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt())).isEqualTo(Duration.ofMinutes(15));
        assertThat(jwt.getClaims().keySet()).containsExactlyInAnyOrder("iss", "aud", "sub", "iat", "exp", "rol");
        assertThat(jwt.getHeaders().get("typ")).isEqualTo("at+jwt");
        assertThat(jwt.getHeaders().get("alg")).isEqualTo("HS256");
        mockMvc.perform(get("/api/prueba").header(HttpHeaders.AUTHORIZATION, "Bearer " + value))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"expired", "issuer", "audience", "type", "missing-exp", "role", "missing-sub",
            "missing-aud", "missing-iat", "bad-sub", "future", "lifetime", "role-array", "type-case"})
    void rejectsInvalidSignedClaims(String defect) throws Exception {
        Instant now = Instant.now().minusSeconds(1);
        var claims = JwtClaimsSet.builder().issuer(defect.equals("issuer") ? "otro" : "vivaair")
                .claim("rol", defect.equals("role-array") ? List.of("CLIENTE")
                        : defect.equals("role") ? "SUPERADMIN" : "CLIENTE");
        if (!defect.equals("missing-aud")) claims.audience(List.of(defect.equals("audience") ? "otro" : "vivaair-api"));
        if (!defect.equals("missing-iat")) claims.issuedAt(defect.equals("expired") ? now.minusSeconds(300)
                : defect.equals("future") ? now.plusSeconds(60) : now);
        if (!defect.equals("missing-sub")) claims.subject(defect.equals("bad-sub") ? "email@example.test" : userId.toString());
        if (!defect.equals("missing-exp")) claims.expiresAt(defect.equals("expired") ? now
                : defect.equals("lifetime") ? now.plusSeconds(3600) : now.plusSeconds(600));
        String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(
                org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS256)
                .type(defect.equals("type") ? "JWT" : defect.equals("type-case") ? "AT+JWT" : "at+jwt")
                .build(), claims.build())).getTokenValue();
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
        unauthorized(token);
    }

    @Test
    void rejectsTamperedSignatureAndWrongSigningKey() throws Exception {
        String token = accessTokens.generar(userId);
        String[] parts = token.split("\\.");
        byte[] signature = Base64.getUrlDecoder().decode(parts[2]);
        signature[0] ^= 1;
        String tampered = parts[0] + "." + parts[1] + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
        assertThatThrownBy(() -> decoder.decode(tampered)).isInstanceOf(JwtException.class);
        unauthorized(tampered);
        byte[] otherSecret = new byte[32];
        new java.security.SecureRandom().nextBytes(otherSecret);
        var otherEncoder = NimbusJwtEncoder.withSecretKey(new javax.crypto.spec.SecretKeySpec(otherSecret, "HmacSHA256"))
                .algorithm(org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS256).build();
        String wrongKey = otherEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS256).type("at+jwt").build(),
                JwtClaimsSet.builder().claims(claims -> claims.putAll(decoder.decode(token).getClaims())).build())).getTokenValue();
        assertThatThrownBy(() -> decoder.decode(wrongKey)).isInstanceOf(JwtException.class);
        unauthorized(wrongKey);
    }

    @Test
    void accountBlockingAndRoleChangesInvalidateExistingAccessTokens() throws Exception {
        String token = accessTokens.generar(userId);
        jdbc.update("UPDATE usuarios SET estado = 'BLOQUEADO' WHERE id = ?", userId);
        unauthorized(token);
        assertThatThrownBy(() -> accessTokens.generar(userId)).isInstanceOf(org.springframework.security.core.AuthenticationException.class);
        jdbc.update("UPDATE usuarios SET estado = 'ACTIVO', rol_id = ? WHERE id = ?",
                roles.findByNombre(RolNombre.ADMIN).orElseThrow().getId(), userId);
        unauthorized(token);
        mockMvc.perform(get("/api/prueba").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessTokens.generar(userId)))
                .andExpect(status().isOk());
    }

    @Test
    void rejectsRs256EvenWithOtherwiseValidClaims() throws Exception {
        var generator = java.security.KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        var pair = generator.generateKeyPair();
        var rsa = NimbusJwtEncoder.withKeyPair((java.security.interfaces.RSAPublicKey) pair.getPublic(),
                (java.security.interfaces.RSAPrivateKey) pair.getPrivate()).build();
        Jwt valid = decoder.decode(accessTokens.generar(userId));
        String token = rsa.encode(JwtEncoderParameters.from(
                JwsHeader.with(org.springframework.security.oauth2.jose.jws.SignatureAlgorithm.RS256).type("at+jwt").build(),
                JwtClaimsSet.builder().claims(claims -> claims.putAll(valid.getClaims())).build())).getTokenValue();
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
        unauthorized(token);
    }

    @Test
    void deletingTheUserInvalidatesItsToken() throws Exception {
        String token = accessTokens.generar(userId);
        jdbc.update("DELETE FROM usuarios WHERE id = ?", userId);
        unauthorized(token);
    }

    private void unauthorized(String token) throws Exception {
        mockMvc.perform(get("/api/prueba").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.codigo").value("NO_AUTENTICADO")).andExpect(jsonPath("$.errores").isEmpty());
    }
}
