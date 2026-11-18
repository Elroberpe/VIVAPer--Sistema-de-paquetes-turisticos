import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Subscription, catchError, combineLatest, debounceTime, distinctUntilChanged, firstValueFrom, map, of, startWith, switchMap, tap } from 'rxjs';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { AlertasService } from '../../../../core/services/alertas.service';
import { UsuariosRepository } from '../../data-access/usuarios.repository';
import { FiltrosUsuarios, ROLES_USUARIO, UsuarioDetalle, UsuarioResumen, UsuariosPagina } from '../../models/usuario';
import { EditarUsuarioModal } from '../../components/editar-usuario-modal';
import { mensajeUsuarios } from '../../data-access/usuarios-errors';
import { CrearUsuarioModal } from '../../components/crear-usuario-modal';

const paginaVacia: UsuariosPagina = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 };
const estadoInicial = { cargando: true, error: '', datos: paginaVacia };

@Component({ selector: 'vp-usuarios-admin', imports: [DatePipe, ReactiveFormsModule, EditarUsuarioModal, CrearUsuarioModal], templateUrl: './usuarios.html', styleUrls: ['../gestion.css', './usuarios.css'] })
export class UsuariosAdmin {
  readonly auth = inject(AuthSessionService);
  private readonly repo = inject(UsuariosRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertasService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly recarga = new BehaviorSubject<void>(undefined);
  private consultaDetalle?: Subscription;
  readonly busqueda = new FormControl('', { nonNullable: true });
  readonly parametros = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly estado = computed(() => this.filtros(this.parametros()).activo);
  readonly fuente = toSignal(combineLatest([this.route.queryParamMap, this.recarga]).pipe(
    switchMap(([params]) => this.repo.listar(this.filtros(params)).pipe(
      tap(datos => {
        if (datos.page > 0 && datos.page >= datos.totalPages) void this.irPagina(Math.max(0, datos.totalPages - 1), true);
      }),
      map(datos => ({ cargando: false, error: '', datos })),
      catchError(error => of({ cargando: false, error: mensajeUsuarios(error), datos: paginaVacia })),
      startWith(estadoInicial)
    ))
  ), { initialValue: estadoInicial });
  readonly inicio = computed(() => this.fuente().datos.content.length ? this.fuente().datos.page * this.fuente().datos.size + 1 : 0);
  readonly fin = computed(() => this.inicio() ? this.inicio() + this.fuente().datos.content.length - 1 : 0);
  readonly cambiando = signal<number | null>(null);
  readonly mensaje = signal('');
  readonly errorAccion = signal('');
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('detalleModal');
  readonly detalle = signal<UsuarioDetalle | null>(null);
  readonly cargandoDetalle = signal(false);
  readonly errorDetalle = signal('');
  readonly roles = ROLES_USUARIO;

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => this.busqueda.setValue(params.get('q')?.slice(0, 100) ?? ''));
    this.busqueda.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe(q => {
      const buscar = q.trim().slice(0, 100);
      if (buscar === this.filtros(this.route.snapshot.queryParamMap).buscar) return;
      void this.router.navigate([], { relativeTo: this.route, queryParams: { q: buscar || null, pagina: null }, queryParamsHandling: 'merge', replaceUrl: true });
    });
  }

  private filtros(params: ParamMap): FiltrosUsuarios {
    const pagina = Number(params.get('pagina') ?? 1);
    return {
      page: Number.isInteger(pagina) && pagina >= 1 && pagina <= 2147483647 ? pagina - 1 : 0,
      size: 10, buscar: params.get('q')?.trim().slice(0, 100) ?? '',
      activo: params.get('estado') === 'Activo' ? true : params.get('estado') === 'Inactivo' ? false : undefined
    };
  }

  filtrarEstado(estado: '' | 'Activo' | 'Inactivo') {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { estado: estado || null, pagina: null }, queryParamsHandling: 'merge' });
  }
  irPagina(page: number, replaceUrl = false) {
    return this.router.navigate([], { relativeTo: this.route, queryParams: { pagina: page ? page + 1 : null }, queryParamsHandling: 'merge', replaceUrl });
  }
  limpiar() { void this.router.navigate([], { relativeTo: this.route, queryParams: {} }); }
  recargar() { this.recarga.next(); }
  esMiCuenta(usuario: UsuarioResumen) { return String(usuario.id) === this.auth.sesion()?.usuarioId; }
  nombre(usuario: UsuarioResumen) { return `${usuario.nombre} ${usuario.apellido}`.trim(); }
  iniciales(usuario: UsuarioResumen) { return `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase(); }

  abrirDetalle(usuario: UsuarioResumen) {
    this.consultaDetalle?.unsubscribe();
    this.detalle.set(null);
    this.errorDetalle.set('');
    this.cargandoDetalle.set(true);
    if (!this.dialog().nativeElement.open) this.dialog().nativeElement.showModal();
    this.consultaDetalle = this.repo.detalle(usuario.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: detalle => { this.detalle.set(detalle); this.cargandoDetalle.set(false); },
      error: error => { this.errorDetalle.set(mensajeUsuarios(error)); this.cargandoDetalle.set(false); }
    });
  }

  cerrarDetalle(event?: Event) {
    event?.preventDefault();
    this.consultaDetalle?.unsubscribe();
    this.dialog().nativeElement.close();
    this.detalle.set(null);
    this.cargandoDetalle.set(false);
  }

  async cambiarEstado(usuario: UsuarioResumen) {
    if (this.cambiando() !== null || !this.auth.esAdministrador() || (this.esMiCuenta(usuario) && usuario.activo)) return;
    this.cambiando.set(usuario.id);
    this.errorAccion.set('');
    this.mensaje.set('');
    const accion = usuario.activo ? 'Desactivar' : 'Activar';
    try {
      const confirmar = await this.alertas.confirmar(`¿${accion} a ${this.nombre(usuario)}?`, usuario.activo ? 'La cuenta no podrá acceder a la plataforma mientras esté desactivada.' : 'La cuenta podrá volver a iniciar sesión.', accion);
      if (!confirmar) return;
      await firstValueFrom(this.repo.cambiarEstado(usuario.id, !usuario.activo));
      this.mensaje.set(`Usuario ${usuario.activo ? 'desactivado' : 'activado'} correctamente.`);
      this.recargar();
    } catch (error) { this.errorAccion.set(mensajeUsuarios(error, 'estado')); }
    finally { this.cambiando.set(null); }
  }

  usuarioActualizado(usuario: UsuarioDetalle) {
    if (this.detalle()?.id === usuario.id) this.detalle.set(usuario);
    this.recargar();
  }

  usuarioCreado() {
    this.mensaje.set('Usuario creado correctamente.');
    this.errorAccion.set('');
    this.recargar();
  }
}
