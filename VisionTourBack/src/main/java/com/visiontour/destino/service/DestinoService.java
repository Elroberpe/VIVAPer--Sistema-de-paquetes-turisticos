package com.visiontour.destino.service;

import com.visiontour.destino.dto.DestinoEstadoRequest;
import com.visiontour.destino.dto.DestinoRequest;
import com.visiontour.destino.dto.DestinoResponse;

import java.util.List;

public interface DestinoService {

    DestinoResponse crear(DestinoRequest request);

    List<DestinoResponse> listar(String nombre, Boolean estado);


    DestinoResponse obtenerPorId(Long id);

    DestinoResponse obtenerActivoPorId(Long id);

    DestinoResponse actualizar(Long id, DestinoRequest request);

    DestinoResponse cambiarEstado(Long id, DestinoEstadoRequest request);




}