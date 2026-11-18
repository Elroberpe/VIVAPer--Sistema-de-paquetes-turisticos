package com.visiontour.auth.service;

import java.util.Locale;
import com.visiontour.auth.dto.AuthResponse;
import com.visiontour.auth.dto.LoginRequest;
import com.visiontour.auth.dto.RegistroRequest;
import com.visiontour.auth.dto.UsuarioResponse;
import com.visiontour.security.jwt.AccessTokenService;
import com.visiontour.security.refresh.RefreshTokenService;
import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.EstadoUsuario;
import com.visiontour.usuario.enums.RolNombre;
import com.visiontour.usuario.dto.CrearUsuarioAdminRequest;
import com.visiontour.usuario.service.UsuarioService;
import com.visiontour.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final UsuarioRepository usuarios;
    private final UsuarioService usuarioService;
    private final AuthenticationManager authenticationManager;
    private final AccessTokenService accessTokens;
    private final RefreshTokenService refreshTokens;
    private final LoginAttemptLimiter attempts;

    @Override
    @Transactional
    public void registrar(RegistroRequest request) {
        // El registro público siempre asigna CLIENTE, sin aceptar un rol enviado por el usuario.
        usuarioService.crearUsuario(new CrearUsuarioAdminRequest(request.nombre(), request.apellido(),
                request.usuario(), request.email(), request.celular(), request.password(), RolNombre.CLIENTE));
    }

    @Override
    @Transactional
    public Sesion login(LoginRequest request, String remoteAddress) {
        String email = normalize(request.email());
        attempts.check(email, remoteAddress);
        try {
            authenticationManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(email, request.password()));
        } catch (IllegalArgumentException exception) {
            throw new BadCredentialsException("Credenciales inválidas.");
        }
        Usuario usuario = usuarios.findWithRolByEmail(email).orElseThrow(() -> new BadCredentialsException("Credenciales inválidas."));
        return crearSesion(refreshTokens.emitir(usuario));
    }

    @Override
    @Transactional
    public Sesion refresh(String token) {
        return crearSesion(refreshTokens.rotar(token));
    }

    @Override
    @Transactional
    public void logout(String token) {
        refreshTokens.revocar(token);
    }

    private Sesion crearSesion(RefreshTokenService.TokenGenerado refresh) {
        String access = accessTokens.generar(refresh.usuario().getId());
        var respuesta = new AuthResponse(access, "Bearer", 900, UsuarioResponse.from(refresh.usuario()));
        return new Sesion(respuesta, refresh.valor(), refresh.expira());
    }

    @Override
    @Transactional(readOnly = true)
    public UsuarioResponse perfil(Long usuarioId) {
        return usuarios.findWithRolById(usuarioId).filter(usuario -> usuario.getEstado() == EstadoUsuario.ACTIVO)
                .map(UsuarioResponse::from).orElseThrow(() -> new BadCredentialsException("Credenciales inválidas."));
    }

    private String normalize(String email) { return email.strip().toLowerCase(Locale.ROOT); }
}
