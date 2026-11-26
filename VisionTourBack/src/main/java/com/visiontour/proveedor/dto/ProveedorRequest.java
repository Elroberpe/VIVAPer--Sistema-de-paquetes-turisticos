package com.visiontour.proveedor.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ProveedorRequest(
        @NotBlank
        @Pattern(regexp = "[0-9]{11}", message = "El RUC debe contener exactamente 11 dígitos.")
        String ruc,

        @NotBlank
        @Size(max = 150)
        String nombre,

        @NotBlank
        @Size(max = 150)
        String encargado,

        @Email
        @Size(max = 150)
        String email,

        @NotBlank
        @Size(max = 20)
        String telefono,

        List<@NotNull @Positive Long> serviciosIds
) {
    public ProveedorRequest {
        nombre = normalizar(nombre);
        encargado = normalizar(encargado);
        email = normalizar(email);
        if (email != null && email.isEmpty()) {
            email = null;
        }
        telefono = normalizar(telefono);
        serviciosIds = serviciosIds == null ? List.of() : serviciosIds;
    }

    private static String normalizar(String valor) {
        return valor == null ? null : valor.strip();
    }
}
