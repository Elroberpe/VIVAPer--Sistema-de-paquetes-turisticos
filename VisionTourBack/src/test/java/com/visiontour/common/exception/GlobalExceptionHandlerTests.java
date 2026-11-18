package com.visiontour.common.exception;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTests {

    private MockMvc mockMvc;
    private LocalValidatorFactoryBean validator;

    @BeforeEach
    void setUp() {
        validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new TestController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @AfterEach
    void tearDown() {
        validator.close();
    }

    @Test
    void acceptsAValidRequest() throws Exception {
        mockMvc.perform(post("/test/body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Carlos\",\"password\":\"clave-valida\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void returnsFieldErrorsWithoutRejectedValues() throws Exception {
        mockMvc.perform(post("/test/body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"password\":\"secreto\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.*", hasSize(5)))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.codigo").value("ERROR_VALIDACION"))
                .andExpect(jsonPath("$.mensaje").value("Los datos de la solicitud no son válidos."))
                .andExpect(jsonPath("$.timestamp").value(matchesPattern(
                        "\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,9})?")))
                .andExpect(jsonPath("$.errores.name").isString())
                .andExpect(jsonPath("$.errores.password").value(
                        "La contraseña debe tener al menos 8 caracteres."))
                .andExpect(content().string(not(containsString("secreto"))))
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    @Test
    void preservesMultipleValidationMessagesForTheSameField() throws Exception {
        mockMvc.perform(post("/test/body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"password\":\"clave-valida\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.name", containsString("El nombre es obligatorio.")))
                .andExpect(jsonPath("$.errores.name", containsString("El nombre debe tener al menos 3 caracteres.")));
    }

    @Test
    void returnsBadRequestForMalformedJson() throws Exception {
        mockMvc.perform(post("/test/body").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("JSON_INVALIDO"))
                .andExpect(jsonPath("$.mensaje").value(
                        "El cuerpo de la solicitud no contiene un JSON válido o tiene datos incompatibles."))
                .andExpect(jsonPath("$.errores").isEmpty())
                .andExpect(content().string(not(containsString("HttpMessageNotReadableException"))));
    }

    @Test
    void returnsBadRequestForAnInvalidParameterType() throws Exception {
        mockMvc.perform(get("/test/number").param("value", "texto"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("SOLICITUD_INVALIDA"))
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void returnsBadRequestForAMissingRequiredParameter() throws Exception {
        mockMvc.perform(get("/test/number"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("SOLICITUD_INVALIDA"));
    }

    @Test
    void returnsErrorsForControllerParameterValidation() throws Exception {
        mockMvc.perform(get("/test/positive").param("value", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("ERROR_VALIDACION"))
                .andExpect(jsonPath("$.errores.value").value("Debe ser mayor que cero."));
    }

    @Test
    void preservesAnExplicitHttpStatusWithoutExposingTechnicalDetails() throws Exception {
        mockMvc.perform(get("/test/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.codigo").value("RECURSO_NO_ENCONTRADO"))
                .andExpect(jsonPath("$.mensaje").value("El recurso solicitado no existe."))
                .andExpect(content().string(not(containsString("detalle-interno"))));
    }

    @Test
    void respectsResponseStatusOnCustomExceptions() throws Exception {
        mockMvc.perform(get("/test/annotated"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void returnsAnApiErrorForAnUnknownRoute() throws Exception {
        mockMvc.perform(get("/test/missing"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.codigo").value("RECURSO_NO_ENCONTRADO"))
                .andExpect(jsonPath("$.errores").isEmpty());
    }

    @Test
    void preservesTheAllowHeaderForUnsupportedMethods() throws Exception {
        mockMvc.perform(post("/test/number"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405))
                .andExpect(jsonPath("$.codigo").value("METODO_NO_PERMITIDO"))
                .andExpect(header().string("Allow", containsString("GET")));
    }

    @Test
    void returnsUnsupportedMediaTypeForNonJsonBodies() throws Exception {
        mockMvc.perform(post("/test/body").contentType(MediaType.TEXT_PLAIN).content("texto"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.codigo").value("TIPO_CONTENIDO_NO_SOPORTADO"))
                .andExpect(jsonPath("$.status").value(415));
    }

    @Test
    void returnsConflictWithoutExposingDatabaseDetails() throws Exception {
        mockMvc.perform(get("/test/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.codigo").value("CONFLICTO_DATOS"))
                .andExpect(content().string(not(containsString("SQL-interno"))));
    }

    @Test
    void returnsAGenericMessageForUnexpectedErrors() throws Exception {
        mockMvc.perform(get("/test/failure"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.codigo").value("ERROR_INTERNO"))
                .andExpect(jsonPath("$.errores").isEmpty())
                .andExpect(jsonPath("$.mensaje").value(
                        "Ocurrió un error interno. Inténtalo de nuevo más tarde."))
                .andExpect(jsonPath("$.trace").doesNotExist())
                .andExpect(content().string(not(containsString("detalle-interno"))))
                .andExpect(content().string(not(containsString("IllegalStateException"))));
    }

    @Test
    void doesNotExposeValidationErrorsForInvalidReturnValues() throws Exception {
        mockMvc.perform(get("/test/invalid-return"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.codigo").value("ERROR_INTERNO"))
                .andExpect(jsonPath("$.errores").isEmpty())
                .andExpect(content().string(not(containsString("resultado-interno"))));
    }

    record TestRequest(
            @NotBlank(message = "El nombre es obligatorio.")
            @Size(min = 3, message = "El nombre debe tener al menos 3 caracteres.") String name,
            @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres.") String password) {
    }

    @ResponseStatus(HttpStatus.NOT_FOUND)
    static class TestNotFoundException extends RuntimeException {
    }

    // Clase interna no estática: solo se registra en estas pruebas, no en el escaneo de la aplicación.
    @RestController
    class TestController {

        @PostMapping(path = "/test/body", consumes = MediaType.APPLICATION_JSON_VALUE)
        public String body(@Valid @RequestBody TestRequest request) {
            return "ok";
        }

        @GetMapping("/test/number")
        public int number(@RequestParam("value") int value) {
            return value;
        }

        @GetMapping("/test/positive")
        public int positive(@RequestParam("value") @Positive(message = "Debe ser mayor que cero.") int value) {
            return value;
        }

        @GetMapping("/test/not-found")
        public void notFound() {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "detalle-interno");
        }

        @GetMapping("/test/annotated")
        public void annotated() {
            throw new TestNotFoundException();
        }

        @GetMapping("/test/conflict")
        public void conflict() {
            throw new DataIntegrityViolationException("SQL-interno");
        }

        @GetMapping("/test/failure")
        public void failure() {
            throw new IllegalStateException("detalle-interno");
        }

        @NotBlank(message = "resultado-interno")
        @GetMapping("/test/invalid-return")
        public String invalidReturn() {
            return "";
        }
    }
}
