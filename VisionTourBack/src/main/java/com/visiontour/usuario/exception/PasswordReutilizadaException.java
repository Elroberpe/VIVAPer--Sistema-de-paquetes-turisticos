package com.visiontour.usuario.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class PasswordReutilizadaException extends RuntimeException {
    public PasswordReutilizadaException() {
        super("La contraseña nueva debe ser diferente de la actual.");
    }
}
