import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { appConfig } from '../../../app.config';
import { AuthRepository } from '../../auth/data-access/auth.repository';
import { Buscador } from '../../paquetes/components/buscador';
import { Inicio } from '../../inicio/pages/inicio';
import { Destino } from '../models/destino';
import { Destinos } from './destinos';
import { DetalleDestino } from './detalle-destino';

const url = '/api/public/destinos';
const destino: Destino = {
  idDestino: 37, nombre: 'Destino real del norte', ubicacion: 'Piura, Perú', subtitulo: 'Una nueva experiencia',
  descripcion: 'Conoce los paisajes del norte.\nDisfruta de su cultura.', imagenUrl: null, estado: true
};

describe('Destinos para visitantes', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      ...appConfig.providers, provideHttpClientTesting(),
      { provide: AuthRepository, useValue: { obtenerSesion: () => of(null), obtenerAccessToken: () => null } }
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  async function renderizar() { await harness.fixture.whenStable(); harness.detectChanges(); }
  async function abrir(ruta = '/destinos') { harness = await RouterTestingHarness.create(ruta); }
  async function lista(datos: Destino[] = [destino]) {
    const request = http.expectOne(url);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(datos); await renderizar();
    return request;
  }
  async function tomar(ruta: string) {
    let request!: TestRequest;
    await vi.waitFor(() => { request = http.expectOne(ruta); });
    return request;
  }

  it('muestra el listado público real sin sesión, con imagen alternativa y enlaces al detalle', async () => {
    await abrir();
    expect(harness.routeNativeElement!.textContent).toContain('Descubriendo destinos');
    const request = await lista();
    expect(request.request.params.keys()).toEqual([]);
    const contenido = harness.routeNativeElement!;
    const tarjeta = contenido.querySelector('.destination-feature')!;
    expect(tarjeta.textContent).toContain(destino.nombre);
    expect(tarjeta.textContent).toContain(destino.ubicacion);
    expect(tarjeta.textContent).toContain(destino.subtitulo);
    expect(tarjeta.textContent).not.toContain('Conoce los paisajes del norte.');
    expect(tarjeta.querySelector('a.destination-link')?.getAttribute('href')).toBe('/destinos/37');
    expect(tarjeta.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Sin imagen de Destino real del norte');
    expect(contenido.querySelector('.admin-sidebar')).toBeNull();
    expect(contenido.querySelector('.customer-login')).not.toBeNull();
    http.expectNone(r => r.url.startsWith('/api/admin/'));
  });

  it('presenta todos los destinos recibidos sin imponer las seis filas del panel', async () => {
    await abrir();
    await lista(Array.from({ length: 7 }, (_, i) => ({ ...destino, idDestino: i + 1 })));
    expect(harness.routeNativeElement!.querySelectorAll('.destination-feature')).toHaveLength(7);
    expect(harness.routeNativeElement!.querySelector('.pagination-controls')).toBeNull();
  });

  it('distingue un catálogo vacío y conserva un enlace al inicio', async () => {
    await abrir(); await lista([]);
    expect(harness.routeNativeElement!.textContent).toContain('Pronto habrá nuevos destinos');
    expect(harness.routeNativeElement!.querySelector('.empty-state a')?.getAttribute('href')).toBe('/');
    expect(harness.routeNativeElement!.querySelector('.loading-state')).toBeNull();
  });

  it('muestra errores de conexión y permite reintentar el listado sin cambiar de ruta', async () => {
    await abrir();
    http.expectOne(url).error(new ProgressEvent('error'));
    await renderizar();
    expect(harness.routeNativeElement!.textContent).toContain('No pudimos conectar');
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.empty-state button')!.click();
    await lista();
    expect(harness.routeNativeElement!.textContent).toContain(destino.nombre);
    expect(TestBed.inject(Router).url).toBe('/destinos');
  });

  it('navega desde la tarjeta hasta el detalle público y conserva el layout de visitantes', async () => {
    await abrir(); await lista();
    harness.routeNativeElement!.querySelector<HTMLAnchorElement>('.destination-feature a.destination-link')!.click();
    const request = await tomar(`${url}/37`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(destino); await renderizar();
    expect(TestBed.inject(Router).url).toBe('/destinos/37');
    expect(harness.routeNativeElement!.querySelector('vp-header')).not.toBeNull();
    expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toBe(destino.nombre);
    expect(harness.routeNativeElement!.textContent).toContain(destino.ubicacion);
    expect(harness.routeNativeElement!.textContent).toContain(destino.subtitulo);
    expect(harness.routeNativeElement!.querySelector('.destination-description')?.textContent).toBe(destino.descripcion);
    expect(harness.routeNativeElement!.querySelector('.destination-links a')?.getAttribute('href')).toBe('/paquetes');
    expect(harness.routeNativeElement!.querySelector('.destination-links a.text-link')?.getAttribute('href')).toBe('/destinos');
  });

  it('abre un detalle por enlace directo sin consultar el listado ni requerir sesión', async () => {
    await abrir('/destinos/37');
    const request = http.expectOne(`${url}/37`);
    expect(request.request.method).toBe('GET');
    request.flush(destino); await renderizar();
    expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toBe(destino.nombre);
    http.expectNone(url);
    http.expectNone('/api/admin/destinos/37');
  });

  it.each(['texto', '0', '-1', '1.5', '9007199254740992'])('presenta un ID no válido (%s) sin consultar la API', async id => {
    await abrir(`/destinos/${id}`);
    await renderizar();
    expect(harness.routeNativeElement!.textContent).toContain('Destino no disponible');
    http.expectNone(r => r.url.startsWith(url));
  });

  it('trata un destino inexistente o inactivo como no disponible sin buscar datos administrativos', async () => {
    await abrir('/destinos/37');
    http.expectOne(`${url}/37`).flush({ codigo: 'RECURSO_NO_ENCONTRADO' }, { status: 404, statusText: 'Not Found' });
    await renderizar();
    expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toContain('Destino no disponible');
    expect(harness.routeNativeElement!.querySelector('.empty-state a')?.getAttribute('href')).toBe('/destinos');
    http.expectNone('/api/admin/destinos/37');
  });

  it('reintenta el detalle ante un error temporal', async () => {
    await abrir('/destinos/37');
    http.expectOne(`${url}/37`).flush({}, { status: 500, statusText: 'Server Error' });
    await renderizar();
    expect(harness.routeNativeElement!.textContent).toContain('No pudimos cargar el destino');
    const pagina = harness.routeDebugElement!.query(By.directive(DetalleDestino)).componentInstance as DetalleDestino;
    pagina.reintentar();
    http.expectOne(`${url}/37`).flush(destino); await renderizar();
    expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toBe(destino.nombre);
  });

  it('cancela la consulta anterior cuando cambia el ID de la ruta', async () => {
    await abrir('/destinos/37');
    const anterior = http.expectOne(`${url}/37`);
    await harness.navigateByUrl('/destinos/38');
    expect(anterior.cancelled).toBe(true);
    http.expectOne(`${url}/38`).flush({ ...destino, idDestino: 38, nombre: 'Otro destino' });
    await renderizar();
    expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toBe('Otro destino');
  });

  it('vuelve a consultar al regresar al catálogo y deja de mostrar un destino desactivado', async () => {
    await abrir(); await lista();
    await harness.navigateByUrl('/destinos/37');
    http.expectOne(`${url}/37`).flush({}, { status: 404, statusText: 'Not Found' });
    await renderizar();
    await harness.navigateByUrl('/destinos');
    await lista([]);
    expect(harness.routeNativeElement!.querySelector('.destination-feature')).toBeNull();
    expect(harness.routeNativeElement!.textContent).toContain('Pronto habrá nuevos destinos');
  });

  it('muestra destinos reales en el inicio y mantiene los selectores de paquetes con sus IDs mock', async () => {
    await abrir('/'); await lista();
    const tarjeta = harness.routeNativeElement!.querySelector('.destination-grid .destination-card')!;
    expect(tarjeta.textContent).toContain(destino.nombre);
    expect(tarjeta.getAttribute('href')).toBe('/destinos/37');
    expect(harness.routeNativeElement!.querySelector('.hero-index')?.textContent).not.toContain('04 destinos');
    await vi.waitFor(async () => {
      await renderizar();
      expect(harness.routeNativeElement!.querySelectorAll('vp-paquete-card').length).toBeGreaterThan(0);
    });
    const opciones = Array.from(harness.routeNativeElement!.querySelectorAll<HTMLOptionElement>('#buscar-destino option')).map(opcion => opcion.value);
    expect(opciones).toContain('ica');
    expect(opciones).not.toContain('37');
    const buscador = harness.routeDebugElement!.query(By.directive(Buscador)).componentInstance as Buscador;
    buscador.form.controls.destino.setValue('ica'); buscador.buscar();
    await renderizar();
    expect(TestBed.inject(Router).url).toContain('/paquetes?destino=ica');
    http.expectNone(url);
  });

  it('mantiene los paquetes del inicio disponibles si falla la API pública y permite reintentar', async () => {
    await abrir('/');
    http.expectOne(url).flush({}, { status: 500, statusText: 'Server Error' });
    await renderizar();
    await vi.waitFor(async () => {
      await renderizar();
      expect(harness.routeNativeElement!.querySelectorAll('vp-paquete-card').length).toBeGreaterThan(0);
    });
    const inicio = harness.routeDebugElement!.query(By.directive(Inicio)).componentInstance as Inicio;
    inicio.reintentarDestinos(); await lista();
    expect(harness.routeNativeElement!.querySelector('.destination-card')?.textContent).toContain(destino.nombre);
  });

  it('muestra el estado vacío de destinos en el inicio sin ocultar el buscador', async () => {
    await abrir('/'); await lista([]);
    expect(harness.routeNativeElement!.textContent).toContain('Pronto habrá nuevos destinos');
    expect(harness.routeNativeElement!.querySelector('vp-buscador')).not.toBeNull();
  });

  it('permite reconsultar la página pública usando el mismo repositorio', async () => {
    await abrir(); await lista();
    const pagina = harness.routeDebugElement!.query(By.directive(Destinos)).componentInstance as Destinos;
    pagina.reintentar(); await lista([{ ...destino, nombre: 'Nombre actualizado' }]);
    expect(harness.routeNativeElement!.textContent).toContain('Nombre actualizado');
  });
});
