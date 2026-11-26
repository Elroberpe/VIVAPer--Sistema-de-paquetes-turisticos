package com.visiontour.proveedor.dto;

import jakarta.validation.constraints.NotNull;

public record CambiarEstadoProveedorRequest(
        @NotNull
        Boolean estado
) {}
