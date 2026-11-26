import { Routes } from '@angular/router';
import { administradorGuard } from '../../core/auth/auth.guard';
import { SECCIONES_ADMIN } from './admin.config';
import { cambiosPendientesGuard } from './pages/gestion';
import { cambiosServiciosGuard } from './pages/servicios/servicios';
import { cambiosDestinosGuard } from './pages/destinos/destinos';
import { cambiosProveedoresGuard } from './pages/proveedores/proveedores';

export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
  { path: 'usuarios', title: 'Usuarios · Administración VivaPeru', data: { seccion: 'usuarios' }, canActivate: [administradorGuard], loadComponent: () => import('./pages/usuarios/usuarios').then(m => m.UsuariosAdmin) },
  { path: 'servicios', title: 'Servicios · Administración VivaPeru', data: { seccion: 'servicios' }, canActivate: [administradorGuard], canDeactivate: [cambiosServiciosGuard], loadComponent: () => import('./pages/servicios/servicios').then(m => m.ServiciosAdmin) },
  { path: 'destinos', title: 'Destinos · Administración VivaPeru', data: { seccion: 'destinos' }, canActivate: [administradorGuard], canDeactivate: [cambiosDestinosGuard], loadComponent: () => import('./pages/destinos/destinos').then(m => m.DestinosAdmin) },
  { path: 'proveedores', title: 'Proveedores · Administración VivaPeru', data: { seccion: 'proveedores' }, canActivate: [administradorGuard], canDeactivate: [cambiosProveedoresGuard], loadComponent: () => import('./pages/proveedores/proveedores').then(m => m.ProveedoresAdmin) },
  ...SECCIONES_ADMIN.filter(seccion => seccion.id !== 'usuarios' && seccion.id !== 'servicios' && seccion.id !== 'destinos' && seccion.id !== 'proveedores').map(seccion => ({
    path: seccion.id, title: `${seccion.titulo} · Administración VivaPeru`,
    data: { seccion: seccion.id },
    canDeactivate: [cambiosPendientesGuard],
    loadComponent: () => import('./pages/gestion').then(m => m.GestionAdmin)
  })),
  { path: 'acceso-denegado', title: 'Acceso restringido · VivaPeru', loadComponent: () => import('./pages/acceso-denegado').then(m => m.AccesoDenegado) },
  { path: '**', title: 'Sección no encontrada · VivaPeru', loadComponent: () => import('./pages/admin-not-found').then(m => m.AdminNotFound) }
];
