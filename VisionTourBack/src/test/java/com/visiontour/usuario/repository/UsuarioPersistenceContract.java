package com.visiontour.usuario.repository;

import java.time.LocalDateTime;
import java.util.UUID;
import javax.sql.DataSource;

import com.visiontour.usuario.entity.Rol;
import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.EstadoUsuario;
import com.visiontour.usuario.enums.RolNombre;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Transactional
abstract class UsuarioPersistenceContract {

    private static final String TEST_PASSWORD_HASH =
            "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private Flyway flyway;

    @Test
    void migratesAndSeedsExactlyTheThreePredefinedRoles() {
        assertThat(rolRepository.findAll()).extracting(Rol::getNombre)
                .containsExactlyInAnyOrder(RolNombre.ADMIN, RolNombre.EMPLEADO, RolNombre.CLIENTE);
        for (RolNombre nombre : RolNombre.values()) {
            assertThat(rolRepository.existsByNombre(nombre)).isTrue();
            assertThat(rolRepository.findByNombre(nombre)).isPresent();
        }
        assertThat(flyway.info().applied()).hasSize(4);
    }

    @Test
    void seedCanBeExecutedAgainWithoutDuplicatingRoles() {
        ResourceDatabasePopulator seed = new ResourceDatabasePopulator(
                new ClassPathResource("db/migration/V2__insertar_roles_iniciales.sql"));
        seed.execute(dataSource);
        seed.execute(dataSource);

        assertThat(rolRepository.count()).isEqualTo(3L);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(DISTINCT nombre) FROM roles", Long.class))
                .isEqualTo(3L);
    }

    @Test
    void persistsTheUserAndLoadsItsRoleLazily() {
        String email = uniqueEmail();
        Usuario usuario = usuarioRepository.saveAndFlush(newUser(email));
        Long id = usuario.getId();
        entityManager.clear();

        Usuario persisted = usuarioRepository.findByEmail(email).orElseThrow();
        assertThat(persisted.getId()).isEqualTo(id);
        assertThat(persisted.getNombre()).isEqualTo("Carlos");
        assertThat(persisted.getApellido()).isEqualTo("Prueba");
        assertThat(persisted.getUsuario()).isEqualTo(usuario.getUsuario());
        assertThat(persisted.getCelular()).isEqualTo("999888777");
        assertThat(persisted.getEstado()).isEqualTo(EstadoUsuario.PENDIENTE);
        assertThat(persisted.getPasswordHash()).isEqualTo(TEST_PASSWORD_HASH);
        assertThat(persisted.getFechaCreacion()).isNotNull();
        assertThat(usuarioRepository.existsByEmail(email)).isTrue();
        assertThat(entityManager.getEntityManagerFactory().getPersistenceUnitUtil().isLoaded(persisted, "rol"))
                .isFalse();
        assertThat(persisted.getRol().getNombre()).isEqualTo(RolNombre.CLIENTE);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT estado FROM usuarios WHERE id = ?", String.class, id)).isEqualTo("PENDIENTE");
    }

    @Test
    void returnsEmptyWhenTheEmailDoesNotExist() {
        String email = uniqueEmail();
        assertThat(usuarioRepository.findByEmail(email)).isEmpty();
        assertThat(usuarioRepository.existsByEmail(email)).isFalse();
    }

    @Test
    void databaseRejectsDuplicateUserEmails() {
        String email = uniqueEmail();
        usuarioRepository.saveAndFlush(newUser(email));

        assertThatThrownBy(() -> usuarioRepository.saveAndFlush(newUser(email)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRejectsDuplicateUsernames() {
        Usuario primero = usuarioRepository.saveAndFlush(newUser(uniqueEmail()));
        Usuario segundo = newUser(uniqueEmail());
        segundo.setUsuario(primero.getUsuario());
        assertThatThrownBy(() -> usuarioRepository.saveAndFlush(segundo))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRequiresUsername() {
        Usuario usuario = newUser(uniqueEmail());
        usuario.setUsuario(null);
        assertThatThrownBy(() -> usuarioRepository.saveAndFlush(usuario))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRequiresPhone() {
        Usuario usuario = newUser(uniqueEmail());
        usuario.setCelular(null);
        assertThatThrownBy(() -> usuarioRepository.saveAndFlush(usuario))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRejectsDuplicateRoleNames() {
        assertThatThrownBy(() -> rolRepository.saveAndFlush(new Rol(RolNombre.CLIENTE)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRejectsUsersWithoutARole() {
        assertThatThrownBy(() -> insertUserWithRole(null))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRejectsUsersWithAnUnknownRole() {
        assertThatThrownBy(() -> insertUserWithRole(-1L))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseProtectsRolesThatAreUsedByUsers() {
        Usuario usuario = usuarioRepository.saveAndFlush(newUser(uniqueEmail()));

        assertThatThrownBy(() -> jdbcTemplate.update("DELETE FROM roles WHERE id = ?", usuario.getRol().getId()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void deletingAUserDoesNotDeleteItsRole() {
        Usuario usuario = usuarioRepository.saveAndFlush(newUser(uniqueEmail()));
        Long rolId = usuario.getRol().getId();
        usuarioRepository.delete(usuario);
        usuarioRepository.flush();
        entityManager.clear();

        assertThat(rolRepository.findById(rolId)).isPresent();
    }

    @Test
    void creationDateDoesNotChangeWhenTheUserIsUpdated() {
        Usuario usuario = usuarioRepository.saveAndFlush(newUser(uniqueEmail()));
        Long id = usuario.getId();
        entityManager.clear();
        Usuario persisted = usuarioRepository.findById(id).orElseThrow();
        LocalDateTime createdAt = persisted.getFechaCreacion();
        persisted.setEstado(EstadoUsuario.ACTIVO);
        usuarioRepository.flush();
        entityManager.clear();

        Usuario updated = usuarioRepository.findById(id).orElseThrow();
        assertThat(updated.getFechaCreacion()).isEqualTo(createdAt);
        assertThat(updated.getEstado()).isEqualTo(EstadoUsuario.ACTIVO);
    }

    @Test
    void passwordHashIsExcludedFromJsonAndToString() {
        Usuario usuario = newUser(uniqueEmail());
        String json = jsonMapper.writeValueAsString(usuario);

        assertThat(json).doesNotContain("passwordHash", "password_hash", TEST_PASSWORD_HASH);
        assertThat(usuario.toString()).doesNotContain(TEST_PASSWORD_HASH);
    }

    private Usuario newUser(String email) {
        Rol cliente = rolRepository.findByNombre(RolNombre.CLIENTE).orElseThrow();
        return new Usuario(
                "Carlos", "Prueba", "u" + UUID.randomUUID().toString().substring(0, 20), "999888777",
                email, TEST_PASSWORD_HASH, EstadoUsuario.PENDIENTE, cliente);
    }

    private void insertUserWithRole(Long rolId) {
        jdbcTemplate.update("""
                INSERT INTO usuarios (nombre, apellido, usuario, celular, email, password_hash, estado, rol_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, "Carlos", "Prueba", "sql_" + UUID.randomUUID().toString().substring(0, 8), "999888777", uniqueEmail(), TEST_PASSWORD_HASH, "PENDIENTE", rolId);
    }

    private String uniqueEmail() {
        return "test-" + UUID.randomUUID() + "@example.test";
    }
}
