import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, CanDeactivateFn, ParamMap, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, catchError, combineLatest, debounceTime, distinctUntilChanged, firstValueFrom, map, of, startWith, switchMap, tap } from 'rxjs';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { AlertasService } from '../../../../core/services/alertas.service';
import { ProveedorEditorModal } from '../../components/proveedor-editor-modal';
import { ProveedoresRepository } from '../../data-access/proveedores.repository';
import { mensajeProveedores } from '../../data-access/proveedores-errors';
import { ProveedorFiltros, ProveedorResumen, ProveedoresPagina } from '../../models/proveedor';

const filasPorPagina = 10;
const paginaVacia: ProveedoresPagina = { content: [], page: 0, size: filasPorPagina, totalElements: 0, totalPages: 0 };
const estadoInicial = { cargando: true, error: '', datos: paginaVacia };

@Component({
  selector: 'vp-proveedores-admin', imports: [ReactiveFormsModule, ProveedorEditorModal],
  templateUrl: './proveedores.html', styleUrls: ['../gestion.css', './proveedores.css']
})
export class ProveedoresAdmin {
  private readonly repo = inject(ProveedoresRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthSessionService);
  private readonly alertas = inject(AlertasService);
  private readonly recarga = new BehaviorSubject<void>(undefined);
  readonly editor = viewChild.required(ProveedorEditorModal);
  readonly busqueda = new FormControl('', { nonNullable: true });
  readonly parametros = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly estado = computed(() => this.filtros(this.parametros()).estado);
  readonly cambiando = signal<number | null>(null);
  readonly mensaje = signal('');
  readonly errorAccion = signal('');
  readonly fuente = toSignal(combineLatest([this.route.queryParamMap, this.recarga]).pipe(
    switchMap(([params]) => this.repo.listar(this.filtros(params)).pipe(
      tap(datos => {
        if (datos.page > 0 && datos.page >= datos.totalPages) void this.irPagina(Math.max(0, datos.totalPages - 1), true);
      }),
      map(datos => ({ cargando: false, error: '', datos })),
      catchError(error => of({ cargando: false, error: mensajeProveedores(error), datos: paginaVacia })),
      startWith(estadoInicial)
    ))
  ), { initialValue: estadoInicial });
  readonly inicio = computed(() => this.fuente().datos.content.length ? this.fuente().datos.page * this.fuente().datos.size + 1 : 0);
  readonly fin = computed(() => this.inicio() ? this.inicio() + this.fuente().datos.content.length - 1 : 0);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => this.busqueda.setValue(params.get('q')?.slice(0, 150) ?? ''));
    this.busqueda.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe(valor => {
      const nombre = valor.trim().slice(0, 150);
      if (nombre !== (this.filtros(this.route.snapshot.queryParamMap).nombre ?? '')) this.filtrar('q', nombre);
    });
  }

  private filtros(params: ParamMap): ProveedorFiltros {
    const pagina = Number(params.get('pagina') ?? 1);
    return {
      page: Number.isSafeInteger(pagina) && pagina >= 1 && (pagina - 1) * filasPorPagina <= 2147483647 ? pagina - 1 : 0,
      size: filasPorPagina, nombre: params.get('q')?.trim().slice(0, 150) || undefined,
      estado: params.get('estado') === 'Activo' ? 'activo' : params.get('estado') === 'Inactivo' ? 'inactivo' : undefined
    };
  }

  filtrar(clave: 'q' | 'estado', valor: string) {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { [clave]: valor || null, pagina: null }, queryParamsHandling: 'merge', replaceUrl: clave === 'q' });
  }
  irPagina(page: number, replaceUrl = false) {
    return this.router.navigate([], { relativeTo: this.route, queryParams: { pagina: page > 0 ? page + 1 : null }, queryParamsHandling: 'merge', replaceUrl });
  }
  limpiar() { void this.router.navigate([], { relativeTo: this.route, queryParams: {} }); }
  recargar() { this.recarga.next(); }
  proveedorGuardado() { this.mensaje.set('Proveedor guardado correctamente.'); this.errorAccion.set(''); this.recargar(); }

  async cambiarEstado(proveedor: ProveedorResumen) {
    if (this.cambiando() !== null || !this.auth.esAdministrador() || !Number.isInteger(proveedor.idProveedor) || proveedor.idProveedor <= 0) return;
    this.cambiando.set(proveedor.idProveedor);
    this.mensaje.set(''); this.errorAccion.set('');
    const accion = proveedor.estado ? 'Desactivar' : 'Activar';
    try {
      if (!await this.alertas.confirmar(`¿${accion} el proveedor ${proveedor.nombre}?`, 'Se conservarán sus datos y sus asociaciones con servicios.', accion)) return;
      await firstValueFrom(this.repo.cambiarEstado(proveedor.idProveedor, !proveedor.estado));
      this.mensaje.set(`Proveedor ${proveedor.estado ? 'desactivado' : 'activado'} correctamente.`);
      this.recargar();
    } catch (error) {
      this.errorAccion.set(mensajeProveedores(error));
      if (error instanceof HttpErrorResponse && error.status === 404) this.recargar();
    } finally { this.cambiando.set(null); }
  }

  confirmarSalida() { return this.cambiando() !== null ? false : this.editor().confirmarSalida(); }
}

export const cambiosProveedoresGuard: CanDeactivateFn<ProveedoresAdmin> = componente => componente.confirmarSalida();
