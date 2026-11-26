package com.visiontour.servicio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ServicioRequest(
        @NotBlank(message = "El nombre del servicio es obligatorio.")
        @Size(max = 100, message = "El nombre no puede superar 100 caracteres.")
        String nombre,

        @Size(max = 255, message = "La descripción no puede superar 255 caracteres.")
        String descripcion
) {}