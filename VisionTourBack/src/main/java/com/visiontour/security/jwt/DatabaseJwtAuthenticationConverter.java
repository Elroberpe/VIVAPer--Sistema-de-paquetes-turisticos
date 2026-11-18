package com.visiontour.security.jwt;

import java.util.List;

import com.visiontour.usuario.enums.EstadoUsuario;
import com.visiontour.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class DatabaseJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    private final UsuarioRepository usuarios;

    @Override
    @Transactional(readOnly = true)
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Long id;
        try {
            id = Long.valueOf(jwt.getSubject());
        } catch (RuntimeException exception) {
            throw new InvalidBearerTokenException("Access token inválido.");
        }
        var usuario = usuarios.findWithRolById(id).filter(value -> value.getEstado() == EstadoUsuario.ACTIVO)
                .orElseThrow(() -> new InvalidBearerTokenException("Access token inválido."));
        String rol = usuario.getRol().getNombre().name();
        if (!rol.equals(jwt.getClaims().get("rol"))) {
            throw new InvalidBearerTokenException("Access token inválido.");
        }
        return new JwtAuthenticationToken(jwt, List.of(new SimpleGrantedAuthority("ROLE_" + rol)), id.toString());
    }
}
