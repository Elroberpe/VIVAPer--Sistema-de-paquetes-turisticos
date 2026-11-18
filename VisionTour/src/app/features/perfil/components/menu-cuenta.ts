import { Component, ElementRef, inject, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'vp-menu-cuenta',
  templateUrl: './menu-cuenta.html',
  styleUrl: './menu-cuenta.css',
  host: { '(document:click)': 'cerrarFuera($event)' }
})
export class MenuCuenta {
  readonly saliendo = input(false);
  readonly perfil = output<void>();
  readonly salir = output<void>();
  readonly menu = viewChild.required<ElementRef<HTMLDetailsElement>>('menu');
  readonly boton = viewChild.required<ElementRef<HTMLElement>>('boton');
  private readonly elemento = inject(ElementRef<HTMLElement>);

  abrirPerfil() {
    this.cerrar(true);
    this.perfil.emit();
  }

  cerrar(devolverFoco = false) {
    if (!this.menu().nativeElement.open) return;
    this.menu().nativeElement.open = false;
    if (devolverFoco) this.boton().nativeElement.focus();
  }

  cerrarFuera(event: Event) {
    if (event.target instanceof Node && !this.elemento.nativeElement.contains(event.target)) this.cerrar();
  }

  cerrarAlSalir(event: FocusEvent) {
    if (!(event.relatedTarget instanceof Node) || !this.elemento.nativeElement.contains(event.relatedTarget)) this.cerrar();
  }

  cerrarConEscape(event: Event) {
    if (!this.menu().nativeElement.open) return;
    event.preventDefault();
    event.stopPropagation();
    this.cerrar(true);
  }
}
