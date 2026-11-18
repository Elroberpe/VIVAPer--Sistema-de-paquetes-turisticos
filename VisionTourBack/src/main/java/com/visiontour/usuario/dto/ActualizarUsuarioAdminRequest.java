package com.visiontour.usuario.dto;

import java.util.Locale;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ActualizarUsuarioAdminRequest(
        @NotBlank @Size(max = 100) String nombre,
        @NotBlank @Size(max = 100) String apellido,
        @NotBlank
        @Pattern(regexp = "[a-z0-9._-]{3,30}", message = "El usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo.")
        String usuario,
        @NotBlank @Email @Size(max = 150) String correo,
        @Pattern(regexp = "[+]?[0-9]{9,15}", message = "El celular debe tener entre 9 y 15 dígitos y puede comenzar con +.")
        String celular) {

    public ActualizarUsuarioAdminRequest {
        if (nombre != null) nombre = nombre.strip();
        if (apellido != null) apellido = apellido.strip();
        if (usuario != null) usuario = usuario.strip().toLowerCase(Locale.ROOT);
        if (correo != null) correo = correo.strip().toLowerCase(Locale.ROOT);
        if (celular != null) celular = celular.strip();
    }

    @JsonAnySetter
    public void rechazarCampo(String campo, Object valor) {
        throw new IllegalArgumentException("La solicitud contiene campos no permitidos.");
    }
}
