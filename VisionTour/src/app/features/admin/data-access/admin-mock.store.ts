import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { RegistroAdmin, UsuarioInterno } from '../models/admin';

function fecha(dias: number) { const d = new Date(); d.setDate(d.getDate() - dias); return d.toISOString(); }
export interface OperacionMock { usuarios: UsuarioInterno[]; proveedores: RegistroAdmin[]; servicios: RegistroAdmin[]; }

@Injectable({ providedIn: 'root' })
export class AdminMockStore {
  private readonly subject = new BehaviorSubject<OperacionMock>({
    usuarios: [
      { id: 'u1', nombre: 'Camila Torres', correo: 'admin@vivaperu.test', rol: 'Administrador', estado: 'Activo', creadoEl: fecha(45) },
      { id: 'u2', nombre: 'Diego Mendoza', correo: 'diego@vivaperu.test', rol: 'Administrador', estado: 'Activo', creadoEl: fecha(38) },
      { id: 'u3', nombre: 'Valeria Rojas', correo: 'valeria@vivaperu.test', rol: 'Operador', estado: 'Activo', creadoEl: fecha(24) },
      { id: 'u4', nombre: 'Mateo Quispe', correo: 'mateo@vivaperu.test', rol: 'Operador', estado: 'Activo', creadoEl: fecha(20) },
      { id: 'u5', nombre: 'Luciana Flores', correo: 'luciana@vivaperu.test', rol: 'Operador', estado: 'Inactivo', creadoEl: fecha(18) },
      { id: 'u6', nombre: 'Sebastián Vega', correo: 'sebastian@vivaperu.test', rol: 'Operador', estado: 'Activo', creadoEl: fecha(12) },
      { id: 'u7', nombre: 'Mariana Castillo', correo: 'mariana@vivaperu.test', rol: 'Operador', estado: 'Activo', creadoEl: fecha(7) },
      { id: 'u8', nombre: 'Andrés Salazar', correo: 'andres@vivaperu.test', rol: 'Operador', estado: 'Inactivo', creadoEl: fecha(3) }
    ],
    proveedores: [
      { id: 'pr1', nombre: 'Andes Travel Partners', descripcion: 'Operador local de experiencias culturales.', estado: 'Activo', contacto: 'Elena Ríos', correo: 'contacto@andes.example', telefono: '+51 900 111 222', ciudad: 'Cusco', tipo: 'Operador turístico' },
      { id: 'pr2', nombre: 'Rutas del Sol', descripcion: 'Traslados para escapadas por la costa.', estado: 'Activo', contacto: 'Luis Paredes', correo: 'hola@rutas.example', telefono: '+51 900 222 333', ciudad: 'Ica', tipo: 'Transporte' },
      { id: 'pr3', nombre: 'Casa del Valle', descripcion: 'Alojamiento de ejemplo en el Valle Sagrado.', estado: 'Activo', contacto: 'Ana Medina', correo: 'reservas@valle.example', telefono: '+51 900 333 444', ciudad: 'Cusco', tipo: 'Alojamiento' },
      { id: 'pr4', nombre: 'Amazonía Natural', descripcion: 'Experiencias de naturaleza de demostración.', estado: 'Inactivo', contacto: 'Pedro Ruiz', correo: 'hola@amazonia.example', telefono: '+51 900 444 555', ciudad: 'Iquitos', tipo: 'Operador turístico' }
    ],
    servicios: [
      { id: 's1', nombre: 'Visita guiada a Machu Picchu', descripcion: 'Recorrido cultural de prueba con guía local.', estado: 'Activo', tipo: 'Guiado', proveedorId: 'pr1', precio: '180' },
      { id: 's2', nombre: 'Traslado Ica – Paracas', descripcion: 'Servicio de transporte de prueba.', estado: 'Activo', tipo: 'Transporte', proveedorId: 'pr2', precio: '85' },
      { id: 's3', nombre: 'Noche en el Valle Sagrado', descripcion: 'Habitación de demostración con desayuno.', estado: 'Activo', tipo: 'Alojamiento', proveedorId: 'pr3', precio: '220' },
      { id: 's4', nombre: 'Paseo por las dunas', descripcion: 'Actividad de ejemplo en Huacachina.', estado: 'Activo', tipo: 'Actividad', proveedorId: 'pr2', precio: '95' },
      { id: 's5', nombre: 'Paseo en bote por el Amazonas', descripcion: 'Ruta fluvial de demostración.', estado: 'Inactivo', tipo: 'Actividad', proveedorId: 'pr4', precio: '160' }
    ]
  });
  readonly cambios$ = this.subject.asObservable();
  get snapshot() { return this.subject.value; }
  actualizar(estado: OperacionMock) { this.subject.next(estado); }
}
