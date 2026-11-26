import { HttpErrorResponse } from '@angular/common/http';
import { ProveedorDatos } from '../models/proveedor';

export function mensajeProveedores(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 0: return 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
      case 401: return 'Tu sesión terminó. Vuelve a iniciar sesión.';
      case 403: return 'No tienes permiso para gestionar proveedores.';
      case 400:
      case 404:
      case 409:
        if (typeof error.error?.mensaje === 'string') return error.error.mensaje;
        return error.status === 400 ? 'Revisa los datos o filtros ingresados.' : error.status === 404 ? 'El proveedor o uno de sus servicios ya no está disponible.' : 'El RUC ya existe o algún servicio seleccionado ya no está activo.';
    }
  }
  return 'No pudimos completar la operación. Inténtalo de nuevo.';
}

export function erroresCamposProveedor(error: unknown): Partial<Record<keyof ProveedorDatos, string>> {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) return {};
  const errores = error.error?.errores;
  if (!errores || typeof errores !== 'object') return {};
  const campos: Partial<Record<keyof ProveedorDatos, string>> = {};
  for (const campo of ['ruc', 'nombre', 'encargado', 'email', 'telefono', 'serviciosIds'] as const) {
    if (typeof errores[campo] === 'string') campos[campo] = errores[campo];
  }
  const errorServicio = Object.entries(errores).find(([clave, valor]) => /^serviciosIds\[\d+\]$/.test(clave) && typeof valor === 'string');
  if (errorServicio && !campos.serviciosIds) campos.serviciosIds = errorServicio[1] as string;
  return campos;
}
