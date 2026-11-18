import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthRepository } from '../../features/auth/data-access/auth.repository';
import { SesionAdmin } from '../../features/auth/models/sesion';

export function destinoAdminSeguro(url: string | null, esAdmin = true): string {
  const inicio = esAdmin ? '/admin/usuarios' : '/admin/paquetes';
  if (!url || !/^\/admin\/(usuarios|paquetes|destinos|servicios|proveedores)\/?$/.test(url.split(/[?#]/)[0]) || /[\\\u0000-\u001f]/.test(url)) return inicio;
  if (!esAdmin && /^\/admin\/usuarios(?:[/?#]|$)/.test(url)) return inicio;
  return url;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly repo = inject(AuthRepository);
  private readonly actual = signal<SesionAdmin | null>(null);
  readonly sesion = this.actual.asReadonly();
  readonly esAdministrador = computed(() => this.sesion()?.rol === 'Administrador');
  readonly esPersonal = computed(() => this.sesion()?.rol === 'Administrador' || this.sesion()?.rol === 'Operador');
  private restauracion?: Promise<SesionAdmin | null>;
  async restaurar(): Promise<SesionAdmin | null> {
    if (this.sesion() && this.sesion()!.expiraEn > Date.now()) return this.sesion();
    this.actual.set(null);
    this.restauracion ??= firstValueFrom(this.repo.obtenerSesion()).then(sesion => { this.actual.set(sesion); return sesion; }).finally(() => { this.restauracion = undefined; });
    return this.restauracion;
  }
  async ingresar(correo: string, clave: string) { const sesion = await firstValueFrom(this.repo.iniciarSesion(correo, clave)); this.actual.set(sesion); return sesion; }
  async renovar() { const sesion = await firstValueFrom(this.repo.renovarSesion()); this.actual.set(sesion); return sesion; }
  invalidar() { this.repo.invalidarSesion(); this.actual.set(null); }
  async salir() { await firstValueFrom(this.repo.cerrarSesion()); this.actual.set(null); }
  actualizarPerfil(usuarioId: string, nombre: string, correo: string) { this.actual.update(sesion => sesion?.usuarioId === usuarioId ? { ...sesion, nombre, correo } : sesion); }
}
