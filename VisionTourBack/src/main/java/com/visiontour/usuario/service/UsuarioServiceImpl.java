package com.visiontour.usuario.service;

import java.util.Locale;

import com.visiontour.auth.dto.UsuarioResponse;
import com.visiontour.auth.service.LoginAttemptLimiter;
import com.visiontour.usuario.dto.ActualizarPerfilRequest;
import com.visiontour.usuario.dto.ActualizarUsuarioAdminRequest;
import com.visiontour.usuario.dto.CambiarPasswordRequest;
import com.visiontour.usuario.dto.CambiarRolUsuarioRequest;
import com.visiontour.usuario.dto.CrearUsuarioAdminRequest;
import com.visiontour.usuario.dto.UsuarioDetalleResponse;
import com.visiontour.usuario.dto.UsuarioResumenResponse;
import com.visiontour.usuario.dto.UsuariosPaginaResponse;
import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.EstadoUsuario;
import com.visiontour.usuario.enums.RolNombre;
import com.visiontour.usuario.exception.DatosUsuarioDuplicadosException;
import com.visiontour.usuario.exception.PasswordActualIncorrectaException;
import com.visiontour.usuario.exception.PasswordReutilizadaException;
import com.visiontour.usuario.exception.UsuarioNoEncontradoException;
import com.visiontour.usuario.exception.RolNoValidoException;
import com.visiontour.usuario.exception.UltimoAdministradorActivoException;
import com.visiontour.usuario.repository.RolRepository;
import com.visiontour.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UsuarioServiceImpl implements UsuarioService {
    private final UsuarioRepository usuarios;
    private final RolRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptLimiter attempts;

    @Override
    @Transactional
    public UsuarioDetalleResponse crearUsuario(CrearUsuarioAdminRequest request) {
        if (usuarios.existsByEmail(request.correo())) {
            throw new DatosUsuarioDuplicadosException("Este correo ya está registrado.");
        }
        if (usuarios.existsByUsuario(request.usuario())) {
            throw new DatosUsuarioDuplicadosException("Este nombre de usuario ya está registrado.");
        }
        var rol = roles.findByNombre(request.rol()).orElseThrow(RolNoValidoException::new);
        var usuario = new Usuario(request.nombre(), request.apellido(), request.usuario(), request.celular(),
                request.correo(), passwordEncoder.encode(request.password()), EstadoUsuario.ACTIVO, rol);
        return UsuarioDetalleResponse.from(usuarios.saveAndFlush(usuario));
    }

    @Override
    @Transactional(readOnly = true)
    public UsuariosPaginaResponse listarUsuarios(int page, int size, String buscar, Boolean activo) {
        var pageable = PageRequest.of(page, size, Sort.by("id").ascending());
        var resultado = usuarios.buscarUsuarios(normalizarBusqueda(buscar), activo, pageable)
                .map(UsuarioResumenResponse::from);
        return new UsuariosPaginaResponse(resultado.getContent(), resultado.getNumber(), resultado.getSize(),
                resultado.getTotalElements(), resultado.getTotalPages());
    }

    @Override
    @Transactional(readOnly = true)
    public UsuarioDetalleResponse obtenerDetalle(Long id) {
        return usuarios.findWithRolById(id).map(UsuarioDetalleResponse::from)
                .orElseThrow(UsuarioNoEncontradoException::new);
    }

    @Override
    @Transactional
    public UsuarioDetalleResponse cambiarEstado(Long administradorId, Long usuarioId, Boolean activo) {
        if (administradorId.equals(usuarioId) && !activo) {
            throw new AccessDeniedException("No puede desactivar su propia cuenta.");
        }
        bloquearCambiosAdministrativos();
        Usuario usuario = usuarios.findForUpdateById(usuarioId).orElseThrow(UsuarioNoEncontradoException::new);
        boolean activoActual = usuario.getEstado() == EstadoUsuario.ACTIVO;
        if (activoActual != activo) {
            if (!activo) comprobarQueQuedaUnAdministrador(usuario);
            usuario.setEstado(activo ? EstadoUsuario.ACTIVO : EstadoUsuario.BLOQUEADO);
        }
        return UsuarioDetalleResponse.from(usuario);
    }

    @Override
    @Transactional
    public UsuarioDetalleResponse actualizarUsuario(Long usuarioId, ActualizarUsuarioAdminRequest request) {
        Usuario usuario = usuarios.findForUpdateById(usuarioId).orElseThrow(UsuarioNoEncontradoException::new);
        if (usuarios.existsByEmailAndIdNot(request.correo(), usuarioId)) {
            throw new DatosUsuarioDuplicadosException("Este correo ya está registrado.");
        }
        if (usuarios.existsByUsuarioAndIdNot(request.usuario(), usuarioId)) {
            throw new DatosUsuarioDuplicadosException("Este nombre de usuario ya está registrado.");
        }
        usuario.setNombre(request.nombre());
        usuario.setApellido(request.apellido());
        usuario.setUsuario(request.usuario());
        usuario.setEmail(request.correo());
        if (request.celular() != null) usuario.setCelular(request.celular());
        return UsuarioDetalleResponse.from(usuario);
    }

    @Override
    @Transactional
    public UsuarioDetalleResponse cambiarRol(Long administradorId, Long usuarioId, CambiarRolUsuarioRequest request) {
        if (administradorId.equals(usuarioId) && request.rol() != RolNombre.ADMIN) {
            throw new AccessDeniedException("No puede quitarse su propio rol ADMIN.");
        }
        bloquearCambiosAdministrativos();
        Usuario usuario = usuarios.findForUpdateById(usuarioId).orElseThrow(UsuarioNoEncontradoException::new);
        var nuevoRol = roles.findByNombre(request.rol()).orElseThrow(RolNoValidoException::new);
        if (usuario.getRol().getNombre() != request.rol()) {
            if (request.rol() != RolNombre.ADMIN) comprobarQueQuedaUnAdministrador(usuario);
            usuario.setRol(nuevoRol);
        }
        return UsuarioDetalleResponse.from(usuario);
    }

    private void bloquearCambiosAdministrativos() {
        // Todos los cambios de rol y estado toman el mismo bloqueo antes de consultar al usuario.
        // Así dos solicitudes simultáneas no pueden retirar a los últimos administradores activos.
        roles.findForUpdateByNombre(RolNombre.ADMIN)
                .orElseThrow(() -> new IllegalStateException("No existe el rol ADMIN."));
    }

    private void comprobarQueQuedaUnAdministrador(Usuario usuario) {
        if (usuario.getEstado() == EstadoUsuario.ACTIVO && usuario.getRol().getNombre() == RolNombre.ADMIN
                && usuarios.countByRolNombreAndEstado(RolNombre.ADMIN, EstadoUsuario.ACTIVO) <= 1) {
            throw new UltimoAdministradorActivoException();
        }
    }

    private String normalizarBusqueda(String buscar) {
        if (buscar == null || buscar.isBlank()) return null;
        // Estos caracteres se buscan como texto, sin actuar como comodines de SQL.
        return buscar.strip().toLowerCase(Locale.ROOT)
                .replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }

    @Override
    @Transactional
    public UsuarioResponse actualizarPerfil(Long usuarioId, ActualizarPerfilRequest request, String remoteAddress) {
        Usuario usuario = obtenerParaActualizar(usuarioId);
        if (request.getEmail() != null) {
            attempts.check(usuario.getEmail(), remoteAddress);
            if (request.getPasswordActual() == null
                    || !coincidePassword(request.getPasswordActual(), usuario.getPasswordHash())) {
                throw new PasswordActualIncorrectaException();
            }
            if (usuarios.existsByEmailAndIdNot(request.getEmail(), usuarioId)) {
                throw new DatosUsuarioDuplicadosException("Este correo ya está registrado.");
            }
        }
        if (request.getUsuario() != null && usuarios.existsByUsuarioAndIdNot(request.getUsuario(), usuarioId)) {
            throw new DatosUsuarioDuplicadosException("Este nombre de usuario ya está registrado.");
        }
        if (request.getNombre() != null) usuario.setNombre(request.getNombre());
        if (request.getApellido() != null) usuario.setApellido(request.getApellido());
        if (request.getUsuario() != null) usuario.setUsuario(request.getUsuario());
        if (request.getCelular() != null) usuario.setCelular(request.getCelular());
        if (request.getEmail() != null) usuario.setEmail(request.getEmail());
        return UsuarioResponse.from(usuario);
    }

    @Override
    @Transactional
    public void cambiarPassword(Long usuarioId, CambiarPasswordRequest request, String remoteAddress) {
        Usuario usuario = obtenerParaActualizar(usuarioId);
        attempts.check(usuario.getEmail(), remoteAddress);
        if (!coincidePassword(request.passwordActual(), usuario.getPasswordHash())) {
            throw new PasswordActualIncorrectaException();
        }
        if (passwordEncoder.matches(request.passwordNueva(), usuario.getPasswordHash())) {
            throw new PasswordReutilizadaException();
        }
        usuario.setPasswordHash(passwordEncoder.encode(request.passwordNueva()));
    }

    private Usuario obtenerParaActualizar(Long usuarioId) {
        return usuarios.findForUpdateById(usuarioId)
                .filter(usuario -> usuario.getEstado() == EstadoUsuario.ACTIVO)
                .orElseThrow(() -> new BadCredentialsException("Credenciales inválidas."));
    }

    private boolean coincidePassword(String password, String hash) {
        try {
            return passwordEncoder.matches(password, hash);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }
}
