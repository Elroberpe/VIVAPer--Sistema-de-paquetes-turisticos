package com.visiontour.proveedor.controller;

import com.visiontour.proveedor.dto.*;
import com.visiontour.proveedor.service.ProveedorService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/proveedores")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class ProveedorController {
    private final ProveedorService service;

    @PostMapping
    public ResponseEntity<ProveedorResponse> crear(@Valid @RequestBody ProveedorRequest request) {
        var response = service.crear(request);
        return ResponseEntity.created(URI.create("/api/admin/proveedores/" + response.idProveedor())).body(response);
    }

    @GetMapping
    public ProveedoresPaginaResponse listar(
            @RequestParam(required = false) @Size(max = 150) String nombre,
            @RequestParam(required = false) String estado,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size) {
        return service.listar(nombre, estado, page, size);
    }

    @GetMapping("/{id}")
    public ProveedorResponse detalle(@PathVariable @Positive Long id) {
        return service.detalle(id);
    }

    @PutMapping("/{id}")
    public ProveedorResponse actualizar(@PathVariable @Positive Long id, @Valid @RequestBody ProveedorRequest request) {
        return service.actualizar(id, request);
    }

    @PatchMapping("/{id}/estado")
    public EstadoProveedorResponse cambiarEstado(@PathVariable @Positive Long id,
            @Valid @RequestBody CambiarEstadoProveedorRequest request) {
        return service.cambiarEstado(id, request.estado());
    }
}
