package com.visiontour.config;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

import com.visiontour.security.SecurityErrorHandler;
import com.visiontour.auth.AuthProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpMethod;
import com.visiontour.security.jwt.DatabaseJwtAuthenticationConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.cors.DefaultCorsProcessor;

@Configuration(proxyBeanMethods = false)
@EnableWebSecurity
@EnableMethodSecurity
@EnableConfigurationProperties(AuthProperties.class)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
            SecurityErrorHandler errorHandler,
            DatabaseJwtAuthenticationConverter jwtConverter, CookieCsrfTokenRepository csrfTokens) throws Exception {
        return http
                .oauth2ResourceServer(resource -> resource
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtConverter))
                        .authenticationEntryPoint(errorHandler).accessDeniedHandler(errorHandler))
                .cors(Customizer.withDefaults())
                // Las rutas de autenticación usan cookies y requieren protección CSRF.
                .csrf(csrf -> csrf.spa().csrfTokenRepository(csrfTokens)
                        .requireCsrfProtectionMatcher(PathPatternRequestMatcher.withDefaults()
                                .matcher(HttpMethod.POST, "/api/auth/**")))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint(errorHandler)
                        .accessDeniedHandler(errorHandler))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/admin/proveedores", "/api/admin/proveedores/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/registro", "/api/auth/login",
                                "/api/auth/refresh", "/api/auth/logout").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/public/destinos", "/api/public/destinos/**").permitAll()
                        .requestMatchers("/api/usuarios/me", "/api/usuarios/me/**")
                                .hasAnyRole("ADMIN", "EMPLEADO", "CLIENTE")
                        .requestMatchers("/api/usuarios", "/api/usuarios/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/servicios", "/api/admin/servicios/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/destinos", "/api/admin/destinos/**").hasRole("ADMIN")
                        .anyRequest().hasAnyRole("ADMIN", "EMPLEADO", "CLIENTE"))
                .build();
    }

    @Bean
    public CookieCsrfTokenRepository csrfTokenRepository() {
        var tokens = CookieCsrfTokenRepository.withHttpOnlyFalse();
        tokens.setCookieCustomizer(cookie -> cookie.sameSite("Lax"));
        return tokens;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(UserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.security.cors.allowed-origins:}") String allowedOrigins) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
                .map(String::trim).filter(origin -> !origin.isEmpty()).toList());
        configuration.setAllowedMethods(List.of("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-XSRF-TOKEN"));
        configuration.setAllowCredentials(true);
        if (configuration.getAllowedOrigins().contains("*")) {
            throw new IllegalArgumentException("CORS requiere orígenes explícitos.");
        }

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public CorsFilter corsFilter(CorsConfigurationSource corsConfigurationSource,
            SecurityErrorHandler errorHandler) {
        CorsFilter filter = new CorsFilter(corsConfigurationSource);
        filter.setCorsProcessor(new DefaultCorsProcessor() {
            @Override
            protected void rejectRequest(ServerHttpResponse response) throws IOException {
                errorHandler.write(((ServletServerHttpResponse) response).getServletResponse(),
                        HttpStatus.FORBIDDEN, "ACCESO_DENEGADO", "No tienes permisos para realizar esta operación.");
            }
        });
        return filter;
    }

    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilterRegistration(CorsFilter corsFilter) {
        FilterRegistrationBean<CorsFilter> registration = new FilterRegistrationBean<>(corsFilter);
        registration.setEnabled(false);
        return registration;
    }
}