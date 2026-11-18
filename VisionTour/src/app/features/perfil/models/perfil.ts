export interface PerfilUsuario {
  id: number;
  nombre: string;
  apellido: string;
  usuario: string;
  celular: string;
  email: string;
  rol: 'ADMIN' | 'EMPLEADO' | 'CLIENTE';
}

export type ActualizarPerfil = Pick<PerfilUsuario, 'nombre' | 'apellido' | 'usuario' | 'celular'>;

export interface CambiarCorreo {
  email: string;
  passwordActual: string;
}

export interface CambiarPassword {
  passwordActual: string;
  passwordNueva: string;
}
