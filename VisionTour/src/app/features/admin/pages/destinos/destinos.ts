import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, CanDeactivateFn, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, catchError, combineLatest, debounceTime, distinctUntilChanged, firstValueFrom, map, of, startWith, switchMap, tap } from 'rxjs';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { AlertasService } from '../../../../core/services/alertas.service';
import { DestinoEditorModal } from '../../components/destino-editor-modal';
import { DestinosRepository } from '../../../destinos/data-access/destinos.repository';
import { mensajeDestinos } from '../../../destinos/data-access/destinos-errors';
import { Destino, DestinoFiltros } from '../../../destinos/models/destino';
import { DestinoImagen } from '../../../destinos/components/destino-imagen';

const estadoInicial = { cargando: true, error: '', registros: [] as Destino[] };
const filasPorPagina = 6;

@Component({
  selector: 'vp-destinos-admin',
  imports: [ReactiveFormsModule, DestinoEditorModal, DestinoImagen],
  templateUrl: './destinos.html',
  styleUrls: ['../gestion.css', './destinos.css']
})
export class DestinosAdmin {
  private readonly repo = inject(DestinosRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthSessionService);
  private readonly alertas = inject(AlertasService);
  private readonly recarga = new BehaviorSubject<void>(undefined);
  readonly editor = viewChild.required(DestinoEditorModal);
  readonly busqueda = new FormControl('', { nonNullable: true });
  readonly parametros = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly estado = computed(() => this.parametros().get('estado') === 'Activo' ? true : this.parametros().get('estado') === 'Inactivo' ? false : undefined);
  readonly filtrosAbiertos = signal(false);
  readonly cambiando = signal<number | null>(null);
  readonly mensaje = signal('');
  readonly errorAccion = signal('');
  private readonly filtros$ = this.route.queryParamMap.pipe(
    map(params => ({
      nombre: params.get('q')?.trim() || undefined,
      estado: params.get('estado') === 'Activo' ? true : params.get('estado') === 'Inactivo' ? false : undefined
    } satisfies DestinoFiltros)),
    distinctUntilChanged((a, b) => a.nombre === b.nombre && a.estado === b.estado)
  );
  readonly fuente = toSignal(combineLatest([this.filtros$, this.recarga]).pipe(
    switchMap(([filtros]) => this.repo.listar(filtros).pipe(
      tap(registros => {
        const ultima = Math.max(1, Math.ceil(registros.length / filasPorPagina));
        if (this.paginaSolicitada() > ultima) void this.irPagina(ultima, true);
      }),
      map(registros => ({ cargando: false, error: '', registros })),
      catchError(error => of({ cargando: false, error: mensajeDestinos(error), registros: [] as Destino[] })),
      startWith(estadoInicial)
    ))
  ), { initialValue: estadoInicial });
  readonly ordenados = computed(() => {
    const registros = [...this.fuente().registros];
    const orden = this.parametros().get('orden');
    if (orden === 'asc' || orden === 'desc') registros.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') * (orden === 'desc' ? -1 : 1));
    return registros;
  });
  readonly paginas = computed(() => Math.max(1, Math.ceil(this.ordenados().length / filasPorPagina)));
  readonly pagina = computed(() => Math.min(this.paginaSolicitada(), this.paginas()));
  readonly visibles = computed(() => this.ordenados().slice((this.pagina() - 1) * filasPorPagina, this.pagina() * filasPorPagina));
  readonly inicio = computed(() => this.visibles().length ? (this.pagina() - 1) * filasPorPagina + 1 : 0);
  readonly fin = computed(() => this.inicio() ? this.inicio() + this.visibles().length - 1 : 0);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => this.busqueda.setValue(params.get('q') ?? ''));
    this.busqueda.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe(valor => {
      const nombre = valor.trim();
      if (nombre === (this.route.snapshot.queryParamMap.get('q')?.trim() ?? '')) return;
      this.filtrar('q', nombre);
    });
  }

  private paginaSolicitada() {
    const pagina = Number(this.parametros().get('pagina') ?? 1);
    return Number.isSafeInteger(pagina) && pagina >= 1 ? pagina : 1;
  }

  filtrar(clave: 'q' | 'estado' | 'orden', valor: string) {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { [clave]: valor || null, pagina: null }, queryParamsHandling: 'merge', replaceUrl: clave === 'q' });
  }

  irPagina(pagina: number, replaceUrl = false) {
    return this.router.navigate([], { relativeTo: this.route, queryParams: { pagina: pagina > 1 ? pagina : null }, queryParamsHandling: 'merge', replaceUrl });
  }

  limpiar() { void this.router.navigate([], { relativeTo: this.route, queryParams: {} }); }
  recargar() { this.recarga.next(); }

  destinoGuardado() {
    this.mensaje.set('Destino guardado correctamente.');
    this.errorAccion.set('');
    this.recargar();
  }

  async cambiarEstado(destino: Destino) {
    if (this.cambiando() !== null || !this.auth.esAdministrador() || !Number.isInteger(destino.idDestino) || destino.idDestino <= 0) return;
    this.cambiando.set(destino.idDestino);
    this.mensaje.set('');
    this.errorAccion.set('');
    const accion = destino.estado ? 'Desactivar' : 'Activar';
    try {
      if (!await this.alertas.confirmar(`¿${accion} el destino ${destino.nombre}?`, 'Se conservarán los datos del destino.', accion)) return;
      await firstValueFrom(this.repo.cambiarEstado(destino.idDestino, !destino.estado));
      this.mensaje.set(`Destino ${destino.estado ? 'desactivado' : 'activado'} correctamente.`);
      this.recargar();
    } catch (error) {
      this.errorAccion.set(mensajeDestinos(error));
      if (error instanceof HttpErrorResponse && error.status === 404) this.recargar();
    } finally { this.cambiando.set(null); }
  }

  confirmarSalida() { return this.cambiando() !== null ? false : this.editor().confirmarSalida(); }
}

export const cambiosDestinosGuard: CanDeactivateFn<DestinosAdmin> = componente => componente.confirmarSalida();
