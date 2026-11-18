package com.visiontour.usuario;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

import com.visiontour.auth.dto.LoginRequest;
import com.visiontour.security.jwt.AccessTokenService;
import com.visiontour.usuario.dto.CambiarPasswordRequest;
import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.EstadoUsuario;
import com.visiontour.usuario.enums.RolNombre;
import com.visiontour.usuario.repository.RolRepository;
import com.visiontour.usuario.repository.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

abstract class PerfilIntegrationContract {
    private static final String PASSWORD = "Clave-actual-2026";
    private static final String NUEVA = "Clave-nueva-2026";

    @Autowired private WebApplicationContext context;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private RolRepository roles;
    @Autowired private PasswordEncoder encoder;
    @Autowired private PlatformTransactionManager transactions;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private AccessTokenService accessTokens;
    @Autowired private JwtEncoder jwtEncoder;
    @Autowired private JsonMapper json;
    private MockMvc mvc;
    private Long id;
    private Long otroId;
    private String email;
    private String token;
    private String remoteAddress;
    private String hashOriginal;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        remoteAddress = "perfil-" + UUID.randomUUID();
        email = UUID.randomUUID() + "@example.test";
        hashOriginal = encoder.encode(PASSWORD);
        id = crearUsuario(email);
        otroId = crearUsuario(UUID.randomUUID() + "@example.test");
        token = accessTokens.generar(id);
    }

    @AfterEach
    void cleanup() {
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            for (Long usuarioId : List.of(id, otroId)) {
                jdbc.update("DELETE FROM refresh_tokens WHERE usuario_id = ?", usuarioId);
                jdbc.update("DELETE FROM usuarios WHERE id = ?", usuarioId);
            }
        });
    }

    @Test
    void conservaElContratoDelPerfil() throws Exception {
        enviar(get("/api/usuarios/me")).andExpect(status().isOk())
                .andExpect(jsonPath("$.*", hasSize(7)))
                .andExpect(jsonPath("$.id").value(id)).andExpect(jsonPath("$.nombre").value("Carlos"))
                .andExpect(jsonPath("$.apellido").value("Pérez")).andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.usuario").value(valor("usuario", id)))
                .andExpect(jsonPath("$.celular").value("999888777"))
                .andExpect(jsonPath("$.rol").value("CLIENTE"));
    }

    @Test
    void actualizaUsuarioYCelularYConservaElResto() throws Exception {
        enviar(patch("/api/usuarios/me").content("{\"usuario\":\"  Carlos.Prueba_1-2  \",\"celular\":\"  +51999888777  \"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.usuario").value("carlos.prueba_1-2"))
                .andExpect(jsonPath("$.celular").value("+51999888777"));
        assertThat(valor("usuario", id)).isEqualTo("carlos.prueba_1-2");
        assertThat(valor("celular", id)).isEqualTo("+51999888777");
        assertThat(valor("email", id)).isEqualTo(email);
        assertThat(valor("nombre", id)).isEqualTo("Carlos");
        assertThat(valor("password_hash", id)).isEqualTo(hashOriginal);
        assertThat(valor("celular", otroId)).isEqualTo("999888777");
    }

    @Test
    void cambiaElCorreoPermiteElNuevoLoginYConservaLasSesiones() throws Exception {
        var cookie = login(PASSWORD).andExpect(status().isOk()).andReturn().getResponse().getCookie("vivaair_refresh");
        String nuevo = UUID.randomUUID() + "@example.test";
        enviar(patch("/api/usuarios/me").content(json.writeValueAsString(Map.of(
                "email", "  " + nuevo.toUpperCase(java.util.Locale.ROOT) + "  ", "passwordActual", PASSWORD,
                "nombre", "Actualizado", "usuario", "nuevo_usuario", "celular", "+51911222333"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value(nuevo))
                .andExpect(jsonPath("$.passwordActual").doesNotExist());
        assertThat(valor("email", id)).isEqualTo(nuevo);
        assertThat(valor("nombre", id)).isEqualTo("Actualizado");
        assertThat(valor("password_hash", id)).isEqualTo(hashOriginal);
        login(PASSWORD).andExpect(status().isUnauthorized());
        email = nuevo;
        login(PASSWORD).andExpect(status().isOk()).andExpect(jsonPath("$.usuario.usuario").value("nuevo_usuario"))
                .andExpect(jsonPath("$.usuario.celular").value("+51911222333"));
        enviar(get("/api/usuarios/me")).andExpect(status().isOk()).andExpect(jsonPath("$.email").value(nuevo));
        var csrf = mvc.perform(get("/api/auth/csrf")).andReturn().getResponse().getCookie("XSRF-TOKEN");
        mvc.perform(post("/api/auth/refresh").cookie(cookie, csrf).header("X-XSRF-TOKEN", csrf.getValue()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.usuario.email").value(nuevo))
                .andExpect(jsonPath("$.usuario.usuario").value("nuevo_usuario"))
                .andExpect(jsonPath("$.usuario.celular").value("+51911222333"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"clave-invalida-secreta", "  Clave-actual-2026  "})
    void noCambiaNingunDatoSiLaPasswordDelCorreoEsIncorrecta(String password) throws Exception {
        var response = enviar(patch("/api/usuarios/me").content(json.writeValueAsString(Map.of(
                "email", "nuevo@example.test", "passwordActual", password, "nombre", "Modificado"))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("PASSWORD_ACTUAL_INCORRECTA"))
                .andReturn().getResponse();
        assertThat(response.getContentAsString()).doesNotContain(password, hashOriginal);
        assertThat(valor("email", id)).isEqualTo(email);
        assertThat(valor("nombre", id)).isEqualTo("Carlos");
    }

    @ParameterizedTest
    @ValueSource(strings = {"email", "usuario"})
    void rechazaDatosDeOtraCuentaYPermiteConservarLosPropios(String campo) throws Exception {
        Map<String, String> body = new java.util.HashMap<>(Map.of(campo, valor(campo, otroId), "nombre", "Modificado"));
        if (campo.equals("email")) body.put("passwordActual", PASSWORD);
        enviar(patch("/api/usuarios/me").content(json.writeValueAsString(body)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.codigo").value("CONFLICTO_DATOS"))
                .andExpect(jsonPath("$.mensaje").value(campo.equals("email")
                        ? "Este correo ya está registrado." : "Este nombre de usuario ya está registrado."));
        assertThat(valor("nombre", id)).isEqualTo("Carlos");
        assertThat(valor("email", id)).isEqualTo(email);
        body.put(campo, valor(campo, id));
        enviar(patch("/api/usuarios/me").content(json.writeValueAsString(body))).andExpect(status().isOk());
    }

    @Test
    void limitaLosIntentosDeCambioDeCorreo() throws Exception {
        for (int i = 0; i < 5; i++) {
            enviar(patch("/api/usuarios/me").content(json.writeValueAsString(Map.of(
                    "email", "nuevo@example.test", "passwordActual", "incorrecta"))))
                    .andExpect(status().isBadRequest());
        }
        enviar(patch("/api/usuarios/me").content(json.writeValueAsString(Map.of(
                "email", "nuevo@example.test", "passwordActual", PASSWORD))))
                .andExpect(status().isTooManyRequests());
        assertThat(valor("email", id)).isEqualTo(email);
    }

    @ParameterizedTest
    @ValueSource(strings = {"usuario", "celular", "email", "passwordActual"})
    void rechazaNullYTiposNoTextualesEnLosNuevosCampos(String campo) throws Exception {
        for (String valor : List.of("null", "123", "true", "{}", "[]")) {
            enviar(patch("/api/usuarios/me").content("{\"nombre\":\"Modificado\",\"" + campo + "\":" + valor + "}"))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("JSON_INVALIDO"));
        }
        assertThat(valor("nombre", id)).isEqualTo("Carlos");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"usuario\":\"ab\"}", "{\"usuario\":\"usuario con espacios\"}", "{\"usuario\":\"\"}",
            "{\"celular\":\"12345678\"}", "{\"celular\":\"1234567890123456\"}", "{\"celular\":\"+51 999888777\"}",
            "{\"email\":\"invalido\",\"passwordActual\":\"actual\"}", "{\"email\":\"\",\"passwordActual\":\"actual\"}",
            "{\"email\":\"nuevo@example.test\"}", "{\"email\":\"nuevo@example.test\",\"passwordActual\":\" \"}",
            "{\"passwordActual\":\"actual\"}"
    })
    void validaLosNuevosDatosSinModificarElPerfil(String body) throws Exception {
        enviar(patch("/api/usuarios/me").content(body)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("ERROR_VALIDACION"));
        assertThat(valor("email", id)).isEqualTo(email);
        assertThat(valor("celular", id)).isEqualTo("999888777");
    }

    @ParameterizedTest
    @ValueSource(strings = {"email", "usuario"})
    void dosCuentasNoPuedenTomarElMismoDatoUnico(String campo) throws Exception {
        String valor = campo.equals("email") ? UUID.randomUUID() + "@example.test" : "compartido_123";
        String body = json.writeValueAsString(Map.of(campo, valor, "passwordActual", PASSWORD, "nombre", "Ganador"));
        String otroToken = accessTokens.generar(otroId);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var primero = executor.submit(() -> { start.await(); return enviar(patch("/api/usuarios/me").content(body))
                    .andReturn().getResponse().getStatus(); });
            var segundo = executor.submit(() -> {
                start.await();
                return mvc.perform(patch("/api/usuarios/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + otroToken)
                        .contentType(MediaType.APPLICATION_JSON).content(body)
                        .with(request -> { request.setRemoteAddr(remoteAddress); return request; }))
                        .andReturn().getResponse().getStatus();
            });
            start.countDown();
            assertThat(List.of(primero.get(30, TimeUnit.SECONDS), segundo.get(30, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 409);
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM usuarios WHERE " + campo + " = ?", Long.class, valor)).isEqualTo(1L);
        assertThat(List.of(valor("nombre", id), valor("nombre", otroId))).containsExactlyInAnyOrder("Carlos", "Ganador");
    }

    @Test
    void actualizaAmbosCamposNormalizadosSoloParaElUsuarioAutenticado() throws Exception {
        enviar(patch("/api/usuarios/me").param("id", otroId.toString())
                .content("{\"nombre\":\"  Carlos Alberto  \",\"apellido\":\"  Pérez Gómez  \"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.*", hasSize(7)))
                .andExpect(jsonPath("$.id").value(id)).andExpect(jsonPath("$.nombre").value("Carlos Alberto"))
                .andExpect(jsonPath("$.apellido").value("Pérez Gómez"))
                .andExpect(jsonPath("$.email").value(email)).andExpect(jsonPath("$.rol").value("CLIENTE"));
        assertThat(valor("nombre", id)).isEqualTo("Carlos Alberto");
        assertThat(valor("apellido", id)).isEqualTo("Pérez Gómez");
        assertThat(valor("password_hash", id)).isEqualTo(hashOriginal);
        assertThat(valor("estado", id)).isEqualTo("ACTIVO");
        assertThat(valor("nombre", otroId)).isEqualTo("Carlos");
        assertThat(valor("apellido", otroId)).isEqualTo("Pérez");
    }

    @ParameterizedTest
    @ValueSource(strings = {"nombre", "apellido"})
    void conservaLosCamposOmitidosYAceptaElLimiteDe100Caracteres(String campo) throws Exception {
        enviar(patch("/api/usuarios/me").content(json.writeValueAsString(Map.of(campo, "  " + "a".repeat(100) + "  "))))
                .andExpect(status().isOk()).andExpect(jsonPath("$." + campo).value("a".repeat(100)));
        assertThat(valor(campo.equals("nombre") ? "apellido" : "nombre", id))
                .isEqualTo(campo.equals("nombre") ? "Pérez" : "Carlos");
    }

    static Stream<Arguments> perfilesInvalidos() {
        return Stream.of(
                Arguments.of("{}", "ERROR_VALIDACION"),
                Arguments.of("{\"nombre\":\"\"}", "ERROR_VALIDACION"),
                Arguments.of("{\"apellido\":\"  \\t\\n  \"}", "ERROR_VALIDACION"),
                Arguments.of("{\"nombre\":\"" + "a".repeat(101) + "\"}", "ERROR_VALIDACION"),
                Arguments.of("{\"apellido\":\"" + "a".repeat(101) + "\"}", "ERROR_VALIDACION"),
                Arguments.of("{\"nombre\":null}", "JSON_INVALIDO"),
                Arguments.of("{\"nombre\":\"Válido\",\"apellido\":null}", "JSON_INVALIDO"),
                Arguments.of("{\"nombre\":123}", "JSON_INVALIDO"),
                Arguments.of("{\"apellido\":true}", "JSON_INVALIDO"),
                Arguments.of("{\"nombre\":{}}", "JSON_INVALIDO"),
                Arguments.of("{\"apellido\":[]}", "JSON_INVALIDO"),
                Arguments.of("{", "JSON_INVALIDO"),
                Arguments.of("null", "JSON_INVALIDO"));
    }

    @ParameterizedTest
    @MethodSource("perfilesInvalidos")
    void rechazaPerfilesInvalidosSinPersistirCambios(String body, String codigo) throws Exception {
        enviar(patch("/api/usuarios/me").content(body)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value(codigo)).andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.timestamp").isString());
        assertThat(valor("nombre", id)).isEqualTo("Carlos");
        assertThat(valor("apellido", id)).isEqualTo("Pérez");
    }

    @ParameterizedTest
    @ValueSource(strings = {"id", "rol", "estado", "passwordHash", "password", "desconocido", "perfilInformado", "passwordInformada"})
    void rechazaTodosLosCamposNoPermitidos(String campo) throws Exception {
        enviar(patch("/api/usuarios/me").content(json.writeValueAsString(Map.of("nombre", "Modificado", campo, "otro"))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("JSON_INVALIDO"));
        assertThat(valor("nombre", id)).isEqualTo("Carlos");
        assertThat(valor("email", id)).isEqualTo(email);
        assertThat(valor("password_hash", id)).isEqualTo(hashOriginal);
    }

    static Stream<String> passwordsInvalidas() {
        return Stream.of("{}", "{\"passwordActual\":\"actual\"}", "{\"passwordNueva\":\"nueva-valida\"}",
                "{\"passwordActual\":null,\"passwordNueva\":\"nueva-valida\"}",
                "{\"passwordActual\":\"actual\",\"passwordNueva\":null}",
                "{\"passwordActual\":\" \",\"passwordNueva\":\"nueva-valida\"}",
                "{\"passwordActual\":\"actual\",\"passwordNueva\":\"\"}",
                "{\"passwordActual\":\"actual\",\"passwordNueva\":\"1234567\"}",
                "{\"passwordActual\":\"actual\",\"passwordNueva\":\"" + "a".repeat(73) + "\"}",
                "{\"passwordActual\":\"actual\",\"passwordNueva\":\"" + "é".repeat(37) + "\"}");
    }

    @ParameterizedTest
    @MethodSource("passwordsInvalidas")
    void validaLosCamposDePasswordSinExponerValores(String body) throws Exception {
        enviar(put("/api/usuarios/me/password").content(body)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("ERROR_VALIDACION"))
                .andExpect(jsonPath("$.errores").isMap()).andExpect(jsonPath("$.trace").doesNotExist());
        assertThat(valor("password_hash", id)).isEqualTo(hashOriginal);
    }

    @ParameterizedTest
    @ValueSource(strings = {"incorrecta", "muy-larga"})
    void rechazaLaPasswordActualIncorrectaSinCambiarElHash(String caso) throws Exception {
        cambiar(caso.equals("muy-larga") ? "x".repeat(100) : "incorrecta", NUEVA)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("PASSWORD_ACTUAL_INCORRECTA"))
                .andExpect(jsonPath("$.mensaje").value("La contraseña actual es incorrecta."));
        assertThat(valor("password_hash", id)).isEqualTo(hashOriginal);
    }

    @Test
    void rechazaReutilizarLaPasswordActual() throws Exception {
        cambiar(PASSWORD, PASSWORD).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("PASSWORD_REUTILIZADA"));
        assertThat(valor("password_hash", id)).isEqualTo(hashOriginal);
    }

    @Test
    void rechazaCamposExtraEnElCambioDePasswordSinExponerCredenciales() throws Exception {
        String body = json.writeValueAsString(Map.of("passwordActual", PASSWORD, "passwordNueva", NUEVA, "id", otroId));
        var response = enviar(put("/api/usuarios/me/password").content(body)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("JSON_INVALIDO")).andReturn().getResponse();
        assertThat(response.getContentAsString()).doesNotContain(PASSWORD, NUEVA, hashOriginal);
        assertThat(valor("password_hash", id)).isEqualTo(hashOriginal);
        assertThat(valor("password_hash", otroId)).isEqualTo(hashOriginal);
    }

    @ParameterizedTest
    @ValueSource(strings = {NUEVA, "éééééééééééééééééééééééééééééééééééé", "  Nueva-con-espacios  "})
    void cambiaElHashPermiteElNuevoLoginYConservaElJwtAnterior(String nueva) throws Exception {
        cambiar(PASSWORD, nueva).andExpect(status().isNoContent()).andExpect(content().string(""));
        String hash = valor("password_hash", id);
        assertThat(hash).startsWith("$2").isNotEqualTo(hashOriginal).isNotEqualTo(nueva);
        assertThat(encoder.matches(nueva, hash)).isTrue();
        assertThat(encoder.matches(PASSWORD, hash)).isFalse();
        assertThat(valor("password_hash", otroId)).isEqualTo(hashOriginal);
        login(PASSWORD).andExpect(status().isUnauthorized());
        login(nueva).andExpect(status().isOk());
        enviar(get("/api/usuarios/me")).andExpect(status().isOk());
    }

    @Test
    void limitaIntentosDeCambioConElLimitadorExistente() throws Exception {
        for (int i = 0; i < 5; i++) cambiar("incorrecta", NUEVA).andExpect(status().isBadRequest());
        cambiar(PASSWORD, NUEVA).andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.codigo").value("ERROR_HTTP_429"));
        assertThat(valor("password_hash", id)).isEqualTo(hashOriginal);
    }

    @ParameterizedTest
    @EnumSource(RolNombre.class)
    void permiteGestionarElPerfilALosRolesExistentes(RolNombre rol) throws Exception {
        jdbc.update("UPDATE usuarios SET rol_id = ? WHERE id = ?", roles.findByNombre(rol).orElseThrow().getId(), id);
        token = accessTokens.generar(id);
        enviar(patch("/api/usuarios/me").content("{\"nombre\":\"Nuevo\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.rol").value(rol.name()));
        cambiar(PASSWORD, NUEVA).andExpect(status().isNoContent());
    }

    @ParameterizedTest
    @ValueSource(strings = {"PATCH", "PUT"})
    void exigeJwtValidoYPermisosEnAmbosEndpoints(String metodo) throws Exception {
        mvc.perform(solicitud(metodo)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("NO_AUTENTICADO"));
        mvc.perform(solicitud(metodo).header(HttpHeaders.AUTHORIZATION, "Bearer invalido"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.codigo").value("NO_AUTENTICADO"));
        Instant now = Instant.now();
        String expired = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).type("at+jwt").build(),
                JwtClaimsSet.builder().issuer("vivaair").audience(List.of("vivaair-api")).subject(id.toString())
                        .claim("rol", "CLIENTE").issuedAt(now.minusSeconds(120)).expiresAt(now.minusSeconds(60)).build()))
                .getTokenValue();
        mvc.perform(solicitud(metodo).header(HttpHeaders.AUTHORIZATION, "Bearer " + expired))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.codigo").value("NO_AUTENTICADO"));
        mvc.perform(solicitud(metodo).with(jwt().jwt(jwt -> jwt.subject(id.toString())).authorities(List.of())))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.codigo").value("ACCESO_DENEGADO"));
        jdbc.update("UPDATE usuarios SET estado = 'BLOQUEADO' WHERE id = ?", id);
        enviar(solicitud(metodo)).andExpect(status().isUnauthorized());
        assertThat(valor("password_hash", id)).isEqualTo(hashOriginal);
    }

    @Test
    void dosCambiosConcurrentesNoPuedenUsarLaMismaPasswordAnterior() throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var primero = executor.submit(() -> { start.await(); return cambiar(PASSWORD, NUEVA).andReturn().getResponse().getStatus(); });
            var segundo = executor.submit(() -> { start.await(); return cambiar(PASSWORD, "Otra-clave-2026").andReturn().getResponse().getStatus(); });
            start.countDown();
            assertThat(List.of(primero.get(30, TimeUnit.SECONDS), segundo.get(30, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(204, 400);
        }
    }

    private Long crearUsuario(String correo) {
        return new TransactionTemplate(transactions).execute(status -> usuarios.saveAndFlush(new Usuario(
                "Carlos", "Pérez", "u" + UUID.randomUUID().toString().substring(0, 20), "999888777", correo, hashOriginal, EstadoUsuario.ACTIVO,
                roles.findByNombre(RolNombre.CLIENTE).orElseThrow())).getId());
    }

    private String valor(String columna, Long usuarioId) {
        return jdbc.queryForObject("SELECT " + columna + " FROM usuarios WHERE id = ?", String.class, usuarioId);
    }

    private ResultActions enviar(MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).with(value -> { value.setRemoteAddr(remoteAddress); return value; }));
    }

    private ResultActions cambiar(String actual, String nueva) throws Exception {
        return enviar(put("/api/usuarios/me/password").param("id", otroId.toString())
                .content(json.writeValueAsString(new CambiarPasswordRequest(actual, nueva))));
    }

    private ResultActions login(String password) throws Exception {
        var csrf = mvc.perform(get("/api/auth/csrf")).andReturn().getResponse().getCookie("XSRF-TOKEN");
        return mvc.perform(post("/api/auth/login").cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(new LoginRequest(email, password)))
                .with(value -> { value.setRemoteAddr(remoteAddress); return value; }));
    }

    private MockHttpServletRequestBuilder solicitud(String metodo) {
        return (metodo.equals("PATCH") ? patch("/api/usuarios/me").content("{\"nombre\":\"Nuevo\"}")
                : put("/api/usuarios/me/password").content(json.writeValueAsString(new CambiarPasswordRequest(PASSWORD, NUEVA))))
                .contentType(MediaType.APPLICATION_JSON);
    }
}
