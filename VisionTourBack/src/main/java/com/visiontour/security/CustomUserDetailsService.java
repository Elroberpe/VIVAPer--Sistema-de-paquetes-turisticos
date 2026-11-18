package com.visiontour.security;

import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.EstadoUsuario;
import com.visiontour.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findWithRolByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Credenciales inválidas."));

        return User.withUsername(usuario.getEmail())
                .password(usuario.getPasswordHash())
                .authorities("ROLE_" + usuario.getRol().getNombre().name())
                .disabled(usuario.getEstado() != EstadoUsuario.ACTIVO)
                .accountLocked(usuario.getEstado() == EstadoUsuario.BLOQUEADO)
                .build();
    }
}
