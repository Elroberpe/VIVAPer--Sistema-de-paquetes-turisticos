package com.visiontour.proveedor.dto;

public record ProveedorListaResponse(
        Long idProveedor,
        String nombre,
        String encargado,
        String email,
        String telefono,
        boolean estado
) {}
