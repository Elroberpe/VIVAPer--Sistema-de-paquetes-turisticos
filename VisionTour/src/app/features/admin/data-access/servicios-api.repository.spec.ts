import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ServiciosApiRepository } from './servicios-api.repository';
import { Servicio } from '../models/servicio';

const url = '/api/admin/servicios';
const servicio: Servicio = { idServicio: 7, nombre: 'Transporte', descripcion: null, estado: true };

describe('Contrato HTTP de Servicios', () => {
  let repo: ServiciosApiRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), ServiciosApiRepository] });
    repo = TestBed.inject(ServiciosApiRepository);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('recibe un arreglo y omite los filtros vacíos y los parámetros de Usuarios', () => {
    repo.listar({ nombre: '   ' }).subscribe(datos => expect(datos).toEqual([servicio]));
    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush([servicio]);
  });

  it('envía nombre recortado y estado=false mediante HttpParams', () => {
    repo.listar({ nombre: '  Transporte & guía  ', estado: false }).subscribe();
    const request = http.expectOne(r => r.url === url);
    expect(request.request.params.keys().sort()).toEqual(['estado', 'nombre']);
    expect(request.request.params.get('nombre')).toBe('Transporte & guía');
    expect(request.request.params.get('estado')).toBe('false');
    expect(request.request.urlWithParams).toContain('%26');
    request.flush([]);
  });

  it('consulta un detalle con el ID real', () => {
    repo.detalle(7).subscribe(datos => expect(datos.idServicio).toBe(7));
    const request = http.expectOne(`${url}/7`);
    expect(request.request.method).toBe('GET');
    request.flush(servicio);
  });

  it('crea enviando únicamente nombre y descripción normalizados', () => {
    repo.crear({ ...servicio, nombre: '  Transporte  ', descripcion: '   ' }).subscribe();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ nombre: 'Transporte', descripcion: null });
    request.flush(servicio, { status: 201, statusText: 'Created' });
  });

  it('reemplaza ambos textos con PUT y borra la descripción omitida', () => {
    repo.actualizar(7, { nombre: '  Guía  ', descripcion: '  Visita guiada  ' }).subscribe();
    const editar = http.expectOne(`${url}/7`);
    expect(editar.request.method).toBe('PUT');
    expect(editar.request.body).toEqual({ nombre: 'Guía', descripcion: 'Visita guiada' });
    editar.flush(servicio);
    repo.actualizar(7, { nombre: 'Guía' }).subscribe();
    const borrarDescripcion = http.expectOne(`${url}/7`);
    expect(borrarDescripcion.request.body).toEqual({ nombre: 'Guía', descripcion: null });
    borrarDescripcion.flush(servicio);
  });

  it('envía exclusivamente estado booleano con PATCH', () => {
    repo.cambiarEstado(7, false).subscribe();
    const request = http.expectOne(`${url}/7/estado`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ estado: false });
    request.flush({ ...servicio, estado: false });
  });
});
