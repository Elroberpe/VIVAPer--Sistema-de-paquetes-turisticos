package com.visiontour.common.exception;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

import com.visiontour.usuario.exception.DatosUsuarioDuplicadosException;
import com.visiontour.usuario.exception.PasswordActualIncorrectaException;
import com.visiontour.usuario.exception.PasswordReutilizadaException;
import com.visiontour.usuario.exception.RolNoValidoException;
import com.visiontour.usuario.exception.UltimoAdministradorActivoException;

import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Object> handleDataIntegrityViolation(
            DataIntegrityViolationException exception, WebRequest request) {
        return handleExceptionInternal(exception, null, HttpHeaders.EMPTY, HttpStatus.CONFLICT, request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleUnexpectedException(Exception exception, WebRequest request) {
        if (exception instanceof AuthenticationException authenticationException) {
            throw authenticationException;
        }
        if (exception instanceof AccessDeniedException accessDeniedException) {
            throw accessDeniedException;
        }
        ResponseStatus responseStatus = AnnotatedElementUtils.findMergedAnnotation(
                exception.getClass(), ResponseStatus.class);
        HttpStatus status = responseStatus == null ? HttpStatus.INTERNAL_SERVER_ERROR : responseStatus.code();
        return handleExceptionInternal(exception, null, HttpHeaders.EMPTY, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception exception, Object body, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        if (status.is5xxServerError()) {
            logger.error("Error interno al procesar una solicitud HTTP.", exception);
        }

        ApiErrorResponse response = new ApiErrorResponse(
                status.value(),
                codeFor(exception, status),
                detailFor(exception, status),
                LocalDateTime.now(),
                status.is5xxServerError() ? Map.of() : validationErrors(exception));

        HttpHeaders responseHeaders = new HttpHeaders();
        responseHeaders.putAll(headers);
        responseHeaders.setContentType(MediaType.APPLICATION_JSON);
        return super.handleExceptionInternal(exception, response, responseHeaders, status, request);
    }

    private String codeFor(Exception exception, HttpStatusCode status) {
        if (status.is5xxServerError()) {
            return "ERROR_INTERNO";
        }
        if (exception instanceof PasswordActualIncorrectaException) {
            return "PASSWORD_ACTUAL_INCORRECTA";
        }
        if (exception instanceof PasswordReutilizadaException) {
            return "PASSWORD_REUTILIZADA";
        }
        if (exception instanceof MethodArgumentNotValidException
                || exception instanceof HandlerMethodValidationException) {
            return "ERROR_VALIDACION";
        }
        if (exception instanceof HttpMessageNotReadableException) {
            return "JSON_INVALIDO";
        }

        return switch (status.value()) {
            case 400 -> "SOLICITUD_INVALIDA";
            case 401 -> "NO_AUTENTICADO";
            case 403 -> "ACCESO_DENEGADO";
            case 404 -> "RECURSO_NO_ENCONTRADO";
            case 405 -> "METODO_NO_PERMITIDO";
            case 406 -> "FORMATO_RESPUESTA_NO_SOPORTADO";
            case 409 -> "CONFLICTO_DATOS";
            case 413 -> "CONTENIDO_DEMASIADO_GRANDE";
            case 415 -> "TIPO_CONTENIDO_NO_SOPORTADO";
            default -> "ERROR_HTTP_" + status.value();
        };
    }

    private String detailFor(Exception exception, HttpStatusCode status) {
        if (status.is5xxServerError()) {
            return "Ocurrió un error interno. Inténtalo de nuevo más tarde.";
        }
        if (exception instanceof PasswordActualIncorrectaException
                || exception instanceof PasswordReutilizadaException
                || exception instanceof DatosUsuarioDuplicadosException
                || exception instanceof RolNoValidoException
                || exception instanceof UltimoAdministradorActivoException) {
            return exception.getMessage();
        }

        if (exception instanceof DataIntegrityViolationException integrityException) {
            String detalle = integrityException.getMostSpecificCause().getMessage();
            if (detalle != null) {
                String constraint = detalle.toLowerCase(Locale.ROOT);
                if (constraint.contains("uk_usuarios_email")) return "Este correo ya está registrado.";
                if (constraint.contains("uk_usuarios_usuario")) return "Este nombre de usuario ya está registrado.";
            }
        }

        if (exception instanceof HttpMessageNotReadableException) {
            return "El cuerpo de la solicitud no contiene un JSON válido o tiene datos incompatibles.";
        }

        return switch (status.value()) {
            case 400 -> "Los datos de la solicitud no son válidos.";
            case 401 -> "Es necesario autenticarse para acceder al recurso.";
            case 403 -> "No tienes permisos para realizar esta operación.";
            case 404 -> "El recurso solicitado no existe.";
            case 405 -> "El método HTTP no está permitido para este recurso.";
            case 406 -> "No es posible generar una respuesta en el formato solicitado.";
            case 409 -> "No se puede completar la operación por un conflicto con los datos existentes.";
            case 413 -> "El contenido de la solicitud supera el tamaño permitido.";
            case 415 -> "El formato del contenido de la solicitud no es compatible.";
            default -> "No fue posible procesar la solicitud.";
        };
    }

    private Map<String, String> validationErrors(Exception exception) {
        Map<String, String> errors = new LinkedHashMap<>();

        if (exception instanceof MethodArgumentNotValidException validationException) {
            validationException.getBindingResult().getAllErrors().forEach(error -> {
                String field = error instanceof FieldError fieldError ? fieldError.getField() : "request";
                addValidationError(errors, field, error.getDefaultMessage());
            });
        } else if (exception instanceof HandlerMethodValidationException validationException) {
            validationException.getParameterValidationResults().forEach(result -> {
                String parameter = result.getMethodParameter().getParameterName();
                String field = parameter == null ? "request" : parameter;
                result.getResolvableErrors().forEach(error -> {
                    String errorField = error instanceof FieldError fieldError ? fieldError.getField() : field;
                    addValidationError(errors, errorField, error.getDefaultMessage());
                });
            });
            validationException.getCrossParameterValidationResults().forEach(error ->
                    addValidationError(errors, "request", error.getDefaultMessage()));
        }

        return errors;
    }

    private void addValidationError(Map<String, String> errors, String field, String message) {
        String validationMessage = message == null ? "El valor no es válido." : message;
        errors.merge(field, validationMessage,
                (existing, additional) -> existing.equals(additional) ? existing : existing + "; " + additional);
    }
}
