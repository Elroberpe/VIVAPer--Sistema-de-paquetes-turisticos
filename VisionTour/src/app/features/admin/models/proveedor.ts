export interface ProveedorResumen {
  idProveedor: number;
  nombre: string;
  encargado: string;
  email: string | null;
  telefono: string;
  estado: boolean;
}

export interface Proveedor extends ProveedorResumen {
  ruc: string;
  servicios: { idServicio: number; nombre: string }[];
}

export interface ProveedorDatos {
  ruc: string;
  nombre: string;
  encargado: string;
  email: string | null;
  telefono: string;
  serviciosIds: number[];
}

export interface ProveedoresPagina {
  content: ProveedorResumen[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ProveedorFiltros {
  nombre?: string;
  estado?: 'activo' | 'inactivo';
  page: number;
  size: number;
}

export interface EstadoProveedor { idProveedor: number; estado: boolean; }
