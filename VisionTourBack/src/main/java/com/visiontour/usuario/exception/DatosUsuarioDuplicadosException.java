package com.visiontour.usuario.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class DatosUsuarioDuplicadosException extends RuntimeException {
    public DatosUsuarioDuplicadosException(String mensaje) {
        super(mensaje);
    }
}
