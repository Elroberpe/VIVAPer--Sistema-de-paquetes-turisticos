package com.visiontour.usuario.dto;

import java.time.LocalDateTime;

import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.EstadoUsuario;

public record UsuarioDetalleResponse(
        Long id,
        String usuario,
        String nombre,
        String apellido,
        String correo,
        String celular,
        String rol,
        boolean activo,
        LocalDateTime fechaRegistro) {
    public static UsuarioDetalleResponse from(Usuario usuario) {
        return new UsuarioDetalleResponse(usuario.getId(), usuario.getUsuario(), usuario.getNombre(),
                usuario.getApellido(), usuario.getEmail(), usuario.getCelular(), usuario.getRol().getNombre().name(),
                usuario.getEstado() == EstadoUsuario.ACTIVO, usuario.getFechaCreacion());
    }
}
