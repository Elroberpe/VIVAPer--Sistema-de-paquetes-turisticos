import { Component, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, CanDeactivateFn, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, firstValueFrom, map, of, startWith, switchMap } from 'rxjs';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { AlertasService } from '../../../core/services/alertas.service';
import { SECCIONES_ADMIN } from '../admin.config';
import { AdminRepository } from '../data-access/admin.repository';
import { CampoAdmin, RegistroAdmin, SeccionAdmin } from '../models/admin';

@Component({ selector: 'vp-admin-gestion', imports: [ReactiveFormsModule, CurrencyPipe], templateUrl: './gestion.html', styleUrl: './gestion.css' })
export class GestionAdmin {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repo = inject(AdminRepository);
  private readonly alertas = inject(AlertasService);
  private readonly injector = inject(Injector);
  readonly auth = inject(AuthSessionService);
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('editor');
  readonly seccion = toSignal(this.route.data.pipe(map(d => d['seccion'] as SeccionAdmin)), { initialValue: this.route.snapshot.data['seccion'] as SeccionAdmin });
  readonly config = computed(() => SECCIONES_ADMIN.find(c => c.id === this.seccion())!);
  readonly parametros = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly consulta = computed(() => this.parametros().get('q') ?? '');
  readonly estadoFiltro = computed(() => this.parametros().get('estado') ?? '');
  readonly filtroExtra = computed(() => this.config().campos.find(c => ['rol', 'categoria', 'tipo'].includes(c.clave)));
  readonly filtrosAbiertos = signal(false);
  readonly fuente = toSignal(this.route.data.pipe(switchMap(d => this.repo.listar(d['seccion'] as SeccionAdmin).pipe(
    map(registros => ({ cargando: false, error: false, registros })),
    catchError(() => of({ cargando: false, error: true, registros: [] as RegistroAdmin[] })),
    startWith({ cargando: true, error: false, registros: [] as RegistroAdmin[] })
  ))), { initialValue: { cargando: true, error: false, registros: [] as RegistroAdmin[] } });
  readonly destinos = toSignal(this.repo.opciones('destinos'), { initialValue: [] });
  readonly proveedores = toSignal(this.repo.opciones('proveedores'), { initialValue: [] });
  readonly filtrados = computed(() => {
    const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const texto = normalizar(this.consulta().trim());
    const extra = this.parametros().get('tipo');
    const campo = this.filtroExtra()?.clave;
    const lista = this.fuente().registros.filter(r => (!texto || normalizar([r.nombre, r.correo, r.region, r.tipo, r.contacto].filter(Boolean).join(' ')).includes(texto)) && (!this.estadoFiltro() || r.estado === this.estadoFiltro()) && (!extra || !campo || r[campo] === extra));
    if (this.parametros().get('orden')) lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') * (this.parametros().get('orden') === 'desc' ? -1 : 1));
    return lista;
  });
  readonly paginas = computed(() => Math.max(1, Math.ceil(this.filtrados().length / 6)));
  readonly pagina = computed(() => Math.max(1, Math.min(this.paginas(), Math.floor(Number(this.parametros().get('pagina'))) || 1)));
  readonly visibles = computed(() => this.filtrados().slice((this.pagina() - 1) * 6, this.pagina() * 6));
  readonly inicio = computed(() => this.filtrados().length ? (this.pagina() - 1) * 6 + 1 : 0);
  readonly fin = computed(() => Math.min(this.pagina() * 6, this.filtrados().length));
  readonly estadisticas = computed(() => {
    const registros = this.fuente().registros;
    const activos = registros.filter(r => ['Activo', 'Publicado'].includes(r.estado)).length;
    const total = { etiqueta: `Total de ${this.config().titulo.toLowerCase()}`, valor: registros.length, nota: 'En tu espacio de gestión', icono: this.config().icono, clase: 'blue' };
    const activo = { etiqueta: this.seccion() === 'paquetes' ? 'Paquetes publicados' : `${this.config().titulo} activos`, valor: activos, nota: this.seccion() === 'paquetes' ? 'Visibles en el sitio web' : 'Disponibles actualmente', icono: 'bi-check2-circle', clase: 'green' };
    const tercero = this.seccion() === 'usuarios' ? { etiqueta: 'Administradores', valor: registros.filter(r => r.rol === 'Administrador' && r.estado === 'Activo').length, nota: 'Con acceso de administración', icono: 'bi-shield-check', clase: 'orange' }
      : this.seccion() === 'paquetes' ? { etiqueta: 'En borrador', valor: registros.filter(r => r.estado === 'Borrador').length, nota: 'Ideas listas para tomar forma', icono: 'bi-pencil-square', clase: 'orange' }
      : { etiqueta: `${this.config().titulo} inactivos`, valor: registros.filter(r => r.estado === 'Inactivo').length, nota: 'Puedes revisar su información', icono: 'bi-pause-circle', clase: 'orange' };
    return [total, activo, tercero];
  });
  readonly editorAbierto = signal(false);
  readonly editando = signal<RegistroAdmin | null>(null);
  readonly soloLectura = signal(false);
  readonly guardando = signal(false);
  readonly errorFormulario = signal('');
  readonly mensaje = signal('');
  form = new FormGroup<Record<string, FormControl<string>>>({});
  readonly columnaSecundaria = computed(() => ({ usuarios: 'Correo electrónico', paquetes: 'Destino', destinos: 'Presentación', servicios: 'Proveedor', proveedores: 'Correo de contacto' })[this.seccion()]);
  readonly columnaTercera = computed(() => ({ usuarios: 'Rol', paquetes: 'Desde / persona', destinos: 'Paquetes', servicios: 'Tarifa', proveedores: 'Ubicación' })[this.seccion()]);

  filtrar(clave: string, valor: string) { void this.router.navigate([], { relativeTo: this.route, queryParams: { [clave]: valor || null, pagina: null }, queryParamsHandling: 'merge', replaceUrl: clave === 'q' }); }
  irPagina(pagina: number) { void this.router.navigate([], { relativeTo: this.route, queryParams: { pagina }, queryParamsHandling: 'merge' }); }
  limpiar() { void this.router.navigate([], { relativeTo: this.route, queryParams: {} }); }
  contar(estado: string) { return this.fuente().registros.filter(r => !estado || r.estado === estado).length; }
  iniciales(nombre: string) { return nombre.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase(); }
  precio(registro: RegistroAdmin) { return Number(registro.precio ?? 0); }
  opciones(campo: CampoAdmin) { return campo.origen === 'destinos' ? this.destinos() : campo.origen === 'proveedores' ? this.proveedores() : campo.opciones ?? []; }
  abrir(registro: RegistroAdmin | null = null, lectura = false) {
    if (!this.auth.esAdministrador() && !lectura) return;
    this.editando.set(registro); this.soloLectura.set(lectura); this.errorFormulario.set(''); this.mensaje.set('');
    const controles: Record<string, FormControl<string>> = {};
    for (const campo of this.config().campos) {
      const validators: ValidatorFn[] = campo.requerido ? [Validators.required, this.noVacio] : [];
      if (campo.tipo === 'email') validators.push(Validators.email);
      if (campo.min !== undefined) validators.push(Validators.min(campo.min));
      if (campo.clave === 'nombre') validators.push(Validators.minLength(2), Validators.maxLength(160));
      const predeterminado = campo.clave === 'dias' ? '1' : campo.clave === 'precio' ? '0' : campo.tipo === 'select' && !campo.origen ? campo.opciones?.[0]?.valor ?? '' : '';
      controles[campo.clave] = new FormControl({ value: registro?.[campo.clave] ?? predeterminado, disabled: lectura }, { nonNullable: true, validators });
    }
    this.form = new FormGroup(controles);
    this.editorAbierto.set(true);
    afterNextRender(() => { if (this.editorAbierto() && !this.dialog().nativeElement.open) this.dialog().nativeElement.showModal(); }, { injector: this.injector });
  }
  async cerrarEditor(event?: Event) { event?.preventDefault(); if (this.guardando()) return; if (await this.confirmarSalida()) { this.dialog().nativeElement.close(); this.editorAbierto.set(false); this.form.markAsPristine(); } }
  async confirmarSalida(): Promise<boolean> {
    if (!this.editorAbierto() || !this.form.dirty || this.soloLectura()) return true;
    const estabaAbierto = this.dialog().nativeElement.open;
    if (estabaAbierto) this.dialog().nativeElement.close();
    const salir = await this.alertas.confirmar('¿Descartar los cambios?', 'Los cambios que todavía no guardaste se perderán.', 'Descartar cambios');
    if (!salir && estabaAbierto) this.dialog().nativeElement.showModal();
    if (salir) { this.editorAbierto.set(false); this.form.markAsPristine(); }
    return salir;
  }
  async guardar() {
    if (this.guardando() || this.soloLectura()) return;
    this.errorFormulario.set('');
    if (this.form.invalid) { this.form.markAllAsTouched(); this.dialog().nativeElement.querySelector<HTMLElement>('.ng-invalid:not(form)')?.focus(); return; }
    const valores = this.form.getRawValue();
    const registro: RegistroAdmin = { id: this.editando()?.id ?? '', nombre: valores['nombre'] ?? '', descripcion: valores['descripcion'] ?? this.editando()?.descripcion ?? '', estado: valores['estado'] ?? 'Activo', ...valores };
    const anterior = this.editando();
    const cambioVisible = this.seccion() === 'paquetes' && (registro.estado === 'Publicado' || anterior?.estado === 'Publicado');
    const desactivar = !!anterior && anterior.estado !== registro.estado && ['Inactivo', 'Archivado'].includes(registro.estado);
    if (cambioVisible || desactivar) {
      this.dialog().nativeElement.close();
      const confirmar = await this.alertas.confirmar(cambioVisible ? '¿Actualizar el catálogo de prueba?' : '¿Cambiar el estado del registro?', cambioVisible ? 'Los cambios se reflejarán en las experiencias visibles del sitio público durante esta sesión.' : 'Se conservará la información del registro con el nuevo estado.', 'Guardar cambios');
      if (!confirmar) { this.dialog().nativeElement.showModal(); return; }
      this.dialog().nativeElement.showModal();
    }
    this.guardando.set(true);
    try {
      await firstValueFrom(this.repo.guardar(this.seccion(), registro));
      this.form.markAsPristine(); this.dialog().nativeElement.close(); this.editorAbierto.set(false);
      this.mensaje.set(`${this.config().singular[0].toUpperCase() + this.config().singular.slice(1)} ${anterior ? 'actualizado' : 'creado'} correctamente en esta sesión de prueba.`);
    } catch (error) { this.errorFormulario.set(error instanceof Error ? error.message : 'No pudimos guardar el registro. Inténtalo de nuevo.'); }
    finally { this.guardando.set(false); }
  }
  private readonly noVacio: ValidatorFn = control => typeof control.value === 'string' && !control.value.trim() ? { required: true } : null;
}

export const cambiosPendientesGuard: CanDeactivateFn<GestionAdmin> = component => component.confirmarSalida();
