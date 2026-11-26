import { Component, DestroyRef, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, firstValueFrom, forkJoin, of } from 'rxjs';
import { AlertasService } from '../../../core/services/alertas.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { ServiciosRepository } from '../data-access/servicios.repository';
import { ProveedoresRepository } from '../data-access/proveedores.repository';
import { erroresCamposProveedor, mensajeProveedores } from '../data-access/proveedores-errors';
import { Proveedor, ProveedorDatos } from '../models/proveedor';
import { Servicio } from '../models/servicio';

type ModoEditor = 'crear' | 'editar' | 'detalle';

@Component({
  selector: 'vp-proveedor-editor-modal', imports: [ReactiveFormsModule], templateUrl: './proveedor-editor-modal.html',
  styleUrls: ['../pages/gestion.css', '../pages/proveedores/proveedores.css']
})
export class ProveedorEditorModal {
  private readonly repo = inject(ProveedoresRepository);
  private readonly serviciosRepo = inject(ServiciosRepository);
  private readonly alertas = inject(AlertasService);
  private readonly auth = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;
  private consulta?: Subscription;
  private cerrando = false;
  private id?: number;
  readonly guardado = output<Proveedor>();
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('modal');
  readonly modo = signal<ModoEditor>('crear');
  readonly proveedor = signal<Proveedor | null>(null);
  readonly servicios = signal<Servicio[]>([]);
  readonly seleccion = signal<number[]>([]);
  readonly opcionesServicios = computed(() => this.servicios().filter(s => s.estado || this.asociado(s.idServicio) || this.seleccion().includes(s.idServicio)));
  readonly cargando = signal(false);
  readonly cargandoServicios = signal(false);
  readonly cargaCompleta = signal(false);
  readonly errorServicios = signal('');
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly erroresCampos = signal<Partial<Record<keyof ProveedorDatos, string>>>({});
  readonly form = this.fb.group({
    ruc: ['', [Validators.required, Validators.pattern(/^[0-9]{11}$/)]],
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(150)]],
    encargado: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(150)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    telefono: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(20)]],
    serviciosIds: this.fb.control<number[]>([])
  });

  abrir(modo: ModoEditor, id?: number) {
    if (this.guardando() || this.cerrando || this.dialog().nativeElement.open || !this.auth.esAdministrador()) return;
    if (modo !== 'crear' && (!Number.isInteger(id) || id! <= 0)) return;
    this.id = id;
    this.modo.set(modo); this.proveedor.set(null); this.servicios.set([]); this.seleccion.set([]);
    this.form.reset(); this.error.set(''); this.erroresCampos.set({}); this.errorServicios.set(''); this.cargaCompleta.set(false);
    this.dialog().nativeElement.showModal();
    this.cargar();
  }

  cargar() {
    this.consulta?.unsubscribe(); this.cargando.set(true); this.error.set('');
    const detalle$ = this.modo() === 'crear' ? of(null) : this.repo.detalle(this.id!);
    const servicios$ = this.modo() === 'detalle' ? of([] as Servicio[]) : this.serviciosRepo.listar(this.modo() === 'crear' ? { estado: true } : {});
    this.consulta = forkJoin({ proveedor: detalle$, servicios: servicios$ }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ proveedor, servicios }) => {
        this.proveedor.set(proveedor); this.servicios.set(servicios);
        const serviciosIds = proveedor?.servicios.map(s => s.idServicio) ?? [];
        this.form.reset({ ruc: proveedor?.ruc ?? '', nombre: proveedor?.nombre ?? '', encargado: proveedor?.encargado ?? '', email: proveedor?.email ?? '', telefono: proveedor?.telefono ?? '', serviciosIds });
        this.seleccion.set(serviciosIds); this.cargaCompleta.set(true); this.cargando.set(false);
      },
      error: error => { this.error.set(mensajeProveedores(error)); this.cargando.set(false); }
    });
  }

  asociado(id: number) { return this.proveedor()?.servicios.some(s => s.idServicio === id) ?? false; }

  seleccionar(servicio: Servicio, seleccionado: boolean) {
    if (this.guardando() || this.cargandoServicios() || this.modo() === 'detalle') return;
    if (seleccionado && !servicio.estado && !this.asociado(servicio.idServicio)) return;
    const actual = this.form.controls.serviciosIds;
    const ids = seleccionado ? [...new Set([...actual.value, servicio.idServicio])] : actual.value.filter(id => id !== servicio.idServicio);
    actual.setValue(ids); actual.markAsDirty(); this.seleccion.set(ids);
  }

  async actualizarServicios() {
    if (this.cargandoServicios()) return;
    this.cargandoServicios.set(true); this.errorServicios.set('');
    try { this.servicios.set(await firstValueFrom(this.serviciosRepo.listar())); }
    catch (error) { this.errorServicios.set(mensajeProveedores(error)); }
    finally { this.cargandoServicios.set(false); }
  }

  async guardar() {
    if (this.guardando() || this.cargando() || this.cargandoServicios() || this.errorServicios() || !this.cargaCompleta() || this.cerrando || this.modo() === 'detalle') return;
    if (this.modo() === 'editar' && !this.proveedor()) return;
    this.error.set(''); this.erroresCampos.set({});
    if (!this.auth.esAdministrador()) { this.error.set('No tienes permiso para gestionar proveedores.'); return; }
    this.form.controls.email.setValue(this.form.controls.email.value.trim());
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    try {
      const valores = this.form.getRawValue();
      const datos: ProveedorDatos = { ...valores, email: valores.email || null };
      const solicitud = this.modo() === 'crear' ? this.repo.crear(datos) : this.repo.actualizar(this.proveedor()!.idProveedor, datos);
      const proveedor = await firstValueFrom(solicitud);
      this.cerrarSinConfirmar(); this.guardado.emit(proveedor);
    } catch (error) {
      this.error.set(mensajeProveedores(error)); this.erroresCampos.set(erroresCamposProveedor(error));
      if (error instanceof HttpErrorResponse && (error.status === 409 || error.status === 404)) await this.actualizarServicios();
    } finally { this.guardando.set(false); }
  }

  async confirmarSalida(): Promise<boolean> {
    if (this.guardando() || this.cargandoServicios() || this.cerrando) return false;
    const modal = this.dialog().nativeElement;
    if (!modal.open) return true;
    if (this.modo() !== 'detalle' && this.form.dirty) {
      this.cerrando = true; modal.close();
      try {
        if (!await this.alertas.confirmar('¿Descartar los cambios?', 'Los cambios que todavía no guardaste se perderán.', 'Descartar cambios')) { modal.showModal(); return false; }
      } finally { this.cerrando = false; }
    }
    this.cerrarSinConfirmar(); return true;
  }

  async cerrar(event?: Event) { event?.preventDefault(); await this.confirmarSalida(); }

  private cerrarSinConfirmar() {
    this.consulta?.unsubscribe(); this.dialog().nativeElement.close(); this.form.reset();
    this.proveedor.set(null); this.servicios.set([]); this.seleccion.set([]); this.cargando.set(false);
    this.cargaCompleta.set(false); this.error.set(''); this.errorServicios.set(''); this.erroresCampos.set({});
  }
}
