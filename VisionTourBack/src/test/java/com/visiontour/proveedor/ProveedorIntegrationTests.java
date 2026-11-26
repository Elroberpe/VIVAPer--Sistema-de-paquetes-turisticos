package com.visiontour.proveedor;

import com.visiontour.support.JwtTestInitializer;
import com.visiontour.security.jwt.AccessTokenService;
import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.EstadoUsuario;
import com.visiontour.usuario.enums.RolNombre;
import com.visiontour.usuario.repository.RolRepository;
import com.visiontour.usuario.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@ContextConfiguration(initializers = JwtTestInitializer.class)
@Transactional
class ProveedorIntegrationTests {
    private static final String BASE = "/api/admin/proveedores";
    @Autowired WebApplicationContext context;
    @Autowired UsuarioRepository usuarios;
    @Autowired RolRepository roles;
    @Autowired AccessTokenService tokens;
    @Autowired JdbcTemplate jdbc;
    @Autowired JsonMapper json;
    @Autowired org.flywaydb.core.Flyway flyway;
    @Autowired jakarta.persistence.EntityManager entityManager;
    MockMvc mvc;
    String admin;

    @BeforeEach
    void preparar() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        admin = token(RolNombre.ADMIN);
    }

    String token(RolNombre rol) {
        var usuario = usuarios.saveAndFlush(new Usuario("Prueba", "Proveedores", "prueba_" + rol.name(),
            "987654321", "proveedores_" + rol.name() + "@example.com", "no-login",
            EstadoUsuario.ACTIVO, roles.findByNombre(rol).orElseThrow()));
        return tokens.generar(usuario.getId());
    }

    MockHttpServletRequestBuilder autorizado(MockHttpServletRequestBuilder request) {
        return request.header("Authorization", "Bearer " + admin).contentType("application/json");
    }

    String datos(String ruc, String nombre, String ids) {
        return """
            {"ruc":"%s","nombre":"%s","encargado":" Ana ","email":" contacto@example.com ",
             "telefono":" 987654321 ","serviciosIds":%s}
            """.formatted(ruc, nombre, ids);
    }

    long crear(String ruc, String nombre, String ids) throws Exception {
        String body = mvc.perform(autorizado(post(BASE)).content(datos(ruc, nombre, ids)))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("idProveedor").asLong();
    }

    @Test
    void aplicaMigracionesDeProveedoresSinLimitarOtrosModulos() {
        assertThat(flyway.info().applied())
            .extracting(migration -> migration.getVersion().getVersion())
            .contains("5", "6", "8");
        assertThat(flyway.info().pending()).isEmpty();
        assertThat(flyway.validateWithResult().validationSuccessful).isTrue();
    }

    @Test
    void integraProveedorConApiRealDeServicios() throws Exception {
        String body = mvc.perform(autorizado(post("/api/admin/servicios")).content("""
            {"nombre":"Servicio de integración proveedores","descripcion":"Prueba del catálogo compartido"}
            """)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long servicioId = json.readTree(body).get("idServicio").asLong();
        long proveedorId = crear("20123456789", "Hotel integrado", "[" + servicioId + "]");
        mvc.perform(autorizado(patch("/api/admin/servicios/" + servicioId + "/estado"))
                .content("{\"estado\":false}")).andExpect(status().isOk());
        mvc.perform(autorizado(get(BASE + "/" + proveedorId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.servicios[0].idServicio").value(servicioId));
        mvc.perform(autorizado(post(BASE)).content(datos("20987654321", "Otro hotel", "[" + servicioId + "]")))
            .andExpect(status().isConflict());
    }

    @Test
    void registraNormalizaYDevuelveDetalle() throws Exception {
        long id = crear("20123456789", " Hotel Andino ", "[1,2]");
        mvc.perform(autorizado(get(BASE + "/" + id)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.nombre").value("Hotel Andino"))
            .andExpect(jsonPath("$.encargado").value("Ana"))
            .andExpect(jsonPath("$.email").value("contacto@example.com"))
            .andExpect(jsonPath("$.telefono").value("987654321"))
            .andExpect(jsonPath("$.estado").value(true))
            .andExpect(jsonPath("$.ruc").value("20123456789"))
            .andExpect(jsonPath("$.servicios.length()").value(2));
    }

    @Test
    void permiteOmitirServiciosYCorreoYNoPermiteImponerEstado() throws Exception {
        mvc.perform(autorizado(post(BASE)).content("""
            {"ruc":"20123456789","nombre":"Hotel","encargado":"Ana","telefono":"123","estado":false}
            """)).andExpect(status().isCreated()).andExpect(jsonPath("$.estado").value(true))
            .andExpect(jsonPath("$.servicios").isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "123", "2012345678A", "201234567890", " 20123456789"})
    void rechazaRucInvalido(String ruc) throws Exception {
        mvc.perform(autorizado(post(BASE)).content(datos(ruc, "Hotel", "[]")))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("ERROR_VALIDACION"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "{\"ruc\":\"20123456789\",\"nombre\":\" \",\"encargado\":\"Ana\",\"telefono\":\"123\"}",
        "{\"ruc\":\"20123456789\",\"nombre\":\"Hotel\",\"encargado\":\" \",\"telefono\":\"123\"}",
        "{\"ruc\":\"20123456789\",\"nombre\":\"Hotel\",\"encargado\":\"Ana\",\"telefono\":\" \"}",
        "{\"ruc\":\"20123456789\",\"nombre\":\"Hotel\",\"encargado\":\"Ana\",\"telefono\":\"123\",\"email\":\"incorrecto\"}"
    })
    void validaCampos(String body) throws Exception {
        mvc.perform(autorizado(post(BASE)).content(body)).andExpect(status().isBadRequest());
    }

    @Test
    void rechazaRucDuplicadoAlCrearYEditar() throws Exception {
        crear("20123456789", "Uno", "[]");
        mvc.perform(autorizado(post(BASE)).content(datos("20123456789", "Dos", "[]")))
            .andExpect(status().isConflict());
        long otro = crear("20987654321", "Dos", "[]");
        mvc.perform(autorizado(put(BASE + "/" + otro)).content(datos("20123456789", "Dos", "[]")))
            .andExpect(status().isConflict());
    }

    @ParameterizedTest
    @ValueSource(strings = {"[1,1]", "[null]", "[-1]", "[0]"})
    void rechazaListaServiciosInvalida(String ids) throws Exception {
        mvc.perform(autorizado(post(BASE)).content(datos("20123456789", "Hotel", ids)))
            .andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("select count(*) from proveedores", Long.class)).isZero();
    }

    @Test
    void rechazaServiciosInexistentesEInactivosSinGuardarProveedor() throws Exception {
        mvc.perform(autorizado(post(BASE)).content(datos("20123456789", "Hotel", "[999999]")))
            .andExpect(status().isNotFound());
        jdbc.update("update servicios set estado = false where id_servicio = 1");
        mvc.perform(autorizado(post(BASE)).content(datos("20123456789", "Hotel", "[1]")))
            .andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("select count(*) from proveedores", Long.class)).isZero();
    }

    @Test
    void cambiaEstadoConservaRelacionesYEdicionReemplazaServicios() throws Exception {
        long id = crear("20123456789", "Hotel", "[1,2]");
        mvc.perform(autorizado(patch(BASE + "/" + id + "/estado")).content("{\"estado\":false}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value(false));
        mvc.perform(autorizado(get(BASE + "/" + id))).andExpect(jsonPath("$.servicios.length()").value(2));
        mvc.perform(autorizado(put(BASE + "/" + id)).content(datos("20123456789", "Nuevo", "[2,3]")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value(false))
            .andExpect(jsonPath("$.servicios[0].idServicio").value(2))
            .andExpect(jsonPath("$.servicios[1].idServicio").value(3));
        mvc.perform(autorizado(put(BASE + "/" + id)).content(datos("20123456789", "Nuevo", "[]")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.servicios").isEmpty());
    }

    @Test
    void filtraNombreYEstadoConPaginacion() throws Exception {
        crear("20123456789", "Hotel Andino", "[]");
        long id = crear("20987654321", "Hotel Costa", "[]");
        mvc.perform(autorizado(patch(BASE + "/" + id + "/estado")).content("{\"estado\":false}"))
            .andExpect(status().isOk());
        mvc.perform(autorizado(get(BASE)).param("nombre","HOTEL").param("estado","activo").param("size","1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
            .andExpect(jsonPath("$.content[0].nombre").value("Hotel Andino"))
            .andExpect(jsonPath("$.page").value(0)).andExpect(jsonPath("$.size").value(1));
        mvc.perform(autorizado(get(BASE)).param("size","1"))
            .andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.totalPages").value(2));
        mvc.perform(autorizado(get(BASE)).param("nombre","%"))
            .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void validaFiltrosEstadoYRecursos() throws Exception {
        mvc.perform(autorizado(get(BASE)).param("estado","cualquiera")).andExpect(status().isBadRequest());
        mvc.perform(autorizado(get(BASE)).param("size","101")).andExpect(status().isBadRequest());
        mvc.perform(autorizado(get(BASE)).param("page","-1")).andExpect(status().isBadRequest());
        mvc.perform(autorizado(get(BASE + "/999999"))).andExpect(status().isNotFound());
        mvc.perform(autorizado(patch(BASE + "/999999/estado")).content("{}")).andExpect(status().isBadRequest());
    }

    @Test
    void conservaRelacionInactivaYPermiteRetirarlaPeroNoVolverAAgregarla() throws Exception {
        long id = crear("20123456789", "Hotel", "[1]");
        jdbc.update("update servicios set estado = false where id_servicio = 1");
        entityManager.clear();
        mvc.perform(autorizado(put(BASE + "/" + id)).content(datos("20123456789", "Nuevo", "[1]")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.servicios.length()").value(1));
        mvc.perform(autorizado(put(BASE + "/" + id)).content(datos("20123456789", "Sin servicios", "[]")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.servicios").isEmpty());
        mvc.perform(autorizado(put(BASE + "/" + id)).content(datos("20123456789", "No guardar", "[1]")))
            .andExpect(status().isConflict());
        entityManager.clear();
        mvc.perform(autorizado(get(BASE + "/" + id)))
            .andExpect(jsonPath("$.nombre").value("Sin servicios"))
            .andExpect(jsonPath("$.servicios").isEmpty());
    }

    @Test
    void baseDeDatosProtegeUnicidadYFormatoRuc() throws Exception {
        crear("20123456789", "Hotel", "[]");
        String sql = "insert into proveedores (ruc,nombre,encargado,telefono) values (?, 'Otro', 'Ana', '123')";
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update(sql, "20123456789"))
            .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update(sql, "abcdefghijk"))
            .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test
    void protegeTodasLasOperacionesConJwtReal() throws Exception {
        for (String rol : new String[]{"CLIENTE", "EMPLEADO"}) {
            String bearer = token(RolNombre.valueOf(rol));
            for (var request : new MockHttpServletRequestBuilder[]{
                    get(BASE), get(BASE + "/1"), post(BASE), put(BASE + "/1"), patch(BASE + "/1/estado")}) {
                mvc.perform(request.header("Authorization","Bearer " + bearer)
                        .contentType("application/json").content("{}"))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.codigo").value("ACCESO_DENEGADO"));
            }
        }
        for (var request : new MockHttpServletRequestBuilder[]{
                get(BASE), get(BASE + "/1"), post(BASE), put(BASE + "/1"), patch(BASE + "/1/estado")}) {
            mvc.perform(request.contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized());
        }
    }
}
