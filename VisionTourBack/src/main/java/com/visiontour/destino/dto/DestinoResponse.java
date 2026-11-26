package com.visiontour.destino.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DestinoResponse {

    private Long idDestino;
    private String nombre;
    private String ubicacion;
    private String subtitulo;
    private String descripcion;
    private String imagenUrl;
    private Boolean estado;
}