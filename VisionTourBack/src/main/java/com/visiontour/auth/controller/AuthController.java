package com.visiontour.auth.controller;

import java.util.Map;
import com.visiontour.auth.dto.AuthResponse;
import com.visiontour.auth.dto.LoginRequest;
import com.visiontour.auth.dto.RegistroRequest;
import com.visiontour.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;
    private final SessionCookie cookies;

    @GetMapping("/csrf")
    public ResponseEntity<Void> csrf(CsrfToken token) {
        token.getToken();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/registro")
    public ResponseEntity<Map<String, String>> registrar(@Valid @RequestBody RegistroRequest request) {
        auth.registrar(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("mensaje", "Cliente registrado correctamente."));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest body, HttpServletRequest request,
            HttpServletResponse response) {
        var sesion = auth.login(body, request.getRemoteAddr());
        cookies.guardar(request, response, sesion.refreshToken(), sesion.expira());
        return sesion.respuesta();
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@CookieValue(name = SessionCookie.NAME, required = false) String token,
            HttpServletRequest request, HttpServletResponse response) {
        try {
            var sesion = auth.refresh(token);
            cookies.guardar(request, response, sesion.refreshToken(), sesion.expira());
            return sesion.respuesta();
        } catch (AuthenticationException exception) {
            cookies.borrar(request, response);
            throw exception;
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = SessionCookie.NAME, required = false) String token,
            HttpServletRequest request, HttpServletResponse response) {
        auth.logout(token);
        cookies.borrar(request, response);
        return ResponseEntity.noContent().build();
    }
}
