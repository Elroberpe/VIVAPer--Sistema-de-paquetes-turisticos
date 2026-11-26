package com.visiontour.servicio.dto;

import jakarta.validation.constraints.NotNull;

public record ServicioEstadoRequest(
        @NotNull(message = "El estado es obligatorio.")
        Boolean estado
) {}