package com.visiontour.proveedor;

import com.visiontour.proveedor.dto.ProveedorRequest;
import com.visiontour.proveedor.entity.Proveedor;
import com.visiontour.proveedor.exception.*;
import com.visiontour.proveedor.repository.ProveedorRepository;
import com.visiontour.proveedor.service.ProveedorServiceImpl;
import com.visiontour.servicio.entity.Servicio;
import com.visiontour.servicio.repository.ServicioRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProveedorServiceTests {
    @Mock ProveedorRepository proveedores;
    @Mock ServicioRepository servicios;
    @InjectMocks ProveedorServiceImpl service;

    ProveedorRequest request(List<Long> ids) {
        return new ProveedorRequest("20123456789", "Nuevo", "Ana", null, "123", ids);
    }

    @Test
    void conservaServicioHistoricoInactivoEnEdicion() {
        var existente = new Proveedor();
        existente.setIdProveedor(10L);
        existente.setEstado(false);
        var inactivo = mock(Servicio.class);
        when(inactivo.getIdServicio()).thenReturn(1L);
        when(inactivo.getNombre()).thenReturn("Alojamiento");
        existente.getServicios().add(inactivo);
        when(proveedores.buscarParaActualizar(10L)).thenReturn(Optional.of(existente));
        when(servicios.findAllById(List.of(1L))).thenReturn(List.of(inactivo));
        when(proveedores.saveAndFlush(existente)).thenReturn(existente);

        var response = service.actualizar(10L, request(List.of(1L)));
        assertThat(response.estado()).isFalse();
        assertThat(response.servicios()).hasSize(1);
    }

    @Test
    void nuevaAsociacionInactivaNoAlteraDatosNiRelaciones() {
        var existente = new Proveedor();
        existente.setNombre("Original");
        var inactivo = mock(Servicio.class);
        when(inactivo.getIdServicio()).thenReturn(2L);
        when(proveedores.buscarParaActualizar(10L)).thenReturn(Optional.of(existente));
        when(servicios.findAllById(List.of(2L))).thenReturn(List.of(inactivo));

        assertThatThrownBy(() -> service.actualizar(10L, request(List.of(2L))))
            .isInstanceOf(ConflictoProveedorException.class);
        assertThat(existente.getNombre()).isEqualTo("Original");
        assertThat(existente.getServicios()).isEmpty();
        verify(proveedores, never()).saveAndFlush(any());
    }

    @Test
    void rechazaDuplicadosAntesDeConsultarServicios() {
        assertThatThrownBy(() -> service.crear(request(List.of(1L, 1L))))
            .isInstanceOf(DatosProveedorInvalidosException.class);
        verifyNoInteractions(servicios);
        verify(proveedores, never()).saveAndFlush(any());
    }

    @Test
    void rechazaRucRepetidoAntesDeGuardar() {
        when(proveedores.existsByRuc("20123456789")).thenReturn(true);
        assertThatThrownBy(() -> service.crear(request(List.of())))
            .isInstanceOf(ConflictoProveedorException.class);
        verifyNoInteractions(servicios);
        verify(proveedores, never()).saveAndFlush(any());
    }

    @Test
    void cambiarEstadoNoEliminaAsociaciones() {
        var proveedor = new Proveedor();
        var servicio = mock(Servicio.class);
        proveedor.getServicios().add(servicio);
        when(proveedores.buscarParaActualizar(10L)).thenReturn(Optional.of(proveedor));
        assertThat(service.cambiarEstado(10L, false).estado()).isFalse();
        assertThat(proveedor.getServicios()).containsExactly(servicio);
    }
}
