import { Component, computed, effect, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { PaquetesRepository } from '../data-access/paquetes.repository';
import { Paquete } from '../models/paquete';
import { AlertasService } from '../../../core/services/alertas.service';
import { FavoritosService } from '../../../core/services/favoritos.service';

@Component({ selector: 'vp-detalle', imports: [RouterLink, CurrencyPipe, DatePipe, ReactiveFormsModule], templateUrl: './detalle.html', styleUrl: './detalle.css' })
export class Detalle {
  private readonly route = inject(ActivatedRoute);
  private readonly repo = inject(PaquetesRepository);
  private readonly alertas = inject(AlertasService);
  readonly contexto = toSignal(this.route.queryParams, { initialValue: this.route.snapshot.queryParams });
  readonly favoritos = inject(FavoritosService);
  readonly estado = toSignal(this.route.paramMap.pipe(switchMap(p => this.repo.obtenerPorSlug(p.get('slug') ?? '').pipe(
    map(paquete => ({ cargando: false, error: false, paquete })),
    catchError(() => of({ cargando: false, error: true, paquete: undefined })),
    startWith({ cargando: true, error: false, paquete: undefined as Paquete | undefined })
  ))), { initialValue: { cargando: true, error: false, paquete: undefined as Paquete | undefined } });
  readonly form = inject(FormBuilder).nonNullable.group({ salidaId: ['', Validators.required], viajeros: [1, [Validators.required, Validators.min(1), Validators.max(8)]] });
  private readonly valores = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly salida = computed(() => this.estado().paquete?.salidas.find(s => s.id === this.valores().salidaId));
  readonly total = computed(() => (this.salida()?.precioCentimos ?? 0) * (this.valores().viajeros ?? 1));
  readonly cuposSuficientes = computed(() => (this.salida()?.cupos ?? 0) >= (this.valores().viajeros ?? 1));
  constructor() {
    effect(() => {
      const paquete = this.estado().paquete;
      const parametros = this.contexto();
      const cantidad = Number(parametros['viajeros']);
      const salida = paquete?.salidas.find(s => s.fecha === parametros['fecha'] && s.cupos > 0);
      this.form.setValue({ salidaId: salida?.id ?? '', viajeros: Number.isInteger(cantidad) && cantidad >= 1 && cantidad <= 8 ? cantidad : 1 });
    });
  }
  revisar() {
    if (this.form.invalid || !this.cuposSuficientes()) { this.form.markAllAsTouched(); return; }
    const p = this.estado().paquete;
    const salida = this.salida();
    if (!p || !salida) return;
    const importe = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(this.total() / 100);
    const fecha = new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${salida.fecha}T12:00:00Z`));
    const viajeros = this.form.controls.viajeros.value;
    void this.alertas.informar('Tu viaje de prueba', `${p.titulo} · Salida: ${fecha} · ${viajeros} ${viajeros === 1 ? 'viajero' : 'viajeros'} · Total: ${importe}. Este es un resumen ilustrativo. El formulario de reserva y el pago simulado se implementarán en la siguiente etapa.`);
  }
}
