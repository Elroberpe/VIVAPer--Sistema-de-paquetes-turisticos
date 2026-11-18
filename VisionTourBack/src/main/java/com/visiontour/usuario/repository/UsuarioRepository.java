package com.visiontour.usuario.repository;

import java.util.Optional;

import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.EstadoUsuario;
import com.visiontour.usuario.enums.RolNombre;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    @EntityGraph(attributePaths = "rol")
    @Query("""
            SELECT u FROM Usuario u
            WHERE (:buscar IS NULL
                OR LOWER(u.nombre) LIKE CONCAT('%', :buscar, '%') ESCAPE '!'
                OR LOWER(u.apellido) LIKE CONCAT('%', :buscar, '%') ESCAPE '!'
                OR LOWER(u.email) LIKE CONCAT('%', :buscar, '%') ESCAPE '!')
            AND (:activo IS NULL
                OR (:activo = true AND u.estado = com.visiontour.usuario.enums.EstadoUsuario.ACTIVO)
                OR (:activo = false AND u.estado <> com.visiontour.usuario.enums.EstadoUsuario.ACTIVO))
            """)
    Page<Usuario> buscarUsuarios(@Param("buscar") String buscar, @Param("activo") Boolean activo, Pageable pageable);

    Optional<Usuario> findByEmail(String email);

    @EntityGraph(attributePaths = "rol")
    Optional<Usuario> findWithRolByEmail(String email);

    @EntityGraph(attributePaths = "rol")
    Optional<Usuario> findWithRolById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Usuario> findForUpdateById(Long id);

    boolean existsByEmail(String email);

    boolean existsByUsuario(String usuario);

    boolean existsByEmailAndIdNot(String email, Long id);

    boolean existsByUsuarioAndIdNot(String usuario, Long id);

    long countByRolNombreAndEstado(RolNombre rol, EstadoUsuario estado);
}
