import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService, destinoAdminSeguro } from '../../../core/auth/auth-session.service';
import { AuthRepository } from '../../auth/data-access/auth.repository';
import { AuthMockRepository } from '../../auth/data-access/auth-mock.repository';
import { DEMO_CLAVE, DEMO_CORREO } from '../../auth/models/sesion';
import { PaquetesMockRepository } from '../../paquetes/data-access/paquetes-mock.repository';
import { CatalogoMockStore } from '../../../shared/catalogo/catalogo-mock.store';
import { AdminMockStore } from './admin-mock.store';
import { AdminMockRepository, validarCambioUsuario } from './admin-mock.repository';
import { RegistroAdmin } from '../models/admin';

describe('Acceso y administración de prueba', () => {
  let auth: AuthSessionService;
  let repo: AdminMockRepository;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: AuthRepository, useClass: AuthMockRepository }, AdminMockRepository] });
    auth = TestBed.inject(AuthSessionService);
    repo = TestBed.inject(AdminMockRepository);
  });
  it('acepta la cuenta demo, conserva la sesión al restaurar y la elimina al salir', async () => {
    await auth.ingresar(DEMO_CORREO, DEMO_CLAVE);
    expect(auth.esAdministrador()).toBe(true);
    expect((await firstValueFrom(TestBed.inject(AuthRepository).obtenerSesion()))?.correo).toBe(DEMO_CORREO);
    await auth.salir();
    expect(auth.sesion()).toBeNull();
    expect(await firstValueFrom(TestBed.inject(AuthRepository).obtenerSesion())).toBeNull();
  });
  it('rechaza claves incorrectas y cuentas inactivas con el mismo error', async () => {
    await expect(auth.ingresar(DEMO_CORREO, 'incorrecta')).rejects.toThrow('El correo o la contraseña no son correctos.');
    await expect(auth.ingresar('luciana@vivaperu.test', DEMO_CLAVE)).rejects.toThrow('El correo o la contraseña no son correctos.');
    expect(auth.sesion()).toBeNull();
  });
  it('descarta sesiones vencidas y obtiene el rol del usuario, no del almacenamiento', async () => {
    const origen = TestBed.inject(AuthRepository);
    sessionStorage.setItem('vivaperu.admin.demo.v1', JSON.stringify({ usuarioId: 'u1', expiraEn: Date.now() - 1 }));
    expect(await firstValueFrom(origen.obtenerSesion())).toBeNull();
    sessionStorage.setItem('vivaperu.admin.demo.v1', JSON.stringify({ usuarioId: 'u3', expiraEn: Date.now() + 60000, rol: 'Administrador' }));
    expect((await firstValueFrom(origen.obtenerSesion()))?.rol).toBe('Operador');
  });
  it('solo permite regresar a secciones internas conocidas', () => {
    for (const url of ['https://otro.example', '//otro.example', '/admin/login', '/admin/paquetes/../../login', '/admin/usuarios-mal', '/admin/paquetes\\..']) expect(destinoAdminSeguro(url)).toBe('/admin/usuarios');
    expect(destinoAdminSeguro('/admin/destinos?q=Cusco')).toBe('/admin/destinos?q=Cusco');
    expect(destinoAdminSeguro('/admin/usuarios', false)).toBe('/admin/paquetes');
  });
  it('no permite guardar sin sesión ni con un operador', async () => {
    const registro: RegistroAdmin = { id: '', nombre: 'Nuevo proveedor', descripcion: '', estado: 'Activo' };
    await expect(firstValueFrom(repo.guardar('proveedores', registro))).rejects.toThrow('Tu sesión no permite');
    await auth.ingresar('valeria@vivaperu.test', DEMO_CLAVE);
    await expect(firstValueFrom(repo.guardar('proveedores', registro))).rejects.toThrow('Tu sesión no permite');
  });
  it('impide correos duplicados, perder el acceso propio y retirar el último administrador', async () => {
    await auth.ingresar(DEMO_CORREO, DEMO_CLAVE);
    const usuarios = await firstValueFrom(repo.listar('usuarios'));
    await expect(firstValueFrom(repo.guardar('usuarios', { ...usuarios[2], correo: DEMO_CORREO }))).rejects.toThrow('Ya existe');
    await expect(firstValueFrom(repo.guardar('usuarios', { ...usuarios[0], estado: 'Inactivo' }))).rejects.toThrow('No puedes desactivar');
    const unicoAdmin = TestBed.inject(AdminMockStore).snapshot.usuarios.filter(u => u.id !== 'u2');
    expect(() => validarCambioUsuario(unicoAdmin, { ...usuarios[0], estado: 'Inactivo' }, 'otro-actor')).toThrow('al menos un administrador');
  });
  it('comparte las ediciones y los estados de publicación con el catálogo público', async () => {
    await auth.ingresar(DEMO_CORREO, DEMO_CLAVE);
    const publico = new PaquetesMockRepository(TestBed.inject(CatalogoMockStore));
    const paquete = (await firstValueFrom(repo.listar('paquetes')))[0];
    await firstValueFrom(repo.guardar('paquetes', { ...paquete, nombre: 'Experiencia editada de prueba', estado: 'Borrador' }));
    expect((await firstValueFrom(publico.listar())).some(p => p.id === paquete.id)).toBe(false);
    await firstValueFrom(repo.guardar('paquetes', { ...paquete, nombre: 'Experiencia editada de prueba', estado: 'Publicado' }));
    expect((await firstValueFrom(publico.listar())).find(p => p.id === paquete.id)?.titulo).toBe('Experiencia editada de prueba');
  });
  it('impide desactivar destinos publicados y proveedores con servicios activos', async () => {
    await auth.ingresar(DEMO_CORREO, DEMO_CLAVE);
    const destino = (await firstValueFrom(repo.listar('destinos')))[0];
    const proveedor = (await firstValueFrom(repo.listar('proveedores')))[0];
    await expect(firstValueFrom(repo.guardar('destinos', { ...destino, estado: 'Inactivo' }))).rejects.toThrow('paquetes publicados');
    await expect(firstValueFrom(repo.guardar('proveedores', { ...proveedor, estado: 'Inactivo' }))).rejects.toThrow('servicios activos');
  });
  it('crea servicios vinculados y rechaza importes que no son válidos', async () => {
    await auth.ingresar(DEMO_CORREO, DEMO_CLAVE);
    const servicio: RegistroAdmin = { id: '', nombre: 'Nuevo guiado de prueba', descripcion: 'Actividad ficticia', estado: 'Activo', tipo: 'Guiado', proveedorId: 'pr1', precio: '99.90' };
    await expect(firstValueFrom(repo.guardar('servicios', { ...servicio, precio: '-1' }))).rejects.toThrow('tarifa válida');
    const creado = await firstValueFrom(repo.guardar('servicios', servicio));
    expect((await firstValueFrom(repo.listar('servicios'))).find(s => s.id === creado.id)?.proveedorId).toBe('pr1');
  });
});
