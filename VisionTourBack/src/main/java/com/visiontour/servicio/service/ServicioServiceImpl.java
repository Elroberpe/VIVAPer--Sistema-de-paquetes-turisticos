package com.visiontour.servicio.service;

import com.visiontour.servicio.dto.ServicioEstadoRequest;
import com.visiontour.servicio.dto.ServicioRequest;
import com.visiontour.servicio.dto.ServicioResponse;
import com.visiontour.servicio.entity.Servicio;
import com.visiontour.servicio.repository.ServicioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ServicioServiceImpl implements ServicioService {

    private final ServicioRepository servicioRepository;

    @Override
    public ServicioResponse crear(ServicioRequest request) {
        String nombreNormalizado = normalizarTexto(request.nombre());
        if (nombreNormalizado == null || nombreNormalizado.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre del servicio es obligatorio.");
        }
        if (servicioRepository.existsByNombreIgnoreCase(nombreNormalizado)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un servicio con ese nombre.");
        }

        Servicio entidad = Servicio.builder()
                .nombre(nombreNormalizado)
                .descripcion(normalizarTexto(request.descripcion()))
                .estado(true)
                .build();

        return toResponse(servicioRepository.save(entidad));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServicioResponse> listar(String nombre, Boolean estado) {
        String filtroNombre = normalizarTexto(nombre);
        return servicioRepository.buscarConFiltros(filtroNombre, estado)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ServicioResponse obtenerPorId(Long id) {
        return toResponse(buscarEntidadPorId(id));
    }

    @Override
    public ServicioResponse actualizar(Long id, ServicioRequest request) {
        Servicio servicio = buscarEntidadPorId(id);

        String nombreNormalizado = normalizarTexto(request.nombre());
        if (nombreNormalizado == null || nombreNormalizado.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre del servicio es obligatorio.");
        }
        if (servicioRepository.existsByNombreIgnoreCaseAndIdServicioNot(nombreNormalizado, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe otro servicio con ese nombre.");
        }

        servicio.setNombre(nombreNormalizado);
        servicio.setDescripcion(normalizarTexto(request.descripcion()));

        return toResponse(servicioRepository.save(servicio));
    }

    @Override
    public ServicioResponse cambiarEstado(Long id, ServicioEstadoRequest request) {
        Servicio servicio = buscarEntidadPorId(id);
        servicio.setEstado(request.estado());
        return toResponse(servicioRepository.save(servicio));
    }

    private Servicio buscarEntidadPorId(Long id) {
        return servicioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado."));
    }

    private String normalizarTexto(String valor) {
        if (valor == null) {
            return null;
        }
        String recortado = valor.trim();
        return recortado.isEmpty() ? null : recortado;
    }

    private ServicioResponse toResponse(Servicio servicio) {
        return new ServicioResponse(
                servicio.getIdServicio(),
                servicio.getNombre(),
                servicio.getDescripcion(),
                servicio.getEstado()
        );
    }
}