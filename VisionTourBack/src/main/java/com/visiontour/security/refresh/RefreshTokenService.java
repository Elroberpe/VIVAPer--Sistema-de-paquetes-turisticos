package com.visiontour.security.refresh;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.EstadoUsuario;
import com.visiontour.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {
    private static final Duration DURACION_SESION = Duration.ofDays(7);
    private final RefreshTokenRepository tokens;
    private final UsuarioRepository usuarios;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public TokenGenerado emitir(Usuario usuario) {
        if (usuario.getEstado() != EstadoUsuario.ACTIVO) {
            throw tokenInvalido();
        }
        String valor = generarValor();
        Instant expira = clock.instant().plus(DURACION_SESION);
        tokens.save(new RefreshToken(usuario, hash(valor), expira));
        return new TokenGenerado(usuario, valor, expira);
    }

    @Transactional
    public TokenGenerado rotar(String valor) {
        if (!tieneFormatoValido(valor)) {
            throw tokenInvalido();
        }
        RefreshToken token = tokens.findByTokenHash(hash(valor)).orElseThrow(this::tokenInvalido);
        if (token.isRevocado() || !token.getFechaExpiracion().isAfter(clock.instant())) {
            throw tokenInvalido();
        }
        Usuario usuario = usuarios.findWithRolById(token.getUsuario().getId())
                .filter(value -> value.getEstado() == EstadoUsuario.ACTIVO)
                .orElseThrow(this::tokenInvalido);
        String nuevoValor = generarValor();
        // Reemplaza el anterior en la misma fila y conserva el vencimiento original.
        token.rotar(hash(nuevoValor));
        return new TokenGenerado(usuario, nuevoValor, token.getFechaExpiracion());
    }

    @Transactional
    public void revocar(String valor) {
        if (tieneFormatoValido(valor)) {
            tokens.findByTokenHash(hash(valor)).ifPresent(RefreshToken::revocar);
        }
    }

    private String generarValor() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private boolean tieneFormatoValido(String valor) {
        return valor != null && valor.matches("[A-Za-z0-9_-]{43}");
    }

    private String hash(String valor) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.US_ASCII));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 no está disponible.", exception);
        }
    }

    private BadCredentialsException tokenInvalido() {
        return new BadCredentialsException("Refresh token inválido.");
    }

    public record TokenGenerado(Usuario usuario, String valor, Instant expira) {
        @Override
        public String toString() {
            return "TokenGenerado[datos protegidos]";
        }
    }
}
