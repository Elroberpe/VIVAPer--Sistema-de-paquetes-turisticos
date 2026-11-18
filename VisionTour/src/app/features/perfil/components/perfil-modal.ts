import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { AlertasService } from '../../../core/services/alertas.service';
import { PerfilRepository } from '../data-access/perfil.repository';
import { PerfilUsuario } from '../models/perfil';
import { limiteClaveUtf8 } from '../../auth/pages/registro/registro.validators';
import { PATRON_TELEFONO, PATRON_USUARIO } from '../../../shared/validators/datos-cuenta';

type SeccionCuenta = 'perfil' | 'password' | 'correo';

@Component({ selector: 'vp-perfil-modal', imports: [ReactiveFormsModule], templateUrl: './perfil-modal.html', styleUrl: './perfil-modal.css' })
export class PerfilModal {
  readonly auth = inject(AuthSessionService);
  private readonly repo = inject(PerfilRepository);
  private readonly alertas = inject(AlertasService);
  readonly perfil = signal<PerfilUsuario | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  readonly seccion = signal<SeccionCuenta>('perfil');
  readonly pestanas = [
    { id: 'perfil', titulo: 'Mi perfil', icono: 'bi-person', accion: 'Guardar cambios' },
    { id: 'password', titulo: 'Contraseña', icono: 'bi-lock', accion: 'Actualizar contraseña' },
    { id: 'correo', titulo: 'Correo', icono: 'bi-envelope', accion: 'Actualizar correo' }
  ] as const;
  readonly pestanaActiva = computed(() => this.pestanas.find(p => p.id === this.seccion())!);
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('modal');
  private cerrando = false;
  readonly form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    usuario: ['', [Validators.required, Validators.pattern(PATRON_USUARIO)]],
    celular: ['', [Validators.required, Validators.pattern(PATRON_TELEFONO)]]
  });
  readonly passwordForm = inject(FormBuilder).nonNullable.group({
    passwordActual: ['', [Validators.required, Validators.pattern(/\S/)]],
    passwordNueva: ['', [Validators.required, Validators.pattern(/\S/), Validators.minLength(8), limiteClaveUtf8]],
    confirmacion: ['', Validators.required]
  }, { validators: control => control.get('passwordNueva')?.value === control.get('confirmacion')?.value ? null : { clavesDistintas: true } });
  readonly correoForm = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    passwordActual: ['', [Validators.required, Validators.pattern(/\S/)]]
  });
  readonly formActivo = computed(() => ({ perfil: this.form, password: this.passwordForm, correo: this.correoForm })[this.seccion()]);

  cambiarSeccion(seccion: SeccionCuenta) {
    if (this.guardando() || this.cargando()) return;
    this.seccion.set(seccion);
    this.error.set('');
    this.mensaje.set('');
  }

  navegarPestanas(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || this.guardando() || this.cargando()) return;
    event.preventDefault();
    const actual = this.pestanas.findIndex(p => p.id === this.seccion());
    const indice = event.key === 'Home' ? 0 : event.key === 'End' ? this.pestanas.length - 1 : (actual + (event.key === 'ArrowRight' ? 1 : -1) + this.pestanas.length) % this.pestanas.length;
    const seccion = this.pestanas[indice].id;
    this.cambiarSeccion(seccion);
    this.dialog().nativeElement.querySelector<HTMLButtonElement>(`#tab-${seccion}`)?.focus();
  }

  abrir() {
    if (this.dialog().nativeElement.open || this.cerrando) return;
    this.perfil.set(null);
    this.form.reset();
    this.passwordForm.reset();
    this.correoForm.reset();
    this.seccion.set('perfil');
    this.mensaje.set('');
    this.dialog().nativeElement.showModal();
    void this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    this.error.set('');
    try {
      const perfil = await firstValueFrom(this.repo.obtener());
      this.aplicar(perfil);
      this.correoForm.reset({ email: perfil.email, passwordActual: '' });
    }
    catch (error) { this.error.set(this.mensajeError(error)); }
    finally { this.cargando.set(false); }
  }

  cancelar() {
    const perfil = this.perfil();
    if (!perfil || this.guardando()) return;
    this.form.reset({ nombre: perfil.nombre, apellido: perfil.apellido, usuario: perfil.usuario, celular: perfil.celular });
    this.error.set('');
    this.mensaje.set('');
  }

  async guardar() {
    if (this.guardando() || !this.perfil()) return;
    this.error.set('');
    this.mensaje.set('');
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.form.dirty) return;
    this.guardando.set(true);
    try {
      this.aplicar(await firstValueFrom(this.repo.actualizar(this.form.getRawValue())));
      this.mensaje.set('Tu perfil se actualizó correctamente.');
    } catch (error) { this.error.set(this.mensajeError(error)); }
    finally { this.guardando.set(false); }
  }

  async actualizarPassword() {
    if (this.guardando()) return;
    this.error.set('');
    this.mensaje.set('');
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    this.guardando.set(true);
    const { passwordActual, passwordNueva } = this.passwordForm.getRawValue();
    try {
      await firstValueFrom(this.repo.cambiarPassword({ passwordActual, passwordNueva }));
      this.passwordForm.reset();
      this.mensaje.set('Tu contraseña se actualizó correctamente. Úsala la próxima vez que inicies sesión.');
    } catch (error) {
      this.error.set(this.mensajeError(error, 'password'));
    } finally { this.guardando.set(false); }
  }

  async actualizarCorreo() {
    if (this.guardando()) return;
    this.error.set('');
    this.mensaje.set('');
    if (this.correoForm.invalid) { this.correoForm.markAllAsTouched(); return; }
    this.guardando.set(true);
    try {
      const perfil = await firstValueFrom(this.repo.cambiarCorreo(this.correoForm.getRawValue()));
      this.aplicar(perfil, true);
      this.correoForm.reset({ email: perfil.email, passwordActual: '' });
      this.mensaje.set('Tu correo se actualizó correctamente.');
    } catch (error) { this.error.set(this.mensajeError(error, 'correo')); }
    finally { this.guardando.set(false); }
  }

  async cerrar(event?: Event) {
    event?.preventDefault();
    if (this.guardando() || this.cerrando) return;
    const modal = this.dialog().nativeElement;
    if (this.form.dirty || this.passwordForm.dirty || this.correoForm.dirty) {
      this.cerrando = true;
      modal.close();
      try {
        const descartar = await this.alertas.confirmar('¿Descartar los cambios?', 'Los cambios que todavía no guardaste se perderán.', 'Descartar cambios');
        if (!descartar) { modal.showModal(); return; }
      } finally { this.cerrando = false; }
    }
    modal.close();
    this.cancelar();
    this.passwordForm.reset();
    this.correoForm.reset();
  }

  private aplicar(perfil: PerfilUsuario, conservarBorrador = false) {
    this.perfil.set(perfil);
    if (!conservarBorrador) this.form.reset({ nombre: perfil.nombre, apellido: perfil.apellido, usuario: perfil.usuario, celular: perfil.celular });
    this.auth.actualizarPerfil(String(perfil.id), `${perfil.nombre} ${perfil.apellido}`.trim(), perfil.email);
  }

  private mensajeError(error: unknown, seccion: SeccionCuenta = 'perfil') {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
      if (error.status === 400 && error.error?.codigo === 'PASSWORD_ACTUAL_INCORRECTA') return 'La contraseña actual no es correcta.';
      if (error.status === 409) return seccion === 'correo' ? 'Este correo ya está registrado.' : 'Este usuario ya está registrado.';
      if (seccion === 'correo' && error.status === 400) return 'Revisa el correo y la contraseña actual.';
      if (seccion === 'password' && error.status === 400) {
        if (error.error?.codigo === 'PASSWORD_REUTILIZADA') return 'La nueva contraseña debe ser diferente de la actual.';
        return 'Revisa los datos de la contraseña.';
      }
      if (error.status === 429) return 'Se alcanzó el límite de intentos. Espera unos minutos antes de volver a intentarlo.';
      if (error.status === 400) return 'Revisa tus datos personales.';
      if (error.status === 401) return 'Tu sesión terminó. Vuelve a iniciar sesión para continuar.';
      if (error.status === 403) return 'No tienes permiso para acceder a este perfil.';
    }
    return 'No pudimos completar la operación. Inténtalo de nuevo.';
  }
}
