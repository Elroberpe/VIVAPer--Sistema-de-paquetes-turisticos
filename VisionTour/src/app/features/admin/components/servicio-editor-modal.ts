import { Component, DestroyRef, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, firstValueFrom } from 'rxjs';
import { AlertasService } from '../../../core/services/alertas.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { ServiciosRepository } from '../data-access/servicios.repository';
import { erroresCamposServicio, mensajeServicios } from '../data-access/servicios-errors';
import { Servicio } from '../models/servicio';

type ModoEditor = 'crear' | 'editar' | 'detalle';

@Component({
  selector: 'vp-servicio-editor-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './servicio-editor-modal.html',
  styleUrls: ['../pages/gestion.css', '../pages/servicios/servicios.css']
})
export class ServicioEditorModal {
  private readonly repo = inject(ServiciosRepository);
  private readonly alertas = inject(AlertasService);
  private readonly auth = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;
  private consulta?: Subscription;
  private cerrando = false;
  readonly guardado = output<Servicio>();
  readonly noDisponible = output<void>();
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('modal');
  readonly modo = signal<ModoEditor>('crear');
  readonly servicio = signal<Servicio | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly erroresCampos = signal<Partial<Record<'nombre' | 'descripcion', string>>>({});
  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    descripcion: ['', Validators.maxLength(255)]
  });

  abrir(modo: ModoEditor, id?: number) {
    if (this.guardando() || this.cerrando || this.dialog().nativeElement.open || !this.auth.esAdministrador()) return;
    if (modo !== 'crear' && (!Number.isInteger(id) || id! <= 0)) return;
    this.modo.set(modo);
    this.servicio.set(null);
    this.form.reset();
    this.error.set('');
    this.erroresCampos.set({});
    this.dialog().nativeElement.showModal();
    if (modo !== 'crear') this.cargar(id!);
  }

  private cargar(id: number) {
    this.consulta?.unsubscribe();
    this.cargando.set(true);
    this.consulta = this.repo.detalle(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: servicio => {
        this.servicio.set(servicio);
        this.form.reset({ nombre: servicio.nombre, descripcion: servicio.descripcion ?? '' });
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeServicios(error));
        this.cargando.set(false);
        if (error instanceof HttpErrorResponse && error.status === 404) this.noDisponible.emit();
      }
    });
  }

  async guardar() {
    if (this.guardando() || this.cargando() || this.cerrando || this.modo() === 'detalle') return;
    if (this.modo() === 'editar' && !this.servicio()) return;
    this.error.set('');
    this.erroresCampos.set({});
    if (!this.auth.esAdministrador()) { this.error.set('No tienes permiso para gestionar servicios.'); return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    try {
      const datos = this.form.getRawValue();
      const solicitud = this.modo() === 'crear' ? this.repo.crear(datos) : this.repo.actualizar(this.servicio()!.idServicio, datos);
      const servicio = await firstValueFrom(solicitud);
      this.cerrarSinConfirmar();
      this.guardado.emit(servicio);
    } catch (error) {
      this.error.set(mensajeServicios(error));
      this.erroresCampos.set(erroresCamposServicio(error));
      if (error instanceof HttpErrorResponse && error.status === 409) this.erroresCampos.set({ nombre: 'Ya existe un servicio con ese nombre.' });
      if (error instanceof HttpErrorResponse && error.status === 404) this.noDisponible.emit();
    } finally { this.guardando.set(false); }
  }

  async confirmarSalida(): Promise<boolean> {
    if (this.guardando() || this.cerrando) return false;
    const modal = this.dialog().nativeElement;
    if (!modal.open) return true;
    if (this.modo() !== 'detalle' && this.form.dirty) {
      this.cerrando = true;
      modal.close();
      try {
        const descartar = await this.alertas.confirmar('¿Descartar los cambios?', 'Los cambios que todavía no guardaste se perderán.', 'Descartar cambios');
        if (!descartar) { modal.showModal(); return false; }
      } finally { this.cerrando = false; }
    }
    this.cerrarSinConfirmar();
    return true;
  }

  async cerrar(event?: Event) { event?.preventDefault(); await this.confirmarSalida(); }

  private cerrarSinConfirmar() {
    this.consulta?.unsubscribe();
    this.dialog().nativeElement.close();
    this.form.reset();
    this.servicio.set(null);
    this.cargando.set(false);
    this.error.set('');
    this.erroresCampos.set({});
  }
}
