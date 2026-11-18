import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertasService } from '../../core/services/alertas.service';

@Component({ selector: 'vp-footer', imports: [RouterLink], templateUrl: './footer.html', styleUrl: './footer.css' })
export class Footer {
  private readonly alertas = inject(AlertasService);
  readonly year = new Date().getFullYear();
  acerca() { void this.alertas.informar('Estamos preparando el próximo viaje', 'Esta es una versión de demostración de VivaPeru. Los paquetes, precios y salidas son datos de prueba. Todavía no se realizan reservas ni cobros reales.'); }
}
