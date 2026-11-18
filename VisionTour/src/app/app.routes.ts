import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'iniciar-sesion', loadComponent: () => import('./layout/auth-layout/auth-layout').then(m => m.AuthLayout), children: [
    { path: '', title: 'Iniciar sesión · VivaPeru', data: { accesoCliente: true }, loadComponent: () => import('./features/auth/pages/login/login').then(m => m.Login) }
  ] },
  { path: 'registrarse', loadComponent: () => import('./layout/auth-layout/auth-layout').then(m => m.AuthLayout), children: [
    { path: '', title: 'Crea tu cuenta · VivaPeru', loadComponent: () => import('./features/auth/pages/registro/registro').then(m => m.Registro) }
  ] },
  { path: 'admin/login', loadComponent: () => import('./layout/auth-layout/auth-layout').then(m => m.AuthLayout), children: [
    { path: '', title: 'Acceso administrativo · VivaPeru', loadComponent: () => import('./features/auth/pages/login/login').then(m => m.Login) }
  ] },
  { path: 'admin', canActivate: [authGuard], canActivateChild: [authGuard],
    loadComponent: () => import('./layout/admin-layout/admin-layout').then(m => m.AdminLayout),
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES) },
  { path: '', loadComponent: () => import('./layout/public-layout/public-layout').then(m => m.PublicLayout), children: [
    { path: '', title: 'VivaPeru · El Perú se vive', loadComponent: () => import('./features/inicio/pages/inicio').then(m => m.Inicio) },
    { path: 'paquetes', title: 'Explora experiencias · VivaPeru', loadComponent: () => import('./features/paquetes/pages/catalogo').then(m => m.Catalogo) },
    { path: 'paquetes/:slug', title: 'Tu próxima experiencia · VivaPeru', loadComponent: () => import('./features/paquetes/pages/detalle').then(m => m.Detalle) },
    { path: 'destinos', title: 'Destinos del Perú · VivaPeru', loadComponent: () => import('./features/destinos/pages/destinos').then(m => m.Destinos) },
    { path: '**', title: 'Página no encontrada · VivaPeru', loadComponent: () => import('./shared/ui/not-found').then(m => m.NotFound) }
  ] }
];
