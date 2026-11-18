package com.visiontour.usuario.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.visiontour.usuario.enums.RolNombre;
import jakarta.validation.constraints.NotNull;

public record CambiarRolUsuarioRequest(
        @NotNull(message = "Debe indicar el rol del usuario.") RolNombre rol) {

    @JsonAnySetter
    public void rechazarCampo(String campo, Object valor) {
        throw new IllegalArgumentException("La solicitud contiene campos no permitidos.");
    }
}
