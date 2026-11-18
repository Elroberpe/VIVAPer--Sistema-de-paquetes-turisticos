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
import { UsuarioDetalle, UsuarioResumen, UsuariosPagina } from '../../models/usuario';
import { UsuariosAdmin } from './usuarios';
import { EditarUsuarioModal } from '../../components/editar-usuario-modal';
import { CrearUsuarioModal } from '../../components/crear-usuario-modal';

const administrador: UsuarioResumen = { id: 1, nombre: 'Ana', apellido: 'Prueba', usuario: 'ana.prueba', celular: '999888777', correo: 'ana@example.test', rol: 'ADMIN', activo: true };
const cliente: UsuarioResumen = { ...administrador, id: 2, nombre: 'Carlos', usuario: 'carlos.prueba', correo: 'carlos@example.test', rol: 'CLIENTE' };
const detalle: UsuarioDetalle = { ...cliente, fechaRegistro: '2026-11-17T10:30:00' };
const pagina = (content: UsuarioResumen[] = [administrador, cliente], extras: Partial<UsuariosPagina> = {}): UsuariosPagina => ({ content, page: 0, size: 10, totalElements: content.length, totalPages: content.length ? 1 : 0, ...extras });

describe('Administración de usuarios con la API', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let componente: UsuariosAdmin;
  let editor: EditarUsuarioModal;
  let creador: CrearUsuarioModal;
  const confirmar = vi.fn();

  beforeEach(() => {
    confirmar.mockReset().mockResolvedValue(true);
    TestBed.configureTestingModule({ providers: [
      ...appConfig.providers, provideHttpClientTesting(),
      { provide: AuthRepository, useValue: {
        iniciarSesion: () => of({ usuarioId: '1', nombre: 'Ana Prueba', correo: administrador.correo, rol: 'Administrador', expiraEn: Date.now() + 900000 } satisfies SesionAdmin),
        obtenerAccessToken: () => 'jwt-admin'
      } },
      { provide: AlertasService, useValue: { confirmar } }
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); });

  async function renderizar() { await harness.fixture.whenStable(); harness.detectChanges(); }
  async function abrir(url = '/admin/usuarios') {
    await TestBed.inject(AuthSessionService).ingresar(administrador.correo, 'clave-de-prueba');
    harness = await RouterTestingHarness.create(url);
    componente = harness.routeDebugElement!.query(By.directive(UsuariosAdmin)).componentInstance;
    editor = harness.routeDebugElement!.query(By.directive(EditarUsuarioModal)).componentInstance;
    creador = harness.routeDebugElement!.query(By.directive(CrearUsuarioModal)).componentInstance;
    for (const modal of [componente, editor, creador]) {
      const dialog = modal.dialog().nativeElement;
      Object.defineProperties(dialog, {
        showModal: { value: vi.fn(() => dialog.setAttribute('open', '')) },
        close: { value: vi.fn(() => dialog.removeAttribute('open')) }
      });
    }
  }
  async function lista(datos = pagina()) {
    const request = http.expectOne(request => request.url === '/api/usuarios');
    request.flush(datos);
    await renderizar();
    return request;
  }
  async function tomar(url: string) {
    let request!: TestRequest;
    await vi.waitFor(() => { request = http.expectOne(request => request.url === url); });
    return request;
  }

  it('muestra las cuentas reales con acciones de creación, detalle, edición y estado', async () => {
    await abrir();
    const request = await lista();
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.has('activo')).toBe(false);
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-admin');
    expect(harness.routeNativeElement!.querySelector('tbody')?.textContent).toContain('carlos.prueba');
    expect(harness.routeNativeElement!.querySelector('tbody')?.textContent).toContain('Cliente');
    expect(harness.routeNativeElement!.querySelector('.create-button')?.textContent).toContain('Nuevo usuario');
    expect(harness.routeNativeElement!.querySelectorAll('.edit-action')).toHaveLength(2);
    expect(harness.routeNativeElement!.textContent).not.toContain('Datos de prueba');
    expect(harness.routeNativeElement!.querySelector<HTMLButtonElement>('tbody tr:first-child .state-action')?.disabled).toBe(true);
  });

  it('envía página y filtros al servidor y vuelve a la primera página al buscar', async () => {
    await abrir('/admin/usuarios?pagina=2&q=Ana&estado=Activo');
    const request = await lista(pagina([cliente], { page: 1, totalElements: 21, totalPages: 3 }));
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('buscar')).toBe('Ana');
    expect(request.request.params.get('activo')).toBe('true');
    const input = harness.routeNativeElement!.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'Carlos'; input.dispatchEvent(new Event('input', { bubbles: true }));
    const buscar = await tomar('/api/usuarios');
    expect(buscar.request.params.get('page')).toBe('0');
    expect(buscar.request.params.get('buscar')).toBe('Carlos');
    expect(buscar.request.params.get('activo')).toBe('true');
    buscar.flush(pagina([cliente]));
    await renderizar();
    expect(harness.routeNativeElement!.querySelector('.skip-link')?.getAttribute('href')).toBe(TestBed.inject(Router).url + '#admin-contenido');
    componente.filtrarEstado('Inactivo');
    const inactivos = await tomar('/api/usuarios');
    expect(inactivos.request.params.get('activo')).toBe('false');
    inactivos.flush(pagina([{ ...cliente, activo: false }]));
    await renderizar();
    expect(harness.routeNativeElement!.querySelector('.state-tag')?.textContent).toContain('Inactivo');
  });

  it('cancela las consultas anteriores para que una respuesta vieja no reemplace los filtros nuevos', async () => {
    await abrir();
    const anterior = http.expectOne(request => request.url === '/api/usuarios');
    await harness.navigateByUrl('/admin/usuarios?q=Carlos');
    expect(anterior.cancelled).toBe(true);
    await lista(pagina([cliente]));
    expect(componente.fuente().datos.content).toEqual([cliente]);
  });

  it('cancela una búsqueda pendiente al limpiar los filtros', async () => {
    await abrir('/admin/usuarios?q=Ana'); await lista();
    componente.busqueda.setValue('Carlos');
    componente.limpiar();
    const request = await tomar('/api/usuarios');
    expect(request.request.params.has('buscar')).toBe(false);
    request.flush(pagina());
    await new Promise(resolve => setTimeout(resolve, 400));
    await renderizar();
    expect(TestBed.inject(Router).url).toBe('/admin/usuarios');
    expect(componente.busqueda.value).toBe('');
    http.expectNone(request => request.url === '/api/usuarios');
  });

  it('consulta el detalle por ID y lo muestra en un modal de solo lectura', async () => {
    await abrir(); await lista();
    componente.abrirDetalle(cliente);
    const request = http.expectOne('/api/usuarios/2');
    expect(request.request.method).toBe('GET');
    request.flush({ ...detalle, apellido: 'Dato actualizado' });
    await renderizar();
    expect(componente.dialog().nativeElement.open).toBe(true);
    expect(componente.dialog().nativeElement.textContent).toContain('Dato actualizado');
    expect(componente.dialog().nativeElement.textContent).toContain('17/11/2026 10:30');
    expect(componente.dialog().nativeElement.querySelector('input')).toBeNull();
    componente.cerrarDetalle();
    expect(componente.dialog().nativeElement.open).toBe(false);
  });

  it('muestra un detalle inexistente y cancela la consulta al cerrar el modal', async () => {
    await abrir(); await lista();
    componente.abrirDetalle(cliente);
    http.expectOne('/api/usuarios/2').flush(null, { status: 404, statusText: 'Not Found' });
    await renderizar();
    expect(componente.errorDetalle()).toContain('ya no está disponible');
    componente.abrirDetalle(cliente);
    const pendiente = http.expectOne('/api/usuarios/2');
    componente.cerrarDetalle();
    expect(pendiente.cancelled).toBe(true);
  });

  it('confirma el cambio de estado, envía solo activo y actualiza la lista desde el servidor', async () => {
    await abrir(); await lista();
    const guardar = componente.cambiarEstado(cliente);
    const request = await tomar('/api/usuarios/2/estado');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ activo: false });
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-admin');
    await componente.cambiarEstado(cliente);
    request.flush({ ...detalle, activo: false });
    await guardar;
    await lista(pagina([administrador, { ...cliente, activo: false }]));
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(componente.mensaje()).toBe('Usuario desactivado correctamente.');
    expect(harness.routeNativeElement!.querySelector('tbody tr:last-child .state-tag')?.textContent).toContain('Inactivo');
    const activar = componente.cambiarEstado({ ...cliente, activo: false });
    const activacion = await tomar('/api/usuarios/2/estado');
    expect(activacion.request.body).toEqual({ activo: true });
    activacion.flush(detalle); await activar; await lista();
    expect(componente.mensaje()).toBe('Usuario activado correctamente.');
  });

  it('no modifica el estado al cancelar ni permite desactivar la cuenta propia', async () => {
    await abrir(); await lista();
    confirmar.mockResolvedValue(false);
    await componente.cambiarEstado(cliente);
    await componente.cambiarEstado(administrador);
    expect(confirmar).toHaveBeenCalledTimes(1);
    http.expectNone('/api/usuarios/2/estado');
    http.expectNone('/api/usuarios/1/estado');
    expect(componente.cambiando()).toBeNull();
  });

  it('regresa a una página existente cuando un cambio de estado vacía la última página filtrada', async () => {
    await abrir('/admin/usuarios?pagina=2&estado=Activo');
    await lista(pagina([cliente], { page: 1, totalElements: 11, totalPages: 2 }));
    const guardar = componente.cambiarEstado(cliente);
    (await tomar('/api/usuarios/2/estado')).flush({ ...detalle, activo: false });
    await guardar;
    const recarga = http.expectOne(request => request.url === '/api/usuarios');
    expect(recarga.request.params.get('activo')).toBe('true');
    recarga.flush(pagina([], { page: 1, totalElements: 10, totalPages: 1 }));
    const primeraPagina = await tomar('/api/usuarios');
    expect(primeraPagina.request.params.get('page')).toBe('0');
    primeraPagina.flush(pagina([administrador]));
    await renderizar();
    expect(TestBed.inject(Router).url).not.toContain('pagina=2');
  });

  it('muestra el error de lista, permite reintentar y distingue una búsqueda vacía', async () => {
    await abrir();
    http.expectOne(request => request.url === '/api/usuarios').flush(null, { status: 500, statusText: 'Error' });
    await renderizar();
    expect(componente.fuente().error).toContain('Inténtalo de nuevo');
    componente.recargar();
    await lista(pagina([]));
    expect(harness.routeNativeElement!.textContent).toContain('No encontramos usuarios.');
    expect(componente.fuente().error).toBe('');
  });

  it.each([403, 404, 409, 500])('conserva la lista si falla el cambio de estado con %s', async status => {
    await abrir(); await lista();
    const guardar = componente.cambiarEstado(cliente);
    (await tomar('/api/usuarios/2/estado')).flush(status === 409 ? { mensaje: 'Debe permanecer al menos un administrador activo.' } : null, { status, statusText: 'Error' });
    await guardar;
    expect(componente.errorAccion()).not.toBe('');
    if (status === 409) expect(componente.errorAccion()).toContain('administrador activo');
    expect(componente.fuente().datos.content[1].activo).toBe(true);
    expect(componente.cambiando()).toBeNull();
    http.expectNone(request => request.url === '/api/usuarios');
  });

  it('abre el editor desde la fila y conserva los borradores de Datos y Rol hasta guardar', async () => {
    await abrir(); await lista();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('tbody tr:last-child .edit-action')!.click();
    await renderizar();
    const modal = editor.dialog().nativeElement;
    expect(modal.open).toBe(true);
    expect(Array.from(modal.querySelectorAll('.form-label')).map(label => label.textContent)).toEqual(['Nombre', 'Apellido', 'Usuario', 'Teléfono', 'Correo', 'Rol']);
    expect(modal.querySelector<HTMLInputElement>('#editar-correo')?.readOnly).toBe(true);
    expect(modal.querySelector<HTMLInputElement>('#editar-correo')?.value).toBe(cliente.correo);
    expect(modal.querySelector<HTMLInputElement>('#editar-rol-actual')?.readOnly).toBe(true);
    expect(modal.querySelector<HTMLInputElement>('#editar-rol-actual')?.value).toBe('Cliente');
    const nombre = modal.querySelector<HTMLInputElement>('#editar-nombre')!;
    nombre.value = 'Carlos Andrés'; nombre.dispatchEvent(new Event('input', { bubbles: true }));
    modal.querySelector<HTMLButtonElement>('#editar-tab-rol')!.click();
    await renderizar();
    const roles = modal.querySelector<HTMLSelectElement>('#editar-rol')!;
    expect(Array.from(roles.options).map(opcion => [opcion.value, opcion.textContent])).toEqual([['ADMIN', 'Administrador'], ['CLIENTE', 'Cliente'], ['EMPLEADO', 'Empleado']]);
    roles.value = 'EMPLEADO'; roles.dispatchEvent(new Event('change', { bubbles: true }));
    await renderizar();
    expect(editor.rolForm.controls.rol.value).toBe('EMPLEADO');
    expect(modal.querySelector<HTMLButtonElement>('.btn-primary')?.disabled).toBe(false);
    modal.querySelector<HTMLButtonElement>('#editar-tab-datos')!.click();
    await renderizar();
    expect(modal.querySelector<HTMLInputElement>('#editar-nombre')?.value).toBe('Carlos Andrés');
    expect(modal.querySelector<HTMLInputElement>('#editar-rol-actual')?.value).toBe('Cliente');
    expect(modal.querySelector<HTMLButtonElement>('.btn-primary')?.disabled).toBe(false);
    expect(componente.fuente().datos.content[1]).toEqual(cliente);
    http.expectNone(request => request.method !== 'GET');
    http.expectNone('/api/usuarios/2');
  });

  it('confirma el descarte del editor y restablece Datos al abrir otra cuenta', async () => {
    await abrir(); await lista();
    editor.abrir(cliente);
    editor.datosForm.patchValue({ nombre: 'Pendiente' }); editor.datosForm.markAsDirty();
    confirmar.mockResolvedValue(false);
    await editor.cerrar();
    expect(editor.dialog().nativeElement.open).toBe(true);
    expect(editor.datosForm.controls.nombre.value).toBe('Pendiente');
    confirmar.mockResolvedValue(true);
    await editor.cerrar();
    expect(editor.dialog().nativeElement.open).toBe(false);
    expect(editor.usuario()).toBeNull();
    expect(editor.datosForm.pristine).toBe(true);
    editor.abrir(administrador);
    await renderizar();
    expect(editor.seccion()).toBe('datos');
    expect(editor.datosForm.controls.nombre.value).toBe(administrador.nombre);
    expect(editor.rolForm.controls.rol.value).toBe('ADMIN');
    expect(editor.dialog().nativeElement.querySelector<HTMLInputElement>('#editar-rol-actual')?.value).toBe('Administrador');
    http.expectNone(request => request.method !== 'GET');
  });

  it('permite navegar con teclado y detecta cambios de rol al cerrar con Escape', async () => {
    await abrir(); await lista();
    editor.abrir(cliente);
    await renderizar();
    const modal = editor.dialog().nativeElement;
    modal.querySelector('.edit-tabs')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    await renderizar();
    expect(editor.seccion()).toBe('rol');
    editor.rolForm.patchValue({ rol: 'ADMIN' }); editor.rolForm.markAsDirty();
    confirmar.mockResolvedValue(false);
    const escape = new Event('cancel', { cancelable: true });
    modal.dispatchEvent(escape);
    await renderizar();
    expect(escape.defaultPrevented).toBe(true);
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(modal.open).toBe(true);
    expect(editor.rolForm.controls.rol.value).toBe('ADMIN');
    http.expectNone(request => request.method !== 'GET');
  });

  it('guarda Datos con PUT, conserva el borrador del rol y mantiene lo guardado si luego falla Rol', async () => {
    await abrir(); await lista();
    editor.abrir(cliente);
    editor.rolForm.patchValue({ rol: 'EMPLEADO' }); editor.rolForm.markAsDirty();
    editor.datosForm.patchValue({ nombre: ' Carlos Andrés ', usuario: 'Carlos.Nuevo', celular: '+51988777666' }); editor.datosForm.markAsDirty();
    await renderizar();
    editor.dialog().nativeElement.querySelector<HTMLButtonElement>('.btn-primary')!.click();
    const request = http.expectOne('/api/usuarios/2');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ nombre: 'Carlos Andrés', apellido: cliente.apellido, usuario: 'carlos.nuevo', celular: '+51988777666', correo: cliente.correo });
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-admin');
    await editor.guardarDatos();
    await editor.cerrar();
    editor.cambiarSeccion('rol');
    expect(editor.seccion()).toBe('datos');
    expect(editor.dialog().nativeElement.open).toBe(true);
    const actualizado = { ...detalle, nombre: 'Carlos Andrés', usuario: 'carlos.nuevo', celular: '+51988777666' };
    request.flush(actualizado);
    await renderizar();
    await lista(pagina([administrador, actualizado]));
    expect(editor.datosForm.pristine).toBe(true);
    expect(editor.datosForm.controls.usuario.value).toBe('carlos.nuevo');
    expect(editor.rolForm.controls.rol.value).toBe('EMPLEADO');
    expect(editor.rolForm.dirty).toBe(true);
    expect(editor.mensaje()).toContain('Datos del usuario actualizados');
    expect(harness.routeNativeElement!.querySelector('tbody tr:last-child')?.textContent).toContain('Carlos Andrés');
    editor.cambiarSeccion('rol');
    const guardarRol = editor.guardarRol();
    http.expectOne('/api/usuarios/2/rol').flush(null, { status: 500, statusText: 'Error' });
    await guardarRol;
    expect(editor.usuario()?.nombre).toBe('Carlos Andrés');
    expect(editor.usuario()?.rol).toBe('CLIENTE');
    expect(editor.datosForm.pristine).toBe(true);
    expect(editor.rolForm.dirty).toBe(true);
    expect(editor.error()).toContain('Inténtalo de nuevo');
  });

  it('guarda solo Rol con PATCH, actualiza la tabla y conserva los datos personales pendientes', async () => {
    await abrir(); await lista();
    editor.abrir(cliente);
    editor.datosForm.patchValue({ nombre: 'Nombre pendiente' }); editor.datosForm.markAsDirty();
    editor.cambiarSeccion('rol');
    editor.rolForm.patchValue({ rol: 'EMPLEADO' }); editor.rolForm.markAsDirty();
    await renderizar();
    editor.dialog().nativeElement.querySelector<HTMLButtonElement>('.btn-primary')!.click();
    const request = http.expectOne('/api/usuarios/2/rol');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ rol: 'EMPLEADO' });
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-admin');
    await editor.guardarRol();
    const actualizado = { ...detalle, rol: 'EMPLEADO' as const };
    request.flush(actualizado);
    await renderizar();
    await lista(pagina([administrador, actualizado]));
    expect(editor.rolForm.pristine).toBe(true);
    expect(editor.datosForm.controls.nombre.value).toBe('Nombre pendiente');
    expect(editor.datosForm.dirty).toBe(true);
    expect(harness.routeNativeElement!.querySelector('tbody tr:last-child .role-tag')?.textContent).toBe('Empleado');
    expect(TestBed.inject(AuthSessionService).sesion()?.nombre).toBe(administrador.nombre + ' ' + administrador.apellido);
    editor.cambiarSeccion('datos');
    await renderizar();
    expect(editor.dialog().nativeElement.querySelector<HTMLInputElement>('#editar-rol-actual')?.value).toBe('Empleado');
    http.expectNone('/api/usuarios/2');
  });

  it('valida los datos y el rol sin enviar formularios inválidos ni roles que no cambiaron', async () => {
    await abrir(); await lista();
    editor.abrir(cliente);
    editor.datosForm.patchValue({ nombre: ' ', usuario: 'ab', celular: '123' }); editor.datosForm.markAsDirty();
    await editor.guardarDatos();
    expect(editor.datosForm.controls.nombre.touched).toBe(true);
    expect(editor.datosForm.controls.usuario.invalid).toBe(true);
    expect(editor.datosForm.controls.celular.invalid).toBe(true);
    editor.rolForm.markAsDirty();
    await editor.guardarRol();
    editor.rolForm.controls.rol.setValue('INVALIDO' as UsuarioResumen['rol']);
    await editor.guardarRol();
    expect(editor.rolForm.invalid).toBe(true);
    http.expectNone(request => request.method !== 'GET');
  });

  it('protege el rol propio y actualiza la cabecera al guardar los datos de la cuenta administradora', async () => {
    await abrir(); await lista();
    editor.abrir(administrador);
    editor.cambiarSeccion('rol');
    await renderizar();
    const opciones = Array.from(editor.dialog().nativeElement.querySelectorAll<HTMLOptionElement>('#editar-rol option'));
    expect(opciones.filter(opcion => opcion.value !== 'ADMIN').every(opcion => opcion.disabled)).toBe(true);
    editor.rolForm.patchValue({ rol: 'CLIENTE' }); editor.rolForm.markAsDirty();
    await editor.guardarRol();
    expect(editor.error()).toContain('No puedes quitarte');
    http.expectNone('/api/usuarios/1/rol');
    editor.abrir(administrador);
    editor.datosForm.patchValue({ nombre: 'Ana María' }); editor.datosForm.markAsDirty();
    const guardar = editor.guardarDatos();
    const actualizado = { ...administrador, nombre: 'Ana María', fechaRegistro: detalle.fechaRegistro };
    http.expectOne('/api/usuarios/1').flush(actualizado);
    await guardar;
    await lista(pagina([actualizado, cliente]));
    expect(TestBed.inject(AuthSessionService).sesion()?.nombre).toBe('Ana María Prueba');
    expect(harness.routeNativeElement!.querySelector('.profile-copy strong')?.textContent).toBe('Ana María Prueba');
  });

  it.each([
    [400, 'datos'], [409, 'datos'], [404, 'datos'], [500, 'datos'], [0, 'datos'],
    [403, 'rol'], [409, 'rol']
  ] as const)('conserva el borrador de %s/%s y muestra el error sin modificar la tabla', async (status, seccion) => {
    await abrir(); await lista();
    editor.abrir(seccion === 'rol' ? { ...cliente, rol: 'ADMIN' } : cliente);
    editor.datosForm.patchValue({ usuario: 'nuevo.usuario' }); editor.datosForm.markAsDirty();
    editor.rolForm.patchValue({ rol: 'EMPLEADO' }); editor.rolForm.markAsDirty();
    editor.cambiarSeccion(seccion);
    const guardar = seccion === 'datos' ? editor.guardarDatos() : editor.guardarRol();
    const mensaje = seccion === 'datos' ? 'Este nombre de usuario ya está registrado.' : 'Debe permanecer al menos un administrador activo.';
    http.expectOne(seccion === 'datos' ? '/api/usuarios/2' : '/api/usuarios/2/rol').flush({ mensaje }, { status, statusText: 'Error' });
    await guardar;
    expect(editor.error()).not.toBe('');
    if (status === 409) expect(editor.error()).toBe(mensaje);
    expect(editor.guardando()).toBe(false);
    expect(editor.datosForm.controls.usuario.value).toBe('nuevo.usuario');
    expect(editor.datosForm.dirty).toBe(true);
    expect(editor.rolForm.dirty).toBe(true);
    expect(componente.fuente().datos.content[1]).toEqual(cliente);
    http.expectNone(request => request.url === '/api/usuarios');
  });

  const datosNuevos = { nombre: ' Nuevo ', apellido: ' Usuario ', usuario: 'Nuevo.Usuario', celular: '+51999888777', correo: 'Nuevo@example.test', password: ' ClaveInicial123! ', rol: 'CLIENTE' as const };

  it.each(['ADMIN', 'CLIENTE', 'EMPLEADO'] as const)('crea un usuario %s con los siete campos y conserva la sesión administradora', async rol => {
    await abrir(); await lista();
    const sesion = { ...TestBed.inject(AuthSessionService).sesion()! };
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.create-button')!.click();
    await renderizar();
    const modal = creador.dialog().nativeElement;
    expect(modal.open).toBe(true);
    expect(modal.querySelector('#crear-usuario-titulo')?.textContent).toBe('Nuevo usuario');
    expect(modal.querySelector<HTMLInputElement>('#nuevo-password')?.autocomplete).toBe('new-password');
    for (const [campo, valor] of Object.entries({ ...datosNuevos, rol })) {
      const input = modal.querySelector<HTMLInputElement | HTMLSelectElement>(`[formControlName="${campo}"]`)!;
      input.value = valor;
      input.dispatchEvent(new Event(campo === 'rol' ? 'change' : 'input', { bubbles: true }));
    }
    await renderizar();
    modal.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    const request = http.expectOne(request => request.url === '/api/usuarios' && request.method === 'POST');
    expect(request.request.body).toEqual({ nombre: 'Nuevo', apellido: 'Usuario', usuario: 'nuevo.usuario', celular: datosNuevos.celular, correo: 'nuevo@example.test', password: datosNuevos.password, rol });
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-admin');
    await creador.crear();
    await creador.cerrar();
    expect(modal.open).toBe(true);
    const nuevo = { ...detalle, id: 3, nombre: 'Nuevo', apellido: 'Usuario', usuario: 'nuevo.usuario', celular: datosNuevos.celular, correo: 'nuevo@example.test', rol };
    request.flush(nuevo, { status: 201, statusText: 'Created' });
    await renderizar();
    await lista(pagina([administrador, cliente, nuevo]));
    expect(modal.open).toBe(false);
    expect(creador.form.controls.password.value).toBe('');
    expect(creador.form.pristine).toBe(true);
    expect(componente.mensaje()).toBe('Usuario creado correctamente.');
    expect(harness.routeNativeElement!.querySelector('tbody')?.textContent).toContain('nuevo.usuario');
    expect(TestBed.inject(AuthSessionService).sesion()).toEqual(sesion);
    http.expectNone('/api/auth/login');
    http.expectNone('/api/auth/refresh');
  });

  it('impide crear con campos vacíos, usuario o celular inválidos y contraseña fuera del límite UTF-8', async () => {
    await abrir(); await lista();
    creador.abrir();
    await creador.crear();
    expect(creador.form.controls.nombre.touched).toBe(true);
    creador.form.setValue({ ...datosNuevos, usuario: 'ab', celular: '123', password: 'é'.repeat(37) });
    await creador.crear();
    expect(creador.form.controls.usuario.invalid).toBe(true);
    expect(creador.form.controls.celular.invalid).toBe(true);
    expect(creador.form.controls.password.hasError('claveLarga')).toBe(true);
    http.expectNone(request => request.method === 'POST');
  });

  it.each([409, 500])('conserva los datos y permite corregirlos si la creación falla con %s', async status => {
    await abrir(); await lista();
    creador.abrir();
    creador.form.setValue(datosNuevos); creador.form.markAsDirty();
    const crear = creador.crear();
    http.expectOne(request => request.url === '/api/usuarios' && request.method === 'POST').flush({ mensaje: 'Este nombre de usuario ya está registrado.' }, { status, statusText: 'Error' });
    await crear;
    expect(creador.error()).toContain(status === 409 ? 'ya está registrado' : 'Inténtalo de nuevo');
    expect(creador.form.controls.usuario.value).toBe(datosNuevos.usuario);
    expect(creador.form.dirty).toBe(true);
    expect(creador.dialog().nativeElement.open).toBe(true);
    expect(creador.guardando()).toBe(false);
    expect(componente.fuente().datos.content).toEqual([administrador, cliente]);
    expect(TestBed.inject(AuthSessionService).sesion()?.usuarioId).toBe('1');
    http.expectNone(request => request.url === '/api/usuarios');
  });

  it('confirma el descarte y limpia la contraseña al cancelar la creación', async () => {
    await abrir(); await lista();
    creador.abrir();
    creador.form.setValue(datosNuevos); creador.form.markAsDirty();
    confirmar.mockResolvedValue(false);
    await creador.cerrar();
    expect(creador.dialog().nativeElement.open).toBe(true);
    expect(creador.form.controls.usuario.value).toBe(datosNuevos.usuario);
    confirmar.mockResolvedValue(true);
    await creador.cerrar();
    expect(creador.dialog().nativeElement.open).toBe(false);
    expect(creador.form.controls.password.value).toBe('');
    creador.abrir();
    expect(creador.form.controls.nombre.value).toBe('');
    expect(creador.form.controls.rol.value).toBe('CLIENTE');
    http.expectNone(request => request.method === 'POST');
  });
});
