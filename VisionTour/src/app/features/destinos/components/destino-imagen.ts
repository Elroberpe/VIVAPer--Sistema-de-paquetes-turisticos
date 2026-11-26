import { Component, effect, input, signal } from '@angular/core';

@Component({
  selector: 'vp-destino-imagen',
  template: `
    @if (url() && !fallida()) {
      <img [src]="url()" [alt]="'Imagen de ' + nombre()" loading="lazy" (error)="fallida.set(true)">
    } @else {
      <span class="sin-imagen" role="img" [attr.aria-label]="'Sin imagen de ' + nombre()"><i class="bi bi-geo-alt" aria-hidden="true"></i></span>
    }
  `,
  styles: `
    :host { display: block; width: 44px; height: 44px; flex-shrink: 0; border-radius: 9px; overflow: hidden; }
    img { width: 100%; height: 100%; object-fit: cover; }
    .sin-imagen { display: grid; place-items: center; width: 100%; height: 100%; background: var(--color-surface-muted, #edf3fa); color: var(--color-text-muted); font-size: 22px; }
  `
})
export class DestinoImagen {
  readonly url = input<string | null>(null);
  readonly nombre = input('destino');
  readonly fallida = signal(false);

  constructor() { effect(() => { this.url(); this.fallida.set(false); }); }
}
