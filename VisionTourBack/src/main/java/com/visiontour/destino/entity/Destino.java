package com.visiontour.destino.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "destinos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Destino {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_destino")
    private Long idDestino;

    @Column(name = "nombre", length = 100, nullable = false)
    private String nombre;

    @Column(name = "ubicacion", length = 150, nullable = false)
    private String ubicacion;

    @Column(name = "subtitulo", length = 100, nullable = false)
    private String subtitulo;

    @Column(name = "descripcion", nullable = false, columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "imagen_url", length = 500)
    private String imagenUrl;

    @Column(name = "estado", nullable = false)
    private Boolean estado;
}
