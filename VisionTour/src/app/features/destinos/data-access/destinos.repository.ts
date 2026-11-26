import { Observable } from 'rxjs';
import { Destino, DestinoDatos, DestinoFiltros } from '../models/destino';

export abstract class DestinosRepository {
  abstract listar(filtros?: DestinoFiltros): Observable<Destino[]>;
  abstract detalle(id: number): Observable<Destino>;
  abstract crear(datos: DestinoDatos): Observable<Destino>;
  abstract actualizar(id: number, datos: DestinoDatos): Observable<Destino>;
  abstract cambiarEstado(id: number, estado: boolean): Observable<Destino>;
}
