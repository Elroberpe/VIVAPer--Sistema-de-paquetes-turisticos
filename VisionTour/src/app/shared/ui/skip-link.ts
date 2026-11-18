import { DOCUMENT } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

@Component({ selector: 'vp-skip-link', template: `<a class="skip-link" [href]="url().split('#')[0] + '#' + destino()" (click)="saltar($event)">{{ texto() }}</a>` })
export class SkipLink {
  readonly destino = input('contenido');
  readonly texto = input('Saltar al contenido');
  private readonly router = inject(Router);
  readonly url = toSignal(this.router.events.pipe(filter(event => event instanceof NavigationEnd), map(event => event.urlAfterRedirects)), { initialValue: this.router.url });
  private readonly document = inject(DOCUMENT);
  saltar(event: Event) { event.preventDefault(); const main = this.document.getElementById(this.destino()); main?.focus(); main?.scrollIntoView({ block: 'start' }); }
}
