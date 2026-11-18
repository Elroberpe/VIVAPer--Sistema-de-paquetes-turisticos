import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { Login } from './login';

describe('Acceso público de clientes', () => {
  it('inicia sesión con el servicio existente y regresa al sitio público', async () => {
    const ingresar = vi.fn().mockResolvedValue({ rol: 'Cliente' });
    const navigateByUrl = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({ providers: [
      { provide: AuthSessionService, useValue: { restaurar: async () => null, ingresar, esPersonal: () => false } },
      { provide: Router, useValue: { navigateByUrl } },
      { provide: ActivatedRoute, useValue: { snapshot: { data: { accesoCliente: true }, queryParamMap: convertToParamMap({}) } } }
    ] });
    const pagina = TestBed.runInInjectionContext(() => new Login());
    await pagina.ngOnInit();
    pagina.form.setValue({ correo: 'ana@example.test', clave: 'clave-ficticia' });
    await pagina.ingresar();
    expect(ingresar).toHaveBeenCalledWith('ana@example.test', 'clave-ficticia');
    expect(navigateByUrl).toHaveBeenCalledWith('/', { replaceUrl: true });
    expect(pagina.form.controls.clave.value).toBe('');
  });
});
