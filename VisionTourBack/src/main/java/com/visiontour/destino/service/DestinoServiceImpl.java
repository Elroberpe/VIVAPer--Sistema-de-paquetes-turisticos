package com.visiontour.destino.service;

import com.visiontour.destino.dto.DestinoEstadoRequest;
import com.visiontour.destino.dto.DestinoRequest;
import com.visiontour.destino.dto.DestinoResponse;
import com.visiontour.destino.entity.Destino;
import com.visiontour.destino.repository.DestinoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class DestinoServiceImpl implements DestinoService {

    private final DestinoRepository destinoRepository;

    @Override
    public DestinoResponse crear(DestinoRequest request) {
        validarDuplicado(request.getNombre(), request.getUbicacion(), null);

        Destino destino = Destino.builder()
                .nombre(request.getNombre().trim())
                .ubicacion(request.getUbicacion().trim())
                .subtitulo(request.getSubtitulo().trim())
                .descripcion(request.getDescripcion().trim())
                .imagenUrl(normalizarImagen(request.getImagenUrl()))
                .estado(true)
                .build();

        return convertirAResponse(destinoRepository.save(destino));
    }

    @Override
    @Transactional(readOnly = true)
    public List<DestinoResponse> listar(String nombre, Boolean estado) {
        String nombreNormalizado = nombre == null ? null : nombre.trim();

        return destinoRepository.buscarConFiltros(nombreNormalizado, estado)
                .stream()
                .map(this::convertirAResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DestinoResponse obtenerPorId(Long id) {
        return convertirAResponse(buscarDestino(id));
    }

    @Override
    @Transactional(readOnly = true)
    public DestinoResponse obtenerActivoPorId(Long id) {
        Destino destino = destinoRepository.findByIdDestinoAndEstadoTrue(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Destino no encontrado"
                ));

        return convertirAResponse(destino);
    }




    @Override
    public DestinoResponse actualizar(Long id, DestinoRequest request) {
        Destino destino = buscarDestino(id);

        validarDuplicado(request.getNombre(), request.getUbicacion(), id);

        destino.setNombre(request.getNombre().trim());
        destino.setUbicacion(request.getUbicacion().trim());
        destino.setSubtitulo(request.getSubtitulo().trim());
        destino.setDescripcion(request.getDescripcion().trim());
        destino.setImagenUrl(normalizarImagen(request.getImagenUrl()));

        return convertirAResponse(destinoRepository.save(destino));
    }

    @Override
    public DestinoResponse cambiarEstado(Long id, DestinoEstadoRequest request) {
        Destino destino = buscarDestino(id);

        destino.setEstado(request.getEstado());

        return convertirAResponse(destinoRepository.save(destino));
    }

    private Destino buscarDestino(Long id) {
        return destinoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Destino no encontrado"
                ));
    }

    private void validarDuplicado(String nombre, String ubicacion, Long idDestino) {
        String nombreNormalizado = nombre.trim();
        String ubicacionNormalizada = ubicacion.trim();

        boolean existe = idDestino == null
                ? destinoRepository.existsByNombreIgnoreCaseAndUbicacionIgnoreCase(
                nombreNormalizado, ubicacionNormalizada)
                : destinoRepository.existsByNombreIgnoreCaseAndUbicacionIgnoreCaseAndIdDestinoNot(
                nombreNormalizado, ubicacionNormalizada, idDestino);

        if (existe) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ya existe un destino con ese nombre y ubicación"
            );
        }
    }

    private String normalizarImagen(String imagenUrl) {
        return imagenUrl == null || imagenUrl.isBlank()
                ? null
                : imagenUrl.trim();
    }

    private DestinoResponse convertirAResponse(Destino destino) {
        return DestinoResponse.builder()
                .idDestino(destino.getIdDestino())
                .nombre(destino.getNombre())
                .ubicacion(destino.getUbicacion())
                .subtitulo(destino.getSubtitulo())
                .descripcion(destino.getDescripcion())
                .imagenUrl(destino.getImagenUrl())
                .estado(destino.getEstado())
                .build();
    }
}