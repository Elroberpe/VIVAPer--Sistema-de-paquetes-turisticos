package com.visiontour.proveedor.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class DatosProveedorInvalidosException extends RuntimeException {
    public DatosProveedorInvalidosException(String mensaje) { super(mensaje); }
}
