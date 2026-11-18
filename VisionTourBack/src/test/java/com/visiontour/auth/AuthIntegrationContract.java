package com.visiontour.auth;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.*;
import com.visiontour.auth.dto.*;
import com.visiontour.auth.controller.SessionCookie;
import jakarta.servlet.http.Cookie;
import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.*;
import com.visiontour.usuario.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.*;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

abstract class AuthIntegrationContract {
    private static final String PASSWORD = "Clave-valida-2026";
    @Autowired private WebApplicationContext context;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private RolRepository roles;
    @Autowired private PasswordEncoder encoder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactions;
    @Autowired private JsonMapper json;
    @Autowired private JwtDecoder decoder;
    private final Set<String> fixtureEmails = ConcurrentHashMap.newKeySet();
    private MockMvc mvc;
    private String email;
    private Long id;
    private String remoteAddress;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        remoteAddress = "fixture-" + UUID.randomUUID();
        email = uniqueEmail();
        id = createUser(email);
    }

    @AfterEach
    void cleanup() {
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            for (String fixture : fixtureEmails) {
                for (Long userId : jdbc.queryForList("SELECT id FROM usuarios WHERE email = ?", Long.class, fixture)) {
                    jdbc.update("DELETE FROM refresh_tokens WHERE usuario_id = ?", userId);
                    jdbc.update("DELETE FROM usuarios WHERE id = ?", userId);
                }
            }
        });
        fixtureEmails.clear();
    }

    @Test
    void registersOnlyActiveClientsAndStoresBcryptHashes() throws Exception {
        String registered = uniqueEmail();
        var result = send("/api/auth/registro", Map.of("nombre", "Carlos", "apellido", "Perez",
                "usuario", "  Carlos_Prueba  ", "celular", "  +51999888777  ",
                "email", "  " + registered.toUpperCase(Locale.ROOT) + "  ", "password", PASSWORD,
                "rol", "ADMIN", "estado", "ACTIVO")).andExpect(status().isCreated())
                .andExpect(jsonPath("$.mensaje").isNotEmpty()).andExpect(jsonPath("$.accessToken").doesNotExist());
        assertThat(result.andReturn().getResponse().getCookie(SessionCookie.NAME)).isNull();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            var user = usuarios.findWithRolByEmail(registered).orElseThrow();
            assertThat(user.getEstado()).isEqualTo(EstadoUsuario.ACTIVO);
            assertThat(user.getRol().getNombre()).isEqualTo(RolNombre.CLIENTE);
            assertThat(user.getUsuario()).isEqualTo("carlos_prueba");
            assertThat(user.getCelular()).isEqualTo("+51999888777");
            assertThat(encoder.matches(PASSWORD, user.getPasswordHash())).isTrue();
            assertThat(user.getPasswordHash()).isNotEqualTo(PASSWORD);
        });

    }

    @ParameterizedTest
    @ValueSource(strings = {"short", "unicode", "blank-name", "long-name", "email", "missing",
            "missing-user", "blank-user", "short-user", "long-user", "invalid-user",
            "missing-phone", "blank-phone", "short-phone", "long-phone", "invalid-phone"})
    void rejectsInvalidRegistrationFields(String invalid) throws Exception {
        Map<String, String> body = new HashMap<>(Map.of("nombre", "Carlos", "apellido", "Perez",
                "usuario", "carlos_" + UUID.randomUUID().toString().substring(0, 8), "celular", "999888777",
                "email", uniqueEmail(), "password", PASSWORD));
        switch (invalid) {
            case "short" -> body.put("password", "1234567");
            case "unicode" -> body.put("password", "é".repeat(37));
            case "blank-name" -> body.put("nombre", "   ");
            case "long-name" -> body.put("apellido", "a".repeat(101));
            case "email" -> body.put("email", "no-es-correo");
            case "missing-user" -> body.remove("usuario");
            case "blank-user" -> body.put("usuario", "  ");
            case "short-user" -> body.put("usuario", "ab");
            case "long-user" -> body.put("usuario", "a".repeat(31));
            case "invalid-user" -> body.put("usuario", "con espacios");
            case "missing-phone" -> body.remove("celular");
            case "blank-phone" -> body.put("celular", " ");
            case "short-phone" -> body.put("celular", "12345678");
            case "long-phone" -> body.put("celular", "1234567890123456");
            case "invalid-phone" -> body.put("celular", "+51 999888777");
            default -> body.remove("password");
        }
        send("/api/auth/registro", body).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("ERROR_VALIDACION"));
    }

    @Test
    void acceptsExactly72Utf8Bytes() throws Exception {
        send("/api/auth/registro", new RegistroRequest(
                "Carlos", "Perez", uniqueUsername(), "999888777", uniqueEmail(), "é".repeat(36)))
                .andExpect(status().isCreated());
    }

    @Test
    void duplicateRegistrationReturns409() throws Exception {
        send("/api/auth/registro", new RegistroRequest(
                "Carlos", "Perez", uniqueUsername(), "999888777", email.toUpperCase(Locale.ROOT), PASSWORD))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.codigo").value("CONFLICTO_DATOS"));
    }

    @Test
    void registrationRaceHasOneSuccessAndOneConflict() throws Exception {
        String registered = uniqueEmail();
        var body = new RegistroRequest(
                "Carlos", "Perez", uniqueUsername(), "999888777", registered, PASSWORD);
        var statuses = concurrently(() -> send("/api/auth/registro", body).andReturn().getResponse().getStatus());
        assertThat(statuses).containsExactlyInAnyOrder(201, 409);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM usuarios WHERE email = ?", Long.class, registered)).isEqualTo(1L);
    }

    @Test
    void rejectsDuplicateUsernameRegardlessOfCase() throws Exception {
        String usuario = usuarios.findById(id).orElseThrow().getUsuario();
        send("/api/auth/registro", new RegistroRequest("Carlos", "Perez", usuario.toUpperCase(Locale.ROOT),
                "999888777", uniqueEmail(), PASSWORD))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.codigo").value("CONFLICTO_DATOS"))
                .andExpect(jsonPath("$.mensaje").value("Este nombre de usuario ya está registrado."));
    }

    @Test
    void concurrentRegistrationsCannotShareAUsername() throws Exception {
        String usuario = "race_" + UUID.randomUUID().toString().substring(0, 8);
        var statuses = concurrently(() -> send("/api/auth/registro", new RegistroRequest(
                "Carlos", "Perez", usuario, "999888777", uniqueEmail(), PASSWORD)).andReturn().getResponse().getStatus());
        assertThat(statuses).containsExactlyInAnyOrder(201, 409);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM usuarios WHERE usuario = ?", Long.class, usuario)).isEqualTo(1L);
    }

    @ParameterizedTest
    @ValueSource(ints = {3, 30})
    void acceptsUsernameAndPhoneLengthBoundaries(int length) throws Exception {
        String usuario = "a".repeat(length);
        String celular = length == 3 ? "123456789" : "+123456789012345";
        send("/api/auth/registro", new RegistroRequest("Carlos", "Perez", usuario, celular, uniqueEmail(), PASSWORD))
                .andExpect(status().isCreated());
    }

    @Test
    void loginProducesSafeJsonJwtAndHttpOnlyRefreshCookie() throws Exception {
        var result = login().andExpect(status().isOk()).andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900)).andExpect(jsonPath("$.usuario.rol").value("CLIENTE"))
                .andExpect(jsonPath("$.usuario.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.refreshToken").doesNotExist()).andReturn();
        AuthResponse body = json.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
        assertThat(decoder.decode(body.accessToken()).getSubject()).isEqualTo(id.toString());
        Cookie cookie = result.getResponse().getCookie(SessionCookie.NAME);
        assertThat(cookie).isNotNull();
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getSecure()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/api/auth");
        assertThat(cookie.getAttribute("SameSite")).isEqualTo("Lax");
        assertThat(cookie.getMaxAge()).isBetween(604790, 604800);
        assertThat(Base64.getUrlDecoder().decode(cookie.getValue())).hasSize(32);
        String hash = jdbc.queryForObject("SELECT token_hash FROM refresh_tokens WHERE usuario_id = ?", String.class, id);
        assertThat(hash).matches("[0-9a-f]{64}").isNotEqualTo(cookie.getValue());
        assertThat(result.getRequest().getSession(false)).isNull();
        mvc.perform(get("/api/usuarios/me").param("id", "999999")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + body.accessToken()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.email").value(email)).andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.estado").doesNotExist());
    }

    @ParameterizedTest
    @ValueSource(strings = {"wrong", "pending", "blocked", "unknown", "long"})
    void invalidLoginsReturnTheSame401Contract(String invalid) throws Exception {
        String loginEmail = email;
        String password = PASSWORD;
        switch (invalid) {
            case "pending" -> jdbc.update("UPDATE usuarios SET estado = 'PENDIENTE' WHERE id = ?", id);
            case "blocked" -> jdbc.update("UPDATE usuarios SET estado = 'BLOQUEADO' WHERE id = ?", id);
            case "unknown" -> loginEmail = uniqueEmail();
            case "long" -> password = "x".repeat(100);
            default -> password = "incorrecta";
        }
        send("/api/auth/login", new LoginRequest(loginEmail, password)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("NO_AUTENTICADO"));
    }

    @Test
    void limitsRepeatedLoginAttempts() throws Exception {
        for (int i = 0; i < 5; i++) send("/api/auth/login", new LoginRequest(email, "incorrecta"))
                .andExpect(status().isUnauthorized());
        send("/api/auth/login", new LoginRequest(email, PASSWORD)).andExpect(status().isTooManyRequests());
    }

    @Test
    void meRequiresAValidBearerToken() throws Exception {
        mvc.perform(get("/api/usuarios/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/usuarios/me").header(HttpHeaders.AUTHORIZATION, "Bearer invalido"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.codigo").value("NO_AUTENTICADO"));
    }

    @Test
    void newlyRegisteredClientCanLoginImmediately() throws Exception {
        String registered = uniqueEmail();
        send("/api/auth/registro", new RegistroRequest(
                "Carlos", "Perez", uniqueUsername(), "999888777", registered, PASSWORD))
                .andExpect(status().isCreated());
        send("/api/auth/login", new LoginRequest(registered, PASSWORD))
                .andExpect(status().isOk()).andExpect(jsonPath("$.usuario.rol").value("CLIENTE"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/auth/verificar-email"})
    void retiredEndpointsAreNotPublicOrMapped(String path) throws Exception {
        send(path, Map.of()).andExpect(status().isUnauthorized());
        AuthResponse login = json.readValue(login().andReturn().getResponse().getContentAsString(), AuthResponse.class);
        mvc.perform(post(path).header(HttpHeaders.AUTHORIZATION, "Bearer " + login.accessToken())
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void refreshRotatesOneRowWithoutExtendingTheSevenDaySession() throws Exception {
        Cookie original = login().andExpect(status().isOk()).andReturn().getResponse().getCookie(SessionCookie.NAME);
        LocalDateTime expires = jdbc.queryForObject("SELECT fecha_expiracion FROM refresh_tokens WHERE usuario_id = ?",
                LocalDateTime.class, id);
        assertThat(expires.toInstant(ZoneOffset.UTC)).isBetween(Instant.now().plus(Duration.ofDays(7)).minusSeconds(10),
                Instant.now().plus(Duration.ofDays(7)));
        var refreshed = send("/api/auth/refresh", Map.of(), original).andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(jsonPath("$.refreshToken").doesNotExist()).andReturn().getResponse();
        Cookie rotated = refreshed.getCookie(SessionCookie.NAME);
        assertThat(rotated.getValue()).isNotEqualTo(original.getValue());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM refresh_tokens WHERE usuario_id = ?", Long.class, id)).isEqualTo(1L);
        assertThat(jdbc.queryForObject("SELECT fecha_expiracion FROM refresh_tokens WHERE usuario_id = ?",
                LocalDateTime.class, id)).isEqualTo(expires);
        AuthResponse auth = json.readValue(refreshed.getContentAsString(), AuthResponse.class);
        assertThat(decoder.decode(auth.accessToken()).getSubject()).isEqualTo(id.toString());
        send("/api/auth/refresh", Map.of(), original).andExpect(status().isUnauthorized());
        // La reutilización del anterior no revoca el token actual.
        send("/api/auth/refresh", Map.of(), rotated).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"expired", "revoked", "blocked", "pending", "unknown", "missing", "malformed"})
    void rejectsInvalidRefreshAndExpiresTheCookie(String invalid) throws Exception {
        Cookie cookie = login().andReturn().getResponse().getCookie(SessionCookie.NAME);
        switch (invalid) {
            case "expired" -> jdbc.update("UPDATE refresh_tokens SET fecha_expiracion = ? WHERE usuario_id = ?",
                    LocalDateTime.ofInstant(Instant.now().minusSeconds(10), ZoneOffset.UTC), id);
            case "revoked" -> send("/api/auth/logout", Map.of(), cookie).andExpect(status().isNoContent());
            case "blocked" -> jdbc.update("UPDATE usuarios SET estado = 'BLOQUEADO' WHERE id = ?", id);
            case "pending" -> jdbc.update("UPDATE usuarios SET estado = 'PENDIENTE' WHERE id = ?", id);
            case "unknown" -> cookie = new Cookie(SessionCookie.NAME, "A".repeat(43));
            case "malformed" -> cookie = new Cookie(SessionCookie.NAME, "invalido");
            default -> { }
        }
        Cookie[] cookies = invalid.equals("missing") ? new Cookie[0] : new Cookie[]{cookie};
        var result = send("/api/auth/refresh", Map.of(), cookies).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("NO_AUTENTICADO")).andReturn();
        assertThat(result.getResponse().getCookie(SessionCookie.NAME).getMaxAge()).isZero();
    }

    @Test
    void refreshUsesTheCurrentDatabaseRole() throws Exception {
        var loggedIn = login().andReturn().getResponse();
        AuthResponse old = json.readValue(loggedIn.getContentAsString(), AuthResponse.class);
        jdbc.update("UPDATE usuarios SET rol_id = ? WHERE id = ?",
                roles.findByNombre(RolNombre.EMPLEADO).orElseThrow().getId(), id);
        mvc.perform(get("/api/usuarios/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + old.accessToken()))
                .andExpect(status().isUnauthorized());
        var refreshed = send("/api/auth/refresh", Map.of(), loggedIn.getCookie(SessionCookie.NAME))
                .andExpect(status().isOk()).andExpect(jsonPath("$.usuario.rol").value("EMPLEADO"))
                .andReturn().getResponse();
        AuthResponse current = json.readValue(refreshed.getContentAsString(), AuthResponse.class);
        mvc.perform(get("/api/usuarios/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + current.accessToken()))
                .andExpect(status().isOk());
    }

    @Test
    void concurrentRefreshHasOneWinnerAndKeepsOneRow() throws Exception {
        Cookie original = login().andReturn().getResponse().getCookie(SessionCookie.NAME);
        var results = concurrently(() -> send("/api/auth/refresh", Map.of(), original).andReturn().getResponse().getStatus());
        assertThat(results).containsExactlyInAnyOrder(200, 401);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM refresh_tokens WHERE usuario_id = ?", Long.class, id)).isEqualTo(1L);
    }

    @Test
    void logoutRevokesOnlyItsSessionAndIsIdempotent() throws Exception {
        var first = login().andReturn().getResponse();
        Cookie cookie = first.getCookie(SessionCookie.NAME);
        Cookie otherSession = login().andReturn().getResponse().getCookie(SessionCookie.NAME);
        var logout = send("/api/auth/logout", Map.of(), cookie).andExpect(status().isNoContent()).andReturn().getResponse();
        Cookie expired = logout.getCookie(SessionCookie.NAME);
        assertThat(expired.getMaxAge()).isZero();
        assertThat(expired.getPath()).isEqualTo(cookie.getPath());
        assertThat(expired.isHttpOnly()).isTrue();
        assertThat(expired.getSecure()).isTrue();
        send("/api/auth/logout", Map.of(), cookie).andExpect(status().isNoContent());
        send("/api/auth/logout", Map.of()).andExpect(status().isNoContent());
        send("/api/auth/refresh", Map.of(), cookie).andExpect(status().isUnauthorized());
        send("/api/auth/refresh", Map.of(), otherSession).andExpect(status().isOk());
        // El JWT emitido antes del logout conserva su vigencia de 15 minutos.
        AuthResponse auth = json.readValue(first.getContentAsString(), AuthResponse.class);
        mvc.perform(get("/api/usuarios/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + auth.accessToken()))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/auth/registro", "/api/auth/login", "/api/auth/refresh", "/api/auth/logout"})
    void authPostsRequireCsrf(String path) throws Exception {
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.codigo").value("ACCESO_DENEGADO"));
        mvc.perform(post(path).cookie(new Cookie("XSRF-TOKEN", "expected"))
                .header("X-XSRF-TOKEN", "incorrect").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
    }

    private ResultActions login() throws Exception { return send("/api/auth/login", new LoginRequest(email, PASSWORD)); }

    private ResultActions send(String path, Object body, Cookie... cookies) throws Exception {
        Cookie csrf = mvc.perform(get("/api/auth/csrf")).andExpect(status().isNoContent())
                .andReturn().getResponse().getCookie("XSRF-TOKEN");
        MockHttpServletRequestBuilder request = post(path).cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body))
                .with(value -> { value.setRemoteAddr(remoteAddress); return value; });
        if (cookies.length > 0) request.cookie(cookies);
        return mvc.perform(request);
    }

    private Long createUser(String value) {
        return new TransactionTemplate(transactions).execute(status -> usuarios.saveAndFlush(new Usuario(
                "Carlos", "Perez", uniqueUsername(), "999888777", value,
                encoder.encode(PASSWORD), EstadoUsuario.ACTIVO, roles.findByNombre(RolNombre.CLIENTE).orElseThrow())).getId());
    }

    private String uniqueUsername() {
        return "u" + UUID.randomUUID().toString().substring(0, 20);
    }

    private String uniqueEmail() {
        String result = "auth-" + UUID.randomUUID() + "@example.test";
        fixtureEmails.add(result);
        return result;
    }

    private List<Integer> concurrently(Callable<Integer> action) throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> { start.await(); return action.call(); });
            var second = executor.submit(() -> { start.await(); return action.call(); });
            start.countDown();
            return List.of(first.get(30, TimeUnit.SECONDS), second.get(30, TimeUnit.SECONDS));
        }
    }
}
