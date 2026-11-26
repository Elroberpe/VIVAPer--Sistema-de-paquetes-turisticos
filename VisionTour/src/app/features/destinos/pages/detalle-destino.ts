import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { DestinosRepository } from '../data-access/destinos.repository';
import { mensajeDestinosPublicos } from '../data-access/destinos-errors';
import { Destino } from '../models/destino';
import { DestinoImagen } from '../components/destino-imagen';

const estadoInicial = { cargando: true, error: '', noDisponible: false, destino: null as Destino | null };

@Component({
  selector: 'vp-detalle-destino',
  imports: [RouterLink, DestinoImagen],
  templateUrl: './detalle-destino.html',
  styleUrl: './detalle-destino.css'
})
export class DetalleDestino {
  private readonly repo = inject(DestinosRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly recarga = new BehaviorSubject<void>(undefined);
  readonly estado = toSignal(combineLatest([this.route.paramMap, this.recarga]).pipe(switchMap(([params]) => {
    const parametro = params.get('idDestino') ?? '';
    const id = Number(parametro);
    if (!/^\d+$/.test(parametro) || !Number.isSafeInteger(id) || id <= 0) {
      return of({ ...estadoInicial, cargando: false, noDisponible: true });
    }
    return this.repo.detallePublico(id).pipe(
      map(destino => ({ cargando: false, error: '', noDisponible: false, destino })),
      catchError(error => {
        const noDisponible = error instanceof HttpErrorResponse && error.status === 404;
        return of({ cargando: false, error: noDisponible ? '' : mensajeDestinosPublicos(error), noDisponible, destino: null });
      }),
      startWith(estadoInicial)
    );
  })), { initialValue: estadoInicial });

  reintentar() { this.recarga.next(); }
}
