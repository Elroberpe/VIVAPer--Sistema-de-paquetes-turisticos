import { RolAdmin } from '../../admin/models/admin';
export interface SesionAdmin { usuarioId: string; nombre: string; correo: string; rol: RolAdmin | 'Cliente'; expiraEn: number; }
export const DEMO_CORREO = 'admin@vivaperu.test';
export const DEMO_CLAVE = 'VivaPeru2026!';
export const DURACION_SESION = 2 * 60 * 60 * 1000;
