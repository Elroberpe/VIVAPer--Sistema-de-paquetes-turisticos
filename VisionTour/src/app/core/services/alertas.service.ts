import { Injectable } from '@angular/core';
import Swal from 'sweetalert2/dist/sweetalert2.esm.js';

@Injectable({ providedIn: 'root' })
export class AlertasService {
  async confirmar(titulo: string, texto: string, accion = 'Confirmar') {
    const resultado = await Swal.fire({ title: titulo, text: texto, icon: 'question', showCancelButton: true,
      confirmButtonText: accion, cancelButtonText: 'Volver', buttonsStyling: false,
      customClass: { popup: 'vp-alert', confirmButton: 'btn btn-primary', cancelButton: 'btn btn-outline-brand' } });
    return resultado.isConfirmed;
  }
  informar(titulo: string, texto: string) {
    return Swal.fire({ title: titulo, text: texto, icon: 'info', confirmButtonText: 'Entendido',
      buttonsStyling: false, customClass: { popup: 'vp-alert', confirmButton: 'btn btn-primary' } });
  }
}
