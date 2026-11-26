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
import { AuthRepository } from '../../../auth/data-access/auth.repository';
import { SesionAdmin } from '../../../auth/models/sesion';
import { ServicioEditorModal } from '../../components/servicio-editor-modal';
import { Servicio } from '../../models/servicio';
import { ServiciosAdmin } from './servicios';

const url = '/api/admin/servicios';
const servicio: Servicio = { idServicio: 7, nombre: 'Transporte', descripcion: null, estado: true };
const inactivo: Servicio = { idServicio: 8, nombre: 'Alojamiento', descripcion: 'Hospedaje', estado: false };

describe('Gestión de Servicios con la API', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let pagina: ServiciosAdmin;
  let editor: ServicioEditorModal;
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
  async function abrir(ruta = '/admin/servicios') {
    await TestBed.inject(AuthSessionService).ingresar('ana@example.test', 'clave-de-prueba');
    harness = await RouterTestingHarness.create(ruta);
    pagina = harness.routeDebugElement!.query(By.directive(ServiciosAdmin)).componentInstance;
    editor = pagina.editor();
    const dialog = editor.dialog().nativeElement;
    Object.defineProperties(dialog, {
      showModal: { value: vi.fn(() => dialog.setAttribute('open', '')) },
      close: { value: vi.fn(() => dialog.removeAttribute('open')) }
    });
  }
  async function lista(datos: Servicio[] = [servicio, inactivo]) {
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

  it('lista los datos reales con JWT, ID y descripción nula sin campos del mock', async () => {
    await abrir();
    const request = await lista();
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-admin');
    expect(request.request.params.keys()).toEqual([]);
    const tabla = harness.routeNativeElement!.querySelector('table')!;
    expect(tabla.textContent).toContain('Transporte');
    expect(tabla.textContent).toContain('Sin descripción');
    expect(tabla.querySelector('tbody td')?.textContent).toBe('7');
    expect(tabla.textContent).not.toMatch(/Proveedor|Tarifa/);
    expect(harness.routeNativeElement!.textContent).not.toContain('Datos ficticios');
    expect(harness.routeNativeElement!.textContent).toContain('Según los filtros actuales');
  });

  it('busca en servidor, conserva filtros en la URL y envía estado=false', async () => {
    await abrir('/admin/servicios?q=aloj&estado=Inactivo');
    const request = await lista([inactivo]);
    expect(request.request.params.get('nombre')).toBe('aloj');
    expect(request.request.params.get('estado')).toBe('false');
    pagina.busqueda.setValue('  Hospedaje  ');
    const buscar = await tomar(url);
    expect(buscar.request.params.get('nombre')).toBe('Hospedaje');
    expect(buscar.request.params.get('estado')).toBe('false');
    buscar.flush([]);
    await renderizar();
    expect(TestBed.inject(Router).url).toContain('q=Hospedaje');
  });

  it('cancela consultas antiguas y la búsqueda pendiente al limpiar filtros', async () => {
    await abrir();
    const anterior = http.expectOne(url);
    await harness.navigateByUrl('/admin/servicios?q=aloj');
    expect(anterior.cancelled).toBe(true);
    await lista([inactivo]);
    pagina.busqueda.setValue('no debe consultarse');
    pagina.limpiar();
    await tomar(url).then(r => r.flush([servicio]));
    await new Promise(resolve => setTimeout(resolve, 400));
    await renderizar();
    expect(TestBed.inject(Router).url).toBe('/admin/servicios');
    expect(pagina.busqueda.value).toBe('');
    http.expectNone(r => r.url === url);
  });

  it('pagina y ordena localmente sin enviar otra solicitud al servidor', async () => {
    await abrir();
    const datos = Array.from({ length: 7 }, (_, i) => ({ ...servicio, idServicio: i + 1, nombre: `Servicio ${7 - i}` }));
    await lista(datos);
    expect(pagina.visibles()).toHaveLength(6);
    await pagina.irPagina(2);
    await renderizar();
    expect(pagina.visibles()[0].idServicio).toBe(7);
    pagina.filtrar('orden', 'asc');
    await renderizar();
    expect(pagina.pagina()).toBe(1);
    expect(pagina.visibles()[0].nombre).toBe('Servicio 1');
    http.expectNone(r => r.url === url);
  });

  it('muestra vacío y permite reintentar un error sin formato de API', async () => {
    await abrir();
    http.expectOne(url).flush({ error: 'Internal Server Error' }, { status: 500, statusText: 'Error' });
    await renderizar();
    expect(harness.routeNativeElement!.textContent).toContain('No pudimos cargar los servicios');
    pagina.recargar();
    await lista([]);
    expect(harness.routeNativeElement!.textContent).toContain('No encontramos servicios');
  });

  it('consulta el detalle actualizado y cancela una consulta al cerrar', async () => {
    await abrir(); await lista();
    editor.abrir('detalle', 7);
    http.expectOne(`${url}/7`).flush({ ...servicio, nombre: 'Dato actualizado' });
    await renderizar();
    expect(editor.dialog().nativeElement.textContent).toContain('Dato actualizado');
    expect(editor.dialog().nativeElement.querySelector('input')).toBeNull();
    await editor.cerrar();
    editor.abrir('editar', 8);
    const pendiente = http.expectOne(`${url}/8`);
    await editor.cerrar();
    expect(pendiente.cancelled).toBe(true);
    editor.abrir('detalle', 0);
    http.expectNone(`${url}/0`);
  });

  it('valida los límites reales, crea un nombre de un carácter y recarga conservando filtros', async () => {
    await abrir('/admin/servicios?estado=Inactivo'); await lista([inactivo]);
    editor.abrir('crear');
    for (const datos of [
      { nombre: '   ', descripcion: '' },
      { nombre: 'a'.repeat(101), descripcion: '' },
      { nombre: 'Guía', descripcion: 'a'.repeat(256) }
    ]) {
      editor.form.setValue(datos);
      await editor.guardar();
      http.expectNone(r => r.method === 'POST');
    }
    editor.form.setValue({ nombre: 'A', descripcion: '' });
    const guardar = editor.guardar();
    const request = http.expectOne(url);
    expect(request.request.body).toEqual({ nombre: 'A', descripcion: null });
    await editor.guardar();
    expect(editor.guardando()).toBe(true);
    expect(await editor.confirmarSalida()).toBe(false);
    request.flush({ ...servicio, nombre: 'A' }, { status: 201, statusText: 'Created' });
    await guardar;
    const recarga = await lista([inactivo]);
    expect(recarga.request.params.get('estado')).toBe('false');
    expect(editor.dialog().nativeElement.open).toBe(false);
    expect(editor.form.pristine).toBe(true);
  });

  it('conserva los datos ante duplicados y muestra errores por campo', async () => {
    await abrir(); await lista();
    editor.abrir('crear');
    editor.form.setValue({ nombre: 'Guía', descripcion: 'Conservar borrador' });
    const duplicado = editor.guardar();
    http.expectOne(url).flush({ status: 409, error: 'Conflict' }, { status: 409, statusText: 'Conflict' });
    await duplicado; await renderizar();
    expect(editor.form.controls.descripcion.value).toBe('Conservar borrador');
    expect(editor.dialog().nativeElement.open).toBe(true);
    expect(editor.dialog().nativeElement.textContent).toContain('Ya existe un servicio');
    const invalido = editor.guardar();
    http.expectOne(url).flush({ errores: { descripcion: 'Descripción rechazada' } }, { status: 400, statusText: 'Bad Request' });
    await invalido; await renderizar();
    expect(editor.dialog().nativeElement.textContent).toContain('Descripción rechazada');
  });

  it('edita un servicio inactivo con PUT conservando o borrando su descripción', async () => {
    await abrir(); await lista();
    editor.abrir('editar', 8);
    http.expectOne(`${url}/8`).flush(inactivo);
    await renderizar();
    editor.form.controls.nombre.setValue('Hospedaje actualizado');
    const conservar = editor.guardar();
    const put = http.expectOne(`${url}/8`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ nombre: 'Hospedaje actualizado', descripcion: 'Hospedaje' });
    put.flush({ ...inactivo, nombre: 'Hospedaje actualizado' });
    await conservar; await lista();
    editor.abrir('editar', 8);
    http.expectOne(`${url}/8`).flush(inactivo);
    editor.form.controls.descripcion.setValue('   ');
    const borrar = editor.guardar();
    const limpiar = http.expectOne(`${url}/8`);
    expect(limpiar.request.body).toEqual({ nombre: inactivo.nombre, descripcion: null });
    limpiar.flush({ ...inactivo, descripcion: null });
    await borrar; await lista();
  });

  it('confirma el descarte al cerrar con Escape o navegar y conserva el borrador si se cancela', async () => {
    await abrir(); await lista();
    editor.abrir('crear');
    editor.form.controls.nombre.setValue('Borrador');
    editor.form.markAsDirty();
    confirmar.mockResolvedValue(false);
    editor.dialog().nativeElement.dispatchEvent(new Event('cancel', { cancelable: true }));
    await renderizar();
    expect(editor.dialog().nativeElement.open).toBe(true);
    await harness.navigateByUrl('/admin/destinos');
    expect(TestBed.inject(Router).url).toBe('/admin/servicios');
    expect(editor.form.controls.nombre.value).toBe('Borrador');
    confirmar.mockResolvedValue(true);
    await harness.navigateByUrl('/admin/destinos');
    expect(TestBed.inject(Router).url).toBe('/admin/destinos');
  });

  it('confirma el estado, impide duplicados y corrige la última página tras desactivar', async () => {
    await abrir('/admin/servicios?estado=Activo&pagina=2');
    const datos = Array.from({ length: 7 }, (_, i) => ({ ...servicio, idServicio: i + 1 }));
    await lista(datos);
    const guardar = pagina.cambiarEstado(datos[6]);
    const patch = await tomar(`${url}/7/estado`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ estado: false });
    await pagina.cambiarEstado(datos[6]);
    patch.flush({ ...servicio, estado: false });
    await guardar;
    const recarga = await lista(datos.slice(0, 6));
    expect(recarga.request.params.get('estado')).toBe('true');
    expect(pagina.pagina()).toBe(1);
    expect(TestBed.inject(Router).url).not.toContain('pagina=');
    expect(pagina.cambiando()).toBeNull();
  });

  it('activa un servicio y no modifica el estado cuando se cancela', async () => {
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

  it('actualiza el listado si un servicio desaparece al consultar o guardar', async () => {
    await abrir(); await lista();
    editor.abrir('editar', 7);
    http.expectOne(`${url}/7`).flush({}, { status: 404, statusText: 'Not Found' });
    await lista([]);
    expect(editor.error()).toContain('ya no está disponible');
    await editor.cerrar();
    const guardar = pagina.cambiarEstado(servicio);
    const patch = await tomar(`${url}/7/estado`);
    patch.flush({}, { status: 404, statusText: 'Not Found' });
    await guardar; await lista([]);
    expect(pagina.errorAccion()).toContain('ya no está disponible');
  });

  it('conserva la edición si otro usuario elimina el registro y el PUT devuelve 404', async () => {
    await abrir(); await lista();
    editor.abrir('editar', 7);
    http.expectOne(`${url}/7`).flush(servicio);
    editor.form.controls.nombre.setValue('Cambio pendiente');
    const guardar = editor.guardar();
    http.expectOne(`${url}/7`).flush({}, { status: 404, statusText: 'Not Found' });
    await guardar; await lista([]);
    expect(editor.form.controls.nombre.value).toBe('Cambio pendiente');
    expect(editor.dialog().nativeElement.open).toBe(true);
  });

  it('muestra acceso denegado ante un 403 sin reintentar indefinidamente', async () => {
    await abrir();
    http.expectOne(url).flush({}, { status: 403, statusText: 'Forbidden' });
    await renderizar();
    expect(pagina.fuente().error).toContain('No tienes permiso');
    http.expectNone(r => r.url === url);
  });
});
