import { Component, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { SECCIONES_ADMIN } from '../../features/admin/admin.config';
import { SkipLink } from '../../shared/ui/skip-link';
import { AlertasService } from '../../core/services/alertas.service';
import { mensajeAutenticacion } from '../../core/auth/auth-errors';
import { PerfilModal } from '../../features/perfil/components/perfil-modal';
import { MenuCuenta } from '../../features/perfil/components/menu-cuenta';

@Component({ selector: 'vp-admin-layout', imports: [RouterOutlet, RouterLink, RouterLinkActive, SkipLink, PerfilModal, MenuCuenta], templateUrl: './admin-layout.html', styleUrl: './admin-layout.css' })
export class AdminLayout {
  readonly auth = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly alertas = inject(AlertasService);
  readonly menu = viewChild.required<ElementRef<HTMLElement>>('menuLateral');
  readonly botonMenu = viewChild.required<ElementRef<HTMLButtonElement>>('botonMenu');
  readonly menuAbierto = signal(false);
  readonly saliendo = signal(false);
  readonly secciones = SECCIONES_ADMIN;
  readonly seccion = toSignal(this.router.events.pipe(filter(e => e instanceof NavigationEnd), startWith(null), map(() => this.route.firstChild?.snapshot?.data?.['seccion'] as string | undefined)));
  readonly titulo = computed(() => this.secciones.find(s => s.id === this.seccion())?.titulo ?? 'Administración');
  readonly iniciales = computed(() => (this.auth.sesion()?.nombre ?? 'VP').split(' ').slice(0, 2).map(n => n[0]).join(''));
  constructor() { this.router.events.pipe(takeUntilDestroyed()).subscribe(e => { if (e instanceof NavigationEnd) this.cerrarMenu(); }); }
  abrirMenu() { this.menuAbierto.set(true); afterNextRender(() => this.menu().nativeElement.querySelector<HTMLElement>('button')?.focus(), { injector: this.injector }); }
  cerrarMenu() { if (!this.menuAbierto()) return; this.menuAbierto.set(false); afterNextRender(() => this.botonMenu().nativeElement.focus(), { injector: this.injector }); }
  mantenerFoco(event: Event) {
    if (!(event instanceof KeyboardEvent) || !this.menuAbierto()) return;
    const controles = Array.from(this.menu().nativeElement.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'));
    const primero = controles[0]; const ultimo = controles.at(-1);
    if (event.shiftKey && event.target === primero) { event.preventDefault(); ultimo?.focus(); }
    else if (!event.shiftKey && event.target === ultimo) { event.preventDefault(); primero?.focus(); }
  }
  async salir() { if (this.saliendo()) return; this.saliendo.set(true); try { await this.auth.salir(); await this.router.navigate(['/admin/login']); } catch (error) { await this.alertas.informar('No se pudo cerrar la sesión', mensajeAutenticacion(error)); } finally { this.saliendo.set(false); } }
}
