package com.visiontour.proveedor.dto;

import java.util.List;

public record ProveedoresPaginaResponse(
        List<ProveedorListaResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {}
