package com.visiontour.destino.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DestinoEstadoRequest {

    @NotNull(message = "El estado es obligatorio")
    private Boolean estado;
}