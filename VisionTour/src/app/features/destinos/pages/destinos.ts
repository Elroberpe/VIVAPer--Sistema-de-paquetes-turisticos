import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PaquetesRepository } from '../../paquetes/data-access/paquetes.repository';

@Component({ selector: 'vp-destinos', imports: [RouterLink], templateUrl: './destinos.html', styleUrl: './destinos.css' })
export class Destinos {
  readonly destinos = toSignal(inject(PaquetesRepository).listarDestinos());
}
