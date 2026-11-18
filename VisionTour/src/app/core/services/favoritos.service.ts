import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FavoritosService {
  readonly ids = signal<string[]>([]);
  alternar(id: string) { this.ids.update(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]); }
}
