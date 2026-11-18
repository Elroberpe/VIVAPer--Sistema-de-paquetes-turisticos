import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { PaquetesRepository } from '../data-access/paquetes.repository';
import { FiltrosPaquetes, Paquete } from '../models/paquete';
import { PaqueteCard } from '../components/paquete-card';
import { Buscador } from '../components/buscador';
import { FavoritosService } from '../../../core/services/favoritos.service';

@Component({ selector: 'vp-catalogo', imports: [FormsModule, RouterLink, Buscador, PaqueteCard], templateUrl: './catalogo.html', styleUrl: './catalogo.css' })
export class Catalogo {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repo = inject(PaquetesRepository);
  private readonly favoritos = inject(FavoritosService);
  readonly parametros = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly destinos = toSignal(this.repo.listarDestinos(), { initialValue: [] });
  readonly filtros = computed<FiltrosPaquetes>(() => {
    const p = this.parametros();
    return { destino: p.get('destino') ?? '', categoria: p.get('categoria') ?? '', fecha: p.get('fecha') ?? '',
      viajeros: p.has('viajeros') ? Number(p.get('viajeros')) : 1,
      precioMaximo: Number(p.get('precioMaximo')) || undefined, duracion: p.get('duracion') ?? '', orden: p.get('orden') ?? '' };
  });
  readonly soloFavoritos = computed(() => this.parametros().get('favoritos') === '1');
  readonly contexto = computed(() => ({ ...this.filtros(), favoritos: this.soloFavoritos() ? '1' : undefined }));
  readonly estado = toSignal(this.route.queryParamMap.pipe(switchMap(p => {
    const filtros: FiltrosPaquetes = { destino: p.get('destino') ?? '', categoria: p.get('categoria') ?? '', fecha: p.get('fecha') ?? '', viajeros: p.has('viajeros') ? Number(p.get('viajeros')) : 1, precioMaximo: Number(p.get('precioMaximo')) || undefined, duracion: p.get('duracion') ?? '', orden: p.get('orden') ?? '' };
    return this.repo.listar(filtros).pipe(
      map(paquetes => ({ cargando: false, error: false, paquetes })),
      catchError(() => of({ cargando: false, error: true, paquetes: [] as Paquete[] })),
      startWith({ cargando: true, error: false, paquetes: [] as Paquete[] })
    );
  })), { initialValue: { cargando: true, error: false, paquetes: [] as Paquete[] } });
  readonly resultados = computed(() => this.estado().paquetes.filter(p => !this.soloFavoritos() || this.favoritos.ids().includes(p.id)));
  actualizar(clave: string, valor: string) { void this.router.navigate([], { relativeTo: this.route, queryParams: { [clave]: valor || null }, queryParamsHandling: 'merge' }); }
  limpiar() { void this.router.navigate(['/paquetes']); }
  reintentar() { void this.router.navigate([], { relativeTo: this.route, queryParams: { actualizar: Date.now() }, queryParamsHandling: 'merge' }); }
}
