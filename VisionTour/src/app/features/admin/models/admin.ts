export type SeccionAdmin = 'usuarios' | 'paquetes' | 'destinos' | 'servicios' | 'proveedores';
export type RolAdmin = 'Administrador' | 'Operador';
export interface UsuarioInterno { id: string; nombre: string; correo: string; rol: RolAdmin; estado: 'Activo' | 'Inactivo'; creadoEl: string; }
export interface RegistroAdmin {
  id: string; nombre: string; descripcion: string; estado: string;
  correo?: string; rol?: string; imagen?: string; region?: string; destinoId?: string;
  categoria?: string; dias?: string; precio?: string; itinerario?: string;
  proveedorId?: string; tipo?: string; telefono?: string; ciudad?: string; contacto?: string;
  cantidad?: string;
}
export interface OpcionCampo { valor: string; etiqueta: string; }
export interface CampoAdmin {
  clave: Exclude<keyof RegistroAdmin, 'id'>; etiqueta: string;
  tipo: 'text' | 'email' | 'select' | 'number' | 'textarea';
  requerido?: boolean; opciones?: OpcionCampo[]; origen?: 'destinos' | 'proveedores';
  ancho?: boolean; ayuda?: string; min?: number;
}
export interface ConfigSeccion {
  id: SeccionAdmin; titulo: string; singular: string; nuevo: string; icono: string;
  grupo: string; descripcion: string; estados: string[]; campos: CampoAdmin[];
}
