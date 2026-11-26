package com.visiontour.proveedor.service;

import com.visiontour.proveedor.dto.*;
import com.visiontour.proveedor.entity.Proveedor;
import com.visiontour.proveedor.exception.*;
import com.visiontour.proveedor.repository.ProveedorRepository;
import com.visiontour.servicio.entity.Servicio;
import com.visiontour.servicio.repository.ServicioRepository;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProveedorServiceImpl implements ProveedorService {
    private final ProveedorRepository proveedores;
    private final ServicioRepository servicios;

    @Override
    @Transactional
    public ProveedorResponse crear(ProveedorRequest request) {
        validarRuc(request.ruc(), null);
        var proveedor = new Proveedor();
        aplicar(proveedor, request);
        return convertirAResponse(proveedores.saveAndFlush(proveedor));
    }

    @Override
    public ProveedoresPaginaResponse listar(String nombre, String estado, int page, int size) {
        Boolean activo = interpretarEstado(estado);
        if (page < 0 || size < 1 || size > 100) {
            throw new DatosProveedorInvalidosException("Página inválida o tamaño fuera del intervalo de 1 a 100.");
        }
        Specification<Proveedor> filtro = (root, query, cb) -> {
            var condiciones = new ArrayList<jakarta.persistence.criteria.Predicate>();
            if (nombre != null && !nombre.isBlank()) {
                String texto = nombre.strip().toLowerCase(Locale.ROOT)
                    .replace("!", "!!").replace("%", "!%").replace("_", "!_");
                condiciones.add(cb.like(cb.lower(root.get("nombre")), "%" + texto + "%", '!'));
            }
            if (activo != null) condiciones.add(cb.equal(root.get("estado"), activo));
            return cb.and(condiciones.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        var resultado = proveedores.findAll(filtro,
            PageRequest.of(page, size, Sort.by("nombre").ascending().and(Sort.by("idProveedor"))));
        return new ProveedoresPaginaResponse(resultado.getContent().stream().map(this::convertirAListaResponse).toList(),
            resultado.getNumber(), resultado.getSize(), resultado.getTotalElements(), resultado.getTotalPages());
    }

    private Boolean interpretarEstado(String estado) {
        if (estado == null) return null;
        return switch (estado.strip().toLowerCase(Locale.ROOT)) {
            case "activo" -> true;
            case "inactivo" -> false;
            default -> throw new DatosProveedorInvalidosException("El estado debe ser activo o inactivo; omítelo para consultar todos.");
        };
    }

    @Override
    public ProveedorResponse detalle(Long id) {
        return convertirAResponse(proveedores.findById(id)
            .orElseThrow(() -> new ProveedorRecursoNoEncontradoException("El proveedor no existe.")));
    }

    @Override
    @Transactional
    public ProveedorResponse actualizar(Long id, ProveedorRequest request) {
        var proveedor = buscarParaActualizar(id);
        validarRuc(request.ruc(), id);
        aplicar(proveedor, request);
        return convertirAResponse(proveedores.saveAndFlush(proveedor));
    }

    @Override
    @Transactional
    public EstadoProveedorResponse cambiarEstado(Long id, boolean estado) {
        var proveedor = buscarParaActualizar(id);
        proveedor.setEstado(estado);
        return new EstadoProveedorResponse(id, estado);
    }

    private Proveedor buscarParaActualizar(Long id) {
        return proveedores.buscarParaActualizar(id)
            .orElseThrow(() -> new ProveedorRecursoNoEncontradoException("El proveedor no existe."));
    }

    private void validarRuc(String ruc, Long id) {
        boolean repetido = id == null ? proveedores.existsByRuc(ruc)
            : proveedores.existsByRucAndIdProveedorNot(ruc, id);
        if (repetido) throw new ConflictoProveedorException("Ya existe un proveedor con ese RUC.");
    }

    private ProveedorResponse convertirAResponse(Proveedor proveedor) {
        var serviciosAsociados = proveedor.getServicios().stream()
            .map(servicio -> new ProveedorResponse.ServicioResumen(servicio.getIdServicio(), servicio.getNombre()))
            .sorted(Comparator.comparing(ProveedorResponse.ServicioResumen::idServicio)).toList();
        return new ProveedorResponse(proveedor.getIdProveedor(), proveedor.getRuc(), proveedor.getNombre(),
            proveedor.getEncargado(), proveedor.getEmail(), proveedor.getTelefono(), proveedor.isEstado(), serviciosAsociados);
    }

    private ProveedorListaResponse convertirAListaResponse(Proveedor proveedor) {
        return new ProveedorListaResponse(proveedor.getIdProveedor(), proveedor.getNombre(),
            proveedor.getEncargado(), proveedor.getEmail(), proveedor.getTelefono(), proveedor.isEstado());
    }

    private void aplicar(Proveedor proveedor, ProveedorRequest request) {
        var ids = request.serviciosIds();
        if (ids.stream().anyMatch(id -> id == null || id <= 0) || new HashSet<>(ids).size() != ids.size()) {
            throw new DatosProveedorInvalidosException("Los servicios deben tener IDs positivos y no repetidos.");
        }
        var seleccionados = servicios.findAllById(ids);
        if (seleccionados.size() != ids.size()) {
            throw new ProveedorRecursoNoEncontradoException("Uno o más servicios no existen.");
        }
        var anteriores = proveedor.getServicios().stream().map(Servicio::getIdServicio).collect(Collectors.toSet());
        if (seleccionados.stream().anyMatch(s -> !Boolean.TRUE.equals(s.getEstado()) && !anteriores.contains(s.getIdServicio()))) {
            throw new ConflictoProveedorException("Solo se pueden agregar servicios activos.");
        }
        proveedor.setRuc(request.ruc());
        proveedor.setNombre(request.nombre());
        proveedor.setEncargado(request.encargado());
        proveedor.setEmail(request.email());
        proveedor.setTelefono(request.telefono());
        proveedor.getServicios().clear();
        proveedor.getServicios().addAll(seleccionados);
    }
}
