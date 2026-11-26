import { Observable } from 'rxjs';
import { Servicio, ServicioDatos, ServicioFiltros } from '../models/servicio';

export abstract class ServiciosRepository {
  abstract listar(filtros?: ServicioFiltros): Observable<Servicio[]>;
  abstract detalle(id: number): Observable<Servicio>;
  abstract crear(datos: ServicioDatos): Observable<Servicio>;
  abstract actualizar(id: number, datos: ServicioDatos): Observable<Servicio>;
  abstract cambiarEstado(id: number, estado: boolean): Observable<Servicio>;
}
