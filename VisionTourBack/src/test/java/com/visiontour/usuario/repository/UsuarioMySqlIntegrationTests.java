package com.visiontour.usuario.repository;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "VIVAAIR_MYSQL_TESTS", matches = "true")
class UsuarioMySqlIntegrationTests extends UsuarioPersistenceContract {
}
