import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({ selector: 'vp-acceso-denegado', imports: [RouterLink], template: `<section class="empty-state"><i class="bi bi-shield-lock" aria-hidden="true"></i><h1 class="page-heading">Esta sección requiere otro permiso.</h1><p>Tu sesión sigue activa. La gestión de usuarios está disponible para administradores.</p><a class="btn btn-primary" routerLink="/admin/paquetes">Ir a paquetes</a></section>` })
export class AccesoDenegado {}
