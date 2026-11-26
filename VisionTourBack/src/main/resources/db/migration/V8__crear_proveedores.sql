CREATE TABLE proveedores (
    id_proveedor BIGINT NOT NULL AUTO_INCREMENT,
    ruc VARCHAR(11) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    encargado VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(20) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_proveedores PRIMARY KEY (id_proveedor),
    CONSTRAINT uq_proveedores_ruc UNIQUE (ruc),
    CONSTRAINT chk_proveedores_ruc_formato CHECK (ruc REGEXP '^[0-9]{11}$')
) ENGINE = InnoDB;

CREATE INDEX idx_proveedores_nombre ON proveedores (nombre);
CREATE TABLE proveedor_servicio (
    id_proveedor BIGINT NOT NULL,
    id_servicio BIGINT NOT NULL,
    CONSTRAINT pk_proveedor_servicio PRIMARY KEY (id_proveedor, id_servicio),
    CONSTRAINT fk_ps_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor),
    CONSTRAINT fk_ps_servicio FOREIGN KEY (id_servicio) REFERENCES servicios(id_servicio)
) ENGINE = InnoDB;
CREATE INDEX idx_ps_servicio ON proveedor_servicio (id_servicio);
