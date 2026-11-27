import { Observable } from 'rxjs';
import { EstadoProveedor, Proveedor, ProveedorDatos, ProveedorFiltros, ProveedoresPagina } from '../models/proveedor';

export abstract class ProveedoresRepository {
  abstract listar(filtros: ProveedorFiltros): Observable<ProveedoresPagina>;
  abstract detalle(id: number): Observable<Proveedor>;
  abstract crear(datos: ProveedorDatos): Observable<Proveedor>;
  abstract actualizar(id: number, datos: ProveedorDatos): Observable<Proveedor>;
  abstract cambiarEstado(id: number, estado: boolean): Observable<EstadoProveedor>;
}
