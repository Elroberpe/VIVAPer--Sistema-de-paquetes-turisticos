import { Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AlertasService } from '../../../core/services/alertas.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { PATRON_TELEFONO, PATRON_USUARIO } from '../../../shared/validators/datos-cuenta';
import { ROLES_USUARIO, UsuarioDetalle, UsuarioResumen } from '../models/usuario';
import { UsuariosRepository } from '../data-access/usuarios.repository';
import { mensajeUsuarios } from '../data-access/usuarios-errors';

@Component({
  selector: 'vp-editar-usuario-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './editar-usuario-modal.html',
  styleUrls: ['../pages/gestion.css', './editar-usuario-modal.css']
})
export class EditarUsuarioModal {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly alertas = inject(AlertasService);
  private readonly repo = inject(UsuariosRepository);
  private readonly auth = inject(AuthSessionService);
  private cerrando = false;
  readonly actualizado = output<UsuarioDetalle>();
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('modal');
  readonly usuario = signal<UsuarioResumen | null>(null);
  readonly seccion = signal<'datos' | 'rol'>('datos');
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  readonly esMiCuenta = computed(() => String(this.usuario()?.id) === this.auth.sesion()?.usuarioId);
  readonly roles = ROLES_USUARIO;
  readonly datosForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    usuario: ['', [Validators.required, Validators.pattern(PATRON_USUARIO)]],
    celular: ['', [Validators.required, Validators.pattern(PATRON_TELEFONO)]]
  });
  readonly rolForm = this.fb.group({ rol: this.fb.control<UsuarioResumen['rol']>('CLIENTE', [Validators.required, Validators.pattern(/^(ADMIN|CLIENTE|EMPLEADO)$/)]) });

  abrir(usuario: UsuarioResumen) {
    if (this.cerrando || this.guardando()) return;
    this.usuario.set({ ...usuario });
    this.restablecerDatos(usuario);
    this.rolForm.reset({ rol: usuario.rol });
    this.seccion.set('datos');
    this.error.set('');
    this.mensaje.set('');
    if (!this.dialog().nativeElement.open) this.dialog().nativeElement.showModal();
  }

  cambiarSeccion(seccion: 'datos' | 'rol') {
    if (this.guardando()) return;
    this.seccion.set(seccion);
    this.error.set('');
    this.mensaje.set('');
  }

  navegarPestanas(event: KeyboardEvent) {
    if (this.guardando() || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const seccion = event.key === 'Home' ? 'datos' : event.key === 'End' ? 'rol' : this.seccion() === 'datos' ? 'rol' : 'datos';
    this.cambiarSeccion(seccion);
    this.dialog().nativeElement.querySelector<HTMLButtonElement>(`#editar-tab-${seccion}`)?.focus();
  }

  async guardarDatos() {
    const usuario = this.usuario();
    if (!usuario || this.guardando() || this.cerrando) return;
    this.error.set('');
    this.mensaje.set('');
    if (!this.auth.esAdministrador()) { this.error.set('No tienes permiso para editar usuarios.'); return; }
    if (this.datosForm.invalid) { this.datosForm.markAllAsTouched(); return; }
    if (!this.datosForm.dirty) return;
    this.guardando.set(true);
    try {
      const actualizado = await firstValueFrom(this.repo.actualizarDatos(usuario.id, { ...this.datosForm.getRawValue(), correo: usuario.correo }));
      this.aplicarActualizacion(actualizado, 'datos');
      this.mensaje.set('Datos del usuario actualizados correctamente.');
    } catch (error) { this.error.set(mensajeUsuarios(error, 'datos')); }
    finally { this.guardando.set(false); }
  }

  async guardarRol() {
    const usuario = this.usuario();
    if (!usuario || this.guardando() || this.cerrando) return;
    this.error.set('');
    this.mensaje.set('');
    if (!this.auth.esAdministrador()) { this.error.set('No tienes permiso para cambiar roles.'); return; }
    if (this.rolForm.invalid) { this.rolForm.markAllAsTouched(); return; }
    const rol = this.rolForm.controls.rol.value;
    if (this.esMiCuenta() && rol !== 'ADMIN') { this.error.set('No puedes quitarte el rol de administrador.'); return; }
    if (rol === usuario.rol) return;
    this.guardando.set(true);
    try {
      const actualizado = await firstValueFrom(this.repo.cambiarRol(usuario.id, rol));
      this.aplicarActualizacion(actualizado, 'rol');
      this.mensaje.set('Rol del usuario actualizado correctamente.');
    } catch (error) { this.error.set(mensajeUsuarios(error, 'rol')); }
    finally { this.guardando.set(false); }
  }

  private restablecerDatos(usuario: UsuarioResumen) {
    this.datosForm.reset({ nombre: usuario.nombre, apellido: usuario.apellido, usuario: usuario.usuario, celular: usuario.celular });
  }

  private aplicarActualizacion(usuario: UsuarioDetalle, seccion: 'datos' | 'rol') {
    this.usuario.set(usuario);
    // Cada pestaña guarda por separado y conserva el borrador pendiente de la otra.
    if (seccion === 'datos' || this.datosForm.pristine) this.restablecerDatos(usuario);
    if (seccion === 'rol' || this.rolForm.pristine) this.rolForm.reset({ rol: usuario.rol });
    this.auth.actualizarPerfil(String(usuario.id), `${usuario.nombre} ${usuario.apellido}`.trim(), usuario.correo);
    this.actualizado.emit(usuario);
  }

  async cerrar(event?: Event) {
    event?.preventDefault();
    if (this.cerrando || this.guardando()) return;
    const modal = this.dialog().nativeElement;
    if (this.datosForm.dirty || this.rolForm.dirty) {
      this.cerrando = true;
      modal.close();
      try {
        const descartar = await this.alertas.confirmar('¿Descartar los cambios?', 'Los cambios que todavía no guardaste se perderán.', 'Descartar cambios');
        if (!descartar) { modal.showModal(); return; }
      } finally { this.cerrando = false; }
    }
    modal.close();
    this.datosForm.reset();
    this.rolForm.reset();
    this.usuario.set(null);
  }
}
