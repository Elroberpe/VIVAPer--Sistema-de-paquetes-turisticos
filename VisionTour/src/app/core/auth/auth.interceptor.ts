import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthRepository } from '../../features/auth/data-access/auth.repository';
import { AuthSessionService, destinoAdminSeguro } from './auth-session.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  // Nunca se envía el JWT a servicios externos ni a las rutas de cookies de auth.
  if (!request.url.startsWith('/api/')) return next(request);
  if (request.url.startsWith('/api/auth/')) return next(request.clone({ headers: request.headers.delete('Authorization') }));
  const repo = inject(AuthRepository);
  const auth = inject(AuthSessionService);
  const router = inject(Router);
  const token = repo.obtenerAccessToken();
  const sesionTerminada = () => {
    auth.invalidar();
    if (router.url.startsWith('/admin')) void router.navigate(['/admin/login'], { queryParams: { returnUrl: destinoAdminSeguro(router.url), motivo: 'sesion' } });
  };
  const autenticar = (valor: string | null) => request.clone({ headers: valor ? request.headers.set('Authorization', `Bearer ${valor}`) : request.headers.delete('Authorization') });
  return next(autenticar(token)).pipe(catchError(error => {
    if (!(error instanceof HttpErrorResponse) || error.status !== 401) return throwError(() => error);
    const actual = repo.obtenerAccessToken();
    const nuevaSesion = actual && actual !== token ? from(Promise.resolve(auth.sesion())) : from(auth.renovar());
    return nuevaSesion.pipe(
      catchError(refreshError => {
        sesionTerminada();
        return throwError(() => refreshError);
      }),
      switchMap(sesion => {
        if (!sesion || !repo.obtenerAccessToken()) { sesionTerminada(); return throwError(() => error); }
        // next() reintenta una sola vez, sin volver a pasar por este interceptor.
        return next(autenticar(repo.obtenerAccessToken())).pipe(catchError(retryError => {
          if (retryError instanceof HttpErrorResponse && retryError.status === 401) sesionTerminada();
          return throwError(() => retryError);
        }));
      })
    );
  }));
};
