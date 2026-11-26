import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { PaquetesRepository } from '../../paquetes/data-access/paquetes.repository';
import { Buscador } from '../../paquetes/components/buscador';
import { PaqueteCard } from '../../paquetes/components/paquete-card';
import { DestinosRepository } from '../../destinos/data-access/destinos.repository';
import { mensajeDestinosPublicos } from '../../destinos/data-access/destinos-errors';
import { Destino } from '../../destinos/models/destino';
import { DestinoImagen } from '../../destinos/components/destino-imagen';

const estadoDestinosInicial = { cargando: true, error: '', destinos: [] as Destino[] };

@Component({ selector: 'vp-inicio', imports: [RouterLink, Buscador, PaqueteCard, DestinoImagen], templateUrl: './inicio.html', styleUrl: './inicio.css' })
export class Inicio {
  private readonly repository = inject(PaquetesRepository);
  private readonly destinosRepo = inject(DestinosRepository);
  private readonly recargaDestinos = new BehaviorSubject<void>(undefined);
  readonly estadoDestinos = toSignal(this.recargaDestinos.pipe(switchMap(() => this.destinosRepo.listarPublicos().pipe(
    map(destinos => ({ cargando: false, error: '', destinos })),
    catchError(error => of({ cargando: false, error: mensajeDestinosPublicos(error), destinos: [] as Destino[] })),
    startWith(estadoDestinosInicial)
  ))), { initialValue: estadoDestinosInicial });
  readonly paquetes = toSignal(this.repository.listar());
  readonly categoria = signal('');
  readonly categorias = ['', 'Cultura', 'Aventura', 'Naturaleza'];
  readonly destacados = computed(() => (this.paquetes() ?? []).filter(p => !this.categoria() || p.categoria === this.categoria()).slice(0, 3));

  reintentarDestinos() { this.recargaDestinos.next(); }
}
