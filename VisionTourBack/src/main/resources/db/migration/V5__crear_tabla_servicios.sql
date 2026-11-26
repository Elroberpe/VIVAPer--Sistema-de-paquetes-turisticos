CREATE TABLE servicios (
    id_servicio BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_servicios PRIMARY KEY (id_servicio),
    CONSTRAINT uq_servicios_nombre UNIQUE (nombre)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;