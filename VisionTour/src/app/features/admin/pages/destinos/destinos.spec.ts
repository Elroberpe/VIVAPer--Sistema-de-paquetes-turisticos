import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { appConfig } from '../../../../app.config';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { AlertasService } from '../../../../core/services/alertas.service';
import { CatalogoMockStore } from '../../../../shared/catalogo/catalogo-mock.store';
import { AuthRepository } from '../../../auth/data-access/auth.repository';
import { SesionAdmin } from '../../../auth/models/sesion';
import { DestinoEditorModal } from '../../components/destino-editor-modal';
import { Destino } from '../../../destinos/models/destino';
import { DestinosAdmin } from './destinos';

const url = '/api/admin/destinos';
const formulario = { nombre: 'Cusco', ubicacion: 'Cusco, Perú', subtitulo: 'Historia entre montañas', descripcion: 'Recorre el Valle Sagrado.', imagenUrl: '' };
const destino: Destino = { ...formulario, idDestino: 7, imagenUrl: null, estado: true };
const inactivo: Destino = { ...destino, idDestino: 8, nombre: 'Ica', ubicacion: 'Ica, Perú', subtitulo: 'Dunas y oasis', imagenUrl: '/images/ica.jpg', estado: false };

describe('Gestión de Destinos con la API', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let pagina: DestinosAdmin;
  let editor: DestinoEditorModal;
  const confirmar = vi.fn();

  beforeEach(() => {
    confirmar.mockReset().mockResolvedValue(true);
    TestBed.configureTestingModule({ providers: [
      ...appConfig.providers, provideHttpClientTesting(),
      { provide: AuthRepository, useValue: {
        iniciarSesion: () => of({ usuarioId: '1', nombre: 'Ana Prueba', correo: 'ana@example.test', rol: 'Administrador', expiraEn: Date.now() + 900000 } satisfies SesionAdmin),
        obtenerAccessToken: () => 'jwt-admin'
      } },
      { provide: AlertasService, useValue: { confirmar } }
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  async function renderizar() { await harness.fixture.whenStable(); harness.detectChanges(); }
  async function abrir(ruta = '/admin/destinos') {
    await TestBed.inject(AuthSessionService).ingresar('ana@example.test', 'clave-de-prueba');
    harness = await RouterTestingHarness.create(ruta);
    pagina = harness.routeDebugElement!.query(By.directive(DestinosAdmin)).componentInstance;
    editor = pagina.editor();
    const dialog = editor.dialog().nativeElement;
    Object.defineProperties(dialog, {
      showModal: { value: vi.fn(() => dialog.setAttribute('open', '')) },
      close: { value: vi.fn(() => dialog.removeAttribute('open')) }
    });
  }
  async function lista(datos: Destino[] = [destino, inactivo]) {
    const request = http.expectOne(r => r.url === url);
    request.flush(datos);
    await renderizar();
    return request;
  }
  async function tomar(ruta: string) {
    let request!: TestRequest;
    await vi.waitFor(() => { request = http.expectOne(r => r.url === ruta); });
    return request;
  }

  it('lista destinos reales con JWT, ubicación y subtítulo, sin tarjetas ni conteo de paquetes ficticios', async () => {
    await abrir();
    const request = await lista();
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-admin');
    expect(request.request.params.keys()).toEqual([]);
    const tabla = harness.routeNativeElement!.querySelector('table')!;
    expect(tabla.textContent).toContain('Cusco, Perú');
    expect(tabla.textContent).toContain('Historia entre montañas');
    expect(tabla.querySelector('tbody td')?.textContent).toBe('7');
    expect(tabla.querySelector('thead')?.textContent).not.toContain('Paquetes');
    expect(harness.routeNativeElement!.querySelector('.stats-grid')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('.admin-footer')?.textContent).toContain('Destinos · Cambios guardados');
    expect(tabla.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Sin imagen de Cusco');
  });

  it('busca por nombre en servidor y combina el filtro estado=false', async () => {
    await abrir('/admin/destinos?q=ic&estado=Inactivo');
    const request = await lista([inactivo]);
    expect(request.request.params.get('nombre')).toBe('ic');
    expect(request.request.params.get('estado')).toBe('false');
    pagina.busqueda.setValue('  Ica  ');
    const buscar = await tomar(url);
    expect(buscar.request.params.get('nombre')).toBe('Ica');
    expect(buscar.request.params.get('estado')).toBe('false');
    buscar.flush([inactivo]);
    await renderizar();
    expect(TestBed.inject(Router).url).toContain('q=Ica');
    expect(harness.routeNativeElement!.querySelector('.state-tag')?.textContent).toContain('Inactivo');
  });

  it('cancela respuestas antiguas y la búsqueda pendiente al limpiar', async () => {
    await abrir();
    const anterior = http.expectOne(url);
    await harness.navigateByUrl('/admin/destinos?q=ica');
    expect(anterior.cancelled).toBe(true);
    await lista([inactivo]);
    pagina.busqueda.setValue('no debe consultarse');
    pagina.limpiar();
    const limpiar = await tomar(url);
    expect(limpiar.request.params.has('nombre')).toBe(false);
    limpiar.flush([destino]);
    await new Promise(resolve => setTimeout(resolve, 400));
    await renderizar();
    expect(TestBed.inject(Router).url).toBe('/admin/destinos');
    expect(pagina.busqueda.value).toBe('');
    http.expectNone(r => r.url === url);
  });

  it('muestra seis filas y ordena y pagina localmente sin nuevas consultas', async () => {
    await abrir();
    const datos = Array.from({ length: 7 }, (_, i) => ({ ...destino, idDestino: i + 1, nombre: `Destino ${7 - i}` }));
    await lista(datos);
    expect(pagina.visibles()).toHaveLength(6);
    await pagina.irPagina(2);
    await renderizar();
    expect(pagina.visibles()[0].idDestino).toBe(7);
    pagina.filtrar('orden', 'asc');
    await renderizar();
    expect(pagina.pagina()).toBe(1);
    expect(pagina.visibles()[0].nombre).toBe('Destino 1');
    http.expectNone(r => r.url === url);
  });

  it('permite reintentar fallos de conexión y servidor y muestra un listado vacío', async () => {
    await abrir();
    http.expectOne(url).error(new ProgressEvent('error'));
    await renderizar();
    expect(pagina.fuente().error).toContain('conectar');
    pagina.recargar();
    http.expectOne(url).flush({}, { status: 500, statusText: 'Server Error' });
    await renderizar();
    expect(pagina.fuente().error).toContain('No pudimos completar');
    pagina.recargar();
    await lista([]);
    expect(harness.routeNativeElement!.textContent).toContain('No encontramos destinos');
  });

  it('consulta el detalle actualizado y cancela la petición al cerrar', async () => {
    await abrir(); await lista();
    editor.abrir('detalle', 7);
    http.expectOne(`${url}/7`).flush({ ...destino, ubicacion: 'Ubicación actualizada' });
    await renderizar();
    expect(editor.dialog().nativeElement.textContent).toContain('Ubicación actualizada');
    expect(editor.dialog().nativeElement.textContent).toContain(destino.descripcion);
    expect(editor.dialog().nativeElement.querySelector('input')).toBeNull();
    await editor.cerrar();
    editor.abrir('editar', 8);
    const pendiente = http.expectOne(`${url}/8`);
    await editor.cerrar();
    expect(pendiente.cancelled).toBe(true);
    for (const id of [0, -1, 1.5]) editor.abrir('detalle', id);
    http.expectNone(r => r.url.startsWith(`${url}/`));
  });

  it('rechaza campos obligatorios vacíos o con espacios y los máximos establecidos', async () => {
    await abrir(); await lista();
    editor.abrir('crear');
    for (const campo of ['nombre', 'ubicacion', 'subtitulo', 'descripcion'] as const) {
      editor.form.setValue({ ...formulario, [campo]: '   ' });
      await editor.guardar();
      expect(editor.form.controls[campo].invalid).toBe(true);
    }
    for (const [campo, longitud] of [['nombre', 101], ['ubicacion', 151], ['subtitulo', 101], ['imagenUrl', 501]] as const) {
      editor.form.setValue({ ...formulario, [campo]: 'a'.repeat(longitud) });
      await editor.guardar();
      expect(editor.form.controls[campo].hasError('maxlength')).toBe(true);
    }
    http.expectNone(r => r.method === 'POST');
  });

  it('crea desde el formulario con límites válidos, descripción larga e imagen opcional', async () => {
    await abrir('/admin/destinos?estado=Inactivo'); await lista([inactivo]);
    editor.abrir('crear');
    const datos = { nombre: 'A', ubicacion: 'u'.repeat(150), subtitulo: 's'.repeat(100), descripcion: 'd'.repeat(1000), imagenUrl: '' };
    editor.form.setValue(datos);
    await renderizar();
    editor.dialog().nativeElement.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    const request = await tomar(url);
    expect(request.request.body).toEqual({ ...datos, imagenUrl: null });
    expect(request.request.method).toBe('POST');
    await editor.guardar();
    expect(await editor.confirmarSalida()).toBe(false);
    expect(editor.guardando()).toBe(true);
    request.flush({ ...destino, ...datos, imagenUrl: null }, { status: 201, statusText: 'Created' });
    const recarga = await tomar(url);
    expect(recarga.request.params.get('estado')).toBe('false');
    recarga.flush([inactivo]);
    await renderizar();
    expect(editor.dialog().nativeElement.open).toBe(false);
    expect(editor.form.pristine).toBe(true);
    expect(pagina.mensaje()).toContain('guardado correctamente');
  });

  it('conserva el borrador ante conflictos y asocia errores del servidor a los campos', async () => {
    await abrir(); await lista();
    editor.abrir('crear');
    editor.form.setValue(formulario);
    editor.form.markAsDirty();
    const conflicto = editor.guardar();
    http.expectOne(url).flush({ codigo: 'CONFLICTO_DATOS', mensaje: 'Conflicto general' }, { status: 409, statusText: 'Conflict' });
    await conflicto; await renderizar();
    expect(editor.form.getRawValue()).toEqual(formulario);
    expect(editor.form.dirty).toBe(true);
    expect(editor.error()).toContain('nombre y ubicación');
    expect(editor.dialog().nativeElement.open).toBe(true);
    const invalido = editor.guardar();
    http.expectOne(url).flush({ errores: { ubicacion: 'Revisa la ubicación', subtitulo: 'Revisa el subtítulo', imagenUrl: 'Imagen rechazada' } }, { status: 400, statusText: 'Bad Request' });
    await invalido; await renderizar();
    expect(editor.dialog().nativeElement.textContent).toContain('Revisa la ubicación');
    expect(editor.dialog().nativeElement.textContent).toContain('Revisa el subtítulo');
    expect(editor.dialog().nativeElement.textContent).toContain('Imagen rechazada');
    const sinDetalle = editor.guardar();
    http.expectOne(url).flush({}, { status: 400, statusText: 'Bad Request' });
    await sinDetalle;
    expect(editor.error()).toContain('Revisa los datos');
    expect(editor.form.getRawValue()).toEqual(formulario);
  });

  it('edita destinos inactivos con PUT completo y conserva o elimina su imagen', async () => {
    await abrir(); await lista();
    editor.abrir('editar', 8);
    http.expectOne(`${url}/8`).flush(inactivo);
    await renderizar();
    editor.form.controls.nombre.setValue('Ica actualizada');
    const conservar = editor.guardar();
    const put = http.expectOne(`${url}/8`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ nombre: 'Ica actualizada', ubicacion: inactivo.ubicacion, subtitulo: inactivo.subtitulo, descripcion: inactivo.descripcion, imagenUrl: inactivo.imagenUrl });
    put.flush({ ...inactivo, nombre: 'Ica actualizada' });
    await conservar; await lista();
    editor.abrir('editar', 8);
    http.expectOne(`${url}/8`).flush(inactivo);
    editor.form.controls.imagenUrl.setValue('   ');
    const borrar = editor.guardar();
    const quitar = http.expectOne(`${url}/8`);
    expect(quitar.request.body.imagenUrl).toBeNull();
    quitar.flush({ ...inactivo, imagenUrl: null });
    await borrar; await lista();
  });

  it('confirma el descarte con Escape y al navegar, conservando el borrador si se cancela', async () => {
    await abrir(); await lista();
    editor.abrir('crear');
    await renderizar();
    const nombre = editor.dialog().nativeElement.querySelector<HTMLInputElement>('#destino-nombre')!;
    nombre.value = 'Borrador'; nombre.dispatchEvent(new Event('input', { bubbles: true }));
    confirmar.mockResolvedValue(false);
    editor.dialog().nativeElement.dispatchEvent(new Event('cancel', { cancelable: true }));
    await renderizar();
    expect(editor.dialog().nativeElement.open).toBe(true);
    await harness.navigateByUrl('/admin/paquetes');
    expect(TestBed.inject(Router).url).toBe('/admin/destinos');
    expect(editor.form.controls.nombre.value).toBe('Borrador');
    confirmar.mockResolvedValue(true);
    await harness.navigateByUrl('/admin/paquetes');
    expect(TestBed.inject(Router).url).toBe('/admin/paquetes');
  });

  it('desactiva, bloquea envíos repetidos y corrige la última página filtrada', async () => {
    await abrir('/admin/destinos?estado=Activo&pagina=2');
    const datos = Array.from({ length: 7 }, (_, i) => ({ ...destino, idDestino: i + 1 }));
    await lista(datos);
    const guardar = pagina.cambiarEstado(datos[6]);
    const patch = await tomar(`${url}/7/estado`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ estado: false });
    await pagina.cambiarEstado(datos[6]);
    expect(pagina.confirmarSalida()).toBe(false);
    patch.flush({ ...destino, estado: false });
    await guardar;
    const recarga = await lista(datos.slice(0, 6));
    expect(recarga.request.params.get('estado')).toBe('true');
    expect(pagina.pagina()).toBe(1);
    expect(TestBed.inject(Router).url).not.toContain('pagina=');
    expect(pagina.cambiando()).toBeNull();
  });

  it('activa un destino y no envía cambios cuando se cancela la confirmación', async () => {
    await abrir(); await lista();
    confirmar.mockResolvedValue(false);
    await pagina.cambiarEstado(inactivo);
    http.expectNone(`${url}/8/estado`);
    confirmar.mockResolvedValue(true);
    const activar = pagina.cambiarEstado(inactivo);
    const patch = await tomar(`${url}/8/estado`);
    expect(patch.request.body).toEqual({ estado: true });
    patch.flush({ ...inactivo, estado: true });
    await activar; await lista();
  });

  it('informa y recarga ante 404 de detalle o cambio de estado', async () => {
    await abrir(); await lista();
    editor.abrir('editar', 7);
    http.expectOne(`${url}/7`).flush({}, { status: 404, statusText: 'Not Found' });
    await lista([]);
    expect(editor.error()).toContain('ya no está disponible');
    await editor.cerrar();
    const cambiar = pagina.cambiarEstado(destino);
    const patch = await tomar(`${url}/7/estado`);
    patch.flush({}, { status: 404, statusText: 'Not Found' });
    await cambiar; await lista([]);
    expect(pagina.errorAccion()).toContain('ya no está disponible');
  });

  it('conserva la edición si el destino deja de existir al guardar', async () => {
    await abrir(); await lista();
    editor.abrir('editar', 7);
    http.expectOne(`${url}/7`).flush(destino);
    editor.form.controls.ubicacion.setValue('Ubicación pendiente');
    const guardar = editor.guardar();
    http.expectOne(`${url}/7`).flush({}, { status: 404, statusText: 'Not Found' });
    await guardar; await lista([]);
    expect(editor.form.controls.ubicacion.value).toBe('Ubicación pendiente');
    expect(editor.dialog().nativeElement.open).toBe(true);
  });

  it('muestra el 403 sin reintentos automáticos', async () => {
    await abrir();
    http.expectOne(url).flush({}, { status: 403, statusText: 'Forbidden' });
    await renderizar();
    expect(pagina.fuente().error).toContain('No tienes permiso');
    http.expectNone(r => r.url === url);
  });

  it('guarda en la API sin alterar los destinos ni paquetes del catálogo mock', async () => {
    await abrir(); await lista();
    const catalogo = TestBed.inject(CatalogoMockStore);
    const antes = structuredClone(catalogo.snapshot);
    editor.abrir('crear'); editor.form.setValue(formulario);
    const guardar = editor.guardar();
    http.expectOne(url).flush(destino, { status: 201, statusText: 'Created' });
    await guardar; await lista();
    expect(catalogo.snapshot).toEqual(antes);
    await harness.navigateByUrl('/destinos');
    expect(harness.routeNativeElement!.querySelector('vp-header')).not.toBeNull();
    http.expectOne('/api/public/destinos').flush([destino]);
  });
});
