package com.visiontour.proveedor.service;

import com.visiontour.proveedor.dto.*;

public interface ProveedorService {
    ProveedorResponse crear(ProveedorRequest request);
    ProveedoresPaginaResponse listar(String nombre, String estado, int page, int size);
    ProveedorResponse detalle(Long id);
    ProveedorResponse actualizar(Long id, ProveedorRequest request);
    EstadoProveedorResponse cambiarEstado(Long id, boolean estado);
}
