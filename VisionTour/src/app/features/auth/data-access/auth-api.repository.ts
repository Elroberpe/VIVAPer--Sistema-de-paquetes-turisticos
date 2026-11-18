import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, defer, firstValueFrom, of, throwError } from 'rxjs';
import { AuthMutex } from '../../../core/auth/auth-mutex';
import { AuthResponse } from '../models/auth-api';
import { SesionAdmin } from '../models/sesion';
import { AuthRepository } from './auth.repository';
import { RegistroCliente } from '../models/registro';

@Injectable()
export class AuthApiRepository extends AuthRepository {
  private readonly http = inject(HttpClient);
  private readonly mutex = inject(AuthMutex);
  private token: string | null = null;
  private sesion: SesionAdmin | null = null;
  private renovacion?: Promise<SesionAdmin>;
  private cerrando = false;

  override registrarCliente(datos: RegistroCliente) {
    return defer(() => this.mutex.ejecutar(async () => {
      // El backend asigna CLIENTE: nunca se envía un rol desde el formulario.
      await this.post<{ mensaje: string }>('registro', {
        nombre: datos.nombre.trim(), apellido: datos.apellido.trim(),
        usuario: datos.usuario.trim().toLowerCase(), celular: datos.celular.trim(),
        email: datos.email.trim().toLowerCase(), password: datos.password
      });
    }));
  }

  override iniciarSesion(correo: string, clave: string) {
    return defer(() => this.mutex.ejecutar(async () => {
      const respuesta = await this.post<AuthResponse>('login', { email: correo.trim(), password: clave });
      return this.guardar(respuesta);
    }));
  }
  override obtenerSesion() {
    return defer(() => this.sesion && this.sesion.expiraEn > Date.now() ? of(this.sesion) : this.renovarSesion()).pipe(
      catchError(error => error instanceof HttpErrorResponse && error.status === 401 ? of(null) : throwError(() => error))
    );
  }
  override renovarSesion() {
    return defer(() => {
      if (this.cerrando) throw new Error('El cierre de sesión está en curso.');
      this.renovacion ??= this.mutex.ejecutar(async () => this.guardar(await this.post<AuthResponse>('refresh', {})))
        .catch(error => { this.invalidarSesion(); throw error; })
        .finally(() => { this.renovacion = undefined; });
      return this.renovacion;
    });
  }
  override cerrarSesion() {
    return defer(async () => {
      this.cerrando = true;
      try {
        // El mismo lock espera renovaciones que ya estuvieran en curso.
        await this.mutex.ejecutar(() => this.post<void>('logout', {}));
        this.invalidarSesion();
      } finally { this.cerrando = false; }
    });
  }
  override obtenerAccessToken() { return this.token; }
  override invalidarSesion() { this.token = null; this.sesion = null; }

  private async post<T>(ruta: string, body: object): Promise<T> {
    // Angular lee la cookie XSRF-TOKEN actual y agrega X-XSRF-TOKEN al POST relativo.
    await firstValueFrom(this.http.get<void>('/api/auth/csrf', { withCredentials: true }));
    return firstValueFrom(this.http.post<T>(`/api/auth/${ruta}`, body, { withCredentials: true }));
  }
  private guardar(respuesta: AuthResponse): SesionAdmin {
    const usuario = respuesta?.usuario;
    if (!usuario || !Number.isSafeInteger(usuario.id) || usuario.id <= 0 || typeof usuario.nombre !== 'string' || typeof usuario.apellido !== 'string' || typeof usuario.email !== 'string' || respuesta.tokenType !== 'Bearer' || typeof respuesta.accessToken !== 'string' || !respuesta.accessToken || !Number.isFinite(respuesta.expiresIn) || respuesta.expiresIn <= 0) {
      this.invalidarSesion();
      throw new Error('El servidor devolvió una respuesta de sesión no válida.');
    }
    const roles = { ADMIN: 'Administrador', EMPLEADO: 'Operador', CLIENTE: 'Cliente' } as const;
    const rol = roles[usuario.rol];
    if (!rol) { this.invalidarSesion(); throw new Error('No se reconoció el rol de esta cuenta.'); }
    this.sesion = { usuarioId: String(usuario.id), nombre: `${usuario.nombre} ${usuario.apellido}`.trim(), correo: usuario.email, rol, expiraEn: Date.now() + respuesta.expiresIn * 1000 };
    this.token = respuesta.accessToken;
    return this.sesion;
  }
}
