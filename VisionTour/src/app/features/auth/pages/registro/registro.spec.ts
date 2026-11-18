import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthRepository } from '../../data-access/auth.repository';
import { Registro } from './registro';

describe('Registro de clientes', () => {
  const registrarCliente = vi.fn();
  const navigate = vi.fn();
  let pagina: Registro;
  const datos = { nombre: 'Ana', apellido: 'Prueba', usuario: 'ana.prueba', celular: '+51999888777', email: 'ana@example.test', password: 'clave-ficticia', confirmacion: 'clave-ficticia' };
  beforeEach(() => {
    registrarCliente.mockReset().mockReturnValue(of(undefined)); navigate.mockReset().mockResolvedValue(true);
    TestBed.configureTestingModule({ providers: [
      { provide: AuthRepository, useValue: { registrarCliente } }, { provide: Router, useValue: { navigate } }
    ] });
    pagina = TestBed.runInInjectionContext(() => new Registro());
  });
  it('impide enviar contraseñas distintas o que excedan el límite UTF-8 del backend', async () => {
    pagina.form.setValue({ ...datos, confirmacion: 'otra-clave' });
    await pagina.registrar(); expect(registrarCliente).not.toHaveBeenCalled();
    pagina.form.patchValue({ password: 'á'.repeat(37), confirmacion: 'á'.repeat(37) });
    expect(pagina.form.controls.password.hasError('claveLarga')).toBe(true);
    await pagina.registrar(); expect(registrarCliente).not.toHaveBeenCalled();
  });
  it('envía los datos sin confirmación ni rol y lleva al login tras el registro', async () => {
    pagina.form.setValue(datos); await pagina.registrar();
    expect(registrarCliente).toHaveBeenCalledWith({ nombre: datos.nombre, apellido: datos.apellido, usuario: datos.usuario, celular: datos.celular, email: datos.email, password: datos.password });
    expect(navigate).toHaveBeenCalledWith(['/iniciar-sesion'], { queryParams: { registro: 'ok' }, replaceUrl: true });
    expect(pagina.form.controls.password.value).toBe('');
  });
  it('muestra el correo o usuario duplicado sin redirigir ni dejar bloqueado el formulario', async () => {
    registrarCliente.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    pagina.form.setValue(datos); await pagina.registrar();
    expect(pagina.error()).toContain('correo o el usuario ya está registrado');
    expect(navigate).not.toHaveBeenCalled(); expect(pagina.enviando()).toBe(false);
  });
  it.each([
    ['usuario', ''], ['usuario', 'ab'], ['usuario', 'a'.repeat(31)], ['usuario', 'ana prueba'], ['usuario', 'ana@prueba'],
    ['celular', ''], ['celular', '12345678'], ['celular', '1'.repeat(16)], ['celular', '999abc777']
  ] as const)('rechaza %s inválido: %s', async (campo, valor) => {
    pagina.form.setValue({ ...datos, [campo]: valor });
    await pagina.registrar();
    expect(pagina.form.controls[campo].invalid).toBe(true);
    expect(registrarCliente).not.toHaveBeenCalled();
  });
});
