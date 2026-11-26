# Login y panel administrativo

Estado: panel con datos de prueba y autenticación conectada a backend de VivaPeru. El apartado de login simulado descrito más abajo es histórico y queda sustituido por [autenticacion-frontend.md](autenticacion-frontend.md): se ingresa con cuentas reales ADMIN o EMPLEADO, sin credenciales de demostración en la pantalla.

Servicios está conectado al backend y requiere ADMIN para todas sus operaciones. La pantalla maneja únicamente nombre, descripción opcional y estado; permite consultar, crear, editar y activar o desactivar. El listado se filtra en servidor por nombre y estado; orden y paginación se resuelven sobre el arreglo recibido. Sus indicadores describen los resultados filtrados. Usuarios y Servicios guardan en el backend; Paquetes, Destinos y Proveedores mantienen datos de prueba. Las referencias a servicios con proveedor o tarifa de este documento describen únicamente el mock histórico, que sigue aislado de la API real.

## Menú vigente

La barra lateral contiene exactamente estas cinco opciones, en este orden:

1. Usuarios.
2. Paquetes.
3. Destinos.
4. Servicios.
5. Proveedores.

El panel abre en **Usuarios**. No se incluyen opciones de Resumen, Salidas, Reservas, Pagos, Clientes ni Configuración en el menú actual.

## Identidad visual

Se utiliza VivaPeru: azul océano, terracota, fondos claros, tarjetas blancas, radios suaves y Plus Jakarta Sans. La barra lateral es azul oscuro; la barra superior y las tablas tienen superficies blancas. Se reutilizan Bootstrap, los tokens CSS del proyecto y SweetAlert2.

En móvil la navegación se abre desde el botón de menú. Las tablas se desplazan horizontalmente dentro de su contenedor. Los formularios utilizan un diálogo nativo con foco modal y se apilan en una columna.

## Separación de layouts

- `PublicLayout`: navegación, contenido y pie del sitio de turismo.
- `AuthLayout`: login del personal, con composición de fotografía y formulario.
- `AdminLayout`: barra lateral, barra superior, contenido administrativo y aviso de demostración.

`app.html` contiene el outlet raíz. Los layouts se montan por rutas, de modo que la cabecera y el pie públicos no aparecen dentro del panel. El enlace al login se encuentra en el pie público; el regreso al sitio y el cierre de sesión están en la barra superior administrativa.

## Secciones y funciones

| Sección | Contenido | Acciones de prueba |
| --- | --- | --- |
| Usuarios | Personal interno, correo, rol y estado. | Buscar, filtrar, consultar, crear y editar. |
| Paquetes | Experiencias, destino, categoría, duración, tarifa, descripción e itinerario. | Crear, editar y cambiar entre borrador, publicado y archivado. |
| Destinos | Nombre, presentación, descripción, fotografía y estado. | Crear y editar; comprobar dependencias antes de desactivar. |
| Servicios | Nombre, descripción opcional y estado, guardados en el backend. | Consultar, crear, editar y activar o desactivar (ADMIN). |
| Proveedores | Nombre comercial, contacto, correo, teléfono, ciudad y tipo. | Crear y editar; comprobar servicios activos antes de desactivar. |

Las tablas ofrecen búsqueda de texto, filtros por estado, orden, filtros adicionales cuando aplican y paginación de seis filas. Las tarjetas de indicadores reflejan el conjunto de registros de cada sección. Los filtros de tabla se conservan en parámetros de consulta.

El mock de Proveedores conserva servicios ficticios vinculados para sus comprobaciones internas, sin mezclarlos con Servicios de la API. La composición de paquetes mediante selección de servicios será una ampliación posterior; los incluidos de las experiencias existentes conservan sus datos de ejemplo.

## Login y sesión

Ruta: `/admin/login`.

- Correo de administrador de prueba: `admin@vivaperu.test`.
- Contraseña ficticia: `VivaPeru2026!`.
- El botón **Usar credenciales de prueba** completa el formulario sin enviarlo automáticamente.
- Se validan los campos y se ofrece mostrar u ocultar la contraseña.
- Las cuentas inactivas y las contraseñas incorrectas muestran el mismo mensaje de acceso no válido.
- Tras ingresar se abre la sección solicitada si es una ruta interna permitida; en otro caso, Usuarios para administradores o Paquetes para operadores.
- La sesión ficticia conserva únicamente el ID y la vigencia en sessionStorage. El usuario y su rol se recuperan de la fuente mock; no se guarda la contraseña.
- Vigencia de prueba: dos horas. Cerrar sesión elimina la identidad almacenada y redirige al login.
- La cuenta de operador `valeria@vivaperu.test` usa la misma contraseña ficticia para comprobar permisos.

La autenticación actual es una simulación de frontend. La integración real requerirá sesión y autorización del backend. Los guards de Angular organizan la navegación; no constituyen una barrera de seguridad del servidor.

## Roles

| Área | Administrador | Operador |
| --- | --- | --- |
| Usuarios y Servicios | Consultar, crear y editar. | Acceso denegado. |
| Paquetes, Destinos y Proveedores | Consultar, crear y editar. | Solo consultar. |

El menú mantiene las cinco opciones solicitadas; la ruta Usuarios comprueba el permiso al entrar. Un usuario sin ese permiso ve una pantalla de acceso restringido. Los nuevos usuarios reciben por defecto el rol Operador.

## Reglas de consistencia

- No se permite duplicar correos de usuarios.
- El administrador no puede desactivar su cuenta ni retirar su propio rol durante la sesión.
- Debe mantenerse al menos un administrador activo.
- Un paquete publicado necesita un destino activo y datos válidos.
- Un borrador o un paquete archivado no aparecen en la exploración pública.
- Editar un paquete publicado pide confirmar la actualización del catálogo.
- No se desactiva un destino mientras tenga paquetes publicados.
- No se desactiva un proveedor mientras tenga servicios activos.
- En el mock histórico, un servicio activo requiere un proveedor activo y una tarifa válida. Esta regla no se aplica a la API actual de Servicios.
- No se realizan borrados permanentes desde esta entrega.
- Un formulario con cambios sin guardar permite volver al editor o confirmar el descarte, conservando los datos mientras se revisa la decisión.

## Datos y arquitectura

Los componentes dependen de contratos de repositorio inyectados. Las implementaciones mock podrán sustituirse por implementaciones HTTP.

- `core/auth`: sesión, rutas protegidas y control de regreso al panel.
- `features/auth`: login, modelo de sesión y contrato de autenticación.
- `features/admin`: configuración de las cinco secciones, modelos, tablas, formularios y repositorio administrativo.
- `features/admin/pages/servicios`: página específica; usa `ServiciosRepository` → `ServiciosApiRepository` y un único modal para crear, editar y consultar. Reutiliza estilos, alertas y sesión del panel. Los errores conservan el formulario y los cambios pendientes requieren confirmación de descarte al cerrar o navegar.
- `shared/catalogo`: modelos, fixtures y estado compartido por el sitio público y la gestión de paquetes y destinos.
- `AdminMockStore`: usuarios, servicios y proveedores ficticios.

Paquetes y destinos se actualizan en una única fuente mock. Al usar **Ver sitio web** durante la misma ejecución, el catálogo público refleja los cambios publicados. Recargar restablece los registros iniciales; esta limitación está indicada en la interfaz. Si una cuenta creada durante la sesión desaparece al recargar los fixtures, su sesión deja de ser válida.

## Rutas

| Ruta | Función |
| --- | --- |
| `/admin/login` | Acceso del personal. |
| `/admin` | Redirección a Usuarios tras comprobar sesión. |
| `/admin/usuarios` | Gestión del equipo. |
| `/admin/paquetes` | Gestión de experiencias. |
| `/admin/destinos` | Gestión de destinos. |
| `/admin/servicios` | Gestión de servicios. |
| `/admin/proveedores` | Gestión de aliados. |
| `/admin/acceso-denegado` | Sesión válida sin permiso para una sección. |
| Ruta desconocida bajo `/admin` | Estado 404 administrativo. |

Los formularios y la consulta de detalle se abren en diálogos dentro de su sección. El grupo administrativo comprueba sesión, aplica permisos y carga sus rutas de forma diferida.

## Continuidad del proyecto

Los flujos públicos de reserva y pago siguen definidos en [flujos-usuario.md](flujos-usuario.md) para una etapa posterior. Este panel no crea reservas, no procesa cobros y no se conecta a servicios externos de autenticación.
