package com.visiontour.auth.dto;

import java.util.Locale;

import com.visiontour.auth.validation.BcryptPassword;
import jakarta.validation.constraints.*;

public record RegistroRequest(
        @NotBlank @Size(max = 100) String nombre,
        @NotBlank @Size(max = 100) String apellido,
        @NotBlank(message = "El usuario es obligatorio.")
        @Pattern(regexp = "[a-z0-9._-]{3,30}", message = "El usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo.") String usuario,
        @NotBlank(message = "El celular es obligatorio.")
        @Pattern(regexp = "[+]?[0-9]{9,15}", message = "El celular debe tener entre 9 y 15 dígitos y puede comenzar con +.") String celular,
        @NotBlank @Email @Size(max = 150) String email,
        @NotBlank @Size(min = 8, max = 72) @BcryptPassword String password) {
    public RegistroRequest {
        if (email != null) email = email.strip();
        if (usuario != null) usuario = usuario.strip().toLowerCase(Locale.ROOT);
        if (celular != null) celular = celular.strip();
    }
    @Override public String toString() { return "RegistroRequest[datos protegidos]"; }
}
