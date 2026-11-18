import { HttpErrorResponse } from '@angular/common/http';

export function mensajeUsuarios(error: unknown, operacion: 'consulta' | 'crear' | 'datos' | 'rol' | 'estado' = 'consulta'): string {
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 0: return 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
      case 400: return operacion === 'consulta' ? 'Revisa los filtros de la solicitud.' : 'Revisa los datos ingresados.';
      case 401: return 'Tu sesión terminó. Vuelve a iniciar sesión.';
      case 403: return 'No tienes permiso para realizar esta acción.';
      case 404: return 'Este usuario ya no está disponible. Actualiza la lista.';
      case 409:
        // El backend devuelve mensajes de negocio sin detalles internos para estos conflictos.
        if (typeof error.error?.mensaje === 'string' && error.error.mensaje.trim()) return error.error.mensaje;
        return operacion === 'datos' || operacion === 'crear' ? 'El usuario o el correo ya está registrado.' : 'Debe permanecer al menos un administrador activo.';
    }
  }
  return 'No pudimos completar la operación. Inténtalo de nuevo.';
}
