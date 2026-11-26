import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Destino, DestinoDatos, DestinoFiltros } from '../models/destino';
import { DestinosRepository } from './destinos.repository';

@Injectable()
export class DestinosApiRepository extends DestinosRepository {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/admin/destinos';

  override listar(filtros: DestinoFiltros = {}) {
    let params = new HttpParams();
    if (filtros.nombre?.trim()) params = params.set('nombre', filtros.nombre.trim());
    if (filtros.estado !== undefined) params = params.set('estado', filtros.estado);
    return this.http.get<Destino[]>(this.url, { params });
  }

  override detalle(id: number) { return this.http.get<Destino>(`${this.url}/${id}`); }

  override crear(datos: DestinoDatos) {
    return this.http.post<Destino>(this.url, this.datosSolicitud(datos));
  }

  override actualizar(id: number, datos: DestinoDatos) {
    return this.http.put<Destino>(`${this.url}/${id}`, this.datosSolicitud(datos));
  }

  override cambiarEstado(id: number, estado: boolean) {
    return this.http.patch<Destino>(`${this.url}/${id}/estado`, { estado });
  }

  private datosSolicitud(datos: DestinoDatos): DestinoDatos {
    return {
      nombre: datos.nombre.trim(), ubicacion: datos.ubicacion.trim(),
      subtitulo: datos.subtitulo.trim(), descripcion: datos.descripcion.trim(),
      imagenUrl: datos.imagenUrl?.trim() || null
    };
  }
}
