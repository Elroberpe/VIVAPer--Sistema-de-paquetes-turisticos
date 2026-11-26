package com.visiontour.servicio.controller;

import com.visiontour.servicio.dto.ServicioEstadoRequest;
import com.visiontour.servicio.dto.ServicioRequest;
import com.visiontour.servicio.dto.ServicioResponse;
import com.visiontour.servicio.service.ServicioService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/servicios")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMIN')")
public class ServicioController {

    private final ServicioService servicioService;

    @PostMapping
    public ResponseEntity<ServicioResponse> crear(@Valid @RequestBody ServicioRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servicioService.crear(request));
    }

    @GetMapping
    public ResponseEntity<List<ServicioResponse>> listar(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) Boolean estado) {
        return ResponseEntity.ok(servicioService.listar(nombre, estado));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServicioResponse> obtenerPorId(@PathVariable @Positive Long id) {
        return ResponseEntity.ok(servicioService.obtenerPorId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServicioResponse> actualizar(
            @PathVariable @Positive Long id,
            @Valid @RequestBody ServicioRequest request) {
        return ResponseEntity.ok(servicioService.actualizar(id, request));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<ServicioResponse> cambiarEstado(
            @PathVariable @Positive Long id,
            @Valid @RequestBody ServicioEstadoRequest request) {
        return ResponseEntity.ok(servicioService.cambiarEstado(id, request));
    }
}