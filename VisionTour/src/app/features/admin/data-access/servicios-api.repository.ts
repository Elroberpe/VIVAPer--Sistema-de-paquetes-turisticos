import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Servicio, ServicioDatos, ServicioFiltros } from '../models/servicio';
import { ServiciosRepository } from './servicios.repository';

@Injectable()
export class ServiciosApiRepository extends ServiciosRepository {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/admin/servicios';

  override listar(filtros: ServicioFiltros = {}) {
    let params = new HttpParams();
    if (filtros.nombre?.trim()) params = params.set('nombre', filtros.nombre.trim());
    if (filtros.estado !== undefined) params = params.set('estado', filtros.estado);
    return this.http.get<Servicio[]>(this.url, { params });
  }

  override detalle(id: number) { return this.http.get<Servicio>(`${this.url}/${id}`); }

  override crear(datos: ServicioDatos) {
    return this.http.post<Servicio>(this.url, this.datosSolicitud(datos));
  }

  override actualizar(id: number, datos: ServicioDatos) {
    return this.http.put<Servicio>(`${this.url}/${id}`, this.datosSolicitud(datos));
  }

  override cambiarEstado(id: number, estado: boolean) {
    return this.http.patch<Servicio>(`${this.url}/${id}/estado`, { estado });
  }

  private datosSolicitud(datos: ServicioDatos): ServicioDatos {
    return { nombre: datos.nombre.trim(), descripcion: datos.descripcion?.trim() || null };
  }
}
