import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
@Component({ selector: 'vp-admin-not-found', imports: [RouterLink], template: `<section class="empty-state"><i class="bi bi-signpost-split" aria-hidden="true"></i><h1 class="page-heading">No encontramos esta sección.</h1><p>Usa las opciones del menú para continuar en tu espacio de gestión.</p><a class="btn btn-primary" [routerLink]="auth.esAdministrador() ? '/admin/usuarios' : '/admin/paquetes'">Volver al panel</a></section>` })
export class AdminNotFound { readonly auth = inject(AuthSessionService); }
