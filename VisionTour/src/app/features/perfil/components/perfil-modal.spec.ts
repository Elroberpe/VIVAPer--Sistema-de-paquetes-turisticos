import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { appConfig } from '../../../app.config';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { AlertasService } from '../../../core/services/alertas.service';
import { AuthRepository } from '../../auth/data-access/auth.repository';
import { SesionAdmin } from '../../auth/models/sesion';
import { PerfilUsuario } from '../models/perfil';
import { PerfilModal } from './perfil-modal';
import { DestinosRepository } from '../../destinos/data-access/destinos.repository';

const usuario: PerfilUsuario = { id: 25, nombre: 'Ana', apellido: 'Prueba', usuario: 'ana.prueba', celular: '+51999888777', email: 'ana@example.test', rol: 'ADMIN' };

describe('Modal de perfil compartido entre administración y clientes', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let pagina: PerfilModal;
  const confirmar = vi.fn();
  const cerrarSesion = vi.fn();

  beforeEach(() => {
    confirmar.mockReset().mockResolvedValue(false);
    cerrarSesion.mockReset().mockReturnValue(of(undefined));
    TestBed.configureTestingModule({ providers: [
      ...appConfig.providers, provideHttpClientTesting(),
      { provide: DestinosRepository, useValue: { listarPublicos: () => of([]) } },
      { provide: AuthRepository, useValue: {
        iniciarSesion: () => of({ usuarioId: '25', nombre: 'Ana Prueba', correo: usuario.email, rol: 'Administrador', expiraEn: Date.now() + 900000 } satisfies SesionAdmin),
        obtenerAccessToken: () => 'jwt-de-prueba',
        obtenerSesion: () => of(null),
        cerrarSesion
      } },
      { provide: AlertasService, useValue: { confirmar } }
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); });

  async function renderizar() { await harness.fixture.whenStable(); harness.detectChanges(); }
  async function mostrarModal(ruta = '/admin/paquetes', selector = '.profile-link') {
    await TestBed.inject(AuthSessionService).ingresar(usuario.email, 'clave-de-prueba');
    harness = await RouterTestingHarness.create(ruta);
    pagina = harness.routeDebugElement!.query(By.directive(PerfilModal)).componentInstance;
    // jsdom no implementa la API nativa de dialog; se simula solo abrir/cerrar.
    const dialog = pagina.dialog().nativeElement;
    Object.defineProperties(dialog, {
      showModal: { value: vi.fn(() => dialog.setAttribute('open', '')) },
      close: { value: vi.fn(() => dialog.removeAttribute('open')) }
    });
    http.expectNone('/api/usuarios/me');
    elegirPerfil(selector);
    await renderizar();
  }
  function elegirPerfil(selector = '.profile-link') {
    const boton = harness.routeNativeElement!.querySelector(selector)!.closest('summary')!;
    boton.click();
    expect(boton.closest('details')!.open).toBe(true);
    http.expectNone('/api/usuarios/me');
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.account-profile')!.click();
    expect(boton.closest('details')!.open).toBe(false);
  }
  async function abrir(respuesta = usuario, ruta = '/admin/paquetes', selector = '.profile-link') {
    await mostrarModal(ruta, selector);
    const request = http.expectOne('/api/usuarios/me');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-de-prueba');
    request.flush(respuesta);
    await renderizar();
  }

  it('abre el modal desde la cabecera y conserva la sección y la URL actuales', async () => {
    await abrir();
    const contenido = harness.routeNativeElement!;
    expect(contenido.querySelector('h1')?.textContent).toBe('Paquetes');
    expect(TestBed.inject(Router).url).toBe('/admin/paquetes');
    expect(pagina.dialog().nativeElement.open).toBe(true);
    expect(contenido.querySelector('#perfil-titulo')?.textContent).toBe('Mi cuenta');
    expect(contenido.querySelector('#perfil-descripcion')).toBeNull();
    expect(contenido.querySelector<HTMLInputElement>('#perfil-email')?.value).toBe(usuario.email);
    expect(contenido.querySelector<HTMLInputElement>('#perfil-email')?.readOnly).toBe(true);
    expect(Array.from(contenido.querySelectorAll('#perfil-form .form-label')).map(label => label.textContent)).toEqual(['Nombres', 'Apellidos', 'Usuario', 'Teléfono', 'Correo']);
    expect(contenido.querySelectorAll('nav[aria-label="Secciones del panel"] a')).toHaveLength(5);
    expect(contenido.querySelector('input[formControlName="email"]')).toBeNull();
    expect(contenido.querySelector('select')).toBeNull();
    expect(pagina.form.getRawValue()).toEqual({ nombre: 'Ana', apellido: 'Prueba', usuario: usuario.usuario, celular: usuario.celular });
  });

  it('guarda los datos del perfil sin enviar el correo y actualiza la cabecera', async () => {
    await abrir();
    const nombre = harness.routeNativeElement!.querySelector<HTMLInputElement>('#perfil-nombre')!;
    nombre.value = ' Ana María ';
    nombre.dispatchEvent(new Event('input', { bubbles: true }));
    const guardar = pagina.guardar();
    const request = http.expectOne('/api/usuarios/me');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ nombre: 'Ana María', apellido: 'Prueba', usuario: usuario.usuario, celular: usuario.celular });
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-de-prueba');
    const actualizado = { ...usuario, nombre: 'Ana María' };
    request.flush(actualizado);
    await guardar;
    await renderizar();
    expect(harness.routeNativeElement!.querySelector('.profile-copy strong')?.textContent).toBe('Ana María Prueba');
    expect(harness.routeNativeElement!.querySelector('[role="status"]')?.textContent).toContain('se actualizó correctamente');
    expect(pagina.form.pristine).toBe(true);
    await pagina.cerrar();
    expect(pagina.dialog().nativeElement.open).toBe(false);
    elegirPerfil();
    http.expectOne('/api/usuarios/me').flush(actualizado);
    await renderizar();
    expect(harness.routeNativeElement!.querySelector<HTMLInputElement>('#perfil-nombre')?.value).toBe('Ana María');
  });

  it('rechaza nombres vacíos o demasiado largos y permite cancelar sin enviar cambios', async () => {
    await abrir();
    pagina.form.patchValue({ nombre: '   ' }); pagina.form.markAsDirty();
    await pagina.guardar();
    expect(pagina.form.controls.nombre.invalid).toBe(true);
    pagina.form.patchValue({ nombre: 'a'.repeat(101) });
    await pagina.guardar();
    expect(pagina.form.controls.nombre.hasError('maxlength')).toBe(true);
    http.expectNone('/api/usuarios/me');
    pagina.cancelar();
    expect(pagina.form.getRawValue()).toEqual({ nombre: 'Ana', apellido: 'Prueba', usuario: usuario.usuario, celular: usuario.celular });
    expect(pagina.form.pristine).toBe(true);
  });

  it('conserva los cambios y el nombre de la sesión cuando falla el guardado y permite reintentar', async () => {
    await abrir();
    pagina.form.patchValue({ apellido: 'Nuevo' }); pagina.form.markAsDirty();
    const guardar = pagina.guardar();
    http.expectOne('/api/usuarios/me').flush(null, { status: 500, statusText: 'Internal Server Error' });
    await guardar;
    expect(pagina.error()).toContain('Inténtalo de nuevo');
    expect(pagina.form.controls.apellido.value).toBe('Nuevo');
    expect(TestBed.inject(AuthSessionService).sesion()?.nombre).toBe('Ana Prueba');
    expect(pagina.guardando()).toBe(false);
    expect(pagina.form.dirty).toBe(true);
    const reintentar = pagina.guardar();
    http.expectOne('/api/usuarios/me').flush({ ...usuario, apellido: 'Nuevo' });
    await reintentar;
    expect(pagina.error()).toBe('');
    expect(TestBed.inject(AuthSessionService).sesion()?.nombre).toBe('Ana Nuevo');
  });

  it('muestra un error de carga y permite volver a consultar la cuenta', async () => {
    await mostrarModal();
    http.expectOne('/api/usuarios/me').flush(null, { status: 0, statusText: 'Unknown Error' });
    await renderizar();
    expect(pagina.error()).toContain('conectar con el servidor');
    expect(harness.routeNativeElement!.querySelector('dialog')?.textContent).toContain('Volver a intentar');
    const reintentar = pagina.cargar();
    http.expectOne('/api/usuarios/me').flush(usuario);
    await reintentar;
    expect(pagina.error()).toBe('');
    expect(pagina.cargando()).toBe(false);
  });

  it('pide confirmar el descarte al cerrar y conserva el formulario si se vuelve al modal', async () => {
    await abrir();
    pagina.form.patchValue({ nombre: 'Otra' }); pagina.form.markAsDirty();
    const escape = new Event('cancel', { cancelable: true });
    pagina.dialog().nativeElement.dispatchEvent(escape);
    await renderizar();
    expect(escape.defaultPrevented).toBe(true);
    expect(confirmar).toHaveBeenCalled();
    expect(pagina.dialog().nativeElement.open).toBe(true);
    expect(pagina.form.controls.nombre.value).toBe('Otra');
    confirmar.mockResolvedValue(true);
    await pagina.cerrar();
    expect(pagina.dialog().nativeElement.open).toBe(false);
    expect(pagina.form.pristine).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/admin/paquetes');
  });

  it('bloquea envíos duplicados y el cierre mientras guarda', async () => {
    await abrir();
    pagina.form.patchValue({ nombre: 'Otra' }); pagina.form.markAsDirty();
    const guardar = pagina.guardar();
    await pagina.guardar();
    await pagina.cerrar();
    expect(pagina.dialog().nativeElement.open).toBe(true);
    http.expectOne('/api/usuarios/me').flush({ ...usuario, nombre: 'Otra' });
    await guardar;
    await pagina.cerrar();
    expect(pagina.dialog().nativeElement.open).toBe(false);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('permite al operador abrir su perfil desde la cabecera', async () => {
    TestBed.inject(AuthRepository).iniciarSesion = () => of({ usuarioId: '25', nombre: 'Ana Prueba', correo: usuario.email, rol: 'Operador', expiraEn: Date.now() + 900000 });
    await abrir({ ...usuario, rol: 'EMPLEADO' });
    expect(harness.routeNativeElement!.querySelector('.account-role')?.textContent).toContain('Operador');
    expect(TestBed.inject(Router).url).toBe('/admin/paquetes');
  });

  async function abrirPassword() {
    await abrir();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('#tab-password')!.click();
    await renderizar();
  }

  it('alterna los formularios con las pestañas y el teclado, conservando los datos del perfil', async () => {
    await abrir();
    pagina.form.patchValue({ nombre: 'Ana María' }); pagina.form.markAsDirty();
    const tab = harness.routeNativeElement!.querySelector<HTMLButtonElement>('#tab-perfil')!;
    tab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await renderizar();
    expect(harness.routeNativeElement!.querySelector('#panel-perfil')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('#password-actual')).not.toBeNull();
    expect(harness.routeNativeElement!.querySelector('#tab-password')?.getAttribute('aria-selected')).toBe('true');
    expect(harness.routeNativeElement!.querySelector('.modal-actions [type="submit"]')?.textContent).toContain('Actualizar contraseña');
    pagina.cambiarSeccion('perfil');
    await renderizar();
    expect(harness.routeNativeElement!.querySelector('#password-form')).toBeNull();
    expect(pagina.form.controls.nombre.value).toBe('Ana María');
    expect(TestBed.inject(Router).url).toBe('/admin/paquetes');
  });

  it('rechaza contraseñas vacías, cortas, distintas o que superan el límite UTF-8', async () => {
    await abrirPassword();
    await pagina.actualizarPassword();
    expect(pagina.passwordForm.controls.passwordActual.touched).toBe(true);
    pagina.passwordForm.setValue({ passwordActual: 'Anterior123!', passwordNueva: 'corta', confirmacion: 'corta' });
    await pagina.actualizarPassword();
    expect(pagina.passwordForm.controls.passwordNueva.hasError('minlength')).toBe(true);
    pagina.passwordForm.patchValue({ passwordNueva: 'NuevaClave123!', confirmacion: 'Diferente123!' });
    await pagina.actualizarPassword();
    expect(pagina.passwordForm.hasError('clavesDistintas')).toBe(true);
    pagina.passwordForm.patchValue({ passwordNueva: 'é'.repeat(37), confirmacion: 'é'.repeat(37) });
    await pagina.actualizarPassword();
    expect(pagina.passwordForm.controls.passwordNueva.hasError('claveLarga')).toBe(true);
    http.expectNone('/api/usuarios/me/password');
  });

  it('envía únicamente las dos contraseñas sin recortar espacios y limpia los campos al guardar', async () => {
    await abrirPassword();
    const datos = { passwordActual: ' Anterior123! ', passwordNueva: ' NuevaClave456! ', confirmacion: ' NuevaClave456! ' };
    for (const [campo, valor] of Object.entries(datos)) {
      const input = harness.routeNativeElement!.querySelector<HTMLInputElement>(`[formControlName="${campo}"]`)!;
      input.value = valor;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await renderizar();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.modal-actions [type="submit"]')!.click();
    const request = http.expectOne('/api/usuarios/me/password');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ passwordActual: datos.passwordActual, passwordNueva: datos.passwordNueva });
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-de-prueba');
    await pagina.actualizarPassword();
    pagina.cambiarSeccion('perfil');
    await pagina.cerrar();
    expect(pagina.seccion()).toBe('password');
    expect(pagina.dialog().nativeElement.open).toBe(true);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await renderizar();
    expect(pagina.passwordForm.getRawValue()).toEqual({ passwordActual: '', passwordNueva: '', confirmacion: '' });
    expect(pagina.mensaje()).toContain('contraseña se actualizó correctamente');
    expect(TestBed.inject(AuthSessionService).sesion()?.nombre).toBe('Ana Prueba');
    expect(pagina.passwordForm.pristine).toBe(true);
    http.expectNone('/api/auth/refresh');
  });

  it.each([
    [400, 'PASSWORD_ACTUAL_INCORRECTA', 'actual no es correcta'],
    [400, 'PASSWORD_REUTILIZADA', 'diferente de la actual'],
    [429, 'ERROR_HTTP_429', 'límite de intentos']
  ])('muestra el error %s/%s sin renovar ni cerrar la sesión', async (status, codigo, mensaje) => {
    await abrirPassword();
    pagina.passwordForm.setValue({ passwordActual: 'Anterior123!', passwordNueva: 'NuevaClave456!', confirmacion: 'NuevaClave456!' });
    const guardar = pagina.actualizarPassword();
    http.expectOne('/api/usuarios/me/password').flush({ codigo }, { status, statusText: 'Error' });
    await guardar;
    expect(pagina.error()).toContain(mensaje);
    expect(pagina.guardando()).toBe(false);
    expect(pagina.dialog().nativeElement.open).toBe(true);
    expect(TestBed.inject(AuthSessionService).sesion()).not.toBeNull();
    http.expectNone('/api/auth/refresh');
  });

  it('confirma el descarte de contraseñas y vuelve a abrir en Mi perfil sin datos sensibles', async () => {
    await abrirPassword();
    pagina.passwordForm.patchValue({ passwordActual: 'Anterior123!' }); pagina.passwordForm.markAsDirty();
    await pagina.cerrar();
    expect(pagina.dialog().nativeElement.open).toBe(true);
    expect(pagina.passwordForm.controls.passwordActual.value).toBe('Anterior123!');
    confirmar.mockResolvedValue(true);
    await pagina.cerrar();
    expect(pagina.passwordForm.controls.passwordActual.value).toBe('');
    pagina.abrir();
    http.expectOne('/api/usuarios/me').flush(usuario);
    await renderizar();
    expect(pagina.seccion()).toBe('perfil');
    expect(pagina.passwordForm.pristine).toBe(true);
  });

  async function abrirCliente() {
    TestBed.inject(AuthRepository).iniciarSesion = () => of({ usuarioId: '25', nombre: 'Ana Prueba', correo: usuario.email, rol: 'Cliente', expiraEn: Date.now() + 900000 });
    await abrir({ ...usuario, rol: 'CLIENTE' }, '/destinos', '.customer-name');
  }

  it('abre el mismo modal desde el nombre del cliente sin salir del sitio público', async () => {
    await abrirCliente();
    expect(pagina.dialog().nativeElement.open).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/destinos');
    expect(harness.routeNativeElement!.querySelectorAll('vp-perfil-modal')).toHaveLength(1);
    expect(harness.routeNativeElement!.querySelector('.account-role')?.textContent).toBe('Cliente');
    expect(harness.routeNativeElement!.querySelector('.admin-sidebar')).toBeNull();
    expect(harness.routeNativeElement!.querySelectorAll('[role="tab"]')).toHaveLength(3);
  });

  it('actualiza el saludo del cliente al guardar su perfil y mantiene el menú móvil al cerrar', async () => {
    await abrirCliente();
    await pagina.cerrar();
    const menu = harness.routeNativeElement!.querySelector<HTMLButtonElement>('.menu-toggle')!;
    menu.click();
    elegirPerfil('.customer-name');
    http.expectOne('/api/usuarios/me').flush({ ...usuario, rol: 'CLIENTE' });
    await renderizar();
    pagina.form.patchValue({ nombre: 'Lucía' }); pagina.form.markAsDirty();
    const guardar = pagina.guardar();
    http.expectOne('/api/usuarios/me').flush({ ...usuario, nombre: 'Lucía', rol: 'CLIENTE' });
    await guardar;
    await renderizar();
    expect(harness.routeNativeElement!.querySelector('.customer-name')?.textContent).toContain('Hola, Lucía');
    await pagina.cerrar();
    expect(pagina.dialog().nativeElement.open).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/destinos');
    expect(harness.routeNativeElement!.querySelector('#navegacion')?.classList.contains('is-open')).toBe(true);
  });

  it('permite al cliente actualizar su contraseña desde el mismo modal', async () => {
    await abrirCliente();
    pagina.cambiarSeccion('password');
    pagina.passwordForm.setValue({ passwordActual: 'Anterior123!', passwordNueva: 'NuevaClave456!', confirmacion: 'NuevaClave456!' });
    const guardar = pagina.actualizarPassword();
    const request = http.expectOne('/api/usuarios/me/password');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ passwordActual: 'Anterior123!', passwordNueva: 'NuevaClave456!' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await guardar;
    expect(pagina.passwordForm.pristine).toBe(true);
    expect(pagina.mensaje()).toContain('contraseña se actualizó correctamente');
    expect(TestBed.inject(AuthSessionService).sesion()?.rol).toBe('Cliente');
  });

  it('mantiene los accesos de login y registro para visitantes sin solicitar un perfil', async () => {
    TestBed.inject(AuthRepository).obtenerSesion = () => of(null);
    harness = await RouterTestingHarness.create('/destinos');
    expect(harness.routeNativeElement!.querySelector('.customer-name')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('.customer-login')?.textContent).toContain('Iniciar sesión');
    expect(harness.routeNativeElement!.querySelector('.customer-register')?.textContent).toContain('Registrarse');
    http.expectNone('/api/usuarios/me');
  });

  it.each([false, true])('cierra sesión desde el menú de cuenta en admin o cliente (%s)', async cliente => {
    if (cliente) await abrirCliente(); else await abrir();
    await pagina.cerrar();
    const selector = cliente ? '.customer-name' : '.profile-link';
    harness.routeNativeElement!.querySelector(selector)!.closest('summary')!.click();
    expect(Array.from(harness.routeNativeElement!.querySelectorAll('.account-dropdown button')).map(boton => boton.textContent?.trim())).toEqual(['Mi perfil', 'Cerrar sesión']);
    expect(harness.routeNativeElement!.querySelector('.logout-button')).toBeNull();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.account-logout')!.click();
    await renderizar();
    expect(cerrarSesion).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(AuthSessionService).sesion()).toBeNull();
    expect(TestBed.inject(Router).url).toBe(cliente ? '/' : '/admin/login');
  });

  it('valida el usuario y teléfono, normaliza el usuario y conserva el correo al guardar el perfil', async () => {
    await abrir();
    pagina.form.patchValue({ usuario: 'ab', celular: '12345678' }); pagina.form.markAsDirty();
    await pagina.guardar();
    expect(pagina.form.controls.usuario.invalid).toBe(true);
    expect(pagina.form.controls.celular.invalid).toBe(true);
    http.expectNone('/api/usuarios/me');
    pagina.form.patchValue({ usuario: 'Ana.Nueva', celular: '987654321' });
    const guardar = pagina.guardar();
    const request = http.expectOne('/api/usuarios/me');
    expect(request.request.body).toEqual({ nombre: 'Ana', apellido: 'Prueba', usuario: 'ana.nueva', celular: '987654321' });
    request.flush({ ...usuario, usuario: 'ana.nueva', celular: '987654321' });
    await guardar;
    expect(pagina.form.controls.usuario.value).toBe('ana.nueva');
    expect(pagina.perfil()?.email).toBe(usuario.email);
  });

  it('mantiene el usuario y teléfono editados si el servidor informa un usuario duplicado', async () => {
    await abrir();
    pagina.form.patchValue({ usuario: 'usuario.ocupado', celular: '987654321' }); pagina.form.markAsDirty();
    const guardar = pagina.guardar();
    http.expectOne('/api/usuarios/me').flush({ codigo: 'CONFLICTO_DATOS' }, { status: 409, statusText: 'Conflict' });
    await guardar;
    expect(pagina.error()).toBe('Este usuario ya está registrado.');
    expect(pagina.form.controls.usuario.value).toBe('usuario.ocupado');
    expect(pagina.form.dirty).toBe(true);
    expect(pagina.perfil()?.usuario).toBe(usuario.usuario);
  });

  async function abrirCorreo(cliente = false) {
    if (cliente) await abrirCliente(); else await abrir();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('#tab-correo')!.click();
    await renderizar();
  }

  it.each([false, true])('actualiza el correo del administrador o cliente (%s) con contraseña y sincroniza el perfil', async cliente => {
    await abrirCorreo(cliente);
    expect(harness.routeNativeElement!.querySelector('#perfil-form')).toBeNull();
    expect(harness.routeNativeElement!.querySelector<HTMLInputElement>('#correo-actual')?.readOnly).toBe(true);
    pagina.correoForm.setValue({ email: 'Nuevo@example.test', passwordActual: ' Actual123! ' }); pagina.correoForm.markAsDirty();
    await renderizar();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.modal-actions [type="submit"]')!.click();
    const request = http.expectOne('/api/usuarios/me');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ email: 'nuevo@example.test', passwordActual: ' Actual123! ' });
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-de-prueba');
    await pagina.actualizarCorreo();
    await pagina.cerrar();
    expect(pagina.dialog().nativeElement.open).toBe(true);
    request.flush({ ...usuario, email: 'nuevo@example.test', rol: cliente ? 'CLIENTE' : 'ADMIN' });
    await renderizar();
    expect(pagina.correoForm.controls.passwordActual.value).toBe('');
    expect(pagina.correoForm.pristine).toBe(true);
    expect(pagina.mensaje()).toBe('Tu correo se actualizó correctamente.');
    expect(TestBed.inject(AuthSessionService).sesion()?.correo).toBe('nuevo@example.test');
    pagina.cambiarSeccion('perfil');
    await renderizar();
    expect(harness.routeNativeElement!.querySelector<HTMLInputElement>('#perfil-email')?.value).toBe('nuevo@example.test');
    http.expectNone('/api/auth/refresh');
  });

  it('exige un correo válido y la contraseña actual antes de enviar', async () => {
    await abrirCorreo();
    pagina.correoForm.setValue({ email: 'incorrecto', passwordActual: '' });
    await pagina.actualizarCorreo();
    expect(pagina.correoForm.controls.email.invalid).toBe(true);
    expect(pagina.correoForm.controls.passwordActual.invalid).toBe(true);
    pagina.correoForm.patchValue({ email: 'a'.repeat(140) + '@example.test', passwordActual: 'Actual123!' });
    await pagina.actualizarCorreo();
    expect(pagina.correoForm.controls.email.hasError('maxlength')).toBe(true);
    http.expectNone('/api/usuarios/me');
  });

  it.each([
    [400, 'PASSWORD_ACTUAL_INCORRECTA', 'La contraseña actual no es correcta.'],
    [409, 'CONFLICTO_DATOS', 'Este correo ya está registrado.'],
    [429, 'ERROR_HTTP_429', 'límite de intentos'],
    [500, 'ERROR_INTERNO', 'Inténtalo de nuevo']
  ] as const)('maneja %s al cambiar el correo sin modificar la sesión', async (status, codigo, mensaje) => {
    await abrirCorreo();
    pagina.correoForm.setValue({ email: 'nuevo@example.test', passwordActual: 'Actual123!' }); pagina.correoForm.markAsDirty();
    const guardar = pagina.actualizarCorreo();
    http.expectOne('/api/usuarios/me').flush({ codigo }, { status, statusText: 'Error' });
    await guardar;
    expect(pagina.error()).toContain(mensaje);
    expect(pagina.correoForm.controls.email.value).toBe('nuevo@example.test');
    expect(pagina.correoForm.dirty).toBe(true);
    expect(TestBed.inject(AuthSessionService).sesion()?.correo).toBe(usuario.email);
    expect(pagina.guardando()).toBe(false);
    http.expectNone('/api/auth/refresh');
  });

  it('conserva los datos personales pendientes al actualizar el correo y limpia las claves al cerrar', async () => {
    await abrir();
    pagina.form.patchValue({ usuario: 'ana.pendiente' }); pagina.form.markAsDirty();
    pagina.cambiarSeccion('correo');
    pagina.correoForm.setValue({ email: 'nuevo@example.test', passwordActual: 'Actual123!' }); pagina.correoForm.markAsDirty();
    const guardar = pagina.actualizarCorreo();
    http.expectOne('/api/usuarios/me').flush({ ...usuario, email: 'nuevo@example.test' });
    await guardar;
    expect(pagina.form.controls.usuario.value).toBe('ana.pendiente');
    expect(pagina.form.dirty).toBe(true);
    pagina.correoForm.controls.passwordActual.setValue('Actual123!'); pagina.correoForm.markAsDirty();
    confirmar.mockResolvedValue(true);
    await pagina.cerrar();
    expect(pagina.correoForm.controls.passwordActual.value).toBe('');
    expect(pagina.correoForm.pristine).toBe(true);
  });

  it('recorre las tres pestañas con el teclado', async () => {
    await abrir();
    const tabs = harness.routeNativeElement!.querySelector('.account-tabs')!;
    tabs.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    await renderizar();
    expect(pagina.seccion()).toBe('correo');
    tabs.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await renderizar();
    expect(pagina.seccion()).toBe('perfil');
    tabs.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    await renderizar();
    expect(pagina.seccion()).toBe('correo');
  });
});
