import { HttpErrorResponse } from '@angular/common/http';

export function mensajeServicios(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 0: return 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
      case 400: return 'Revisa los datos o filtros ingresados.';
      case 401: return 'Tu sesión terminó. Vuelve a iniciar sesión.';
      case 403: return 'No tienes permiso para gestionar servicios.';
      case 404: return 'Este servicio ya no está disponible. Se actualizará la lista.';
      case 409: return 'Ya existe un servicio con ese nombre, incluso si está inactivo.';
    }
  }
  return 'No pudimos completar la operación. Inténtalo de nuevo.';
}

export function erroresCamposServicio(error: unknown): Partial<Record<'nombre' | 'descripcion', string>> {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) return {};
  const errores = error.error?.errores;
  return {
    nombre: typeof errores?.nombre === 'string' ? errores.nombre : undefined,
    descripcion: typeof errores?.descripcion === 'string' ? errores.descripcion : undefined
  };
}
