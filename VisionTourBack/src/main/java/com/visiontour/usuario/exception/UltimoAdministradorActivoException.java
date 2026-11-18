package com.visiontour.usuario.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class UltimoAdministradorActivoException extends RuntimeException {
    public UltimoAdministradorActivoException() {
        super("Debe permanecer al menos un administrador activo en el sistema.");
    }
}
