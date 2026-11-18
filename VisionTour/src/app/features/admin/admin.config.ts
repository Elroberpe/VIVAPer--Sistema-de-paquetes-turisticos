import { ConfigSeccion, OpcionCampo } from './models/admin';

function opciones(...valores: string[]): OpcionCampo[] { return valores.map(valor => ({ valor, etiqueta: valor })); }
const imagenes = [
  { valor: '/images/cusco.jpg', etiqueta: 'Montañas de Cusco' }, { valor: '/images/ica.jpg', etiqueta: 'Oasis de Huacachina' },
  { valor: '/images/arequipa.jpg', etiqueta: 'Ciudad de Arequipa' }, { valor: '/images/amazonia.jpg', etiqueta: 'Amazonía peruana' }
];
const estado = { clave: 'estado', etiqueta: 'Estado', tipo: 'select', requerido: true, opciones: opciones('Activo', 'Inactivo') } as const;

export const SECCIONES_ADMIN: ConfigSeccion[] = [
  { id: 'usuarios', titulo: 'Usuarios', singular: 'usuario', nuevo: 'Nuevo usuario', icono: 'bi-people', grupo: 'EQUIPO Y ACCESOS', descripcion: 'Un gran viaje empieza con un gran equipo. Gestiona quiénes forman parte de VivaPeru.', estados: ['Activo', 'Inactivo'], campos: [
    { clave: 'nombre', etiqueta: 'Nombre completo', tipo: 'text', requerido: true, ancho: true },
    { clave: 'correo', etiqueta: 'Correo electrónico', tipo: 'email', requerido: true, ancho: true },
    { clave: 'rol', etiqueta: 'Rol de acceso', tipo: 'select', requerido: true, opciones: opciones('Operador', 'Administrador') }, estado
  ] },
  { id: 'paquetes', titulo: 'Paquetes', singular: 'paquete', nuevo: 'Nuevo paquete', icono: 'bi-suitcase-lg', grupo: 'EXPERIENCIAS QUE CONECTAN', descripcion: 'Da forma a nuevas historias. Organiza las experiencias que los viajeros descubrirán en el Perú.', estados: ['Publicado', 'Borrador', 'Archivado'], campos: [
    { clave: 'nombre', etiqueta: 'Nombre de la experiencia', tipo: 'text', requerido: true, ancho: true },
    { clave: 'destinoId', etiqueta: 'Destino', tipo: 'select', requerido: true, origen: 'destinos' },
    { clave: 'categoria', etiqueta: 'Categoría', tipo: 'select', requerido: true, opciones: opciones('Cultura', 'Aventura', 'Naturaleza') },
    { clave: 'dias', etiqueta: 'Duración en días', tipo: 'number', requerido: true, min: 1 },
    { clave: 'precio', etiqueta: 'Tarifa base por persona (S/)', tipo: 'number', requerido: true, min: 0 },
    { clave: 'imagen', etiqueta: 'Fotografía de prueba', tipo: 'select', requerido: true, opciones: imagenes },
    { clave: 'estado', etiqueta: 'Estado del paquete', tipo: 'select', requerido: true, opciones: opciones('Borrador', 'Publicado', 'Archivado') },
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', requerido: true, ancho: true },
    { clave: 'itinerario', etiqueta: 'Itinerario', tipo: 'textarea', requerido: true, ancho: true, ayuda: 'Describe las actividades del viaje, una por línea.' }
  ] },
  { id: 'destinos', titulo: 'Destinos', singular: 'destino', nuevo: 'Nuevo destino', icono: 'bi-geo-alt', grupo: 'EL PERÚ POR DESCUBRIR', descripcion: 'Cada lugar tiene algo que contar. Cuida los destinos que inspiran el próximo viaje.', estados: ['Activo', 'Inactivo'], campos: [
    { clave: 'nombre', etiqueta: 'Nombre del destino', tipo: 'text', requerido: true },
    { clave: 'region', etiqueta: 'Región o frase de presentación', tipo: 'text', requerido: true },
    { clave: 'imagen', etiqueta: 'Fotografía de prueba', tipo: 'select', requerido: true, opciones: imagenes }, estado,
    { clave: 'descripcion', etiqueta: 'Descripción del destino', tipo: 'textarea', requerido: true, ancho: true }
  ] },
  { id: 'servicios', titulo: 'Servicios', singular: 'servicio', nuevo: 'Nuevo servicio', icono: 'bi-grid', grupo: 'LOS DETALLES HACEN EL VIAJE', descripcion: 'Alojamientos, traslados y actividades. Organiza lo que hace especial cada experiencia.', estados: ['Activo', 'Inactivo'], campos: [
    { clave: 'nombre', etiqueta: 'Nombre del servicio', tipo: 'text', requerido: true, ancho: true },
    { clave: 'tipo', etiqueta: 'Tipo de servicio', tipo: 'select', requerido: true, opciones: opciones('Guiado', 'Transporte', 'Alojamiento', 'Actividad') },
    { clave: 'proveedorId', etiqueta: 'Proveedor', tipo: 'select', requerido: true, origen: 'proveedores' },
    { clave: 'precio', etiqueta: 'Tarifa de prueba (S/)', tipo: 'number', requerido: true, min: 0 }, estado,
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', ancho: true }
  ] },
  { id: 'proveedores', titulo: 'Proveedores', singular: 'proveedor', nuevo: 'Nuevo proveedor', icono: 'bi-buildings', grupo: 'ALIADOS EN CADA DESTINO', descripcion: 'Conecta con quienes hacen posible cada experiencia. Gestiona tus aliados locales.', estados: ['Activo', 'Inactivo'], campos: [
    { clave: 'nombre', etiqueta: 'Nombre comercial', tipo: 'text', requerido: true, ancho: true },
    { clave: 'contacto', etiqueta: 'Persona de contacto', tipo: 'text', requerido: true },
    { clave: 'correo', etiqueta: 'Correo de contacto', tipo: 'email', requerido: true },
    { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'text' },
    { clave: 'ciudad', etiqueta: 'Ciudad', tipo: 'text', requerido: true },
    { clave: 'tipo', etiqueta: 'Tipo de proveedor', tipo: 'select', requerido: true, opciones: opciones('Operador turístico', 'Transporte', 'Alojamiento') }, estado,
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', ancho: true }
  ] }
];
