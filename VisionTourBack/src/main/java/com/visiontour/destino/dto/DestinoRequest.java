package com.visiontour.destino.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DestinoRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
    private String nombre;

    @NotBlank(message = "La ubicación es obligatoria")
    @Size(max = 150, message = "La ubicación no puede superar los 150 caracteres")
    private String ubicacion;

    @NotBlank(message = "El subtítulo es obligatorio")
    @Size(max = 100, message = "El subtítulo no puede superar los 100 caracteres")
    private String subtitulo;

    @NotBlank(message = "La descripción es obligatoria")
    private String descripcion;

    @Size(max = 500, message = "La URL de imagen no puede superar los 500 caracteres")
    private String imagenUrl;
}