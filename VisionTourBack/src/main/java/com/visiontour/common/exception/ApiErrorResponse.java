package com.visiontour.common.exception;

import java.time.LocalDateTime;
import java.util.Map;

public record ApiErrorResponse(
        int status,
        String codigo,
        String mensaje,
        LocalDateTime timestamp,
        Map<String, String> errores
) {
}
