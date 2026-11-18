package com.visiontour.usuario.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class RolNoValidoException extends RuntimeException {
    public RolNoValidoException() {
        super("El rol solicitado no existe.");
    }
}
