import { AbstractControl, ValidationErrors } from '@angular/forms';

export function limiteClaveUtf8(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && new TextEncoder().encode(control.value).length > 72 ? { claveLarga: true } : null;
}
export function clavesIguales(control: AbstractControl): ValidationErrors | null {
  return control.get('password')?.value === control.get('confirmacion')?.value ? null : { clavesDistintas: true };
}
