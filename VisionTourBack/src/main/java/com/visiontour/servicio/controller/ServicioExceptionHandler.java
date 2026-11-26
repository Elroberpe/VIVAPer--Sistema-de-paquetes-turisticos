package com.visiontour.servicio.controller;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(basePackages = "com.visiontour.servicio")
public class ServicioExceptionHandler {

    public record ErrorRespuesta(int status, String error, String mensaje) {
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> handleResponseStatus(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        HttpStatus estadoFinal = status != null ? status : HttpStatus.BAD_REQUEST;
        String mensaje = ex.getReason() != null && !ex.getReason().isBlank()
                ? ex.getReason()
                : "Error al procesar la solicitud del servicio.";
        return ResponseEntity.status(estadoFinal)
                .body(new ErrorRespuesta(estadoFinal.value(), estadoFinal.getReasonPhrase(), mensaje));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        String mensaje = "Datos de entrada inválidos.";
        if (ex.getBindingResult().getFieldError() != null
                && ex.getBindingResult().getFieldError().getDefaultMessage() != null) {
            mensaje = ex.getBindingResult().getFieldError().getDefaultMessage();
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorRespuesta(400, "Bad Request", mensaje));
    }

    @ExceptionHandler({ConstraintViolationException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<?> handleBadRequest(Exception ex) {
        String mensaje = ex instanceof HttpMessageNotReadableException
                ? "El cuerpo de la solicitud no tiene un formato JSON válido o tiene tipos incorrectos."
                : "Parámetros de consulta o ruta inválidos.";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorRespuesta(400, "Bad Request", mensaje));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGenericException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorRespuesta(500, "Internal Server Error",
                        "Ocurrió un error inesperado al procesar la solicitud."));
    }
}