package com.visiontour.usuario.service;

import com.visiontour.auth.dto.UsuarioResponse;
import com.visiontour.usuario.dto.ActualizarPerfilRequest;
import com.visiontour.usuario.dto.ActualizarUsuarioAdminRequest;
import com.visiontour.usuario.dto.CambiarPasswordRequest;
import com.visiontour.usuario.dto.CambiarRolUsuarioRequest;
import com.visiontour.usuario.dto.CrearUsuarioAdminRequest;
import com.visiontour.usuario.dto.UsuarioDetalleResponse;
import com.visiontour.usuario.dto.UsuariosPaginaResponse;

public interface UsuarioService {
    UsuarioDetalleResponse crearUsuario(CrearUsuarioAdminRequest request);

    UsuarioResponse actualizarPerfil(Long usuarioId, ActualizarPerfilRequest request, String remoteAddress);

    void cambiarPassword(Long usuarioId, CambiarPasswordRequest request, String remoteAddress);

    UsuariosPaginaResponse listarUsuarios(int page, int size, String buscar, Boolean activo);

    UsuarioDetalleResponse obtenerDetalle(Long id);

    UsuarioDetalleResponse cambiarEstado(Long administradorId, Long usuarioId, Boolean activo);

    UsuarioDetalleResponse actualizarUsuario(Long usuarioId, ActualizarUsuarioAdminRequest request);

    UsuarioDetalleResponse cambiarRol(Long administradorId, Long usuarioId, CambiarRolUsuarioRequest request);
}
