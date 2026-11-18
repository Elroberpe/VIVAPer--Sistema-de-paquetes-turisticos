import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { AlertasService } from '../../../core/services/alertas.service';
import { PATRON_TELEFONO, PATRON_USUARIO } from '../../../shared/validators/datos-cuenta';
import { limiteClaveUtf8 } from '../../auth/pages/registro/registro.validators';
import { UsuariosRepository } from '../data-access/usuarios.repository';
import { mensajeUsuarios } from '../data-access/usuarios-errors';
import { UsuarioResumen } from '../models/usuario';

@Component({
  selector: 'vp-crear-usuario-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './crear-usuario-modal.html',
  styleUrl: '../pages/gestion.css'
})
export class CrearUsuarioModal {
  private readonly repo = inject(UsuariosRepository);
  private readonly auth = inject(AuthSessionService);
  private readonly alertas = inject(AlertasService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private cerrando = false;
  readonly creado = output<void>();
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('modal');
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    usuario: ['', [Validators.required, Validators.pattern(PATRON_USUARIO)]],
    celular: ['', [Validators.required, Validators.pattern(PATRON_TELEFONO)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    rol: this.fb.control<UsuarioResumen['rol']>('CLIENTE', [Validators.required, Validators.pattern(/^(ADMIN|CLIENTE|EMPLEADO)$/)]),
    password: ['', [Validators.required, Validators.pattern(/\S/), Validators.minLength(8), limiteClaveUtf8]]
  });

  abrir() {
    if (this.guardando() || this.cerrando || this.dialog().nativeElement.open) return;
    this.form.reset();
    this.error.set('');
    this.dialog().nativeElement.showModal();
  }

  async crear() {
    if (this.guardando() || this.cerrando) return;
    this.error.set('');
    if (!this.auth.esAdministrador()) { this.error.set('No tienes permiso para crear usuarios.'); return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    try {
      await firstValueFrom(this.repo.crear(this.form.getRawValue()));
      this.form.reset();
      this.dialog().nativeElement.close();
      this.creado.emit();
    } catch (error) { this.error.set(mensajeUsuarios(error, 'crear')); }
    finally { this.guardando.set(false); }
  }

  async cerrar(event?: Event) {
    event?.preventDefault();
    if (this.guardando() || this.cerrando) return;
    const modal = this.dialog().nativeElement;
    if (this.form.dirty) {
      this.cerrando = true;
      modal.close();
      try {
        const descartar = await this.alertas.confirmar('¿Descartar los cambios?', 'Los datos que ingresaste se perderán.', 'Descartar cambios');
        if (!descartar) { modal.showModal(); return; }
      } finally { this.cerrando = false; }
    }
    modal.close();
    this.form.reset();
    this.error.set('');
  }
}
