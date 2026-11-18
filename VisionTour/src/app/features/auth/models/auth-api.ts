export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  usuario: { id: number; nombre: string; apellido: string; usuario: string; celular: string; email: string; rol: 'ADMIN' | 'EMPLEADO' | 'CLIENTE' };
}
