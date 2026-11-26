package com.visiontour.servicio.service;

import com.visiontour.servicio.dto.ServicioEstadoRequest;
import com.visiontour.servicio.dto.ServicioRequest;
import com.visiontour.servicio.dto.ServicioResponse;

import java.util.List;

public interface ServicioService {

    ServicioResponse crear(ServicioRequest request);

    List<ServicioResponse> listar(String nombre, Boolean estado);

    ServicioResponse obtenerPorId(Long id);

    ServicioResponse actualizar(Long id, ServicioRequest request);

    ServicioResponse cambiarEstado(Long id, ServicioEstadoRequest request);
}