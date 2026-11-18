package com.visiontour.auth;

import java.net.URI;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.http.*;
import java.util.UUID;
import com.visiontour.auth.dto.*;
import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.*;
import com.visiontour.usuario.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"app.security.cors.allowed-origins=http://localhost:4200", "app.auth.cookie-secure=false"})
@ActiveProfiles("test")
class AuthHttpTests {
    @Value("${local.server.port}") private int port;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private RolRepository roles;
    @Autowired private PasswordEncoder encoder;
    @Autowired private PlatformTransactionManager transactions;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private JsonMapper json;

    @Test
    void realHttpRefreshesTheSessionWithCookiesCsrfAndCors() throws Exception {
        String email = "http-" + UUID.randomUUID() + "@example.test";
        String password = "Clave-solo-para-pruebas";
        Long id = new TransactionTemplate(transactions).execute(status -> usuarios.saveAndFlush(new Usuario(
                "Carlos", "Perez", "u" + UUID.randomUUID().toString().substring(0, 20), "999888777", email, encoder.encode(password), EstadoUsuario.ACTIVO,
                roles.findByNombre(RolNombre.CLIENTE).orElseThrow())).getId());
        try {
            CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
            try (HttpClient client = HttpClient.newBuilder().cookieHandler(cookies).build()) {
                var preflight = client.send(HttpRequest.newBuilder(uri("/api/auth/login"))
                        .header("Origin", "http://localhost:4200").header("Access-Control-Request-Method", "POST")
                        .method("OPTIONS", HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
                assertThat(preflight.statusCode()).isEqualTo(200);
                assertThat(preflight.headers().firstValue("Access-Control-Allow-Origin")).contains("http://localhost:4200");
                var forbidden = client.send(HttpRequest.newBuilder(uri("/api/auth/login"))
                        .header("Origin", "https://no-autorizado.example").method("OPTIONS", HttpRequest.BodyPublishers.noBody())
                        .header("Access-Control-Request-Method", "POST").build(), HttpResponse.BodyHandlers.ofString());
                assertThat(forbidden.statusCode()).isEqualTo(403);
                assertThat(forbidden.body()).contains("ACCESO_DENEGADO");
                var missingCsrf = post(client, "/api/auth/login", "{}");
                assertThat(missingCsrf.statusCode()).isEqualTo(403);
                var csrf = client.send(HttpRequest.newBuilder(uri("/api/auth/csrf")).GET().build(), HttpResponse.BodyHandlers.ofString());
                assertThat(csrf.statusCode()).isEqualTo(204);
                var login = post(client, cookies, "/api/auth/login", json.writeValueAsString(new LoginRequest(email, password)));
                assertThat(login.statusCode()).isEqualTo(200);
                assertThat(login.headers().allValues("Set-Cookie")).anyMatch(value -> value.startsWith("vivaair_refresh=")
                        && value.contains("HttpOnly") && value.contains("SameSite=Lax") && value.contains("Path=/api/auth"));
                assertThat(cookies.getCookieStore().getCookies()).noneMatch(value -> value.getName().equals("JSESSIONID"));
                AuthResponse auth = json.readValue(login.body(), AuthResponse.class);
                var me = client.send(HttpRequest.newBuilder(uri("/api/usuarios/me"))
                        .header("Authorization", "Bearer " + auth.accessToken()).GET().build(), HttpResponse.BodyHandlers.ofString());
                assertThat(me.statusCode()).isEqualTo(200);
                assertThat(json.readValue(me.body(), UsuarioResponse.class).id()).isEqualTo(id);
                var anonymous = client.send(HttpRequest.newBuilder(uri("/api/usuarios/me"))
                        .GET().build(), HttpResponse.BodyHandlers.ofString());
                assertThat(anonymous.statusCode()).isEqualTo(401);
                assertThat(anonymous.body()).contains("NO_AUTENTICADO");
                String before = cookie(cookies, "vivaair_refresh");
                var refreshed = post(client, cookies, "/api/auth/refresh", "{}");
                assertThat(refreshed.statusCode()).isEqualTo(200);
                assertThat(cookie(cookies, "vivaair_refresh")).isNotEqualTo(before);
                assertThat(json.readValue(refreshed.body(), AuthResponse.class).usuario().id()).isEqualTo(id);
                var logout = post(client, cookies, "/api/auth/logout", "{}");
                assertThat(logout.statusCode()).isEqualTo(204);
                assertThat(logout.headers().allValues("Set-Cookie")).anyMatch(value -> value.startsWith("vivaair_refresh=")
                        && value.contains("Max-Age=0"));
                assertThat(cookies.getCookieStore().getCookies()).noneMatch(value -> value.getName().equals("vivaair_refresh"));
                assertThat(post(client, cookies, "/api/auth/refresh", "{}").statusCode()).isEqualTo(401);
            }
        } finally {
            new TransactionTemplate(transactions).executeWithoutResult(status -> {
                jdbc.update("DELETE FROM refresh_tokens WHERE usuario_id = ?", id);
                jdbc.update("DELETE FROM usuarios WHERE id = ?", id);
            });
        }
    }

    private HttpResponse<String> post(HttpClient client, String path, String body) throws Exception {
        return client.send(HttpRequest.newBuilder(uri(path)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(HttpClient client, CookieManager cookies, String path, String body) throws Exception {
        return client.send(HttpRequest.newBuilder(uri(path)).header("Content-Type", "application/json")
                .header("X-XSRF-TOKEN", cookie(cookies, "XSRF-TOKEN"))
                .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }

    private String cookie(CookieManager manager, String name) {
        return manager.getCookieStore().getCookies().stream().filter(cookie -> cookie.getName().equals(name))
                .findFirst().orElseThrow().getValue();
    }

    private URI uri(String path) { return URI.create("http://localhost:" + port + path); }
}
