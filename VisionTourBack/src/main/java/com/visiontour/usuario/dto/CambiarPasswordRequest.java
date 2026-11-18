package com.visiontour.usuario.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.visiontour.auth.validation.BcryptPassword;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CambiarPasswordRequest(
        @NotBlank String passwordActual,
        @NotBlank @Size(min = 8, message = "La contraseña nueva debe tener al menos 8 caracteres.")
        @BcryptPassword String passwordNueva) {

    @JsonAnySetter
    public void rechazarCampo(String campo, Object valor) {
        throw new IllegalArgumentException("La solicitud contiene campos no permitidos.");
    }

    @Override
    public String toString() {
        return "CambiarPasswordRequest[datos protegidos]";
    }
}
