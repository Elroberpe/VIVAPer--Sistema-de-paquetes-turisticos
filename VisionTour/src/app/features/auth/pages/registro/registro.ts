import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthRepository } from '../../data-access/auth.repository';
import { mensajeAutenticacion } from '../../../../core/auth/auth-errors';
import { clavesIguales, limiteClaveUtf8 } from './registro.validators';
import { PATRON_TELEFONO, PATRON_USUARIO } from '../../../../shared/validators/datos-cuenta';

@Component({ selector: 'vp-registro', imports: [ReactiveFormsModule, RouterLink], templateUrl: './registro.html', styleUrls: ['../login/login.css', './registro.css'] })
export class Registro {
  private readonly repo = inject(AuthRepository);
  private readonly router = inject(Router);
  readonly form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    usuario: ['', [Validators.required, Validators.pattern(PATRON_USUARIO)]],
    celular: ['', [Validators.required, Validators.pattern(PATRON_TELEFONO)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72), limiteClaveUtf8]],
    confirmacion: ['', Validators.required]
  }, { validators: clavesIguales });
  readonly visible = signal(false);
  readonly enviando = signal(false);
  readonly error = signal('');
  async registrar() {
    if (this.enviando()) return;
    this.error.set('');
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.enviando.set(true);
    const { nombre, apellido, usuario, celular, email, password } = this.form.getRawValue();
    try {
      await firstValueFrom(this.repo.registrarCliente({ nombre, apellido, usuario, celular, email, password }));
      this.form.reset();
      await this.router.navigate(['/iniciar-sesion'], { queryParams: { registro: 'ok' }, replaceUrl: true });
    } catch (error) {
      this.error.set(error instanceof HttpErrorResponse && error.status === 409 ? 'El correo o el usuario ya está registrado.' : error instanceof HttpErrorResponse && error.status === 400 ? 'Revisa los datos ingresados y las condiciones de la contraseña.' : mensajeAutenticacion(error));
    } finally { this.enviando.set(false); }
  }
}
