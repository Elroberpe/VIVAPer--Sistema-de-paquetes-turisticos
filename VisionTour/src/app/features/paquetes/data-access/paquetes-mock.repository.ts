import { Injectable } from '@angular/core';
import { delay, map } from 'rxjs';
import { FiltrosPaquetes, Paquete } from '../models/paquete';
import { PaquetesRepository } from './paquetes.repository';
import { CatalogoMockStore } from '../../../shared/catalogo/catalogo-mock.store';

export function filtrarPaquetes(paquetes: Paquete[], filtros: FiltrosPaquetes): Paquete[] {
  const viajeros = filtros.viajeros ?? 1;
  if (!Number.isInteger(viajeros) || viajeros < 1) return [];
  const resultado = paquetes.filter(p =>
    (!filtros.destino || p.destinoId === filtros.destino) &&
    (!filtros.categoria || p.categoria === filtros.categoria) &&
    (!filtros.duracion || (filtros.duracion === 'corta' ? p.dias <= 2 : p.dias >= 3))
  ).flatMap(p => {
    const salidas = p.salidas.filter(s => (!filtros.fecha || s.fecha === filtros.fecha) && s.cupos >= viajeros);
    if (!salidas.length) return [];
    const precioDesdeCentimos = Math.min(...salidas.map(s => s.precioCentimos));
    if (filtros.precioMaximo !== undefined && precioDesdeCentimos > filtros.precioMaximo * 100) return [];
    return [{ ...p, precioDesdeCentimos }];
  });
  if (filtros.orden === 'precio-asc') resultado.sort((a, b) => a.precioDesdeCentimos - b.precioDesdeCentimos);
  if (filtros.orden === 'precio-desc') resultado.sort((a, b) => b.precioDesdeCentimos - a.precioDesdeCentimos);
  return resultado;
}

@Injectable()
export class PaquetesMockRepository extends PaquetesRepository {
  constructor(private readonly store: CatalogoMockStore) { super(); }
  override listar(filtros: FiltrosPaquetes = {}) {
    return this.store.cambios$.pipe(map(c => filtrarPaquetes(c.paquetes.filter(p => p.estado === 'Publicado' && c.destinos.some(d => d.id === p.destinoId && d.estado === 'Activo')), filtros)), delay(220));
  }
  override obtenerPorSlug(slug: string) {
    return this.store.cambios$.pipe(map(c => c.paquetes.find(p => p.slug === slug && p.estado === 'Publicado' && c.destinos.some(d => d.id === p.destinoId && d.estado === 'Activo'))), delay(180));
  }
  override listarDestinos() { return this.store.cambios$.pipe(map(c => c.destinos.filter(d => d.estado === 'Activo').map(d => ({ ...d }))), delay(100)); }
}
