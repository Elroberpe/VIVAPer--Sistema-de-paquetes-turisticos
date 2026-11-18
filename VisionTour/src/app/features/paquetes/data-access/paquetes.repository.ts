import { Observable } from 'rxjs';
import { Destino, FiltrosPaquetes, Paquete } from '../models/paquete';

export abstract class PaquetesRepository {
  abstract listar(filtros?: FiltrosPaquetes): Observable<Paquete[]>;
  abstract obtenerPorSlug(slug: string): Observable<Paquete | undefined>;
  abstract listarDestinos(): Observable<Destino[]>;
}
