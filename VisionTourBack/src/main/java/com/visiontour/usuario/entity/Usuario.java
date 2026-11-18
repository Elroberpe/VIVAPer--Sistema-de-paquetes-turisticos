package com.visiontour.usuario.entity;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.visiontour.usuario.enums.EstadoUsuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "usuarios")
public class Usuario {

    @Id
    @Setter(AccessLevel.NONE)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombre;

    private String apellido;

    @Column(nullable = false, length = 30)
    private String usuario;

    @Column(nullable = false, length = 16)
    private String celular;

    private String email;

    @JsonIgnore
    @Column(name = "password_hash")
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    private EstadoUsuario estado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rol_id")
    private Rol rol;

    @Column(name = "fecha_creacion", updatable = false)
    @Setter(AccessLevel.NONE)
    private LocalDateTime fechaCreacion;

    public Usuario(String nombre, String apellido, String usuario, String celular, String email,
            String passwordHash, EstadoUsuario estado, Rol rol) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.usuario = usuario;
        this.celular = celular;
        this.email = email;
        this.passwordHash = passwordHash;
        this.estado = estado;
        this.rol = rol;
    }

    @PrePersist
    protected void asignarFechaCreacion() {
        fechaCreacion = LocalDateTime.now();
    }
}
