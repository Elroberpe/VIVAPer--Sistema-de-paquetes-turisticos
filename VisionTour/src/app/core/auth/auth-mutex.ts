import { Injectable } from '@angular/core';

/** Serializa las operaciones que rotan cookies, incluidas las de otras pestañas. */
@Injectable({ providedIn: 'root' })
export class AuthMutex {
  async ejecutar<T>(operacion: () => Promise<T>): Promise<T> {
    if (typeof navigator === 'undefined' || !navigator.locks) {
      throw new Error('Para iniciar sesión usa un navegador actualizado y abre el sitio mediante HTTPS o localhost.');
    }
    return await navigator.locks.request('vivaperu-auth-session', operacion);
  }
}
