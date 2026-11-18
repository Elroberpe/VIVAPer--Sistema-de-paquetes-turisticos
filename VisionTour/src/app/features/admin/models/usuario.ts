export const ROLES_USUARIO = { ADMIN: 'Administrador', CLIENTE: 'Cliente', EMPLEADO: 'Empleado' } as const;

export interface UsuarioResumen {
  id: number;
  nombre: string;
  apellido: string;
  usuario: string;
  celular: string;
  correo: string;
  rol: 'ADMIN' | 'EMPLEADO' | 'CLIENTE';
  activo: boolean;
}

export interface UsuarioDetalle extends UsuarioResumen { fechaRegistro: string; }

export type ActualizarUsuarioAdmin = Pick<UsuarioResumen, 'nombre' | 'apellido' | 'usuario' | 'correo' | 'celular'>;

export interface CrearUsuarioAdmin extends ActualizarUsuarioAdmin {
  password: string;
  rol: UsuarioResumen['rol'];
}

export interface UsuariosPagina {
  content: UsuarioResumen[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface FiltrosUsuarios { page: number; size: number; buscar: string; activo?: boolean; }
