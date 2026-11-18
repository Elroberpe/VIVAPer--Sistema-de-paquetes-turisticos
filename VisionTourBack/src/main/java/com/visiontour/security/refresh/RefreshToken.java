package com.visiontour.security.refresh;

import java.time.Instant;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.visiontour.usuario.entity.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "refresh_tokens")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @JsonIgnore
    @Column(name = "token_hash")
    private String tokenHash;

    @JdbcTypeCode(SqlTypes.TIMESTAMP)
    @Column(name = "fecha_expiracion")
    private Instant fechaExpiracion;

    private boolean revocado;

    // Columna obligatoria de V3. Se conserva sin implementar familias de tokens.
    @Column(name = "familia_id")
    private String familiaId;

    public RefreshToken(Usuario usuario, String tokenHash, Instant fechaExpiracion) {
        this.usuario = usuario;
        this.tokenHash = tokenHash;
        this.fechaExpiracion = fechaExpiracion;
        this.familiaId = UUID.randomUUID().toString();
    }

    public void rotar(String nuevoHash) {
        tokenHash = nuevoHash;
    }

    public void revocar() {
        revocado = true;
    }
}
