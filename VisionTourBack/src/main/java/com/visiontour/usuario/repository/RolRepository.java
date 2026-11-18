package com.visiontour.usuario.repository;

import java.util.Optional;

import com.visiontour.usuario.entity.Rol;
import com.visiontour.usuario.enums.RolNombre;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface RolRepository extends JpaRepository<Rol, Long> {

    Optional<Rol> findByNombre(RolNombre nombre);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Rol> findForUpdateByNombre(RolNombre nombre);

    boolean existsByNombre(RolNombre nombre);
}
