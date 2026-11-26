import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EstadoProveedor, Proveedor, ProveedorDatos, ProveedorFiltros, ProveedoresPagina } from '../models/proveedor';
import { ProveedoresRepository } from './proveedores.repository';

@Injectable()
export class ProveedoresApiRepository extends ProveedoresRepository {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/admin/proveedores';

  override listar(filtros: ProveedorFiltros) {
    let params = new HttpParams().set('page', filtros.page).set('size', filtros.size);
    if (filtros.nombre?.trim()) params = params.set('nombre', filtros.nombre.trim());
    if (filtros.estado) params = params.set('estado', filtros.estado);
    return this.http.get<ProveedoresPagina>(this.url, { params });
  }

  override detalle(id: number) { return this.http.get<Proveedor>(`${this.url}/${id}`); }
  override crear(datos: ProveedorDatos) { return this.http.post<Proveedor>(this.url, this.datosSolicitud(datos)); }
  override actualizar(id: number, datos: ProveedorDatos) { return this.http.put<Proveedor>(`${this.url}/${id}`, this.datosSolicitud(datos)); }
  override cambiarEstado(id: number, estado: boolean) { return this.http.patch<EstadoProveedor>(`${this.url}/${id}/estado`, { estado }); }

  private datosSolicitud(datos: ProveedorDatos): ProveedorDatos {
    return {
      ruc: datos.ruc, nombre: datos.nombre.trim(), encargado: datos.encargado.trim(),
      email: datos.email?.trim() || null, telefono: datos.telefono.trim(), serviciosIds: [...datos.serviciosIds]
    };
  }
}
