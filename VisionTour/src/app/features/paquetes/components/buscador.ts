import { Component, effect, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PaquetesRepository } from '../data-access/paquetes.repository';
import { FiltrosPaquetes } from '../models/paquete';

@Component({ selector: 'vp-buscador', imports: [ReactiveFormsModule], templateUrl: './buscador.html', styleUrl: './buscador.css' })
export class Buscador {
  readonly filtros = input<FiltrosPaquetes>({});
  private readonly router = inject(Router);
  readonly destinos = toSignal(inject(PaquetesRepository).listarDestinos(), { initialValue: [] });
  readonly form = inject(FormBuilder).nonNullable.group({ destino: '', fecha: '', viajeros: [1, [Validators.required, Validators.min(1), Validators.max(8)]] });
  readonly hoy = this.fechaLocal();
  constructor() {
    effect(() => { const f = this.filtros(); this.form.patchValue({ destino: f.destino ?? '', fecha: f.fecha ?? '', viajeros: f.viajeros ?? 1 }); });
  }
  buscar() {
    if (this.form.invalid || (this.form.controls.fecha.value && this.form.controls.fecha.value < this.hoy)) { this.form.markAllAsTouched(); return; }
    const valores = this.form.getRawValue();
    void this.router.navigate(['/paquetes'], { queryParams: { destino: valores.destino || null, fecha: valores.fecha || null, viajeros: valores.viajeros } });
  }
  private fechaLocal() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
}
