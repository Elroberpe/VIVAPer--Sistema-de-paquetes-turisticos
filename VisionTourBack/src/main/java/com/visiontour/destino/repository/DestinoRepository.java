package com.visiontour.destino.repository;

import com.visiontour.destino.entity.Destino;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DestinoRepository extends JpaRepository<Destino, Long> {

    boolean existsByNombreIgnoreCaseAndUbicacionIgnoreCase(
            String nombre,
            String ubicacion
    );

    boolean existsByNombreIgnoreCaseAndUbicacionIgnoreCaseAndIdDestinoNot(
            String nombre,
            String ubicacion,
            Long idDestino
    );

    @Query("""
            SELECT d FROM Destino d
            WHERE (:nombre IS NULL OR :nombre = ''
                   OR LOWER(d.nombre) LIKE LOWER(CONCAT('%', :nombre, '%')))
              AND (:estado IS NULL OR d.estado = :estado)
            ORDER BY d.idDestino ASC
            """)
    List<Destino> buscarConFiltros(
            @Param("nombre") String nombre,
            @Param("estado") Boolean estado
    );
    Optional<Destino> findByIdDestinoAndEstadoTrue(Long idDestino);
}