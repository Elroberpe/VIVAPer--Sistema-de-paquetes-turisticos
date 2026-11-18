import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PaquetesRepository } from '../../paquetes/data-access/paquetes.repository';
import { Buscador } from '../../paquetes/components/buscador';
import { PaqueteCard } from '../../paquetes/components/paquete-card';

@Component({ selector: 'vp-inicio', imports: [RouterLink, Buscador, PaqueteCard], templateUrl: './inicio.html', styleUrl: './inicio.css' })
export class Inicio {
  private readonly repository = inject(PaquetesRepository);
  readonly destinos = toSignal(this.repository.listarDestinos(), { initialValue: [] });
  readonly paquetes = toSignal(this.repository.listar());
  readonly categoria = signal('');
  readonly categorias = ['', 'Cultura', 'Aventura', 'Naturaleza'];
  readonly destacados = computed(() => (this.paquetes() ?? []).filter(p => !this.categoria() || p.categoria === this.categoria()).slice(0, 3));
}
