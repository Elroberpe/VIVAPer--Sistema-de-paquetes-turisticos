package com.visiontour.destino.controller;

import com.visiontour.destino.dto.DestinoEstadoRequest;
import com.visiontour.destino.dto.DestinoRequest;
import com.visiontour.destino.dto.DestinoResponse;
import com.visiontour.destino.service.DestinoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/destinos")
public class DestinoController {

    private final DestinoService destinoService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DestinoResponse crear(@Valid @RequestBody DestinoRequest request) {
        return destinoService.crear(request);
    }

    @GetMapping
    public List<DestinoResponse> listar(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) Boolean estado) {
        return destinoService.listar(nombre, estado);
    }

    @GetMapping("/{id}")
    public DestinoResponse obtenerPorId(@PathVariable Long id) {
        return destinoService.obtenerPorId(id);
    }

    @PutMapping("/{id}")
    public DestinoResponse actualizar(
            @PathVariable Long id,
            @Valid @RequestBody DestinoRequest request) {
        return destinoService.actualizar(id, request);
    }

    @PatchMapping("/{id}/estado")
    public DestinoResponse cambiarEstado(
            @PathVariable Long id,
            @Valid @RequestBody DestinoEstadoRequest request) {
        return destinoService.cambiarEstado(id, request);
    }
}