import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DestinosApiRepository } from './destinos-api.repository';
import { Destino } from '../models/destino';

const url = '/api/admin/destinos';
const destino: Destino = {
  idDestino: 7, nombre: 'Cusco', ubicacion: 'Cusco, Perú', subtitulo: 'Historia entre montañas',
  descripcion: 'Recorre el Valle Sagrado.', imagenUrl: null, estado: true
};

describe('Contrato HTTP de Destinos', () => {
  let repo: DestinosApiRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), DestinosApiRepository] });
    repo = TestBed.inject(DestinosApiRepository);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('recibe un arreglo y omite filtros vacíos y parámetros de paginación', () => {
    repo.listar({ nombre: '   ' }).subscribe(datos => expect(datos).toEqual([destino]));
    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush([destino]);
  });

  it('codifica nombre y conserva estado=false al filtrar inactivos', () => {
    repo.listar({ nombre: '  Cusco & valle  ', estado: false }).subscribe();
    const request = http.expectOne(r => r.url === url);
    expect(request.request.params.keys().sort()).toEqual(['estado', 'nombre']);
    expect(request.request.params.get('nombre')).toBe('Cusco & valle');
    expect(request.request.params.get('estado')).toBe('false');
    expect(request.request.urlWithParams).toContain('%26');
    request.flush([]);
  });

  it('consulta el detalle administrativo con el ID real', () => {
    repo.detalle(7).subscribe(datos => expect(datos).toEqual(destino));
    const request = http.expectOne(`${url}/7`);
    expect(request.request.method).toBe('GET');
    request.flush(destino);
  });

  it('crea con los cinco campos recortados y excluye ID, estado y datos mock', () => {
    repo.crear({ ...destino, nombre: ' Cusco ', ubicacion: ' Cusco, Perú ', subtitulo: ' Andes ', descripcion: ' Viaje ', imagenUrl: '   ' }).subscribe();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ nombre: 'Cusco', ubicacion: 'Cusco, Perú', subtitulo: 'Andes', descripcion: 'Viaje', imagenUrl: null });
    request.flush(destino, { status: 201, statusText: 'Created' });
  });

  it('edita enviando todos los campos y conserva o elimina imagenUrl', () => {
    repo.actualizar(7, { ...destino, imagenUrl: ' /images/cusco.jpg ' }).subscribe();
    const conservar = http.expectOne(`${url}/7`);
    expect(conservar.request.method).toBe('PUT');
    expect(conservar.request.body).toEqual({ nombre: destino.nombre, ubicacion: destino.ubicacion, subtitulo: destino.subtitulo, descripcion: destino.descripcion, imagenUrl: '/images/cusco.jpg' });
    conservar.flush(destino);
    repo.actualizar(7, { nombre: destino.nombre, ubicacion: destino.ubicacion, subtitulo: destino.subtitulo, descripcion: destino.descripcion }).subscribe();
    const quitar = http.expectOne(`${url}/7`);
    expect(quitar.request.body.imagenUrl).toBeNull();
    quitar.flush(destino);
  });

  it('cambia el estado con PATCH y únicamente el booleano estado', () => {
    repo.cambiarEstado(7, false).subscribe();
    const request = http.expectOne(`${url}/7/estado`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ estado: false });
    request.flush({ ...destino, estado: false });
  });
});
