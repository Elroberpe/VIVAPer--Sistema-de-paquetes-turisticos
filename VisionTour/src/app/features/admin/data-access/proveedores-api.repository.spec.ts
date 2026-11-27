import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProveedoresApiRepository } from './proveedores-api.repository';
import { ProveedorDatos } from '../models/proveedor';
import { erroresCamposProveedor, mensajeProveedores } from './proveedores-errors';
import { HttpErrorResponse } from '@angular/common/http';

const url = '/api/admin/proveedores';
const datos: ProveedorDatos = { ruc: '00123456789', nombre: ' Hotel Andino ', encargado: ' Ana ', email: '  ', telefono: ' +51 987654321 ', serviciosIds: [1, 2] };

describe('Contrato HTTP de Proveedores', () => {
  let repo: ProveedoresApiRepository;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), ProveedoresApiRepository] });
    repo = TestBed.inject(ProveedoresApiRepository); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('consulta una página del servidor y omite nombre y estado vacíos', () => {
    const pagina = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 };
    repo.listar({ page: 0, size: 10, nombre: ' ' }).subscribe(dato => expect(dato).toEqual(pagina));
    const request = http.expectOne(r => r.url === url);
    expect(request.request.params.keys()).toEqual(['page', 'size']);
    expect(request.request.params.get('page')).toBe('0'); expect(request.request.params.get('size')).toBe('10');
    request.flush(pagina);
  });

  it('codifica el nombre y usa inactivo en lugar del booleano de Servicios', () => {
    repo.listar({ page: 2, size: 10, nombre: ' Hotel & 100%_! ', estado: 'inactivo' }).subscribe();
    const request = http.expectOne(r => r.url === url);
    expect(request.request.params.get('nombre')).toBe('Hotel & 100%_!');
    expect(request.request.params.get('estado')).toBe('inactivo');
    expect(request.request.urlWithParams).toContain('%26');
    request.flush({ content: [], page: 2, size: 10, totalElements: 0, totalPages: 0 });
  });

  it.each(['crear', 'actualizar'] as const)('%s envía únicamente los campos editables y conserva IDs y RUC como texto', operacion => {
    const entrada = { ...datos, estado: false, idProveedor: 99, ciudad: 'No enviar', servicios: [] };
    (operacion === 'crear' ? repo.crear(entrada) : repo.actualizar(15, entrada)).subscribe();
    const request = http.expectOne(operacion === 'crear' ? url : `${url}/15`);
    expect(request.request.method).toBe(operacion === 'crear' ? 'POST' : 'PUT');
    expect(request.request.body).toEqual({ ruc: '00123456789', nombre: 'Hotel Andino', encargado: 'Ana', email: null, telefono: '+51 987654321', serviciosIds: [1, 2] });
    expect(datos.nombre).toBe(' Hotel Andino '); request.flush({});
  });

  it('consulta el detalle sin construirlo desde el listado', () => {
    repo.detalle(15).subscribe(); const request = http.expectOne(`${url}/15`);
    expect(request.request.method).toBe('GET'); request.flush({});
  });

  it('PATCH recibe una respuesta reducida y no supone datos completos del proveedor', () => {
    repo.cambiarEstado(15, false).subscribe(dato => expect(dato).toEqual({ idProveedor: 15, estado: false }));
    const request = http.expectOne(`${url}/15/estado`);
    expect(request.request.method).toBe('PATCH'); expect(request.request.body).toEqual({ estado: false });
    request.flush({ idProveedor: 15, estado: false });
  });

  it('distingue conflictos sin comparar textos y recoge errores de elementos de servicios', () => {
    expect(mensajeProveedores(new HttpErrorResponse({ status: 409, error: { codigo: 'CONFLICTO_DATOS', mensaje: 'El servicio está inactivo.' } }))).toBe('El servicio está inactivo.');
    expect(erroresCamposProveedor(new HttpErrorResponse({ status: 400, error: { errores: { ruc: 'RUC inválido', 'serviciosIds[0]': 'ID inválido' } } }))).toEqual({ ruc: 'RUC inválido', serviciosIds: 'ID inválido' });
    expect(mensajeProveedores(new HttpErrorResponse({ status: 500, error: { mensaje: 'Detalle interno' } }))).not.toContain('Detalle interno');
  });
});
