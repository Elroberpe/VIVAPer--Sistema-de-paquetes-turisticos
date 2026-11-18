package com.visiontour.security.jwt;

import java.time.Clock;
import java.time.Duration;
import java.util.List;

import com.visiontour.usuario.enums.EstadoUsuario;
import com.visiontour.usuario.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccessTokenService {
    private final JwtEncoder encoder;
    private final UsuarioRepository usuarios;
    private final Clock clock;

    private final String issuer;
    private final String audience;

    public AccessTokenService(JwtEncoder encoder, UsuarioRepository usuarios, Clock clock,
            @Value("${app.security.jwt.issuer}") String issuer,
            @Value("${app.security.jwt.audience}") String audience) {
        this.encoder = encoder;
        this.usuarios = usuarios;
        this.clock = clock;
        this.issuer = issuer;
        this.audience = audience;
    }

    @Transactional(readOnly = true)
    public String generar(Long usuarioId) {
        var usuario = usuarios.findWithRolById(usuarioId)
                .filter(value -> value.getEstado() == EstadoUsuario.ACTIVO)
                .orElseThrow(() -> new BadCredentialsException("No se puede emitir el token."));
        var now = clock.instant();
        var claims = JwtClaimsSet.builder().issuer(issuer).audience(List.of(audience))
                .subject(usuario.getId().toString()).issuedAt(now).expiresAt(now.plus(Duration.ofMinutes(15)))
                .claim("rol", usuario.getRol().getNombre().name()).build();
        return encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).type("at+jwt").build(), claims)).getTokenValue();
    }
}
