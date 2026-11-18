package com.visiontour.usuario.controller;

import com.visiontour.auth.dto.UsuarioResponse;
import com.visiontour.auth.service.AuthService;
import com.visiontour.usuario.dto.ActualizarPerfilRequest;
import com.visiontour.usuario.dto.ActualizarUsuarioAdminRequest;
import com.visiontour.usuario.dto.CambiarEstadoUsuarioRequest;
import com.visiontour.usuario.dto.CambiarPasswordRequest;
import com.visiontour.usuario.dto.CambiarRolUsuarioRequest;
import com.visiontour.usuario.dto.CrearUsuarioAdminRequest;
import com.visiontour.usuario.dto.UsuarioDetalleResponse;
import com.visiontour.usuario.dto.UsuariosPaginaResponse;
import com.visiontour.usuario.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {
    private final AuthService auth;
    private final UsuarioService usuarios;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UsuarioDetalleResponse> crearUsuario(@Valid @RequestBody CrearUsuarioAdminRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(usuarios.crearUsuario(request));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public UsuariosPaginaResponse listarUsuarios(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size,
            @RequestParam(required = false) @Size(max = 100) String buscar,
            @RequestParam(required = false) Boolean activo) {
        return usuarios.listarUsuarios(page, size, buscar, activo);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UsuarioDetalleResponse obtenerDetalle(@PathVariable @Positive Long id) {
        return usuarios.obtenerDetalle(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UsuarioDetalleResponse actualizarUsuario(@PathVariable @Positive Long id,
            @Valid @RequestBody ActualizarUsuarioAdminRequest request) {
        return usuarios.actualizarUsuario(id, request);
    }

    @PatchMapping("/{id}/rol")
    @PreAuthorize("hasRole('ADMIN')")
    public UsuarioDetalleResponse cambiarRol(@AuthenticationPrincipal Jwt jwt, @PathVariable @Positive Long id,
            @Valid @RequestBody CambiarRolUsuarioRequest request) {
        return usuarios.cambiarRol(Long.valueOf(jwt.getSubject()), id, request);
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasRole('ADMIN')")
    public UsuarioDetalleResponse cambiarEstado(@AuthenticationPrincipal Jwt jwt,
            @PathVariable @Positive Long id, @Valid @RequestBody CambiarEstadoUsuarioRequest request) {
        return usuarios.cambiarEstado(Long.valueOf(jwt.getSubject()), id, request.activo());
    }

    @GetMapping("/me")
    public UsuarioResponse me(@AuthenticationPrincipal Jwt jwt) {
        return auth.perfil(Long.valueOf(jwt.getSubject()));
    }

    @PatchMapping("/me")
    public UsuarioResponse actualizarPerfil(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ActualizarPerfilRequest body, HttpServletRequest request) {
        return usuarios.actualizarPerfil(Long.valueOf(jwt.getSubject()), body, request.getRemoteAddr());
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> cambiarPassword(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CambiarPasswordRequest body, HttpServletRequest request) {
        usuarios.cambiarPassword(Long.valueOf(jwt.getSubject()), body, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
