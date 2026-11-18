package com.visiontour.usuario.dto;

import java.util.List;

public record UsuariosPaginaResponse(
        List<UsuarioResumenResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages) {
}
