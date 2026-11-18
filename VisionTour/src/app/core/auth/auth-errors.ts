import { HttpErrorResponse } from '@angular/common/http';

export function mensajeAutenticacion(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 0: return 'No se pudo conectar con el servidor. Comprueba que el backend esté disponible.';
      case 400: return 'Revisa el correo y la contraseña ingresados.';
      case 401: return 'El correo o la contraseña no son correctos, o la cuenta no está activa.';
      case 403: return 'No se pudo validar la solicitud de acceso. Recarga la página e inténtalo de nuevo.';
      case 429: return 'Se alcanzó el límite de intentos de acceso. Espera unos minutos antes de volver a intentarlo.';
      default: return 'El servicio de acceso no está disponible en este momento. Inténtalo de nuevo más tarde.';
    }
  }
  return error instanceof Error ? error.message : 'No pudimos completar la operación de acceso.';
}
