package com.visiontour.usuario.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class PasswordActualIncorrectaException extends RuntimeException {
    public PasswordActualIncorrectaException() {
        super("La contraseña actual es incorrecta.");
    }
}
