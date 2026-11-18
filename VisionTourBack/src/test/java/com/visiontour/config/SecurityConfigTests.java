package com.visiontour.config;

import java.util.Map;
import java.util.UUID;

import com.visiontour.security.CustomUserDetailsService;
import com.visiontour.security.jwt.AccessTokenService;
import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.EstadoUsuario;
import com.visiontour.usuario.enums.RolNombre;
import com.visiontour.usuario.repository.RolRepository;
import com.visiontour.usuario.repository.UsuarioRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "app.security.cors.allowed-origins=http://localhost:4200")
@ActiveProfiles("test")
@Import(SecurityConfigTests.TestEndpoints.class)
class SecurityConfigTests {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AccessTokenService accessTokens;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void anonymousUsersReceiveJson401WithoutCreatingASession() throws Exception {
        ResultActions result = mockMvc.perform(get("/api/prueba"));
        expectApiError(result, 401, "NO_AUTENTICADO");
        assertThat(result.andReturn().getRequest().getSession(false)).isNull();
        assertThat(result.andReturn().getResponse().getCookie("JSESSIONID")).isNull();
        result.andExpect(header().doesNotExist(HttpHeaders.WWW_AUTHENTICATE));
    }

    @ParameterizedTest
    @EnumSource(RolNombre.class)
    void recognizedRolesCanAccessProtectedEndpoints(RolNombre rol) throws Exception {
        mockMvc.perform(get("/api/prueba").with(user("usuario").roles(rol.name())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensaje").value("Backend funcionando"));
    }

    @ParameterizedTest
    @EnumSource(RolNombre.class)
    @Transactional
    void bearerUsesTheDatabaseRoleForGetPostAndMethodPermissions(RolNombre rol) throws Exception {
        var usuario = usuarioRepository.saveAndFlush(new Usuario(
                "Usuario", "JWT", "u" + UUID.randomUUID().toString().substring(0, 20), "999888777",
                "jwt-role-" + UUID.randomUUID() + "@example.test", passwordEncoder.encode("clave-de-prueba"),
                EstadoUsuario.ACTIVO, rolRepository.findByNombre(rol).orElseThrow()));
        String authorization = "Bearer " + accessTokens.generar(usuario.getId());
        mockMvc.perform(get("/api/prueba").header(HttpHeaders.AUTHORIZATION, authorization))
                .andExpect(status().isOk());
        var result = mockMvc.perform(post("/security-test/change").header(HttpHeaders.AUTHORIZATION, authorization))
                .andExpect(status().isOk()).andReturn();
        assertThat(result.getResponse().getCookie("vivaair_refresh")).isNull();
        assertThat(result.getRequest().getSession(false)).isNull();
        mockMvc.perform(get("/security-test/admin").header(HttpHeaders.AUTHORIZATION, authorization))
                .andExpect(status().is(rol == RolNombre.ADMIN ? 200 : 403));
    }

    @Test
    void anAuthenticatedUserWithoutARecognizedRoleReceivesJson403() throws Exception {
        expectApiError(mockMvc.perform(get("/api/prueba").with(user("otro").roles("OTRO"))),
                403, "ACCESO_DENEGADO");
    }

    @Test
    void methodSecurityRejectsInsufficientPermissionsWithJson403() throws Exception {
        expectApiError(mockMvc.perform(get("/security-test/admin").with(user("cliente").roles("CLIENTE"))),
                403, "ACCESO_DENEGADO");
    }

    @Test
    void methodSecurityAllowsTheRequiredRole() throws Exception {
        mockMvc.perform(get("/security-test/admin").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());
    }

    @Test
    void authenticatedRequestsDoNotNeedCsrfCookies() throws Exception {
        var result = mockMvc.perform(post("/security-test/change").with(user("cliente").roles("CLIENTE")))
                .andExpect(status().isOk()).andReturn();
        assertThat(result.getResponse().getCookie("vivaair_refresh")).isNull();
        assertThat(result.getRequest().getSession(false)).isNull();
    }

    @Test
    void authenticationFromAnExistingSessionIsIgnored() throws Exception {
        MockHttpSession session = new MockHttpSession();
        var securityContext = SecurityContextHolder.createEmptyContext();
        securityContext.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                "usuario", null, AuthorityUtils.createAuthorityList("ROLE_ADMIN")));
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, securityContext);

        expectApiError(mockMvc.perform(get("/api/prueba").session(session)), 401, "NO_AUTENTICADO");
    }

    @Test
    void httpBasicDoesNotAuthenticateRequests() throws Exception {
        expectApiError(mockMvc.perform(get("/api/prueba").with(httpBasic("usuario", "clave"))),
                401, "NO_AUTENTICADO");
    }

    @ParameterizedTest
    @ValueSource(strings = {"/login", "/logout", "/api/auth/login", "/api/auth/registro"})
    void authenticationPathsAreNotAutomaticallyPublic(String path) throws Exception {
        expectApiError(mockMvc.perform(get(path)), 401, "NO_AUTENTICADO");
    }

    @Test
    void corsAcceptsOnlyTheConfiguredOriginBeforeAuthentication() throws Exception {
        mockMvc.perform(options("/api/prueba")
                        .header(HttpHeaders.ORIGIN, "http://localhost:4200")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:4200"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    void anUnapprovedCorsOriginReceivesJson403() throws Exception {
        ResultActions result = mockMvc.perform(options("/api/prueba")
                .header(HttpHeaders.ORIGIN, "https://no-autorizado.example")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"));
        expectApiError(result, 403, "ACCESO_DENEGADO");
        result.andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    @Test
    void corsRejectsUnapprovedHeadersWithJson403() throws Exception {
        expectApiError(mockMvc.perform(options("/api/prueba")
                .header(HttpHeaders.ORIGIN, "http://localhost:4200")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "X-No-Autorizado")),
                403, "ACCESO_DENEGADO");
    }

    @Test
    void corsRequiresExplicitOrigins() {
        assertThatThrownBy(() -> new SecurityConfig().corsConfigurationSource("*"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void corsIsClosedWhenNoOriginsAreConfigured() {
        var source = new SecurityConfig().corsConfigurationSource("");
        var request = new org.springframework.mock.web.MockHttpServletRequest("GET", "/api/prueba");
        assertThat(source.getCorsConfiguration(request).getAllowedOrigins()).isEmpty();
    }

    @Test
    @Transactional
    void userDetailsServiceLoadsTheDatabaseUserAndItsLazyRole() {
        String email = "security-" + UUID.randomUUID() + "@example.test";
        String hash = passwordEncoder.encode("clave-solo-para-pruebas");
        usuarioRepository.saveAndFlush(new Usuario(
                "Usuario", "Prueba", "u" + UUID.randomUUID().toString().substring(0, 20), "999888777",
                email, hash, EstadoUsuario.ACTIVO,
                rolRepository.findByNombre(RolNombre.CLIENTE).orElseThrow()));

        var details = userDetailsService.loadUserByUsername(email);

        assertThat(details.getUsername()).isEqualTo(email);
        assertThat(details.getPassword()).isEqualTo(hash);
        assertThat(details.getAuthorities()).extracting("authority").containsExactly("ROLE_CLIENTE");
    }

    @Test
    void cookiesDoNotAuthenticateAnAnonymousRequest() throws Exception {
        expectApiError(mockMvc.perform(post("/security-test/change")
                .cookie(new Cookie("vivaair_refresh", "obsolete"), new Cookie("JSESSIONID", "obsolete"))),
                401, "NO_AUTENTICADO");
    }

    private void expectApiError(ResultActions result, int statusCode, String codigo) throws Exception {
        result.andExpect(status().is(statusCode))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.*", hasSize(5)))
                .andExpect(jsonPath("$.status").value(statusCode))
                .andExpect(jsonPath("$.codigo").value(codigo))
                .andExpect(jsonPath("$.mensaje").isNotEmpty())
                .andExpect(jsonPath("$.timestamp").isString())
                .andExpect(jsonPath("$.errores").isEmpty())
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    @TestConfiguration(proxyBeanMethods = false)
    @RestController
    static class TestEndpoints {

        @GetMapping("/security-test/admin")
        @PreAuthorize("hasRole('ADMIN')")
        public Map<String, String> admin() {
            return Map.of("resultado", "ok");
        }

        @PostMapping("/security-test/change")
        public Map<String, String> change() {
            return Map.of("resultado", "ok");
        }
    }
}
