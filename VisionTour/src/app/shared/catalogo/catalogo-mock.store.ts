import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { crearPaquetes, DESTINOS } from './catalogo.fixtures';
import { DestinoGestion, PaqueteGestion } from './models';

export interface CatalogoMock { paquetes: PaqueteGestion[]; destinos: DestinoGestion[]; }

@Injectable({ providedIn: 'root' })
export class CatalogoMockStore {
  private readonly subject = new BehaviorSubject<CatalogoMock>({
    paquetes: crearPaquetes().map(p => ({ ...p, estado: 'Publicado' })),
    destinos: DESTINOS.map(d => ({ ...d, estado: 'Activo' }))
  });
  readonly cambios$ = this.subject.asObservable();
  get snapshot(): CatalogoMock { return this.subject.value; }
  actualizar(catalogo: CatalogoMock) { this.subject.next(catalogo); }
}
