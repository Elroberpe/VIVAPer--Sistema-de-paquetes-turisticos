CREATE TABLE destinos (
    id_destino BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(150) NOT NULL,
    subtitulo VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    imagen_url VARCHAR(500) NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_destinos PRIMARY KEY (id_destino),
    CONSTRAINT uq_destino_nombre_ubicacion UNIQUE (nombre, ubicacion)
) ENGINE = InnoDB;
