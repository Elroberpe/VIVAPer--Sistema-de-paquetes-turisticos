import { Injectable, inject } from '@angular/core';
import { combineLatest, defer, delay, map, of } from 'rxjs';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { CatalogoMockStore } from '../../../shared/catalogo/catalogo-mock.store';
import { crearPaquetes } from '../../../shared/catalogo/catalogo.fixtures';
import { Categoria, EstadoActivo, EstadoPaquete, PaqueteGestion } from '../../../shared/catalogo/models';
import { RegistroAdmin, RolAdmin, SeccionAdmin, UsuarioInterno } from '../models/admin';
import { AdminMockStore } from './admin-mock.store';
import { AdminRepository } from './admin.repository';

function validarNombre(nombre: string) { if (nombre.trim().length < 2 || nombre.trim().length > 160) throw new Error('El nombre debe tener entre 2 y 160 caracteres.'); }
function validarCorreo(correo = '') { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) throw new Error('Ingresa un correo válido.'); }
function validarImporte(precio = '') { const numero = Number(precio); if (!precio.trim() || !Number.isFinite(numero) || numero < 0 || numero > 1000000 || Math.abs(numero * 100 - Math.round(numero * 100)) > .000001) throw new Error('Ingresa una tarifa válida en soles, con hasta dos decimales.'); return Math.round(numero * 100); }
function validarActivo(estado: string): asserts estado is EstadoActivo { if (!['Activo', 'Inactivo'].includes(estado)) throw new Error('Selecciona un estado válido.'); }

export function validarCambioUsuario(usuarios: UsuarioInterno[], registro: RegistroAdmin, actorId: string) {
  validarNombre(registro.nombre); validarCorreo(registro.correo); validarActivo(registro.estado);
  if (!['Administrador', 'Operador'].includes(registro.rol ?? '')) throw new Error('Selecciona un rol válido.');
  if (usuarios.some(u => u.id !== registro.id && u.correo.toLowerCase() === registro.correo?.trim().toLowerCase())) throw new Error('Ya existe un usuario con ese correo.');
  if (registro.id === actorId && (registro.estado !== 'Activo' || registro.rol !== 'Administrador')) throw new Error('No puedes desactivar tu propio acceso ni cambiar tu rol en esta sesión.');
  const anterior = usuarios.find(u => u.id === registro.id);
  if (anterior?.rol === 'Administrador' && anterior.estado === 'Activo' && (registro.rol !== 'Administrador' || registro.estado !== 'Activo') && !usuarios.some(u => u.id !== registro.id && u.rol === 'Administrador' && u.estado === 'Activo')) throw new Error('Debe quedar al menos un administrador activo.');
}

@Injectable()
export class AdminMockRepository extends AdminRepository {
  private readonly catalogo = inject(CatalogoMockStore);
  private readonly operacion = inject(AdminMockStore);
  private readonly auth = inject(AuthSessionService);
  override listar(seccion: SeccionAdmin) {
    return combineLatest([this.catalogo.cambios$, this.operacion.cambios$]).pipe(map(([c, o]): RegistroAdmin[] => {
      switch (seccion) {
        case 'usuarios': return o.usuarios.map(u => ({ id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, estado: u.estado, descripcion: u.rol === 'Administrador' ? 'Administración de la plataforma' : 'Equipo de operaciones' }));
        case 'paquetes': return c.paquetes.map(p => ({ id: p.id, nombre: p.titulo, descripcion: p.descripcion, estado: p.estado, destinoId: p.destinoId, region: p.destino, categoria: p.categoria, dias: String(p.dias), precio: String(p.precioDesdeCentimos / 100), imagen: p.imagen, itinerario: p.itinerario.map(d => `${d.titulo}: ${d.descripcion}`).join('\n') }));
        case 'destinos': return c.destinos.map(d => ({ ...d, cantidad: String(c.paquetes.filter(p => p.destinoId === d.id && p.estado !== 'Archivado').length) }));
        case 'servicios': return o.servicios.map(s => ({ ...s, region: o.proveedores.find(p => p.id === s.proveedorId)?.nombre ?? 'Proveedor no disponible' }));
        case 'proveedores': return o.proveedores.map(p => ({ ...p, cantidad: String(o.servicios.filter(s => s.proveedorId === p.id).length) }));
      }
    }), delay(150));
  }
  override opciones(origen: 'destinos' | 'proveedores') {
    return combineLatest([this.catalogo.cambios$, this.operacion.cambios$]).pipe(map(([c, o]) => (origen === 'destinos' ? c.destinos : o.proveedores).map(r => ({ valor: r.id, etiqueta: r.nombre + (r.estado === 'Inactivo' ? ' (inactivo)' : '') }))));
  }
  override guardar(seccion: SeccionAdmin, registro: RegistroAdmin) {
    return defer(() => {
      const sesion = this.auth.sesion();
      if (!sesion || sesion.expiraEn <= Date.now() || !this.auth.esAdministrador()) throw new Error('Tu sesión no permite realizar esta acción. Vuelve a ingresar con un administrador.');
      const r = { ...registro, nombre: registro.nombre.trim(), descripcion: registro.descripcion.trim() };
      validarNombre(r.nombre);
      const c = this.catalogo.snapshot;
      const o = this.operacion.snapshot;
      const existentes = seccion === 'usuarios' ? o.usuarios : seccion === 'paquetes' ? c.paquetes : seccion === 'destinos' ? c.destinos : o[seccion];
      if (r.id && !existentes.some(item => item.id === r.id)) throw new Error('Este registro ya no está disponible. Actualiza la lista.');
      if (seccion === 'usuarios') {
        validarCambioUsuario(o.usuarios, r, sesion.usuarioId);
        r.id ||= 'u-' + crypto.randomUUID();
        const usuario: UsuarioInterno = { id: r.id, nombre: r.nombre, correo: r.correo!.trim().toLowerCase(), rol: r.rol as RolAdmin, estado: r.estado as EstadoActivo, creadoEl: o.usuarios.find(u => u.id === r.id)?.creadoEl ?? new Date().toISOString() };
        this.operacion.actualizar({ ...o, usuarios: this.reemplazar(o.usuarios, usuario) });
        this.auth.actualizarPerfil(usuario.id, usuario.nombre, usuario.correo);
      } else if (seccion === 'paquetes') {
        const destino = c.destinos.find(d => d.id === r.destinoId);
        if (!destino) throw new Error('Selecciona un destino existente.');
        if (!['Publicado', 'Borrador', 'Archivado'].includes(r.estado)) throw new Error('Selecciona un estado válido.');
        if (r.estado === 'Publicado' && destino.estado !== 'Activo') throw new Error('Activa el destino antes de publicar este paquete.');
        const dias = Number(r.dias);
        if (!Number.isInteger(dias) || dias < 1 || dias > 60) throw new Error('La duración debe ser un número entero entre 1 y 60 días.');
        const precio = validarImporte(r.precio);
        if (!['Cultura', 'Aventura', 'Naturaleza'].includes(r.categoria ?? '')) throw new Error('Selecciona una categoría válida.');
        if (!r.descripcion || !r.itinerario?.trim()) throw new Error('Completa la descripción y el itinerario.');
        if (!['/images/cusco.jpg', '/images/ica.jpg', '/images/arequipa.jpg', '/images/amazonia.jpg'].includes(r.imagen ?? '')) throw new Error('Selecciona una fotografía del prototipo.');
        const anterior = c.paquetes.find(p => p.id === r.id);
        r.id ||= 'p-' + crypto.randomUUID();
        const diferencia = precio - (anterior?.precioDesdeCentimos ?? precio);
        const itinerario = r.itinerario.split('\n').map(linea => linea.trim()).filter(Boolean).map((linea, index) => { const corte = linea.indexOf(':'); return { titulo: corte > 0 ? linea.slice(0, corte) : `Día ${index + 1}`, descripcion: corte > 0 ? linea.slice(corte + 1).trim() : linea }; });
        const salidas = anterior ? anterior.salidas.map(s => ({ ...s, precioCentimos: Math.max(0, s.precioCentimos + diferencia) })) : crearPaquetes()[0].salidas.map((s, index) => ({ ...s, id: `${r.id}-${index}`, precioCentimos: precio + (index === 2 ? 5000 : 0) }));
        const paquete: PaqueteGestion = { id: r.id, slug: anterior?.slug ?? r.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + r.id.slice(-6), titulo: r.nombre, descripcion: r.descripcion, destinoId: destino.id, destino: destino.nombre, categoria: r.categoria as Categoria, dias, precioDesdeCentimos: precio, imagen: r.imagen!, itinerario, salidas, estado: r.estado as EstadoPaquete, destacado: anterior?.destacado ?? 'Una nueva historia por descubrir', incluidos: anterior?.incluidos ?? ['Guía local de prueba', 'Actividades del itinerario'] };
        this.catalogo.actualizar({ ...c, paquetes: this.reemplazar(c.paquetes, paquete) });
      } else if (seccion === 'destinos') {
        validarActivo(r.estado);
        if (!r.region?.trim() || !r.descripcion) throw new Error('Completa la región y la descripción.');
        if (!['/images/cusco.jpg', '/images/ica.jpg', '/images/arequipa.jpg', '/images/amazonia.jpg'].includes(r.imagen ?? '')) throw new Error('Selecciona una fotografía del prototipo.');
        if (r.estado === 'Inactivo' && c.paquetes.some(p => p.destinoId === r.id && p.estado === 'Publicado')) throw new Error('Este destino tiene paquetes publicados. Archívalos o cambia su destino antes de desactivarlo.');
        r.id ||= 'd-' + crypto.randomUUID();
        const destino = { id: r.id, nombre: r.nombre, region: r.region.trim(), imagen: r.imagen!, descripcion: r.descripcion, estado: r.estado };
        this.catalogo.actualizar({ destinos: this.reemplazar(c.destinos, destino), paquetes: c.paquetes.map(p => p.destinoId === r.id ? { ...p, destino: r.nombre } : p) });
      } else {
        validarActivo(r.estado);
        if (seccion === 'servicios') {
          const proveedor = o.proveedores.find(p => p.id === r.proveedorId);
          if (!proveedor) throw new Error('Selecciona un proveedor existente.');
          if (r.estado === 'Activo' && proveedor.estado !== 'Activo') throw new Error('El proveedor debe estar activo para ofrecer este servicio.');
          validarImporte(r.precio);
          if (!['Guiado', 'Transporte', 'Alojamiento', 'Actividad'].includes(r.tipo ?? '')) throw new Error('Selecciona un tipo de servicio válido.');
        } else {
          validarCorreo(r.correo);
          if (!r.contacto?.trim() || !r.ciudad?.trim()) throw new Error('Completa el contacto y la ciudad.');
          if (!['Operador turístico', 'Transporte', 'Alojamiento'].includes(r.tipo ?? '')) throw new Error('Selecciona un tipo de proveedor válido.');
          if (r.estado === 'Inactivo' && o.servicios.some(s => s.proveedorId === r.id && s.estado === 'Activo')) throw new Error('Desactiva primero los servicios activos de este proveedor.');
        }
        r.id ||= (seccion === 'servicios' ? 's-' : 'pr-') + crypto.randomUUID();
        this.operacion.actualizar({ ...o, [seccion]: this.reemplazar(o[seccion], r) });
      }
      return of(r);
    }).pipe(delay(250));
  }
  private reemplazar<T extends { id: string }>(lista: T[], registro: T): T[] { return lista.some(r => r.id === registro.id) ? lista.map(r => r.id === registro.id ? registro : r) : [registro, ...lista]; }
}
