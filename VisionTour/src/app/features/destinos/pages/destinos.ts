import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { DestinosRepository } from '../data-access/destinos.repository';
import { mensajeDestinosPublicos } from '../data-access/destinos-errors';
import { Destino } from '../models/destino';
import { DestinoImagen } from '../components/destino-imagen';

const estadoInicial = { cargando: true, error: '', destinos: [] as Destino[] };

@Component({ selector: 'vp-destinos', imports: [RouterLink, DestinoImagen], templateUrl: './destinos.html', styleUrl: './destinos.css' })
export class Destinos {
  private readonly repo = inject(DestinosRepository);
  private readonly recarga = new BehaviorSubject<void>(undefined);
  readonly estado = toSignal(this.recarga.pipe(switchMap(() => this.repo.listarPublicos().pipe(
    map(destinos => ({ cargando: false, error: '', destinos })),
    catchError(error => of({ cargando: false, error: mensajeDestinosPublicos(error), destinos: [] as Destino[] })),
    startWith(estadoInicial)
  ))), { initialValue: estadoInicial });

  reintentar() { this.recarga.next(); }
}
