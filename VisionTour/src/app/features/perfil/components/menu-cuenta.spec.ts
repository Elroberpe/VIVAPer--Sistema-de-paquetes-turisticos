import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuCuenta } from './menu-cuenta';

describe('Menú de cuenta compartido', () => {
  let fixture: ComponentFixture<MenuCuenta>;
  let componente: MenuCuenta;
  let summary: HTMLElement;
  let menu: HTMLDetailsElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(MenuCuenta);
    fixture.detectChanges();
    componente = fixture.componentInstance;
    summary = fixture.nativeElement.querySelector('summary');
    menu = fixture.nativeElement.querySelector('details');
  });

  it('abre y cierra el desplegable al pulsar el perfil y conserva el orden de las acciones', () => {
    expect(menu.open).toBe(false);
    summary.click();
    expect(menu.open).toBe(true);
    expect(Array.from(fixture.nativeElement.querySelectorAll('.account-dropdown button') as NodeListOf<HTMLButtonElement>).map(boton => boton.textContent?.trim())).toEqual(['Mi perfil', 'Cerrar sesión']);
    summary.click();
    expect(menu.open).toBe(false);
  });

  it('cierra al hacer clic fuera del menú', () => {
    summary.click();
    document.body.click();
    expect(menu.open).toBe(false);
  });

  it('cierra con Escape y devuelve el foco al perfil', () => {
    summary.click();
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    menu.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });

  it('cierra cuando el foco sale hacia otro control', () => {
    summary.click();
    menu.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    expect(menu.open).toBe(false);
  });

  it('cierra antes de abrir Mi perfil y deja el disparador como punto de retorno del foco', () => {
    const perfil = vi.fn();
    componente.perfil.subscribe(perfil);
    summary.click();
    fixture.nativeElement.querySelector('.account-profile').click();
    expect(perfil).toHaveBeenCalledTimes(1);
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });

  it('bloquea las dos acciones y muestra Saliendo mientras se cierra la sesión', () => {
    const salir = vi.fn();
    componente.salir.subscribe(salir);
    fixture.componentRef.setInput('saliendo', true);
    fixture.detectChanges();
    summary.click();
    const botones = Array.from(fixture.nativeElement.querySelectorAll('.account-dropdown button') as NodeListOf<HTMLButtonElement>);
    expect(botones.every(boton => boton.disabled)).toBe(true);
    expect(botones[1].textContent).toContain('Saliendo…');
    botones[1].click();
    expect(salir).not.toHaveBeenCalled();
  });
});
