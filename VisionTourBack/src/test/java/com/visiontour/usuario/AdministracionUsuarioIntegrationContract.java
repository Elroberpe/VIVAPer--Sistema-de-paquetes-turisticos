package com.visiontour.usuario;

import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

import com.visiontour.auth.dto.AuthResponse;
import com.visiontour.auth.dto.LoginRequest;
import com.visiontour.security.jwt.AccessTokenService;
import com.visiontour.support.JwtTestInitializer.SqlCapture;
import com.visiontour.usuario.dto.CambiarEstadoUsuarioRequest;
import com.visiontour.usuario.dto.CambiarRolUsuarioRequest;
import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.EstadoUsuario;
import com.visiontour.usuario.enums.RolNombre;
import com.visiontour.usuario.repository.RolRepository;
import com.visiontour.usuario.repository.UsuarioRepository;
import com.visiontour.usuario.service.UsuarioService;
import com.visiontour.usuario.exception.UltimoAdministradorActivoException;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

abstract class AdministracionUsuarioIntegrationContract {
    private static final String PASSWORD = "Clave-pruebas-2026";

    @Autowired private WebApplicationContext context;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private UsuarioService usuarioService;
    @Autowired private RolRepository roles;
    @Autowired private PasswordEncoder encoder;
    @Autowired private AccessTokenService accessTokens;
    @Autowired private PlatformTransactionManager transactions;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private JsonMapper json;

    private MockMvc mvc;
    private final List<Long> ids = new ArrayList<>();
    private final List<String> correosNuevos = new ArrayList<>();
    private String grupo;
    private String hashOriginal;
    private String adminToken;
    private Long adminId;
    private Long clienteId;
    private Long empleadoId;
    private Long bloqueadoId;
    private Long pendienteId;

    @BeforeEach
    void prepararUsuarios() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        grupo = "admin" + UUID.randomUUID().toString().substring(0, 8);
        hashOriginal = encoder.encode(PASSWORD);
        adminId = crearUsuario("Ana", "Torres", "admin", RolNombre.ADMIN, EstadoUsuario.ACTIVO);
        clienteId = crearUsuario("Carlos", "Perez", "cliente", RolNombre.CLIENTE, EstadoUsuario.ACTIVO);
        empleadoId = crearUsuario("Elena", "Gomez", "empleado", RolNombre.EMPLEADO, EstadoUsuario.ACTIVO);
        bloqueadoId = crearUsuario("Luis", "Diaz", "bloqueado", RolNombre.CLIENTE, EstadoUsuario.BLOQUEADO);
        pendienteId = crearUsuario("Pedro", "Ramos", "pendiente", RolNombre.CLIENTE, EstadoUsuario.PENDIENTE);
        adminToken = accessTokens.generar(adminId);
    }

    @AfterEach
    void eliminarDatosDePrueba() {
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            for (String correo : correosNuevos) {
                ids.addAll(jdbc.queryForList("SELECT id FROM usuarios WHERE email = ?", Long.class, correo));
            }
            for (Long id : ids) {
                jdbc.update("DELETE FROM refresh_tokens WHERE usuario_id = ?", id);
                jdbc.update("DELETE FROM usuarios WHERE id = ?", id);
            }
        });
        ids.clear();
        correosNuevos.clear();
    }

    @Test
    void adminPuedeListarConLosValoresPredeterminados() throws Exception {
        comoAdmin(get("/api/usuarios").param("buscar", grupo))
                .andExpect(status().isOk()).andExpect(jsonPath("$.*", hasSize(5)))
                .andExpect(jsonPath("$.content", hasSize(5)))
                .andExpect(jsonPath("$.page").value(0)).andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.totalElements").value(5)).andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.content[0].id").value(adminId))
                .andExpect(jsonPath("$.content[0].rol").value("ADMIN"))
                .andExpect(jsonPath("$.content[0].correo").value(grupo + ".admin@example.test"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"CARLOS", "PEREZ", ".CLIENTE@EXAMPLE.TEST"})
    void buscaPorNombreApellidoOCorreoSinDistinguirMayusculas(String buscar) throws Exception {
        String texto = buscar.startsWith(".") ? grupo + buscar : buscar + " " + grupo;
        comoAdmin(get("/api/usuarios").param("buscar", "  " + texto.toUpperCase(java.util.Locale.ROOT) + "  "))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(clienteId));
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void combinaBusquedaYFiltroDeEstado(boolean activo) throws Exception {
        comoAdmin(get("/api/usuarios").param("buscar", grupo).param("activo", Boolean.toString(activo)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(activo ? 3 : 2))
                .andExpect(jsonPath("$.content[*].activo", everyItem(is(activo))));
    }

    @Test
    void paginacionDevuelvePaginasOrdenadasYTotalesCorrectos() throws Exception {
        comoAdmin(get("/api/usuarios").param("buscar", grupo).param("page", "1").param("size", "2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[0].id").value(empleadoId))
                .andExpect(jsonPath("$.content[1].id").value(bloqueadoId))
                .andExpect(jsonPath("$.page").value(1)).andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalElements").value(5)).andExpect(jsonPath("$.totalPages").value(3));
        comoAdmin(get("/api/usuarios").param("buscar", grupo).param("page", "2").param("size", "2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].id").value(pendienteId));
    }

    @Test
    void devuelve200ConListaVaciaSinCoincidenciasOFueraDeLaUltimaPagina() throws Exception {
        comoAdmin(get("/api/usuarios").param("buscar", grupo + "inexistente"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content", hasSize(0)))
                .andExpect(jsonPath("$.totalElements").value(0)).andExpect(jsonPath("$.totalPages").value(0));
        comoAdmin(get("/api/usuarios").param("buscar", grupo).param("page", "99"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content", hasSize(0)))
                .andExpect(jsonPath("$.totalElements").value(5));
    }

    @ParameterizedTest
    @ValueSource(strings = {"%", "_", "!"})
    void losComodinesSeBuscanComoTextoLiteral(String buscar) throws Exception {
        comoAdmin(get("/api/usuarios").param("buscar", grupo + buscar))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    void consultaElDetalleSinExponerCredenciales() throws Exception {
        var response = comoAdmin(get("/api/usuarios/{id}", clienteId))
                .andExpect(status().isOk()).andExpect(jsonPath("$.*", hasSize(9)))
                .andExpect(jsonPath("$.id").value(clienteId)).andExpect(jsonPath("$.nombre").value("Carlos " + grupo))
                .andExpect(jsonPath("$.usuario").value(grupo + ".cliente"))
                .andExpect(jsonPath("$.correo").value(grupo + ".cliente@example.test"))
                .andExpect(jsonPath("$.celular").value("999888777"))
                .andExpect(jsonPath("$.rol").value("CLIENTE")).andExpect(jsonPath("$.activo").value(true))
                .andExpect(jsonPath("$.fechaRegistro").isString()).andReturn().getResponse();
        assertThat(response.getContentAsString()).doesNotContain("password", "passwordHash", "password_hash", hashOriginal);
        comoAdmin(get("/api/usuarios/{id}", bloqueadoId)).andExpect(status().isOk())
                .andExpect(jsonPath("$.activo").value(false));
    }

    @Test
    void usuarioInexistenteDevuelve404EnDetalleYCambioDeEstado() throws Exception {
        comoAdmin(get("/api/usuarios/{id}", Long.MAX_VALUE)).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.codigo").value("RECURSO_NO_ENCONTRADO"));
        cambiarEstado(Long.MAX_VALUE, false).andExpect(status().isNotFound());
        comoAdmin(put("/api/usuarios/{id}", Long.MAX_VALUE).content(json.writeValueAsString(datosCliente())))
                .andExpect(status().isNotFound());
        cambiarRol(Long.MAX_VALUE, RolNombre.EMPLEADO).andExpect(status().isNotFound());
    }

    @Test
    void adminPuedeDesactivarYActivarSinEliminarElUsuario() throws Exception {
        cambiarEstado(clienteId, false).andExpect(status().isOk()).andExpect(jsonPath("$.activo").value(false));
        assertThat(usuarios.findById(clienteId).orElseThrow().getEstado()).isEqualTo(EstadoUsuario.BLOQUEADO);
        cambiarEstado(clienteId, true).andExpect(status().isOk()).andExpect(jsonPath("$.activo").value(true));
        var usuario = usuarios.findById(clienteId).orElseThrow();
        assertThat(usuario.getEstado()).isEqualTo(EstadoUsuario.ACTIVO);
        assertThat(usuario.getPasswordHash()).isEqualTo(hashOriginal);
        assertThat(usuario.getEmail()).isEqualTo(grupo + ".cliente@example.test");
    }

    @Test
    void repetirLaDesactivacionEsValidoYConservaPendientes() throws Exception {
        cambiarEstado(bloqueadoId, false).andExpect(status().isOk()).andExpect(jsonPath("$.activo").value(false));
        cambiarEstado(bloqueadoId, false).andExpect(status().isOk());
        cambiarEstado(pendienteId, false).andExpect(status().isOk());
        assertThat(usuarios.findById(pendienteId).orElseThrow().getEstado()).isEqualTo(EstadoUsuario.PENDIENTE);
    }

    @Test
    void adminNoPuedeDesactivarseAunqueEnvieOtroIdPorParametro() throws Exception {
        comoAdmin(patch("/api/usuarios/{id}/estado", adminId).param("administradorId", clienteId.toString())
                .content("{\"activo\":false}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.codigo").value("ACCESO_DENEGADO"));
        assertThat(usuarios.findById(adminId).orElseThrow().getEstado()).isEqualTo(EstadoUsuario.ACTIVO);
        cambiarEstado(adminId, true).andExpect(status().isOk());
    }

    @ParameterizedTest
    @EnumSource(value = RolNombre.class, names = {"CLIENTE", "EMPLEADO"})
    void soloAdminPuedeAccederALasOperacionesAdministrativas(RolNombre rol) throws Exception {
        String token = accessTokens.generar(rol == RolNombre.CLIENTE ? clienteId : empleadoId);
        for (var request : solicitudesAdministracion()) {
            enviar(request, token).andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.codigo").value("ACCESO_DENEGADO"));
        }
    }

    @Test
    void lasOperacionesAdministrativasExigenAutenticacionValida() throws Exception {
        for (var request : solicitudesAdministracion()) {
            mvc.perform(request).andExpect(status().isUnauthorized());
        }
        for (var request : solicitudesAdministracion()) {
            enviar(request, "invalido").andExpect(status().isUnauthorized());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"page=-1", "page=texto", "size=0", "size=101", "size=texto", "activo=invalido"})
    void parametrosInvalidosDevuelven400(String parametro) throws Exception {
        String[] partes = parametro.split("=");
        comoAdmin(get("/api/usuarios").param(partes[0], partes[1]))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void validaLongitudDeBusquedaYLimitesPermitidos() throws Exception {
        comoAdmin(get("/api/usuarios").param("buscar", "a".repeat(101)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("ERROR_VALIDACION"));
        comoAdmin(get("/api/usuarios").param("buscar", "a".repeat(100)).param("size", "100"))
                .andExpect(status().isOk());
        comoAdmin(get("/api/usuarios").param("buscar", "  ").param("size", "1")).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "abc", "1.5"})
    void validaIdEnDetalleYCambioDeEstado(String id) throws Exception {
        comoAdmin(get("/api/usuarios/{id}", id)).andExpect(status().isBadRequest());
        comoAdmin(patch("/api/usuarios/{id}/estado", id).content("{\"activo\":false}"))
                .andExpect(status().isBadRequest());
        comoAdmin(put("/api/usuarios/{id}", id).content(json.writeValueAsString(datosCliente())))
                .andExpect(status().isBadRequest());
        comoAdmin(patch("/api/usuarios/{id}/rol", id).content("{\"rol\":\"EMPLEADO\"}"))
                .andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"activo\":null}", "{\"activo\":\"invalido\"}", "{", "null",
            "{\"activo\":false,\"id\":1}", "{\"activo\":false,\"rol\":\"ADMIN\"}"})
    void validaElCuerpoDelCambioDeEstado(String body) throws Exception {
        comoAdmin(patch("/api/usuarios/{id}/estado", clienteId).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        assertThat(usuarios.findById(clienteId).orElseThrow().getEstado()).isEqualTo(EstadoUsuario.ACTIVO);
    }

    @Test
    void desactivadoNoPuedeHacerLoginUsarSuJwtAnteriorNiRenovar() throws Exception {
        var sesion = loginCliente().andExpect(status().isOk()).andReturn().getResponse();
        String tokenAnterior = json.readValue(sesion.getContentAsString(), AuthResponse.class).accessToken();
        Cookie refresh = sesion.getCookie("vivaair_refresh");

        cambiarEstado(clienteId, false).andExpect(status().isOk());

        loginCliente().andExpect(status().isUnauthorized());
        enviar(get("/api/usuarios/me"), tokenAnterior).andExpect(status().isUnauthorized());
        enviar(get("/api/prueba"), tokenAnterior).andExpect(status().isUnauthorized());
        Cookie csrf = csrf();
        mvc.perform(post("/api/auth/refresh").cookie(refresh, csrf).header("X-XSRF-TOKEN", csrf.getValue()))
                .andExpect(status().isUnauthorized());
        cambiarEstado(clienteId, true).andExpect(status().isOk());
        loginCliente().andExpect(status().isOk());
    }

    @Test
    void paginaEnBaseDeDatosYCargaRolesSinConsultasPorUsuario() {
        var consultas = SqlCapture.capture(() -> new TransactionTemplate(transactions).executeWithoutResult(status -> {
            var pagina = usuarios.buscarUsuarios(grupo, null, PageRequest.of(0, 2));
            assertThat(pagina.getContent()).hasSize(2);
            assertThat(pagina.getTotalElements()).isEqualTo(5);
            pagina.forEach(usuario -> assertThat(usuario.getRol().getNombre()).isNotNull());
        }));
        assertThat(consultas).hasSize(2);
        assertThat(consultas.getFirst()).containsIgnoringCase("join roles");
        assertThat(consultas.getFirst().toLowerCase(java.util.Locale.ROOT))
                .containsAnyOf("fetch first", "fetch next", "limit");
    }

    @ParameterizedTest
    @EnumSource(EstadoUsuario.class)
    void adminActualizaDatosPersonalesSinModificarRolEstadoNiPassword(EstadoUsuario estado) throws Exception {
        jdbc.update("UPDATE usuarios SET estado = ? WHERE id = ?", estado.name(), clienteId);
        var datos = datosCliente();
        datos.put("nombre", "  Carlos Alberto  ");
        datos.put("apellido", "  Pérez Gómez  ");
        datos.put("usuario", "  " + grupo.toUpperCase(java.util.Locale.ROOT) + ".NUEVO  ");
        datos.put("correo", "  " + grupo.toUpperCase(java.util.Locale.ROOT) + ".NUEVO@EXAMPLE.TEST  ");
        datos.put("celular", "  +51999888777  ");

        var response = comoAdmin(put("/api/usuarios/{id}", clienteId).content(json.writeValueAsString(datos)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.*", hasSize(9)))
                .andExpect(jsonPath("$.nombre").value("Carlos Alberto"))
                .andExpect(jsonPath("$.apellido").value("Pérez Gómez"))
                .andExpect(jsonPath("$.usuario").value(grupo + ".nuevo"))
                .andExpect(jsonPath("$.correo").value(grupo + ".nuevo@example.test"))
                .andExpect(jsonPath("$.celular").value("+51999888777"))
                .andExpect(jsonPath("$.rol").value("CLIENTE"))
                .andExpect(jsonPath("$.activo").value(estado == EstadoUsuario.ACTIVO)).andReturn().getResponse();
        var guardado = usuarios.findById(clienteId).orElseThrow();
        assertThat(guardado.getEstado()).isEqualTo(estado);
        assertThat(guardado.getPasswordHash()).isEqualTo(hashOriginal);
        assertThat(response.getContentAsString()).doesNotContain("password", hashOriginal);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void omitirOEnviarNullEnCelularConservaElCelular(boolean omitir) throws Exception {
        var datos = datosCliente();
        if (omitir) datos.remove("celular");
        else datos.put("celular", null);
        comoAdmin(put("/api/usuarios/{id}", clienteId).content(json.writeValueAsString(datos)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.celular").value("999888777"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"correo", "usuario"})
    void noPermiteDuplicadosYPermiteConservarLosDatosPropios(String campo) throws Exception {
        var datos = datosCliente();
        datos.put(campo, grupo.toUpperCase(java.util.Locale.ROOT) + ".ADMIN" + (campo.equals("correo") ? "@EXAMPLE.TEST" : ""));
        datos.put("nombre", "No debe guardarse");
        comoAdmin(put("/api/usuarios/{id}", clienteId).content(json.writeValueAsString(datos)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.codigo").value("CONFLICTO_DATOS"));
        assertThat(usuarios.findById(clienteId).orElseThrow().getNombre()).isEqualTo("Carlos " + grupo);
        comoAdmin(put("/api/usuarios/{id}", clienteId).content(json.writeValueAsString(datosCliente())))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"rol", "estado", "activo", "password", "passwordHash", "id", "email", "telefono"})
    void putRechazaCamposFueraDeSuContrato(String campo) throws Exception {
        var datos = datosCliente();
        datos.put("nombre", "No debe guardarse");
        datos.put(campo, "valor no permitido");
        comoAdmin(put("/api/usuarios/{id}", clienteId).content(json.writeValueAsString(datos)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("JSON_INVALIDO"));
        var guardado = usuarios.findById(clienteId).orElseThrow();
        assertThat(guardado.getNombre()).isEqualTo("Carlos " + grupo);
        assertThat(guardado.getPasswordHash()).isEqualTo(hashOriginal);
        assertThat(guardado.getEstado()).isEqualTo(EstadoUsuario.ACTIVO);
    }

    @ParameterizedTest
    @MethodSource("datosPersonalesInvalidos")
    void validaLosDatosDelPut(String campo, String valor) throws Exception {
        var datos = datosCliente();
        datos.put(campo, valor);
        comoAdmin(put("/api/usuarios/{id}", clienteId).content(json.writeValueAsString(datos)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("ERROR_VALIDACION"));
        assertThat(usuarios.findById(clienteId).orElseThrow().getUsuario()).isEqualTo(grupo + ".cliente");
    }

    static Stream<Arguments> datosPersonalesInvalidos() {
        return Stream.of(
                Arguments.of("nombre", null), Arguments.of("nombre", "  "), Arguments.of("nombre", "a".repeat(101)),
                Arguments.of("apellido", null), Arguments.of("apellido", ""), Arguments.of("apellido", "a".repeat(101)),
                Arguments.of("usuario", null), Arguments.of("usuario", "ab"), Arguments.of("usuario", "a".repeat(31)),
                Arguments.of("usuario", "con espacios"), Arguments.of("correo", null), Arguments.of("correo", "  "),
                Arguments.of("correo", "invalido"), Arguments.of("correo", "a".repeat(151)),
                Arguments.of("celular", ""), Arguments.of("celular", "12345678"),
                Arguments.of("celular", "+1234567890123456"), Arguments.of("celular", "+51 999888777"));
    }

    @Test
    void putAceptaLosLimitesDeNombreUsuarioYCelular() throws Exception {
        var datos = datosCliente();
        datos.put("nombre", "a".repeat(100));
        datos.put("apellido", "a".repeat(100));
        datos.put("usuario", grupo + "a".repeat(30 - grupo.length()));
        datos.put("celular", "+123456789012345");
        comoAdmin(put("/api/usuarios/{id}", clienteId).content(json.writeValueAsString(datos)))
                .andExpect(status().isOk());
    }

    @Test
    void correoActualizadoFuncionaEnLoginYConservaLasSesiones() throws Exception {
        var sesion = loginCliente().andExpect(status().isOk()).andReturn().getResponse();
        String tokenAnterior = json.readValue(sesion.getContentAsString(), AuthResponse.class).accessToken();
        Cookie refresh = sesion.getCookie("vivaair_refresh");
        var datos = datosCliente();
        String nuevoCorreo = grupo + ".nuevo@example.test";
        datos.put("correo", nuevoCorreo);
        comoAdmin(put("/api/usuarios/{id}", clienteId).content(json.writeValueAsString(datos))).andExpect(status().isOk());

        loginCliente().andExpect(status().isUnauthorized());
        login(nuevoCorreo).andExpect(status().isOk());
        enviar(get("/api/usuarios/me"), tokenAnterior).andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(nuevoCorreo));
        Cookie csrf = csrf();
        mvc.perform(post("/api/auth/refresh").cookie(refresh, csrf).header("X-XSRF-TOKEN", csrf.getValue()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.usuario.email").value(nuevoCorreo));
    }

    @ParameterizedTest
    @EnumSource(RolNombre.class)
    void adminCambiaElRolDeOtroUsuarioYRepetirloEsValido(RolNombre rol) throws Exception {
        var antes = usuarios.findById(clienteId).orElseThrow();
        cambiarRol(clienteId, rol).andExpect(status().isOk()).andExpect(jsonPath("$.rol").value(rol.name()))
                .andExpect(jsonPath("$.activo").value(true)).andExpect(jsonPath("$.usuario").value(antes.getUsuario()));
        cambiarRol(clienteId, rol).andExpect(status().isOk());
        var despues = usuarios.findById(clienteId).orElseThrow();
        assertThat(despues.getNombre()).isEqualTo(antes.getNombre());
        assertThat(despues.getEmail()).isEqualTo(antes.getEmail());
        assertThat(despues.getCelular()).isEqualTo(antes.getCelular());
        assertThat(despues.getPasswordHash()).isEqualTo(antes.getPasswordHash());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"rol\":null}", "{\"rol\":\"\"}", "{\"rol\":\"SUPERADMIN\"}",
            "{\"rol\":\"admin\"}", "{\"rol\":0}", "{\"rol\":true}", "{\"rol\":{}}",
            "{\"rol\":\"ADMIN\",\"estado\":\"ACTIVO\"}"})
    void rechazaRolesInvalidosOCamposAdicionales(String body) throws Exception {
        comoAdmin(patch("/api/usuarios/{id}/rol", clienteId).content(body)).andExpect(status().isBadRequest());
        comoAdmin(get("/api/usuarios/{id}", clienteId)).andExpect(jsonPath("$.rol").value("CLIENTE"));
    }

    @ParameterizedTest
    @EnumSource(value = RolNombre.class, names = {"CLIENTE", "EMPLEADO"})
    void adminNoPuedeQuitarseSuRolNiSuplantarAlEjecutor(RolNombre rol) throws Exception {
        comoAdmin(patch("/api/usuarios/{id}/rol", adminId).param("administradorId", clienteId.toString())
                .content(json.writeValueAsString(new CambiarRolUsuarioRequest(rol))))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.codigo").value("ACCESO_DENEGADO"));
        cambiarRol(adminId, RolNombre.ADMIN).andExpect(status().isOk());
    }

    @Test
    void elJwtAnteriorNoConservaPermisosTrasCambiarElRol() throws Exception {
        var sesion = loginCliente().andExpect(status().isOk()).andReturn().getResponse();
        String tokenCliente = json.readValue(sesion.getContentAsString(), AuthResponse.class).accessToken();
        Cookie refresh = sesion.getCookie("vivaair_refresh");
        cambiarRol(clienteId, RolNombre.ADMIN).andExpect(status().isOk());
        enviar(get("/api/usuarios"), tokenCliente).andExpect(status().isUnauthorized());

        Cookie csrf = csrf();
        var renovacion = mvc.perform(post("/api/auth/refresh").cookie(refresh, csrf)
                        .header("X-XSRF-TOKEN", csrf.getValue()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.usuario.rol").value("ADMIN"))
                .andReturn().getResponse();
        String tokenAdmin = json.readValue(renovacion.getContentAsString(), AuthResponse.class).accessToken();
        enviar(get("/api/usuarios"), tokenAdmin).andExpect(status().isOk());

        cambiarRol(clienteId, RolNombre.CLIENTE).andExpect(status().isOk());
        enviar(get("/api/usuarios"), tokenAdmin).andExpect(status().isUnauthorized());
        var nuevoLogin = loginCliente().andExpect(status().isOk()).andReturn().getResponse();
        String tokenNuevo = json.readValue(nuevoLogin.getContentAsString(), AuthResponse.class).accessToken();
        enviar(get("/api/usuarios"), tokenNuevo).andExpect(status().isForbidden());
        enviar(get("/api/usuarios/me"), tokenNuevo).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"rol", "estado"})
    void cambiosSimultaneosSiempreConservanUnAdministradorActivo(String segundoCambio) throws Exception {
        Long otroAdminId = crearUsuario("Otro", "Admin", "otroadmin", RolNombre.ADMIN, EstadoUsuario.ACTIVO);
        assertThat(usuarios.countByRolNombreAndEstado(RolNombre.ADMIN, EstadoUsuario.ACTIVO)).isEqualTo(2);
        CountDownLatch inicio = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var primero = executor.submit(() -> {
                inicio.await();
                return retirarAdministrador(adminId, otroAdminId, "rol");
            });
            var segundo = executor.submit(() -> {
                inicio.await();
                return retirarAdministrador(otroAdminId, adminId, segundoCambio);
            });
            inicio.countDown();
            assertThat(List.of(primero.get(30, TimeUnit.SECONDS), segundo.get(30, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 409);
        }
        assertThat(usuarios.countByRolNombreAndEstado(RolNombre.ADMIN, EstadoUsuario.ACTIVO)).isEqualTo(1);
    }

    private int retirarAdministrador(Long ejecutor, Long destino, String operacion) {
        try {
            if (operacion.equals("rol")) {
                usuarioService.cambiarRol(ejecutor, destino, new CambiarRolUsuarioRequest(RolNombre.CLIENTE));
            } else {
                usuarioService.cambiarEstado(ejecutor, destino, false);
            }
            return 200;
        } catch (UltimoAdministradorActivoException exception) {
            return 409;
        }
    }

    private Map<String, Object> datosCliente() {
        return new HashMap<>(Map.of("nombre", "Carlos " + grupo, "apellido", "Perez " + grupo,
                "usuario", grupo + ".cliente", "correo", grupo + ".cliente@example.test", "celular", "999888777"));
    }

    @ParameterizedTest
    @EnumSource(RolNombre.class)
    void adminPuedeCrearUsuariosConLosRolesExistentes(RolNombre rol) throws Exception {
        var datos = datosCreacion();
        datos.put("rol", rol.name());
        datos.put("nombre", "  Carlos  ");
        datos.put("apellido", "  Pérez  ");
        datos.put("usuario", "  " + (grupo + ".nuevo").toUpperCase(java.util.Locale.ROOT) + "  ");
        datos.put("correo", "  " + (grupo + ".nuevo@example.test").toUpperCase(java.util.Locale.ROOT) + "  ");
        datos.put("celular", "  +51999888777  ");

        var response = comoAdmin(post("/api/usuarios").content(json.writeValueAsString(datos)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.*", hasSize(9)))
                .andExpect(jsonPath("$.id").isNumber()).andExpect(jsonPath("$.nombre").value("Carlos"))
                .andExpect(jsonPath("$.apellido").value("Pérez"))
                .andExpect(jsonPath("$.usuario").value(grupo + ".nuevo"))
                .andExpect(jsonPath("$.correo").value(grupo + ".nuevo@example.test"))
                .andExpect(jsonPath("$.celular").value("+51999888777"))
                .andExpect(jsonPath("$.rol").value(rol.name())).andExpect(jsonPath("$.activo").value(true))
                .andExpect(jsonPath("$.fechaRegistro").isString()).andReturn().getResponse();

        assertThat(response.getContentAsString()).doesNotContain("password", "passwordHash", PASSWORD);
        assertThat(response.getCookie("vivaair_refresh")).isNull();
        var guardado = usuarios.findByEmail(grupo + ".nuevo@example.test").orElseThrow();
        assertThat(encoder.matches(PASSWORD, guardado.getPasswordHash())).isTrue();
        assertThat(guardado.getPasswordHash()).isNotEqualTo(PASSWORD);
        login(guardado.getEmail()).andExpect(status().isOk()).andExpect(jsonPath("$.usuario.rol").value(rol.name()));
        comoAdmin(get("/api/usuarios/me")).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(adminId));
    }

    @ParameterizedTest
    @ValueSource(strings = {"correo", "usuario"})
    void creacionNoPermiteCorreoONombreDeUsuarioDuplicados(String campo) throws Exception {
        var datos = datosCreacion();
        datos.put(campo, (grupo + ".cliente" + (campo.equals("correo") ? "@example.test" : ""))
                .toUpperCase(java.util.Locale.ROOT));
        long cantidadAnterior = usuarios.count();

        comoAdmin(post("/api/usuarios").content(json.writeValueAsString(datos)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.codigo").value("CONFLICTO_DATOS"));

        assertThat(usuarios.count()).isEqualTo(cantidadAnterior);
    }

    @ParameterizedTest
    @MethodSource("datosPersonalesInvalidos")
    void creacionValidaLosDatosPersonales(String campo, String valor) throws Exception {
        var datos = datosCreacion();
        datos.put(campo, valor);
        comoAdmin(post("/api/usuarios").content(json.writeValueAsString(datos)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("ERROR_VALIDACION"));
        assertThat(usuarios.existsByEmail(grupo + ".nuevo@example.test")).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"nombre", "apellido", "usuario", "correo", "celular", "password", "rol"})
    void creacionExigeTodosSusCampos(String campo) throws Exception {
        var datos = datosCreacion();
        datos.remove(campo);
        comoAdmin(post("/api/usuarios").content(json.writeValueAsString(datos)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("ERROR_VALIDACION"));
        datos.put(campo, null);
        var response = comoAdmin(post("/api/usuarios").content(json.writeValueAsString(datos)))
                .andExpect(status().isBadRequest()).andReturn().getResponse();
        assertThat(response.getContentAsString()).doesNotContain(PASSWORD);
    }

    @ParameterizedTest
    @ValueSource(strings = {"estado", "activo", "id", "passwordHash", "email", "telefono"})
    void creacionRechazaCamposAdicionales(String campo) throws Exception {
        var datos = datosCreacion();
        datos.put(campo, "valor no permitido");
        comoAdmin(post("/api/usuarios").content(json.writeValueAsString(datos)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("JSON_INVALIDO"));
        assertThat(usuarios.existsByEmail(grupo + ".nuevo@example.test")).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUPERADMIN", "admin", "numero", "booleano"})
    void creacionSoloAceptaNombresDeRolesValidos(String caso) throws Exception {
        var datos = datosCreacion();
        Object rol = switch (caso) {
            case "numero" -> 0;
            case "booleano" -> true;
            default -> caso;
        };
        datos.put("rol", rol);
        comoAdmin(post("/api/usuarios").content(json.writeValueAsString(datos)))
                .andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @MethodSource("passwordsInvalidasDeCreacion")
    void creacionValidaLaPasswordSinExponerla(String password) throws Exception {
        var datos = datosCreacion();
        datos.put("password", password);
        comoAdmin(post("/api/usuarios").content(json.writeValueAsString(datos)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("ERROR_VALIDACION"))
                .andExpect(jsonPath("$.trace").doesNotExist());
        assertThat(usuarios.existsByEmail(grupo + ".nuevo@example.test")).isFalse();
    }

    static Stream<String> passwordsInvalidasDeCreacion() {
        return Stream.of("", "   ", "1234567", "a".repeat(73), "é".repeat(37));
    }

    @ParameterizedTest
    @MethodSource("passwordsValidasDeCreacion")
    void creacionConservaLaPasswordYPermiteElLimiteDeBcrypt(String password) throws Exception {
        var datos = datosCreacion();
        datos.put("password", password);
        comoAdmin(post("/api/usuarios").content(json.writeValueAsString(datos))).andExpect(status().isCreated());
        String hash = usuarios.findByEmail(grupo + ".nuevo@example.test").orElseThrow().getPasswordHash();
        assertThat(encoder.matches(password, hash)).isTrue();
        login(grupo + ".nuevo@example.test", password).andExpect(status().isOk());
    }

    static Stream<String> passwordsValidasDeCreacion() {
        return Stream.of("  Clave-con-espacios-2026  ", "é".repeat(36));
    }

    private Map<String, Object> datosCreacion() {
        String correo = grupo + ".nuevo@example.test";
        correosNuevos.add(correo);
        return new HashMap<>(Map.of("nombre", "Carlos", "apellido", "Pérez", "usuario", grupo + ".nuevo",
                "correo", correo, "celular", "999888777", "password", PASSWORD, "rol", "CLIENTE"));
    }

    private ResultActions cambiarRol(Long id, RolNombre rol) throws Exception {
        return comoAdmin(patch("/api/usuarios/{id}/rol", id)
                .content(json.writeValueAsString(new CambiarRolUsuarioRequest(rol))));
    }

    private Long crearUsuario(String nombre, String apellido, String sufijo, RolNombre rol, EstadoUsuario estado) {
        Long id = new TransactionTemplate(transactions).execute(status -> usuarios.saveAndFlush(new Usuario(
                nombre + " " + grupo, apellido + " " + grupo, grupo + "." + sufijo, "999888777",
                grupo + "." + sufijo + "@example.test",
                hashOriginal, estado, roles.findByNombre(rol).orElseThrow())).getId());
        ids.add(id);
        return id;
    }

    private ResultActions comoAdmin(MockHttpServletRequestBuilder request) throws Exception {
        return enviar(request, adminToken);
    }

    private ResultActions enviar(MockHttpServletRequestBuilder request, String token) throws Exception {
        return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON));
    }

    private ResultActions cambiarEstado(Long id, boolean activo) throws Exception {
        return comoAdmin(patch("/api/usuarios/{id}/estado", id)
                .content(json.writeValueAsString(new CambiarEstadoUsuarioRequest(activo))));
    }

    private Cookie csrf() throws Exception {
        return mvc.perform(get("/api/auth/csrf")).andReturn().getResponse().getCookie("XSRF-TOKEN");
    }

    private ResultActions loginCliente() throws Exception {
        return login(grupo + ".cliente@example.test");
    }

    private ResultActions login(String correo) throws Exception {
        return login(correo, PASSWORD);
    }

    private ResultActions login(String correo, String password) throws Exception {
        Cookie csrf = csrf();
        return mvc.perform(post("/api/auth/login").cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(new LoginRequest(correo, password)))
                .with(request -> { request.setRemoteAddr(grupo); return request; }));
    }

    private List<MockHttpServletRequestBuilder> solicitudesAdministracion() throws Exception {
        return List.of(get("/api/usuarios"), get("/api/usuarios/{id}", clienteId),
                patch("/api/usuarios/{id}/estado", clienteId).content("{\"activo\":false}"),
                put("/api/usuarios/{id}", clienteId).content(json.writeValueAsString(datosCliente())),
                patch("/api/usuarios/{id}/rol", clienteId).content("{\"rol\":\"EMPLEADO\"}"),
                post("/api/usuarios").content(json.writeValueAsString(datosCreacion())));
    }
}
