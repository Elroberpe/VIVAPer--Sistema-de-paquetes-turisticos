CREATE TABLE refresh_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    fecha_expiracion DATETIME(6) NOT NULL,
    revocado BOOLEAN NOT NULL DEFAULT FALSE,
    familia_id VARCHAR(36) NOT NULL,
    CONSTRAINT pk_refresh_tokens PRIMARY KEY (id),
    CONSTRAINT uk_refresh_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE = InnoDB;

CREATE INDEX idx_refresh_tokens_usuario ON refresh_tokens (usuario_id);
CREATE INDEX idx_refresh_tokens_familia ON refresh_tokens (familia_id);
CREATE INDEX idx_refresh_tokens_expiracion ON refresh_tokens (fecha_expiracion);
