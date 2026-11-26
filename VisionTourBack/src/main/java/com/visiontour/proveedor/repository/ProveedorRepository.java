package com.visiontour.proveedor.repository;

import com.visiontour.proveedor.entity.Proveedor;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;

public interface ProveedorRepository extends JpaRepository<Proveedor, Long>, JpaSpecificationExecutor<Proveedor> {
    boolean existsByRuc(String ruc);
    boolean existsByRucAndIdProveedorNot(String ruc, Long idProveedor);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Proveedor p where p.idProveedor = :id")
    Optional<Proveedor> buscarParaActualizar(Long id);
}
