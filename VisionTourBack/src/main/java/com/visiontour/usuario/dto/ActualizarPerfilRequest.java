package com.visiontour.usuario.dto;

import java.util.Locale;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
@JsonAutoDetect(isGetterVisibility = JsonAutoDetect.Visibility.NONE)
public class ActualizarPerfilRequest {
    @Size(min = 1, max = 100, message = "El nombre debe tener entre 1 y 100 caracteres.")
    private String nombre;

    @Size(min = 1, max = 100, message = "El apellido debe tener entre 1 y 100 caracteres.")
    private String apellido;

    @Pattern(regexp = "[a-z0-9._-]{3,30}", message = "El usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo.")
    private String usuario;

    @Pattern(regexp = "[+]?[0-9]{9,15}", message = "El celular debe tener entre 9 y 15 dígitos y puede comenzar con +.")
    private String celular;

    @Email(message = "El correo debe tener un formato válido.")
    @Size(min = 1, max = 150, message = "El correo debe tener entre 1 y 150 caracteres.")
    private String email;

    private String passwordActual;

    @JsonSetter(nulls = Nulls.FAIL)
    public void setNombre(Object nombre) {
        this.nombre = normalizarTexto(nombre);
    }

    @JsonSetter(nulls = Nulls.FAIL)
    public void setApellido(Object apellido) {
        this.apellido = normalizarTexto(apellido);
    }

    @JsonSetter(nulls = Nulls.FAIL)
    public void setUsuario(Object usuario) {
        this.usuario = normalizarTexto(usuario).toLowerCase(Locale.ROOT);
    }

    @JsonSetter(nulls = Nulls.FAIL)
    public void setCelular(Object celular) {
        this.celular = normalizarTexto(celular);
    }

    @JsonSetter(nulls = Nulls.FAIL)
    public void setEmail(Object email) {
        this.email = normalizarTexto(email).toLowerCase(Locale.ROOT);
    }

    @JsonSetter(nulls = Nulls.FAIL)
    public void setPasswordActual(Object passwordActual) {
        if (!(passwordActual instanceof String texto)) {
            throw new IllegalArgumentException("La contraseña debe ser una cadena de texto.");
        }
        this.passwordActual = texto;
    }

    @AssertTrue(message = "Debe enviar al menos un dato del perfil para actualizar.")
    public boolean isPerfilInformado() {
        return nombre != null || apellido != null || usuario != null || celular != null || email != null;
    }

    @AssertTrue(message = "Para actualizar el correo debe enviar la contraseña actual.")
    public boolean isPasswordInformada() {
        return email == null || (passwordActual != null && !passwordActual.isBlank());
    }

    @JsonAnySetter
    public void rechazarCampo(String campo, Object valor) {
        throw new IllegalArgumentException("La solicitud contiene campos no permitidos.");
    }

    private String normalizarTexto(Object valor) {
        if (!(valor instanceof String texto)) {
            throw new IllegalArgumentException("Los datos del perfil deben ser cadenas de texto.");
        }
        return texto.strip();
    }

    @Override
    public String toString() {
        return "ActualizarPerfilRequest[datos protegidos]";
    }
}
