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
import { ProveedorEditorModal } from '../../components/proveedor-editor-modal';
import { Proveedor, ProveedoresPagina } from '../../models/proveedor';
import { Servicio } from '../../models/servicio';
import { ProveedoresAdmin } from './proveedores';

const url = '/api/admin/proveedores';
const serviciosUrl = '/api/admin/servicios';
const proveedor: Proveedor = { idProveedor: 15, ruc: '00123456789', nombre: 'Hotel Andino', encargado: 'Ana Pérez', email: null, telefono: '+51 987654321', estado: true, servicios: [{ idServicio: 2, nombre: 'Transporte' }] };
const activo: Servicio = { idServicio: 1, nombre: 'Alojamiento', descripcion: null, estado: true };
const inactivo: Servicio = { idServicio: 2, nombre: 'Transporte', descripcion: null, estado: false };
const otroInactivo: Servicio = { idServicio: 3, nombre: 'Guiado', descripcion: null, estado: false };
const pagina = (cambios: Partial<ProveedoresPagina> = {}): ProveedoresPagina => {
  const { ruc, servicios, ...resumen } = proveedor;
  return { content: [resumen], page: 0, size: 10, totalElements: 1, totalPages: 1, ...cambios };
};

describe('Proveedores con la API', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let vista: ProveedoresAdmin;
  let editor: ProveedorEditorModal;
  let rolActual: SesionAdmin['rol'];
  const confirmar = vi.fn();
  const sesion = (rol: SesionAdmin['rol'] = 'Administrador'): SesionAdmin => ({ usuarioId: '1', nombre: 'Ana Prueba', correo: 'ana@example.test', rol, expiraEn: Date.now() + 900000 });

  beforeEach(() => {
    rolActual = 'Administrador';
    confirmar.mockReset().mockResolvedValue(true);
    TestBed.configureTestingModule({ providers: [
      ...appConfig.providers, provideHttpClientTesting(),
      { provide: AuthRepository, useValue: { iniciarSesion: () => of(sesion(rolActual)), obtenerAccessToken: () => 'jwt-admin', obtenerSesion: () => of(null) } },
      { provide: AlertasService, useValue: { confirmar } }
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  async function renderizar() { await harness.fixture.whenStable(); harness.detectChanges(); }
  async function abrir(ruta = '/admin/proveedores') {
    await TestBed.inject(AuthSessionService).ingresar('ana@example.test', 'clave-de-prueba');
    harness = await RouterTestingHarness.create(ruta);
    vista = harness.routeDebugElement!.query(By.directive(ProveedoresAdmin)).componentInstance;
    editor = vista.editor();
    const dialog = editor.dialog().nativeElement;
    Object.defineProperties(dialog, {
      showModal: { value: vi.fn(() => dialog.setAttribute('open', '')) },
      close: { value: vi.fn(() => dialog.removeAttribute('open')) }
    });
  }
  async function lista(datos = pagina()) {
    const request = http.expectOne(r => r.url === url); request.flush(datos); await renderizar(); return request;
  }
  async function tomar(ruta: string) {
    let request!: TestRequest; await vi.waitFor(() => { request = http.expectOne(r => r.url === ruta); }); return request;
  }
  async function editar() {
    editor.abrir('editar', 15);
    http.expectOne(`${url}/15`).flush(proveedor);
    const catalogo = http.expectOne(serviciosUrl);
    expect(catalogo.request.params.keys()).toEqual([]); catalogo.flush([activo, inactivo, otroInactivo]); await renderizar();
  }
  function completar() { editor.form.patchValue({ ruc: '20123456789', nombre: 'Nuevo proveedor', encargado: 'Luis', telefono: '+51 ext. 9' }); }

  it('lista datos reales con JWT y totales del servidor sin campos ni indicadores ficticios', async () => {
    await abrir(); const request = await lista(pagina({ totalElements: 25, totalPages: 3 }));
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-admin');
    expect(request.request.params.toString()).toBe('page=0&size=10');
    const tabla = harness.routeNativeElement!.querySelector('table')!;
    expect(tabla.textContent).toContain('Hotel Andino'); expect(tabla.textContent).toContain('Sin correo');
    expect(tabla.textContent).not.toMatch(/Ciudad|Tipo de proveedor|RUC/);
    expect(harness.routeNativeElement!.querySelector('.stats-grid')).toBeNull();
    expect(harness.routeNativeElement!.textContent).not.toContain('Datos ficticios');
    expect(harness.routeNativeElement!.textContent).toContain('25');
  });

  it('envía filtros y página al servidor sin volver a recortar los registros recibidos', async () => {
    await abrir('/admin/proveedores?q=hotel&estado=Inactivo&pagina=2');
    const request = await lista(pagina({ page: 1, totalElements: 25, totalPages: 3 }));
    expect(request.request.params.get('nombre')).toBe('hotel'); expect(request.request.params.get('estado')).toBe('inactivo');
    expect(request.request.params.get('page')).toBe('1'); expect(vista.inicio()).toBe(11); expect(vista.fin()).toBe(11);
    expect(harness.routeNativeElement!.querySelectorAll('tbody tr')).toHaveLength(1);
    vista.busqueda.setValue('  Andino  ');
    const buscar = await tomar(url); expect(buscar.request.params.get('page')).toBe('0');
    expect(buscar.request.params.get('nombre')).toBe('Andino'); expect(buscar.request.params.get('estado')).toBe('inactivo');
    buscar.flush(pagina()); await renderizar(); expect(TestBed.inject(Router).url).not.toContain('pagina=');
  });

  it.each(['-1', '2.5', '999999999999999999', '214748366', 'texto'])('normaliza una página inválida (%s) y omite estados desconocidos', async valor => {
    await abrir(`/admin/proveedores?pagina=${valor}&estado=todos`); const request = await lista();
    expect(request.request.params.get('page')).toBe('0'); expect(request.request.params.has('estado')).toBe(false);
  });

  it('cancela consultas anteriores y limpia la búsqueda pendiente al restablecer filtros', async () => {
    await abrir(); const anterior = http.expectOne(r => r.url === url);
    await harness.navigateByUrl('/admin/proveedores?q=hotel'); expect(anterior.cancelled).toBe(true); await lista();
    vista.busqueda.setValue('pendiente'); vista.limpiar(); const nueva = await tomar(url);
    expect(nueva.request.params.has('nombre')).toBe(false); nueva.flush(pagina()); await renderizar();
    expect(vista.busqueda.value).toBe('');
  });

  it('muestra vacío, error de conexión y reintento', async () => {
    await abrir(); http.expectOne(r => r.url === url).error(new ProgressEvent('error')); await renderizar();
    expect(harness.routeNativeElement!.textContent).toContain('No pudimos cargar los proveedores');
    vista.recargar(); await lista(pagina({ content: [], totalElements: 0, totalPages: 0 }));
    expect(harness.routeNativeElement!.textContent).toContain('No encontramos proveedores');
    expect(vista.inicio()).toBe(0); expect(vista.fin()).toBe(0);
    expect((harness.routeNativeElement!.querySelector('[aria-label="Página siguiente"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('crea un proveedor sin correo ni servicios y no aplica restricciones de teléfono del mock', async () => {
    await abrir(); await lista(); editor.abrir('crear');
    const catalogo = http.expectOne(r => r.url === serviciosUrl); expect(catalogo.request.params.get('estado')).toBe('true');
    catalogo.flush([]); completar();
    const guardar = editor.guardar(); const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ ruc: '20123456789', nombre: 'Nuevo proveedor', encargado: 'Luis', email: null, telefono: '+51 ext. 9', serviciosIds: [] });
    request.flush({ ...proveedor, servicios: [] }); await guardar; await lista();
    expect(editor.dialog().nativeElement.open).toBe(false);
  });

  it('valida RUC, campos vacíos, longitudes y correo antes de enviar', async () => {
    await abrir(); await lista(); editor.abrir('crear'); http.expectOne(r => r.url === serviciosUrl).flush([]); completar();
    for (const ruc of ['1234567890', '123456789012', '2012345678a', ' 0123456789']) {
      editor.form.controls.ruc.setValue(ruc); await editor.guardar(); expect(editor.form.controls.ruc.invalid).toBe(true);
    }
    editor.form.controls.ruc.setValue('00123456789'); editor.form.controls.nombre.setValue(' ');
    editor.form.controls.encargado.setValue('x'.repeat(151)); editor.form.controls.email.setValue('invalido'); editor.form.controls.telefono.setValue('x'.repeat(21));
    await editor.guardar(); expect(editor.form.invalid).toBe(true);
    http.expectNone(r => r.method === 'POST');
  });

  it('consulta el detalle completo sin cargar un catálogo innecesario', async () => {
    await abrir(); await lista(); editor.abrir('detalle', 15); http.expectOne(`${url}/15`).flush(proveedor); await renderizar();
    http.expectNone(r => r.url === serviciosUrl);
    expect(editor.dialog().nativeElement.textContent).toContain('00123456789');
    expect(editor.dialog().nativeElement.textContent).toContain('Transporte');
    expect(editor.dialog().nativeElement.querySelector('form')).toBeNull();
  });

  it('carga detalle y catálogo, conserva asociaciones inactivas y no ofrece otras inactivas', async () => {
    await abrir(); await lista(); await editar();
    expect(editor.form.controls.serviciosIds.value).toEqual([2]);
    expect(editor.dialog().nativeElement.textContent).toContain('Transporte');
    expect(editor.dialog().nativeElement.textContent).not.toContain('Guiado');
    editor.form.controls.nombre.setValue('Contacto actualizado'); editor.seleccionar(activo, true);
    const guardar = editor.guardar(); const request = http.expectOne(`${url}/15`);
    expect(request.request.method).toBe('PUT'); expect(request.request.body.serviciosIds).toEqual([2, 1]);
    expect(request.request.body.ruc).toBe('00123456789'); expect(request.request.body.estado).toBeUndefined();
    request.flush(proveedor); await guardar; await lista();
  });

  it('permite quitar todas las asociaciones explícitamente sin permitir agregar inactivos nuevos', async () => {
    await abrir(); await lista(); await editar(); editor.seleccionar(otroInactivo, true);
    expect(editor.form.controls.serviciosIds.value).toEqual([2]); editor.seleccionar(inactivo, false);
    const guardar = editor.guardar(); const request = http.expectOne(`${url}/15`);
    expect(request.request.body.serviciosIds).toEqual([]); request.flush({ ...proveedor, servicios: [] }); await guardar; await lista();
  });

  it('conserva el borrador ante 409, actualiza servicios y permite retirar una selección que se desactivó', async () => {
    await abrir(); await lista(); await editar(); editor.seleccionar(activo, true); editor.form.controls.nombre.setValue('Borrador');
    const guardar = editor.guardar(); http.expectOne(`${url}/15`).flush({ codigo: 'CONFLICTO_DATOS', mensaje: 'El servicio está inactivo.' }, { status: 409, statusText: 'Conflict' });
    const catalogo = await tomar(serviciosUrl); catalogo.flush([{ ...activo, estado: false }, inactivo, otroInactivo]); await guardar; await renderizar();
    expect(editor.error()).toBe('El servicio está inactivo.'); expect(editor.erroresCampos().ruc).toBeUndefined();
    expect(editor.form.controls.nombre.value).toBe('Borrador'); expect(editor.seleccion()).toEqual([2, 1]);
    expect(editor.dialog().nativeElement.open).toBe(true);
    editor.seleccionar({ ...activo, estado: false }, false); editor.seleccionar({ ...activo, estado: false }, true);
    expect(editor.form.controls.serviciosIds.value).toEqual([2]);
  });

  it('muestra errores de validación de campos y listas sin cerrar el formulario', async () => {
    await abrir(); await lista(); await editar(); const guardar = editor.guardar();
    http.expectOne(`${url}/15`).flush({ mensaje: 'Revisa los datos.', errores: { ruc: 'RUC inválido', 'serviciosIds[0]': 'ID inválido' } }, { status: 400, statusText: 'Bad Request' });
    await guardar; expect(editor.erroresCampos()).toEqual({ ruc: 'RUC inválido', serviciosIds: 'ID inválido' }); expect(editor.dialog().nativeElement.open).toBe(true);
  });

  it('bloquea guardado si falla la carga del catálogo y permite reintentar', async () => {
    await abrir(); await lista(); editor.abrir('editar', 15); http.expectOne(`${url}/15`).flush(proveedor);
    http.expectOne(serviciosUrl).error(new ProgressEvent('error')); await renderizar(); await editor.guardar();
    expect(editor.cargaCompleta()).toBe(false); http.expectNone(r => r.method === 'PUT');
    editor.cargar(); http.expectOne(`${url}/15`).flush(proveedor); http.expectOne(serviciosUrl).flush([activo, inactivo]); await renderizar();
    expect(editor.cargaCompleta()).toBe(true); expect(editor.form.controls.serviciosIds.value).toEqual([2]);
  });

  it('conserva el borrador si falla la actualización del catálogo después de un conflicto', async () => {
    await abrir(); await lista(); await editar(); editor.form.controls.nombre.setValue('Pendiente');
    const guardar = editor.guardar(); http.expectOne(`${url}/15`).flush({ mensaje: 'RUC duplicado.' }, { status: 409, statusText: 'Conflict' });
    (await tomar(serviciosUrl)).error(new ProgressEvent('error')); await guardar; await editor.guardar();
    http.expectNone(r => r.method === 'PUT'); expect(editor.form.controls.nombre.value).toBe('Pendiente');
    const recarga = editor.actualizarServicios(); http.expectOne(serviciosUrl).flush([activo, inactivo]); await recarga;
    expect(editor.errorServicios()).toBe(''); expect(editor.form.controls.nombre.value).toBe('Pendiente');
  });

  it('bloquea envío duplicado, cierre y navegación durante un guardado', async () => {
    await abrir(); await lista(); await editar(); const guardar = editor.guardar(); const request = http.expectOne(`${url}/15`);
    await editor.guardar(); await editor.cerrar(); expect(await vista.confirmarSalida()).toBe(false);
    http.expectNone(r => r.method === 'PUT'); expect(editor.dialog().nativeElement.open).toBe(true);
    request.flush(proveedor); await guardar; await lista(); expect(editor.guardando()).toBe(false);
  });

  it('confirma el descarte al cerrar o navegar y conserva cambios si se cancela', async () => {
    await abrir(); await lista(); await editar(); editor.seleccionar(activo, true); confirmar.mockResolvedValue(false);
    await editor.cerrar(); expect(editor.dialog().nativeElement.open).toBe(true);
    await harness.navigateByUrl('/admin/paquetes'); expect(TestBed.inject(Router).url).toBe('/admin/proveedores');
    expect(editor.form.controls.serviciosIds.value).toEqual([2, 1]); confirmar.mockResolvedValue(true);
    await harness.navigateByUrl('/admin/paquetes'); expect(TestBed.inject(Router).url).toBe('/admin/paquetes');
  });

  it('cancela las consultas del modal al cerrar antes de recibir datos', async () => {
    await abrir(); await lista(); editor.abrir('editar', 15);
    const detalle = http.expectOne(`${url}/15`); const catalogo = http.expectOne(serviciosUrl);
    await editor.cerrar(); expect(detalle.cancelled).toBe(true); expect(catalogo.cancelled).toBe(true);
  });

  it('desactiva con respuesta reducida, bloquea duplicados y ajusta una página que queda vacía', async () => {
    await abrir('/admin/proveedores?estado=Activo&pagina=2'); await lista(pagina({ page: 1, totalElements: 11, totalPages: 2 }));
    const cambiar = vista.cambiarEstado(proveedor); const request = await tomar(`${url}/15/estado`);
    expect(request.request.body).toEqual({ estado: false }); await vista.cambiarEstado(proveedor); http.expectNone(`${url}/15/estado`);
    request.flush({ idProveedor: 15, estado: false }); await cambiar;
    const recarga = await tomar(url); expect(recarga.request.params.get('estado')).toBe('activo');
    recarga.flush(pagina({ content: [], page: 1, totalElements: 10, totalPages: 1 }));
    const primera = await tomar(url); expect(primera.request.params.get('page')).toBe('0'); primera.flush(pagina({ totalElements: 10 })); await renderizar();
    expect(TestBed.inject(Router).url).not.toContain('pagina='); expect(vista.cambiando()).toBeNull();
  });

  it('cancela o activa sin aplicar la regla ficticia que bloqueaba proveedores con servicios', async () => {
    await abrir(); await lista(); confirmar.mockResolvedValue(false); await vista.cambiarEstado(proveedor); http.expectNone(`${url}/15/estado`);
    confirmar.mockResolvedValue(true); const activar = vista.cambiarEstado({ ...proveedor, estado: false });
    const request = await tomar(`${url}/15/estado`); expect(request.request.body).toEqual({ estado: true });
    request.flush({ idProveedor: 15, estado: true }); await activar; await lista();
  });

  it.each(['Operador', 'Cliente'] as const)('impide consultar Proveedores con rol %s', async rol => {
    rolActual = rol;
    await TestBed.inject(AuthSessionService).ingresar('otro@example.test', 'clave'); harness = await RouterTestingHarness.create('/admin/proveedores');
    expect(harness.routeNativeElement!.querySelector('vp-proveedores-admin')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('table')).toBeNull();
    http.expectNone(r => r.url.startsWith(url) || r.url.startsWith(serviciosUrl));
  });
});
