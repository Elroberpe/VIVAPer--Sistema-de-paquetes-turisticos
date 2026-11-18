package com.visiontour.usuario.service;

import java.util.Optional;
import java.util.List;
import java.util.stream.Stream;

import com.visiontour.auth.service.LoginAttemptLimiter;
import com.visiontour.usuario.dto.ActualizarPerfilRequest;
import com.visiontour.usuario.dto.ActualizarUsuarioAdminRequest;
import com.visiontour.usuario.dto.CambiarPasswordRequest;
import com.visiontour.usuario.dto.CambiarRolUsuarioRequest;
import com.visiontour.usuario.dto.CrearUsuarioAdminRequest;
import com.visiontour.usuario.entity.Rol;
import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.EstadoUsuario;
import com.visiontour.usuario.enums.RolNombre;
import com.visiontour.usuario.exception.PasswordActualIncorrectaException;
import com.visiontour.usuario.exception.PasswordReutilizadaException;
import com.visiontour.usuario.exception.DatosUsuarioDuplicadosException;
import com.visiontour.usuario.exception.UsuarioNoEncontradoException;
import com.visiontour.usuario.exception.RolNoValidoException;
import com.visiontour.usuario.exception.UltimoAdministradorActivoException;
import com.visiontour.usuario.repository.RolRepository;
import com.visiontour.usuario.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTests {
    @Mock private UsuarioRepository usuarios;
    @Mock private RolRepository roles;
    @Mock private PasswordEncoder encoder;
    @Mock private LoginAttemptLimiter attempts;
    private UsuarioService service;
    private Usuario usuario;

    @BeforeEach
    void setup() {
        service = new UsuarioServiceImpl(usuarios, roles, encoder, attempts);
        Rol rol = mock(Rol.class);
        usuario = new Usuario("Carlos", "Pérez", "usuario.prueba", "999888777",
                "perfil@example.test", "hash-anterior", EstadoUsuario.ACTIVO, rol);
    }

    @Test
    void actualizaSoloElCampoSolicitado() {
        when(usuarios.findForUpdateById(1L)).thenReturn(Optional.of(usuario));
        when(usuario.getRol().getNombre()).thenReturn(RolNombre.CLIENTE);
        var request = new ActualizarPerfilRequest();
        request.setNombre("  Carlos Alberto  ");
        var response = service.actualizarPerfil(1L, request, "ip");
        assertThat(response.nombre()).isEqualTo("Carlos Alberto");
        assertThat(response.apellido()).isEqualTo("Pérez");
        assertThat(response.email()).isEqualTo("perfil@example.test");
        assertThat(usuario.getPasswordHash()).isEqualTo("hash-anterior");
        verifyNoInteractions(encoder, attempts);
    }

    @Test
    void verificaLaClaveActualAntesDeCodificarLaNueva() {
        when(usuarios.findForUpdateById(1L)).thenReturn(Optional.of(usuario));
        when(encoder.matches("actual", "hash-anterior")).thenReturn(true);
        when(encoder.encode("nueva-segura")).thenReturn("hash-nuevo");
        service.cambiarPassword(1L, new CambiarPasswordRequest("actual", "nueva-segura"), "ip");
        var order = inOrder(attempts, encoder);
        order.verify(attempts).check("perfil@example.test", "ip");
        order.verify(encoder).matches("actual", "hash-anterior");
        order.verify(encoder).matches("nueva-segura", "hash-anterior");
        order.verify(encoder).encode("nueva-segura");
        assertThat(usuario.getPasswordHash()).isEqualTo("hash-nuevo");
    }

    @Test
    void unaPasswordIncorrectaNoGeneraNiGuardaUnHash() {
        when(usuarios.findForUpdateById(1L)).thenReturn(Optional.of(usuario));
        assertThatThrownBy(() -> service.cambiarPassword(1L, new CambiarPasswordRequest("incorrecta", "nueva-segura"), "ip"))
                .isInstanceOf(PasswordActualIncorrectaException.class);
        verify(encoder, never()).encode(anyString());
        assertThat(usuario.getPasswordHash()).isEqualTo("hash-anterior");
    }

    @Test
    void reutilizarLaPasswordNoGeneraNiGuardaUnHash() {
        when(usuarios.findForUpdateById(1L)).thenReturn(Optional.of(usuario));
        when(encoder.matches("actual", "hash-anterior")).thenReturn(true);
        assertThatThrownBy(() -> service.cambiarPassword(1L, new CambiarPasswordRequest("actual", "actual"), "ip"))
                .isInstanceOf(PasswordReutilizadaException.class);
        verify(encoder, never()).encode(anyString());
        assertThat(usuario.getPasswordHash()).isEqualTo("hash-anterior");
    }

    @Test
    void excesoDeIntentosEvitaElTrabajoDeBcrypt() {
        when(usuarios.findForUpdateById(1L)).thenReturn(Optional.of(usuario));
        doThrow(new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS)).when(attempts).check("perfil@example.test", "ip");
        assertThatThrownBy(() -> service.cambiarPassword(1L, new CambiarPasswordRequest("actual", "nueva-segura"), "ip"))
                .isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(encoder);
        assertThat(usuario.getPasswordHash()).isEqualTo("hash-anterior");
    }

    @ParameterizedTest
    @EnumSource(value = EstadoUsuario.class, names = {"PENDIENTE", "BLOQUEADO"})
    void rechazaUsuariosNoActivos(EstadoUsuario estado) {
        usuario.setEstado(estado);
        when(usuarios.findForUpdateById(1L)).thenReturn(Optional.of(usuario));
        assertThatThrownBy(() -> service.cambiarPassword(1L, new CambiarPasswordRequest("actual", "nueva-segura"), "ip"))
                .isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> service.actualizarPerfil(1L, new ActualizarPerfilRequest(), "ip"))
                .isInstanceOf(BadCredentialsException.class);
        verifyNoInteractions(encoder, attempts);
    }

    @Test
    void rechazaUsuariosInexistentes() {
        when(usuarios.findForUpdateById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.cambiarPassword(1L, new CambiarPasswordRequest("actual", "nueva-segura"), "ip"))
                .isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> service.actualizarPerfil(1L, new ActualizarPerfilRequest(), "ip"))
                .isInstanceOf(BadCredentialsException.class);
        verifyNoInteractions(encoder, attempts);
    }

    @Test
    void elDtoNoExponePasswordsAlConvertirseEnTexto() {
        assertThat(new CambiarPasswordRequest("actual-secreta", "nueva-secreta").toString())
                .doesNotContain("actual-secreta", "nueva-secreta");
        var request = new ActualizarPerfilRequest();
        request.setPasswordActual("actual-secreta");
        assertThat(request.toString()).doesNotContain("actual-secreta");
    }

    @Test
    void compruebaPasswordYDuplicadosAntesDeCambiarLosDatos() {
        when(usuarios.findForUpdateById(1L)).thenReturn(Optional.of(usuario));
        when(encoder.matches("actual", "hash-anterior")).thenReturn(true);
        when(usuarios.existsByEmailAndIdNot("nuevo@example.test", 1L)).thenReturn(true);
        var request = new ActualizarPerfilRequest();
        request.setNombre("Modificado");
        request.setEmail("nuevo@example.test");
        request.setPasswordActual("actual");

        assertThatThrownBy(() -> service.actualizarPerfil(1L, request, "ip"))
                .isInstanceOf(DatosUsuarioDuplicadosException.class);
        var order = inOrder(attempts, encoder, usuarios);
        order.verify(usuarios).findForUpdateById(1L);
        order.verify(attempts).check("perfil@example.test", "ip");
        order.verify(encoder).matches("actual", "hash-anterior");
        order.verify(usuarios).existsByEmailAndIdNot("nuevo@example.test", 1L);
        assertThat(usuario.getNombre()).isEqualTo("Carlos");
        assertThat(usuario.getEmail()).isEqualTo("perfil@example.test");
    }

    @Test
    void limitaIntentosAntesDeComprobarLaPasswordParaElCorreo() {
        when(usuarios.findForUpdateById(1L)).thenReturn(Optional.of(usuario));
        doThrow(new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS)).when(attempts).check("perfil@example.test", "ip");
        var request = new ActualizarPerfilRequest();
        request.setEmail("nuevo@example.test");
        request.setPasswordActual("actual");
        assertThatThrownBy(() -> service.actualizarPerfil(1L, request, "ip"))
                .isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(encoder);
        assertThat(usuario.getEmail()).isEqualTo("perfil@example.test");
    }

    @Test
    void listadoNormalizaLaBusquedaYConservaLaPaginacion() {
        var pageable = PageRequest.of(1, 2, Sort.by("id").ascending());
        when(usuarios.buscarUsuarios("pérez", false, pageable))
                .thenReturn(new PageImpl<>(List.of(usuario, usuario), pageable, 5));
        when(usuario.getRol().getNombre()).thenReturn(RolNombre.CLIENTE);

        var response = service.listarUsuarios(1, 2, "  PÉREZ  ", false);

        assertThat(response.page()).isEqualTo(1);
        assertThat(response.size()).isEqualTo(2);
        assertThat(response.totalElements()).isEqualTo(5);
        assertThat(response.totalPages()).isEqualTo(3);
        assertThat(response.content()).extracting(item -> item.correo()).containsOnly("perfil@example.test");
        verify(usuarios).buscarUsuarios("pérez", false, pageable);
    }

    @Test
    void detalleInexistenteLanzaUnaExcepcionEspecifica() {
        when(usuarios.findWithRolById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.obtenerDetalle(99L)).isInstanceOf(UsuarioNoEncontradoException.class);
    }

    @Test
    void noPermiteLaAutodesactivacion() {
        assertThatThrownBy(() -> service.cambiarEstado(1L, 1L, false)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(usuarios, encoder, attempts);
    }

    @Test
    void cambioDeEstadoDeUnUsuarioInexistenteLanza404() {
        permitirCambiosAdministrativos();
        when(usuarios.findForUpdateById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.cambiarEstado(1L, 99L, false))
                .isInstanceOf(UsuarioNoEncontradoException.class);
    }

    @ParameterizedTest
    @MethodSource("cambiosDeEstado")
    void cambiaElEstadoSinModificarOtrosDatos(EstadoUsuario anterior, boolean activo, EstadoUsuario esperado) {
        permitirCambiosAdministrativos();
        usuario.setEstado(anterior);
        when(usuarios.findForUpdateById(2L)).thenReturn(Optional.of(usuario));
        when(usuario.getRol().getNombre()).thenReturn(RolNombre.CLIENTE);

        var response = service.cambiarEstado(1L, 2L, activo);

        assertThat(usuario.getEstado()).isEqualTo(esperado);
        assertThat(response.activo()).isEqualTo(activo);
        assertThat(response.correo()).isEqualTo("perfil@example.test");
        assertThat(response.rol()).isEqualTo("CLIENTE");
        assertThat(usuario.getPasswordHash()).isEqualTo("hash-anterior");
        verify(usuarios, never()).delete(any(Usuario.class));
        verifyNoInteractions(encoder, attempts);
    }

    static Stream<Arguments> cambiosDeEstado() {
        return Stream.of(
                Arguments.of(EstadoUsuario.ACTIVO, false, EstadoUsuario.BLOQUEADO),
                Arguments.of(EstadoUsuario.BLOQUEADO, true, EstadoUsuario.ACTIVO),
                Arguments.of(EstadoUsuario.PENDIENTE, true, EstadoUsuario.ACTIVO),
                Arguments.of(EstadoUsuario.ACTIVO, true, EstadoUsuario.ACTIVO),
                Arguments.of(EstadoUsuario.BLOQUEADO, false, EstadoUsuario.BLOQUEADO),
                Arguments.of(EstadoUsuario.PENDIENTE, false, EstadoUsuario.PENDIENTE));
    }

    @Test
    void adminActualizaDatosNormalizadosSinCambiarRolEstadoNiPassword() {
        when(usuarios.findForUpdateById(2L)).thenReturn(Optional.of(usuario));
        when(usuario.getRol().getNombre()).thenReturn(RolNombre.CLIENTE);
        var request = new ActualizarUsuarioAdminRequest("  Carlos Alberto  ", "  Pérez Gómez  ",
                "  Carlos.Nuevo  ", "  NUEVO@EXAMPLE.TEST  ", "  +51999888777  ");

        var response = service.actualizarUsuario(2L, request);

        assertThat(response.nombre()).isEqualTo("Carlos Alberto");
        assertThat(response.apellido()).isEqualTo("Pérez Gómez");
        assertThat(response.usuario()).isEqualTo("carlos.nuevo");
        assertThat(response.correo()).isEqualTo("nuevo@example.test");
        assertThat(response.celular()).isEqualTo("+51999888777");
        assertThat(response.rol()).isEqualTo("CLIENTE");
        assertThat(response.activo()).isTrue();
        assertThat(usuario.getPasswordHash()).isEqualTo("hash-anterior");
        verifyNoInteractions(roles, encoder, attempts);
    }

    @Test
    void correoOUsuarioDuplicadosNoModificanLosDatos() {
        when(usuarios.findForUpdateById(2L)).thenReturn(Optional.of(usuario));
        var request = new ActualizarUsuarioAdminRequest("Nuevo", "Apellido", "nuevo.usuario", "nuevo@example.test", null);
        when(usuarios.existsByEmailAndIdNot("nuevo@example.test", 2L)).thenReturn(true);
        assertThatThrownBy(() -> service.actualizarUsuario(2L, request))
                .isInstanceOf(DatosUsuarioDuplicadosException.class);

        when(usuarios.existsByEmailAndIdNot("nuevo@example.test", 2L)).thenReturn(false);
        when(usuarios.existsByUsuarioAndIdNot("nuevo.usuario", 2L)).thenReturn(true);
        assertThatThrownBy(() -> service.actualizarUsuario(2L, request))
                .isInstanceOf(DatosUsuarioDuplicadosException.class);
        assertThat(usuario.getNombre()).isEqualTo("Carlos");
        assertThat(usuario.getEmail()).isEqualTo("perfil@example.test");
        assertThat(usuario.getUsuario()).isEqualTo("usuario.prueba");
    }

    @Test
    void adminNoPuedeQuitarseSuRol() {
        assertThatThrownBy(() -> service.cambiarRol(1L, 1L, new CambiarRolUsuarioRequest(RolNombre.CLIENTE)))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(usuarios, roles, encoder, attempts);
    }

    @Test
    void rolNoRegistradoEnLaBaseDevuelveUnaExcepcionEspecifica() {
        permitirCambiosAdministrativos();
        when(usuarios.findForUpdateById(2L)).thenReturn(Optional.of(usuario));
        when(roles.findByNombre(RolNombre.EMPLEADO)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.cambiarRol(1L, 2L, new CambiarRolUsuarioRequest(RolNombre.EMPLEADO)))
                .isInstanceOf(RolNoValidoException.class);
    }

    @Test
    void cambiaElRolCuandoQuedaOtroAdministradorActivo() {
        permitirCambiosAdministrativos();
        when(usuarios.findForUpdateById(2L)).thenReturn(Optional.of(usuario));
        when(usuario.getRol().getNombre()).thenReturn(RolNombre.ADMIN);
        when(usuarios.countByRolNombreAndEstado(RolNombre.ADMIN, EstadoUsuario.ACTIVO)).thenReturn(2L);
        when(roles.findByNombre(RolNombre.CLIENTE)).thenReturn(Optional.of(new Rol(RolNombre.CLIENTE)));

        var response = service.cambiarRol(1L, 2L, new CambiarRolUsuarioRequest(RolNombre.CLIENTE));

        assertThat(response.rol()).isEqualTo("CLIENTE");
        assertThat(response.activo()).isTrue();
        assertThat(response.correo()).isEqualTo("perfil@example.test");
        assertThat(usuario.getPasswordHash()).isEqualTo("hash-anterior");
    }

    @Test
    void noPermiteRetirarElRolDelUltimoAdministradorActivo() {
        permitirCambiosAdministrativos();
        when(usuarios.findForUpdateById(2L)).thenReturn(Optional.of(usuario));
        when(usuario.getRol().getNombre()).thenReturn(RolNombre.ADMIN);
        when(usuarios.countByRolNombreAndEstado(RolNombre.ADMIN, EstadoUsuario.ACTIVO)).thenReturn(1L);
        when(roles.findByNombre(RolNombre.CLIENTE)).thenReturn(Optional.of(new Rol(RolNombre.CLIENTE)));

        assertThatThrownBy(() -> service.cambiarRol(1L, 2L, new CambiarRolUsuarioRequest(RolNombre.CLIENTE)))
                .isInstanceOf(UltimoAdministradorActivoException.class);
        assertThat(usuario.getRol().getNombre()).isEqualTo(RolNombre.ADMIN);
    }

    @Test
    void noPermiteDesactivarAlUltimoAdministradorActivo() {
        permitirCambiosAdministrativos();
        when(usuarios.findForUpdateById(2L)).thenReturn(Optional.of(usuario));
        when(usuario.getRol().getNombre()).thenReturn(RolNombre.ADMIN);
        when(usuarios.countByRolNombreAndEstado(RolNombre.ADMIN, EstadoUsuario.ACTIVO)).thenReturn(1L);

        assertThatThrownBy(() -> service.cambiarEstado(1L, 2L, false))
                .isInstanceOf(UltimoAdministradorActivoException.class);
        assertThat(usuario.getEstado()).isEqualTo(EstadoUsuario.ACTIVO);
    }

    private void permitirCambiosAdministrativos() {
        when(roles.findForUpdateByNombre(RolNombre.ADMIN)).thenReturn(Optional.of(new Rol(RolNombre.ADMIN)));
    }

    @Test
    void creaUsuarioActivoConElRolSolicitadoYPasswordCodificada() {
        when(roles.findByNombre(RolNombre.EMPLEADO)).thenReturn(Optional.of(new Rol(RolNombre.EMPLEADO)));
        when(encoder.encode("  clave-segura  ")).thenReturn("hash-nuevo");
        when(usuarios.saveAndFlush(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));
        var request = new CrearUsuarioAdminRequest("  Carlos  ", "  Pérez  ", "  Carlos.Nuevo  ",
                "  NUEVO@EXAMPLE.TEST  ", "  +51999888777  ", "  clave-segura  ", RolNombre.EMPLEADO);

        var response = service.crearUsuario(request);

        var captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarios).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getPasswordHash()).isEqualTo("hash-nuevo");
        assertThat(captor.getValue().getEstado()).isEqualTo(EstadoUsuario.ACTIVO);
        assertThat(response.usuario()).isEqualTo("carlos.nuevo");
        assertThat(response.correo()).isEqualTo("nuevo@example.test");
        assertThat(response.celular()).isEqualTo("+51999888777");
        assertThat(response.rol()).isEqualTo("EMPLEADO");
        assertThat(request.toString()).doesNotContain("clave-segura");
    }

    @ParameterizedTest
    @ValueSource(strings = {"correo", "usuario"})
    void noCreaUsuariosDuplicadosNiCodificaSuPassword(String campo) {
        var request = new CrearUsuarioAdminRequest("Carlos", "Pérez", "nuevo.usuario", "nuevo@example.test",
                "999888777", "clave-segura", RolNombre.CLIENTE);
        if (campo.equals("correo")) when(usuarios.existsByEmail(request.correo())).thenReturn(true);
        else when(usuarios.existsByUsuario(request.usuario())).thenReturn(true);

        assertThatThrownBy(() -> service.crearUsuario(request)).isInstanceOf(DatosUsuarioDuplicadosException.class);

        verify(usuarios, never()).saveAndFlush(any(Usuario.class));
        verifyNoInteractions(roles, encoder, attempts);
    }

    @Test
    void noCreaUsuariosConUnRolQueNoExisteEnLaBase() {
        when(roles.findByNombre(RolNombre.EMPLEADO)).thenReturn(Optional.empty());
        var request = new CrearUsuarioAdminRequest("Carlos", "Pérez", "nuevo.usuario", "nuevo@example.test",
                "999888777", "clave-segura", RolNombre.EMPLEADO);

        assertThatThrownBy(() -> service.crearUsuario(request)).isInstanceOf(RolNoValidoException.class);

        verify(usuarios, never()).saveAndFlush(any(Usuario.class));
        verifyNoInteractions(encoder, attempts);
    }
}
