package com.visiontour.proveedor.entity;

import com.visiontour.servicio.entity.Servicio;
import jakarta.persistence.*;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "proveedores")
@Getter
@Setter
@NoArgsConstructor
public class Proveedor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_proveedor")
    private Long idProveedor;
    @Column(nullable = false, length = 11)
    private String ruc;
    @Column(nullable = false, length = 150)
    private String nombre;
    @Column(nullable = false, length = 150)
    private String encargado;
    @Column(length = 150)
    private String email;
    @Column(nullable = false, length = 20)
    private String telefono;
    @Column(nullable = false)
    private boolean estado = true;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "proveedor_servicio",
        joinColumns = @JoinColumn(name = "id_proveedor"),
        inverseJoinColumns = @JoinColumn(name = "id_servicio"))
    private Set<Servicio> servicios = new LinkedHashSet<>();
}
