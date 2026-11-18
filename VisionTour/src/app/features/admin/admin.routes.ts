import { Routes } from '@angular/router';
import { usuariosGuard } from '../../core/auth/auth.guard';
import { SECCIONES_ADMIN } from './admin.config';
import { cambiosPendientesGuard } from './pages/gestion';

export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
  { path: 'usuarios', title: 'Usuarios · Administración VivaPeru', data: { seccion: 'usuarios' }, canActivate: [usuariosGuard], loadComponent: () => import('./pages/usuarios/usuarios').then(m => m.UsuariosAdmin) },
  ...SECCIONES_ADMIN.filter(seccion => seccion.id !== 'usuarios').map(seccion => ({
    path: seccion.id, title: `${seccion.titulo} · Administración VivaPeru`,
    data: { seccion: seccion.id },
    canDeactivate: [cambiosPendientesGuard],
    loadComponent: () => import('./pages/gestion').then(m => m.GestionAdmin)
  })),
  { path: 'acceso-denegado', title: 'Acceso restringido · VivaPeru', loadComponent: () => import('./pages/acceso-denegado').then(m => m.AccesoDenegado) },
  { path: '**', title: 'Sección no encontrada · VivaPeru', loadComponent: () => import('./pages/admin-not-found').then(m => m.AdminNotFound) }
];
