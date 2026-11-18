import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActualizarPerfil, CambiarCorreo, CambiarPassword, PerfilUsuario } from '../models/perfil';

@Injectable({ providedIn: 'root' })
export class PerfilRepository {
  private readonly http = inject(HttpClient);

  obtener() { return this.http.get<PerfilUsuario>('/api/usuarios/me'); }

  actualizar(datos: ActualizarPerfil) {
    return this.http.patch<PerfilUsuario>('/api/usuarios/me', {
      nombre: datos.nombre.trim(), apellido: datos.apellido.trim(),
      usuario: datos.usuario.trim().toLowerCase(), celular: datos.celular.trim()
    });
  }

  cambiarPassword(datos: CambiarPassword) {
    return this.http.put<void>('/api/usuarios/me/password', {
      passwordActual: datos.passwordActual, passwordNueva: datos.passwordNueva
    });
  }

  cambiarCorreo(datos: CambiarCorreo) {
    return this.http.patch<PerfilUsuario>('/api/usuarios/me', {
      email: datos.email.trim().toLowerCase(), passwordActual: datos.passwordActual
    });
  }
}
