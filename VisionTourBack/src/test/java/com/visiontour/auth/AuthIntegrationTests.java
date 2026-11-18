package com.visiontour.auth;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class AuthIntegrationTests extends AuthIntegrationContract {}
