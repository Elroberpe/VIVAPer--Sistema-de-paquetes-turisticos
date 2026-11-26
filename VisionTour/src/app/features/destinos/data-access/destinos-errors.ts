import { HttpErrorResponse } from '@angular/common/http';
import { DestinoDatos } from '../models/destino';

export function mensajeDestinos(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 0: return 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
      case 400: return 'Revisa los datos o filtros ingresados.';
      case 401: return 'Tu sesión terminó. Vuelve a iniciar sesión.';
      case 403: return 'No tienes permiso para gestionar destinos.';
      case 404: return 'Este destino ya no está disponible. Se actualizará la lista.';
      case 409: return 'Hay un conflicto con los datos. Revisa si ya existe otro destino con el mismo nombre y ubicación, incluso inactivo.';
    }
  }
  return 'No pudimos completar la operación. Inténtalo de nuevo.';
}

export function erroresCamposDestino(error: unknown): Partial<Record<keyof DestinoDatos, string>> {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) return {};
  const errores = error.error?.errores;
  return {
    nombre: typeof errores?.nombre === 'string' ? errores.nombre : undefined,
    ubicacion: typeof errores?.ubicacion === 'string' ? errores.ubicacion : undefined,
    subtitulo: typeof errores?.subtitulo === 'string' ? errores.subtitulo : undefined,
    descripcion: typeof errores?.descripcion === 'string' ? errores.descripcion : undefined,
    imagenUrl: typeof errores?.imagenUrl === 'string' ? errores.imagenUrl : undefined
  };
}
