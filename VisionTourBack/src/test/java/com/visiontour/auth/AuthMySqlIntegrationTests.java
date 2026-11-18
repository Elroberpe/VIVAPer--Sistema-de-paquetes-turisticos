package com.visiontour.auth;

import org.springframework.boot.test.context.SpringBootTest;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "VIVAAIR_MYSQL_TESTS", matches = "true")
class AuthMySqlIntegrationTests extends AuthIntegrationContract {}
