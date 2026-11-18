import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActualizarUsuarioAdmin, CrearUsuarioAdmin, FiltrosUsuarios, UsuarioDetalle, UsuarioResumen, UsuariosPagina } from '../models/usuario';

@Injectable({ providedIn: 'root' })
export class UsuariosRepository {
  private readonly http = inject(HttpClient);

  listar(filtros: FiltrosUsuarios) {
    let params = new HttpParams().set('page', filtros.page).set('size', filtros.size);
    if (filtros.buscar.trim()) params = params.set('buscar', filtros.buscar.trim());
    if (filtros.activo !== undefined) params = params.set('activo', filtros.activo);
    return this.http.get<UsuariosPagina>('/api/usuarios', { params });
  }

  detalle(id: number) { return this.http.get<UsuarioDetalle>(`/api/usuarios/${id}`); }

  crear(datos: CrearUsuarioAdmin) {
    return this.http.post<UsuarioDetalle>('/api/usuarios', {
      nombre: datos.nombre.trim(), apellido: datos.apellido.trim(),
      usuario: datos.usuario.trim().toLowerCase(), correo: datos.correo.trim().toLowerCase(),
      celular: datos.celular.trim(), password: datos.password, rol: datos.rol
    });
  }

  cambiarEstado(id: number, activo: boolean) {
    return this.http.patch<UsuarioDetalle>(`/api/usuarios/${id}/estado`, { activo });
  }

  actualizarDatos(id: number, datos: ActualizarUsuarioAdmin) {
    return this.http.put<UsuarioDetalle>(`/api/usuarios/${id}`, {
      nombre: datos.nombre.trim(), apellido: datos.apellido.trim(),
      usuario: datos.usuario.trim().toLowerCase(), correo: datos.correo.trim().toLowerCase(),
      celular: datos.celular.trim()
    });
  }

  cambiarRol(id: number, rol: UsuarioResumen['rol']) {
    return this.http.patch<UsuarioDetalle>(`/api/usuarios/${id}/rol`, { rol });
  }
}
