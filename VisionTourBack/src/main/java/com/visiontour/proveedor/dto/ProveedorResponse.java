package com.visiontour.proveedor.dto;

import java.util.List;

public record ProveedorResponse(
        Long idProveedor,
        String ruc,
        String nombre,
        String encargado,
        String email,
        String telefono,
        boolean estado,
        List<ServicioResumen> servicios
) {
    public record ServicioResumen(
            Long idServicio,
            String nombre
    ) {}
}
