package com.visiontour.security;

import java.util.Optional;

import com.visiontour.config.SecurityConfig;
import com.visiontour.usuario.entity.Rol;
import com.visiontour.usuario.entity.Usuario;
import com.visiontour.usuario.enums.EstadoUsuario;
import com.visiontour.usuario.enums.RolNombre;
import com.visiontour.usuario.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CustomUserDetailsServiceTests {

    private static final String EMAIL = "prueba@example.test";
    private static final String PASSWORD = "clave-solo-para-pruebas";
    private final SecurityConfig securityConfig = new SecurityConfig();
    private final PasswordEncoder passwordEncoder = securityConfig.passwordEncoder();

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private CustomUserDetailsService userDetailsService;

    @ParameterizedTest
    @EnumSource(RolNombre.class)
    void loadsTheStoredHashAndConvertsEachRole(RolNombre rol) {
        String hash = passwordEncoder.encode(PASSWORD);
        given(usuarioRepository.findWithRolByEmail(EMAIL)).willReturn(Optional.of(usuario(rol, EstadoUsuario.ACTIVO, hash)));

        UserDetails details = userDetailsService.loadUserByUsername(EMAIL);

        assertThat(details.getUsername()).isEqualTo(EMAIL);
        assertThat(details.getPassword()).isEqualTo(hash);
        assertThat(details.getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_" + rol.name());
        assertThat(details.isEnabled()).isTrue();
        assertThat(details.isAccountNonLocked()).isTrue();
        verify(usuarioRepository).findWithRolByEmail(EMAIL);
    }

    @Test
    void rejectsAnUnknownEmailWithoutExposingIt() {
        given(usuarioRepository.findWithRolByEmail(EMAIL)).willReturn(Optional.empty());

        assertThatThrownBy(() -> userDetailsService.loadUserByUsername(EMAIL))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessage("Credenciales inválidas.");
    }

    @Test
    void bcryptUsesSaltAndVerifiesPasswords() {
        String first = passwordEncoder.encode(PASSWORD);
        String second = passwordEncoder.encode(PASSWORD);

        assertThat(first).startsWith("$2a$").isNotEqualTo(PASSWORD).isNotEqualTo(second);
        assertThat(passwordEncoder.matches(PASSWORD, first)).isTrue();
        assertThat(passwordEncoder.matches("otra-clave", first)).isFalse();
    }

    @Test
    void authenticatesAnActiveUserAndErasesOnlyTheAdapterCredentials() {
        String hash = passwordEncoder.encode(PASSWORD);
        Usuario usuario = usuario(RolNombre.CLIENTE, EstadoUsuario.ACTIVO, hash);
        given(usuarioRepository.findWithRolByEmail(EMAIL)).willReturn(Optional.of(usuario));

        Authentication authentication = securityConfig.authenticationManager(userDetailsService, passwordEncoder)
                .authenticate(UsernamePasswordAuthenticationToken.unauthenticated(EMAIL, PASSWORD));

        assertThat(authentication.isAuthenticated()).isTrue();
        assertThat(authentication.getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .contains("ROLE_CLIENTE");
        assertThat(authentication.getCredentials()).isNull();
        assertThat(usuario.getPasswordHash()).isEqualTo(hash);
    }

    @ParameterizedTest
    @EnumSource(value = EstadoUsuario.class, names = {"PENDIENTE", "BLOQUEADO"})
    void preventsPendingAndBlockedUsersFromAuthenticating(EstadoUsuario estado) {
        String hash = passwordEncoder.encode(PASSWORD);
        given(usuarioRepository.findWithRolByEmail(EMAIL)).willReturn(Optional.of(usuario(RolNombre.CLIENTE, estado, hash)));
        Class<? extends Exception> expected = estado == EstadoUsuario.BLOQUEADO
                ? LockedException.class : DisabledException.class;

        assertThatThrownBy(() -> securityConfig.authenticationManager(userDetailsService, passwordEncoder)
                .authenticate(UsernamePasswordAuthenticationToken.unauthenticated(EMAIL, PASSWORD)))
                .isInstanceOf(expected);
    }

    @Test
    void rejectsAnIncorrectPassword() {
        given(usuarioRepository.findWithRolByEmail(EMAIL)).willReturn(Optional.of(
                usuario(RolNombre.CLIENTE, EstadoUsuario.ACTIVO, passwordEncoder.encode(PASSWORD))));

        assertThatThrownBy(() -> securityConfig.authenticationManager(userDetailsService, passwordEncoder)
                .authenticate(UsernamePasswordAuthenticationToken.unauthenticated(EMAIL, "otra-clave")))
                .isInstanceOf(BadCredentialsException.class);
    }

    private Usuario usuario(RolNombre rol, EstadoUsuario estado, String hash) {
        return new Usuario(
                "Usuario", "Prueba", "usuario.prueba", "999888777", EMAIL, hash, estado, new Rol(rol));
    }
}
