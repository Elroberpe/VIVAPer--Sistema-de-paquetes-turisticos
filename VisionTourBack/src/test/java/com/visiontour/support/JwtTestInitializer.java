package com.visiontour.support;

import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.boot.test.util.TestPropertyValues;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;

public class JwtTestInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {
    private static final String SECRET = generate();

    private static String generate() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    @Override
    public void initialize(ConfigurableApplicationContext context) {
        TestPropertyValues.of("app.security.jwt.issuer=vivaair", "app.security.jwt.audience=vivaair-api",
                "spring.jpa.properties.hibernate.session_factory.statement_inspector=" + SqlCapture.class.getName(),
                "app.security.jwt.secret=" + SECRET).applyTo(context);
    }

    public static class SqlCapture implements org.hibernate.resource.jdbc.spi.StatementInspector {
        private static final ThreadLocal<java.util.List<String>> STATEMENTS = new ThreadLocal<>();

        @Override
        public String inspect(String sql) {
            var statements = STATEMENTS.get();
            if (statements != null) statements.add(sql);
            return sql;
        }

        public static java.util.List<String> capture(Runnable operation) {
            var statements = new java.util.ArrayList<String>();
            STATEMENTS.set(statements);
            try {
                operation.run();
                return java.util.List.copyOf(statements);
            } finally {
                STATEMENTS.remove();
            }
        }
    }
}
