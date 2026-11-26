package com.visiontour.servicio.repository;

import com.visiontour.servicio.entity.Servicio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ServicioRepository extends JpaRepository<Servicio, Long> {

    boolean existsByNombreIgnoreCase(String nombre);

    boolean existsByNombreIgnoreCaseAndIdServicioNot(String nombre, Long idServicio);

    @Query("""
            SELECT s FROM Servicio s
            WHERE (:nombre IS NULL OR :nombre = '' OR LOWER(s.nombre) LIKE LOWER(CONCAT('%', :nombre, '%')))
              AND (:estado IS NULL OR s.estado = :estado)
            ORDER BY s.idServicio ASC
            """)
    List<Servicio> buscarConFiltros(@Param("nombre") String nombre, @Param("estado") Boolean estado);
}