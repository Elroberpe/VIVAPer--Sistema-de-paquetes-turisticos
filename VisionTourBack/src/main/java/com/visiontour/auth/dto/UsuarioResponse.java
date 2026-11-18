package com.visiontour.auth.dto;

import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.RolNombre;

public record UsuarioResponse(Long id, String nombre, String apellido, String usuario, String celular,
        String email, RolNombre rol) {
    public static UsuarioResponse from(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getNombre(), usuario.getApellido(),
                usuario.getUsuario(), usuario.getCelular(), usuario.getEmail(), usuario.getRol().getNombre());
    }
}
