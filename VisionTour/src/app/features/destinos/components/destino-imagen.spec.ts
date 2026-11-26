import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DestinoImagen } from './destino-imagen';

describe('Imagen de destino', () => {
  it('presenta una alternativa accesible cuando no existe imagen', async () => {
    const fixture = TestBed.createComponent(DestinoImagen);
    fixture.componentRef.setInput('nombre', 'Cusco');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="img"]').getAttribute('aria-label')).toBe('Sin imagen de Cusco');
  });

  it('reemplaza una imagen rota y vuelve a cargar al cambiar la URL', async () => {
    const fixture = TestBed.createComponent(DestinoImagen);
    fixture.componentRef.setInput('nombre', 'Cusco');
    fixture.componentRef.setInput('url', '/images/no-existe.jpg');
    await fixture.whenStable();
    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    fixture.componentRef.setInput('url', '/images/cusco.jpg');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('/images/cusco.jpg');
    expect(fixture.nativeElement.querySelector('img').getAttribute('alt')).toBe('Imagen de Cusco');
  });
});
