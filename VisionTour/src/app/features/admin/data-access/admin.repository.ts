import { Observable } from 'rxjs';
import { OpcionCampo, RegistroAdmin, SeccionAdmin } from '../models/admin';

export abstract class AdminRepository {
  abstract listar(seccion: SeccionAdmin): Observable<RegistroAdmin[]>;
  abstract opciones(origen: 'destinos' | 'proveedores'): Observable<OpcionCampo[]>;
  abstract guardar(seccion: SeccionAdmin, registro: RegistroAdmin): Observable<RegistroAdmin>;
}
