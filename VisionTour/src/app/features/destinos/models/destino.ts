export interface Destino {
  idDestino: number;
  nombre: string;
  ubicacion: string;
  subtitulo: string;
  descripcion: string;
  imagenUrl: string | null;
  estado: boolean;
}

export interface DestinoDatos {
  nombre: string;
  ubicacion: string;
  subtitulo: string;
  descripcion: string;
  imagenUrl?: string | null;
}

export interface DestinoFiltros {
  nombre?: string;
  estado?: boolean;
}
