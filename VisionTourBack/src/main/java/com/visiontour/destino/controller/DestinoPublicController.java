package com.visiontour.destino.controller;

import com.visiontour.destino.dto.DestinoResponse;
import com.visiontour.destino.service.DestinoService;
import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/public/destinos")
public class DestinoPublicController {

    private final DestinoService destinoService;

    @GetMapping
    public List<DestinoResponse> listarDestinosActivos() {
        return destinoService.listar(null, true);
    }

    @GetMapping("/{id}")
    public DestinoResponse obtenerDestinoActivo(@PathVariable Long id) {
        return destinoService.obtenerActivoPorId(id);
    }
}