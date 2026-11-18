package com.visiontour.usuario.dto;

import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.EstadoUsuario;

public record UsuarioResumenResponse(
        Long id,
        String nombre,
        String apellido,
        String usuario,
        String celular,
        String correo,
        String rol,
        boolean activo) {
    public static UsuarioResumenResponse from(Usuario usuario) {
        return new UsuarioResumenResponse(usuario.getId(), usuario.getNombre(), usuario.getApellido(),
                usuario.getUsuario(), usuario.getCelular(), usuario.getEmail(), usuario.getRol().getNombre().name(),
                usuario.getEstado() == EstadoUsuario.ACTIVO);
    }
}
