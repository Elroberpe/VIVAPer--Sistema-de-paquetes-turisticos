export type Categoria = 'Cultura' | 'Aventura' | 'Naturaleza';
export interface Destino { id: string; nombre: string; region: string; imagen: string; descripcion: string; }
export interface Salida { id: string; fecha: string; cupos: number; precioCentimos: number; }
export interface Paquete {
  id: string; slug: string; titulo: string; destinoId: string; destino: string;
  categoria: Categoria; dias: number; precioDesdeCentimos: number; imagen: string;
  descripcion: string; destacado: string; incluidos: string[];
  itinerario: { titulo: string; descripcion: string }[]; salidas: Salida[];
}
export interface FiltrosPaquetes {
  destino?: string; categoria?: string; fecha?: string; viajeros?: number;
  precioMaximo?: number; duracion?: string; orden?: string;
}
export type EstadoPaquete = 'Publicado' | 'Borrador' | 'Archivado';
export type EstadoActivo = 'Activo' | 'Inactivo';
export interface PaqueteGestion extends Paquete { estado: EstadoPaquete; }
export interface DestinoGestion extends Destino { estado: EstadoActivo; }
