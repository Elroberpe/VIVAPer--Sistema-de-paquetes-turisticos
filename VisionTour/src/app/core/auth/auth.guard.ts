import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService, destinoAdminSeguro } from './auth-session.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);
  try {
    const sesion = await auth.restaurar();
    return sesion && auth.esPersonal() ? true : router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: destinoAdminSeguro(state.url) } });
  } catch {
    return router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: destinoAdminSeguro(state.url), motivo: 'conexion' } });
  }
};

export const usuariosGuard: CanActivateFn = async () => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);
  await auth.restaurar();
  return auth.esAdministrador() || router.createUrlTree(['/admin/acceso-denegado']);
};
