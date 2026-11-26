export interface Servicio {
  idServicio: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
}

export interface ServicioDatos {
  nombre: string;
  descripcion?: string | null;
}

export interface ServicioFiltros {
  nombre?: string;
  estado?: boolean;
}
