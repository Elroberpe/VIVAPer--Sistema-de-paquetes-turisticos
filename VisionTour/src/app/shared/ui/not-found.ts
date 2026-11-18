import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({ selector: 'vp-not-found', imports: [RouterLink], template: `<section class="page-container section-space"><div class="empty-state"><i class="bi bi-signpost-split" aria-hidden="true"></i><span class="eyebrow">ERROR 404</span><h1 class="page-heading">Este camino aún no existe.</h1><p>La página que buscas no está disponible. Hay muchas otras experiencias por descubrir.</p><a class="btn btn-primary" routerLink="/">Volver al inicio</a></div></section>` })
export class NotFound {}
