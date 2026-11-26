import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { appConfig } from '../../app.config';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { DEMO_CLAVE, DEMO_CORREO } from '../auth/models/sesion';
import { AuthRepository } from '../auth/data-access/auth.repository';
import { AuthMockRepository } from '../auth/data-access/auth-mock.repository';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('Navegación administrativa', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [...appConfig.providers, provideHttpClientTesting(), { provide: AuthRepository, useClass: AuthMockRepository }] });
  });
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); });
  it('redirige al login al abrir una ruta protegida sin sesión', async () => {
    const harness = await RouterTestingHarness.create('/admin/proveedores');
    expect(harness.routeNativeElement?.textContent).toContain('ACCESO ADMINISTRATIVO');
    expect(harness.routeNativeElement?.querySelector('.admin-sidebar')).toBeNull();
  });
  it('monta el panel con exactamente las cinco secciones y conserva el sitio público separado', async () => {
    await TestBed.inject(AuthSessionService).ingresar(DEMO_CORREO, DEMO_CLAVE);
    const harness = await RouterTestingHarness.create('/admin/usuarios');
    TestBed.inject(HttpTestingController).expectOne(request => request.url === '/api/usuarios').flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
    expect(Array.from(harness.routeNativeElement!.querySelectorAll('nav[aria-label="Secciones del panel"] a')).map(a => a.textContent?.trim())).toEqual(['Usuarios', 'Paquetes', 'Destinos', 'Servicios', 'Proveedores']);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Usuarios');
    expect(harness.routeNativeElement?.querySelector('vp-header')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('vp-footer')).toBeNull();
    await harness.navigateByUrl('/destinos');
    expect(harness.routeNativeElement?.querySelector('vp-header')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('vp-footer')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('.admin-sidebar')).toBeNull();
  });
  it('mantiene al operador fuera de Usuarios y permite consultar Paquetes sin acciones de edición', async () => {
    await TestBed.inject(AuthSessionService).ingresar('valeria@vivaperu.test', DEMO_CLAVE);
    const harness = await RouterTestingHarness.create('/admin/usuarios');
    expect(harness.routeNativeElement?.textContent).toContain('Esta sección requiere otro permiso.');
    await harness.navigateByUrl('/admin/paquetes');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Paquetes');
    expect(harness.routeNativeElement?.querySelector('.create-button')).toBeNull();
    await harness.navigateByUrl('/admin/servicios');
    expect(harness.routeNativeElement?.textContent).toContain('Esta sección requiere otro permiso.');
    TestBed.inject(HttpTestingController).expectNone(request => request.url === '/api/admin/servicios');
    await harness.navigateByUrl('/admin/destinos');
    expect(harness.routeNativeElement?.textContent).toContain('Esta sección requiere otro permiso.');
    TestBed.inject(HttpTestingController).expectNone(request => request.url === '/api/admin/destinos');
  });
});
