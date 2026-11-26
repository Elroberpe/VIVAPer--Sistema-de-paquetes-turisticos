package com.visiontour.proveedor.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class ConflictoProveedorException extends RuntimeException {
    public ConflictoProveedorException(String mensaje) { super(mensaje); }
}
