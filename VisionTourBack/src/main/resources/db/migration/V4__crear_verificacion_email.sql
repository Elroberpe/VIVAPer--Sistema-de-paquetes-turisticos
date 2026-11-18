CREATE TABLE email_verification_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    fecha_expiracion DATETIME(6) NOT NULL,
    utilizado BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT pk_email_verification_tokens PRIMARY KEY (id),
    CONSTRAINT uk_email_verification_token_hash UNIQUE (token_hash),
    CONSTRAINT uk_email_verification_usuario UNIQUE (usuario_id),
    CONSTRAINT fk_email_verification_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE = InnoDB;
