import { Injectable, inject } from '@angular/core';
import { defer, delay, of, throwError } from 'rxjs';
import { AdminMockStore } from '../../admin/data-access/admin-mock.store';
import { DEMO_CLAVE, DURACION_SESION, SesionAdmin } from '../models/sesion';
import { AuthRepository } from './auth.repository';

const CLAVE_SESION = 'vivaperu.admin.demo.v1';

@Injectable()
export class AuthMockRepository extends AuthRepository {
  override registrarCliente() { return throwError(() => new Error('El registro requiere la API de autenticación real.')); }
  private readonly store = inject(AdminMockStore);
  override iniciarSesion(correo: string, clave: string) {
    return defer(() => {
      const usuario = this.store.snapshot.usuarios.find(u => u.correo.toLowerCase() === correo.trim().toLowerCase() && u.estado === 'Activo');
      if (!usuario || clave !== DEMO_CLAVE) throw new Error('El correo o la contraseña no son correctos.');
      const sesion: SesionAdmin = { usuarioId: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol, expiraEn: Date.now() + DURACION_SESION };
      try { sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ usuarioId: sesion.usuarioId, expiraEn: sesion.expiraEn })); } catch { /* La sesión en memoria sigue disponible. */ }
      return of(sesion);
    }).pipe(delay(400));
  }
  override obtenerSesion() {
    return defer(() => {
      try {
        const guardada: unknown = JSON.parse(sessionStorage.getItem(CLAVE_SESION) ?? 'null');
        if (!guardada || typeof guardada !== 'object' || !('usuarioId' in guardada) || !('expiraEn' in guardada)) return of(null);
        const { usuarioId, expiraEn } = guardada;
        if (typeof expiraEn !== 'number' || !Number.isFinite(expiraEn) || expiraEn <= Date.now() || expiraEn > Date.now() + DURACION_SESION) { this.limpiar(); return of(null); }
        const usuario = this.store.snapshot.usuarios.find(u => u.id === usuarioId && u.estado === 'Activo');
        if (!usuario) { this.limpiar(); return of(null); }
        return of({ usuarioId: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol, expiraEn } satisfies SesionAdmin);
      } catch { this.limpiar(); return of(null); }
    }).pipe(delay(80));
  }
  override cerrarSesion() { return defer(() => { this.limpiar(); return of(undefined); }); }
  private limpiar() { try { sessionStorage.removeItem(CLAVE_SESION); } catch { /* El navegador puede bloquear el almacenamiento. */ } }
}
