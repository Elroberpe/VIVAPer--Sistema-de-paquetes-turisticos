import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthMutex } from '../../../core/auth/auth-mutex';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { authInterceptor } from '../../../core/auth/auth.interceptor';
import { AuthResponse } from '../models/auth-api';
import { AuthRepository } from './auth.repository';
import { AuthApiRepository } from './auth-api.repository';

const respuesta = (token = 'jwt-de-prueba', rol: 'ADMIN' | 'EMPLEADO' | 'CLIENTE' = 'ADMIN'): AuthResponse => ({
  accessToken: token, tokenType: 'Bearer', expiresIn: 900,
  usuario: { id: 25, nombre: 'Ana', apellido: 'Prueba', usuario: 'ana.prueba', celular: '+51999888777', email: 'ana@example.test', rol }
});

describe('Autenticación HTTP según el contrato del backend', () => {
  let http: HttpTestingController;
  let cliente: HttpClient;
  let repo: AuthRepository;
  let auth: AuthSessionService;
  beforeEach(() => {
    sessionStorage.clear(); localStorage.clear();
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
    let cola: Promise<unknown> = Promise.resolve();
    const mutex = { ejecutar<T>(operacion: () => Promise<T>) { const turno = cola.then(operacion); cola = turno.then(() => undefined, () => undefined); return turno; } };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor]), withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })),
      provideHttpClientTesting(), { provide: AuthRepository, useClass: AuthApiRepository }, { provide: AuthMutex, useValue: mutex }
    ] });
    http = TestBed.inject(HttpTestingController); cliente = TestBed.inject(HttpClient);
    repo = TestBed.inject(AuthRepository); auth = TestBed.inject(AuthSessionService);
  });
  afterEach(() => { http.verify(); vi.restoreAllMocks(); });
  async function tomar(url: string) { let request!: TestRequest; await vi.waitFor(() => { request = http.expectOne(url); }); return request; }
  async function completarPost(ruta: string, body: AuthResponse | null, status = 200) {
    const csrf = await tomar('/api/auth/csrf');
    document.cookie = 'XSRF-TOKEN=csrf-de-prueba; path=/'; csrf.flush(null);
    const request = await tomar('/api/auth/' + ruta);
    request.flush(body, { status, statusText: status === 200 ? 'OK' : status === 204 ? 'No Content' : 'Unauthorized' });
    return request;
  }
  async function ingresar(token = 'jwt-original') {
    const promesa = auth.ingresar('ana@example.test', 'clave-ficticia');
    await completarPost('login', respuesta(token));
    return promesa;
  }
  it('registra los seis campos del contrato con CSRF y sin iniciar sesión automáticamente', async () => {
    const registro = firstValueFrom(repo.registrarCliente({ nombre: ' Ana ', apellido: ' Prueba ', usuario: ' Ana.Prueba ', celular: ' +51999888777 ', email: ' Ana@example.test ', password: 'clave-ficticia' }));
    const csrf = await tomar('/api/auth/csrf');
    document.cookie = 'XSRF-TOKEN=csrf-registro; path=/'; csrf.flush(null);
    const request = await tomar('/api/auth/registro');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ nombre: 'Ana', apellido: 'Prueba', usuario: 'ana.prueba', celular: '+51999888777', email: 'ana@example.test', password: 'clave-ficticia' });
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-registro');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.withCredentials).toBe(true);
    request.flush({ mensaje: 'Cliente registrado correctamente.' }, { status: 201, statusText: 'Created' });
    await registro;
    expect(auth.sesion()).toBeNull(); expect(repo.obtenerAccessToken()).toBeNull();
    http.expectNone('/api/auth/login');
  });
  it('envía email/password con CSRF, adapta el usuario y conserva el JWT solo en memoria', async () => {
    const promesa = auth.ingresar(' ana@example.test ', 'clave-ficticia');
    const request = await completarPost('login', respuesta());
    expect(request.request.body).toEqual({ email: 'ana@example.test', password: 'clave-ficticia' });
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-de-prueba');
    expect(request.request.headers.has('Authorization')).toBe(false);
    const sesion = await promesa;
    expect(sesion).toMatchObject({ usuarioId: '25', nombre: 'Ana Prueba', rol: 'Administrador' });
    expect(sesion.expiraEn).toBeGreaterThan(Date.now() + 899000);
    expect(repo.obtenerAccessToken()).toBe('jwt-de-prueba');
    expect(sessionStorage.length).toBe(0); expect(localStorage.length).toBe(0);
  });
  it('restaura mediante la cookie de refresh y acepta un 401 como sesión inexistente', async () => {
    const restauracion = auth.restaurar();
    await completarPost('refresh', null, 401);
    expect(await restauracion).toBeNull();
    expect(repo.obtenerAccessToken()).toBeNull();
  });
  it('comparte una sola renovación entre solicitudes concurrentes', async () => {
    const primera = auth.renovar(); const segunda = auth.renovar();
    await completarPost('refresh', respuesta('jwt-renovado'));
    expect((await primera)?.usuarioId).toBe('25');
    expect(await segunda).toEqual(await primera);
    expect(repo.obtenerAccessToken()).toBe('jwt-renovado');
    http.expectNone('/api/auth/refresh');
  });
  it('ante un 401 renueva y reintenta la petición privada una sola vez', async () => {
    await ingresar();
    const perfil = firstValueFrom(cliente.get('/api/usuarios/me'));
    const original = http.expectOne('/api/usuarios/me');
    expect(original.request.headers.get('Authorization')).toBe('Bearer jwt-original');
    original.flush(null, { status: 401, statusText: 'Unauthorized' });
    await completarPost('refresh', respuesta('jwt-nuevo'));
    const reintento = await tomar('/api/usuarios/me');
    expect(reintento.request.headers.get('Authorization')).toBe('Bearer jwt-nuevo');
    reintento.flush({ id: 25 }); expect(await perfil).toEqual({ id: 25 });
  });
  it('si el refresh falla elimina la sesión sin reintentos en bucle', async () => {
    await ingresar();
    const perfil = firstValueFrom(cliente.get('/api/usuarios/me')).catch(error => error);
    http.expectOne('/api/usuarios/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await completarPost('refresh', null, 401);
    expect((await perfil).status).toBe(401);
    expect(auth.sesion()).toBeNull(); expect(repo.obtenerAccessToken()).toBeNull();
    http.expectNone('/api/usuarios/me');
  });
  it('conserva la sesión en un 403 y no envía el JWT a otros orígenes', async () => {
    await ingresar();
    const prohibida = firstValueFrom(cliente.get('/api/restringido')).catch(error => error);
    http.expectOne('/api/restringido').flush(null, { status: 403, statusText: 'Forbidden' });
    expect((await prohibida).status).toBe(403); expect(auth.sesion()?.rol).toBe('Administrador');
    const externa = firstValueFrom(cliente.get('https://externo.example/api/datos'));
    const request = http.expectOne('https://externo.example/api/datos');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({}); await externa; http.expectNone('/api/auth/refresh');
  });
  it('espera el refresh pendiente antes del logout y elimina la sesión al terminar', async () => {
    await ingresar();
    const renovar = auth.renovar();
    (await tomar('/api/auth/csrf')).flush(null);
    const refresh = await tomar('/api/auth/refresh');
    const salir = auth.salir();
    http.expectNone('/api/auth/logout');
    refresh.flush(respuesta('jwt-renovado'));
    await renovar;
    const logout = await completarPost('logout', null, 204);
    expect(logout.request.headers.has('Authorization')).toBe(false);
    await salir; expect(auth.sesion()).toBeNull(); expect(repo.obtenerAccessToken()).toBeNull();
  });
  it('distingue CLIENTE de los perfiles del personal', async () => {
    const clienteLogin = auth.ingresar('ana@example.test', 'clave-ficticia');
    await completarPost('login', respuesta('jwt-cliente', 'CLIENTE'));
    expect((await clienteLogin).rol).toBe('Cliente'); expect(auth.esPersonal()).toBe(false);
  });
});
