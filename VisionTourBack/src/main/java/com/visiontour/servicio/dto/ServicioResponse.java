package com.visiontour.servicio.dto;

public record ServicioResponse(
        Long idServicio,
        String nombre,
        String descripcion,
        Boolean estado
) {}