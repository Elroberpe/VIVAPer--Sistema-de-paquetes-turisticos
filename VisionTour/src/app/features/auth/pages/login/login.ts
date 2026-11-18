import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthSessionService, destinoAdminSeguro } from '../../../../core/auth/auth-session.service';
import { mensajeAutenticacion } from '../../../../core/auth/auth-errors';

@Component({ selector: 'vp-login', imports: [ReactiveFormsModule, RouterLink], templateUrl: './login.html', styleUrl: './login.css' })
export class Login implements OnInit {
  private readonly auth = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly form = inject(FormBuilder).nonNullable.group({ correo: ['', [Validators.required, Validators.email]], clave: ['', Validators.required] });
  readonly visible = signal(false);
  readonly enviando = signal(false);
  readonly restaurando = signal(true);
  readonly error = signal('');
  readonly accesoCliente = this.route.snapshot.data['accesoCliente'] === true;
  readonly registroCreado = this.accesoCliente && this.route.snapshot.queryParamMap.get('registro') === 'ok';
  async ngOnInit() {
    try {
      if (this.registroCreado) return;
      const sesion = await this.auth.restaurar();
      if (sesion && this.accesoCliente && !this.auth.esPersonal()) await this.router.navigateByUrl('/', { replaceUrl: true });
      else if (sesion && this.auth.esPersonal()) await this.router.navigateByUrl(destinoAdminSeguro(this.route.snapshot.queryParamMap.get('returnUrl'), this.auth.esAdministrador()), { replaceUrl: true });
      else if (sesion) this.error.set('Esta cuenta no tiene acceso al panel administrativo.');
      else if (this.route.snapshot.queryParamMap.get('motivo') === 'sesion') this.error.set('Tu sesión terminó. Ingresa de nuevo para continuar.');
    }
    catch (error) { this.error.set(mensajeAutenticacion(error)); }
    finally { this.restaurando.set(false); }
  }
  async ingresar() {
    if (this.enviando() || this.restaurando()) return;
    this.error.set('');
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.enviando.set(true);
    try {
      const { correo, clave } = this.form.getRawValue();
      const sesion = await this.auth.ingresar(correo, clave);
      this.form.controls.clave.reset('');
      if (this.accesoCliente && !this.auth.esPersonal()) { await this.router.navigateByUrl('/', { replaceUrl: true }); return; }
      if (!this.auth.esPersonal()) { this.error.set('Esta cuenta no tiene acceso al panel administrativo.'); return; }
      await this.router.navigateByUrl(destinoAdminSeguro(this.route.snapshot.queryParamMap.get('returnUrl'), sesion.rol === 'Administrador'), { replaceUrl: true });
    } catch (error) { this.error.set(mensajeAutenticacion(error)); }
    finally { this.enviando.set(false); }
  }
}
