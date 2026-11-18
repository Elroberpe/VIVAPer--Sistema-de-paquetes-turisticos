package com.visiontour.auth.service;

import java.time.Instant;

import com.visiontour.auth.dto.AuthResponse;
import com.visiontour.auth.dto.LoginRequest;
import com.visiontour.auth.dto.RegistroRequest;
import com.visiontour.auth.dto.UsuarioResponse;

public interface AuthService {
    void registrar(RegistroRequest request);
    Sesion login(LoginRequest request, String remoteAddress);
    Sesion refresh(String token);
    void logout(String token);
    UsuarioResponse perfil(Long usuarioId);

    record Sesion(AuthResponse respuesta, String refreshToken, Instant expira) {
        @Override
        public String toString() {
            return "Sesion[datos protegidos]";
        }
    }
}
