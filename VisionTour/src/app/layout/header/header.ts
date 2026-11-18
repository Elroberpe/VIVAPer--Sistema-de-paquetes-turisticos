import { Component, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { AlertasService } from '../../core/services/alertas.service';
import { mensajeAutenticacion } from '../../core/auth/auth-errors';
import { PerfilModal } from '../../features/perfil/components/perfil-modal';
import { MenuCuenta } from '../../features/perfil/components/menu-cuenta';

@Component({ selector: 'vp-header', imports: [RouterLink, RouterLinkActive, PerfilModal, MenuCuenta], templateUrl: './header.html', styleUrl: './header.css' })
export class Header implements OnInit {
  readonly auth = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertasService);
  readonly saliendo = signal(false);
  readonly abierto = signal(false);
  constructor() {
    inject(Router).events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationEnd) this.abierto.set(false);
    });
  }
  async ngOnInit() { try { await this.auth.restaurar(); } catch { /* La exploración pública sigue disponible sin sesión. */ } }
  async salir() {
    if (this.saliendo()) return;
    this.saliendo.set(true);
    try { await this.auth.salir(); await this.router.navigate(['/']); }
    catch (error) { await this.alertas.informar('No se pudo cerrar la sesión', mensajeAutenticacion(error)); }
    finally { this.saliendo.set(false); }
  }
}
