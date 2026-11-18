import { Observable } from 'rxjs';
import { SesionAdmin } from '../models/sesion';
import { RegistroCliente } from '../models/registro';
export abstract class AuthRepository {
  abstract registrarCliente(datos: RegistroCliente): Observable<void>;
  abstract iniciarSesion(correo: string, clave: string): Observable<SesionAdmin>;
  abstract obtenerSesion(): Observable<SesionAdmin | null>;
  abstract cerrarSesion(): Observable<void>;
  obtenerAccessToken(): string | null { return null; }
  renovarSesion(): Observable<SesionAdmin | null> { return this.obtenerSesion(); }
  invalidarSesion(): void { /* Los repositorios sin JWT no mantienen access token. */ }
}
