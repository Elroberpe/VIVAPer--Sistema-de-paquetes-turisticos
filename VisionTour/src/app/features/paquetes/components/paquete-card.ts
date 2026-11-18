import { Component, inject, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FiltrosPaquetes, Paquete } from '../models/paquete';
import { FavoritosService } from '../../../core/services/favoritos.service';

@Component({ selector: 'vp-paquete-card', imports: [CurrencyPipe, RouterLink], templateUrl: './paquete-card.html', styleUrl: './paquete-card.css' })
export class PaqueteCard {
  readonly paquete = input.required<Paquete>();
  readonly contexto = input<FiltrosPaquetes & { favoritos?: string }>({});
  readonly favoritos = inject(FavoritosService);
}
