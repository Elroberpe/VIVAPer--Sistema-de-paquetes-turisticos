import { describe, expect, it } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { filtrarPaquetes, PaquetesMockRepository } from './paquetes-mock.repository';
import { crearPaquetes } from './mocks/paquetes.mock';
import { CatalogoMockStore } from '../../../shared/catalogo/catalogo-mock.store';

describe('Catálogo de prueba', () => {
  const paquetes = crearPaquetes();
  it('combina destino, categoría, presupuesto y duración', () => {
    const resultado = filtrarPaquetes(paquetes, { destino: 'ica', categoria: 'Aventura', precioMaximo: 200, duracion: 'corta' });
    expect(resultado.map(p => p.id)).toEqual(['p6']);
  });
  it('no ofrece salidas agotadas aunque coincidan con la fecha buscada', () => {
    expect(filtrarPaquetes(paquetes, { fecha: paquetes[0].salidas[1].fecha, viajeros: 1 })).toEqual([]);
  });
  it('filtra y muestra el precio de la salida buscada, en lugar de una tarifa inferior de otra fecha', () => {
    const fecha = paquetes[1].salidas[2].fecha;
    expect(filtrarPaquetes(paquetes, { destino: 'ica', fecha, precioMaximo: 400 }).map(p => p.id)).toEqual(['p6']);
    const resultado = filtrarPaquetes(paquetes, { destino: 'ica', fecha });
    expect(resultado.find(p => p.id === 'p2')?.precioDesdeCentimos).toBe(43900);
    expect(paquetes[1].precioDesdeCentimos).toBe(38900);
  });
  it('no muestra paquetes si la salida no tiene cupos para todo el grupo', () => {
    expect(filtrarPaquetes(paquetes, { fecha: paquetes[0].salidas[0].fecha, viajeros: 9 })).toEqual([]);
    expect(filtrarPaquetes(paquetes, { fecha: paquetes[0].salidas[0].fecha, viajeros: 8 })).toHaveLength(6);
  });
  it('rechaza cantidades inválidas y fechas sin salida', () => {
    for (const viajeros of [0, -1, 1.5, NaN]) expect(filtrarPaquetes(paquetes, { viajeros })).toEqual([]);
    expect(filtrarPaquetes(paquetes, { fecha: '2000-01-01' })).toEqual([]);
  });
  it('ordena por precio sin alterar el orden de los datos originales', () => {
    const ids = paquetes.map(p => p.id);
    const resultado = filtrarPaquetes(paquetes, { orden: 'precio-asc' });
    expect(resultado[0].id).toBe('p6');
    expect(resultado.at(-1)?.id).toBe('p1');
    expect(paquetes.map(p => p.id)).toEqual(ids);
  });
  it('resuelve un slug desconocido sin fabricar un paquete', async () => {
    const repo = new PaquetesMockRepository(new CatalogoMockStore());
    expect(await firstValueFrom(repo.obtenerPorSlug('no-existe'))).toBeUndefined();
  });
});
