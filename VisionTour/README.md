# VivaPeru

Frontend de demostración para explorar paquetes turísticos peruanos. Angular 21, Bootstrap 5, CSS propio y SweetAlert2, con el sistema visual VivaPeru.

## Ejecutar

Requiere una versión de Node compatible con Angular 21: `^20.19.0`, `^22.12.0` o `^24.0.0`.

```sh
npm ci
npm start
```

Abrir http://127.0.0.1:4200. En PowerShell, si las políticas impiden ejecutar `npm.ps1`, usar `npm.cmd`.

```sh
npm run build
npm test
```

El resultado de producción queda en `dist/vivaperu/browser`. El hosting de una SPA debe dirigir las rutas de aplicación a `index.html` y servir normalmente los archivos estáticos.

## Incluido en esta entrega

- Inicio responsive, navegación móvil y pie de página.
- Buscador por destino, fecha opcional y cantidad de viajeros.
- Destinos, catálogo, categorías, presupuesto, duración y orden por precio.
- Favoritos en memoria durante la navegación; se reinician al recargar.
- Detalle, itinerario, incluidos y consulta de salidas e importe de prueba.
- Estados de carga, vacío, error, paquete desconocido y página 404.
- Contrato de repositorio inyectable con implementación mock; componentes sin dependencia de archivos de datos.
- Fuente, iconos y fotografías servidos localmente.

Las fechas de ejemplo se generan a 21, 28 y 42 días de la fecha de apertura de la aplicación. La segunda salida aparece agotada para comprobar ese estado. Los paquetes tienen ocho cupos en las otras dos salidas. El filtro de fecha es exacto; dejarlo vacío permite explorar todas las salidas disponibles.

La consulta de viaje muestra un resumen en SweetAlert2. Los formularios de reserva y los pagos simulados pertenecen a la siguiente entrega; todavía no se crean reservas ni se procesan pagos.

## Destinos para visitantes

Los destinos del inicio y `/destinos` se consultan desde `GET /api/public/destinos`, sin requerir sesión. Las tarjetas muestran los datos activos del backend y abren `/destinos/{idDestino}`; el detalle usa `GET /api/public/destinos/{idDestino}` y muestra nombre, ubicación, subtítulo, descripción e imagen. Una imagen ausente o que no carga tiene una alternativa visual. Listado e inicio muestran carga, vacío, error y reintento; el detalle distingue los destinos inexistentes o inactivos mediante el `404` del backend. Cada entrada o reconsulta vuelve a pedir los datos, sin caché global del catálogo público.

Estas consultas omiten `Authorization`, incluso si hay una sesión abierta. Un error público no intenta renovar ni invalidar la sesión. La API pública no admite filtros ni paginación: se muestran los destinos recibidos. El detalle permite volver a Destinos o ver todas las experiencias, sin enviar su ID real al filtro de paquetes ficticios.

## Login y panel administrativo

Abrir `/admin/login`, o usar **Acceso administrativo** en el pie del sitio público.

El acceso utiliza la autenticación real de `backend de VivaPeru`. Ingresa con una cuenta existente de rol `ADMIN` o `EMPLEADO`; las cuentas ficticias del prototipo ya no permiten iniciar sesión. `CLIENTE` no tiene acceso administrativo.

El encabezado público enlaza a `/iniciar-sesion` y `/registrarse`. El registro solicita nombres, apellidos, usuario, teléfono, correo y contraseña; usa `POST /api/auth/registro` y el backend asigna `CLIENTE`. Después del registro se muestra el login para ingresar con la nueva cuenta. Los clientes regresan al inicio y pueden cerrar sesión desde el encabezado. Se muestran validaciones, errores de acceso y correo o usuario duplicado.

El panel contiene exactamente cinco opciones de navegación, en este orden: **Usuarios, Paquetes, Destinos, Servicios y Proveedores**. `ADMIN` se muestra como Administrador y `EMPLEADO` como Operador.

Al presionar el usuario de la cabecera aparece un menú con **Mi perfil** y, debajo, **Cerrar sesión**. Mi perfil abre el modal sobre la sección actual del panel. Consulta la cuenta real mediante `GET /api/usuarios/me`. En Mi perfil aparecen, en orden, nombres, apellidos, usuario, teléfono y correo (solo lectura). Se actualizan los cuatro primeros con `PATCH /api/usuarios/me`; el teléfono usa la propiedad `celular` del backend. Al guardar, el nombre de la cabecera se actualiza; el formulario incluye validación, confirmación de descarte al cerrar y estados de carga, error y éxito.

Debajo de **Mi cuenta**, las pestañas **Mi perfil**, **Contraseña** y **Correo** cambian el contenido del mismo modal. Contraseña solicita la clave actual, la nueva y su confirmación, y envía únicamente `passwordActual` y `passwordNueva` a `PUT /api/usuarios/me/password`. Valida coincidencia, mínimo de 8 caracteres y máximo de 72 bytes UTF-8. Correo envía únicamente `email` y `passwordActual` a `PATCH /api/usuarios/me`; al guardar actualiza el correo de la sesión y el campo de solo lectura. Se distinguen los errores de datos duplicados, contraseña incorrecta, reutilizada y límite de intentos. Las claves se limpian al guardar o cerrar y las sesiones existentes se mantienen según el contrato del backend.

En el sitio público, presionar el nombre del usuario en la cabecera abre el mismo menú con Mi perfil y Cerrar sesión. El menú, el modal y el acceso a la API se comparten con el panel administrativo. Al guardar los nombres, el saludo de la cabecera también se actualiza. El menú se cierra al pulsar fuera, al salir con Tab o al presionar Escape.

Usuarios utiliza el backend real y requiere `ADMIN`: lista con `GET /api/usuarios`, consulta el detalle en un modal con `GET /api/usuarios/{id}` y cambia el estado con `PATCH /api/usuarios/{id}/estado` enviando solo `{ activo }`. La búsqueda por nombre, apellido o correo, el filtro de activos/inactivos y la paginación se ejecutan en el servidor; se conservan en la URL. Antes de activar o desactivar se pide confirmación y después se vuelve a consultar la lista. No se permite desactivar la cuenta propia.

**Nuevo usuario** abre un modal con un único formulario: nombre, apellido, usuario, teléfono, correo, rol y contraseña inicial. Envía los siete campos del contrato a `POST /api/usuarios`. Permite crear administradores, clientes y empleados; el backend asigna el estado activo. Al recibir 201 se cierra el modal, se limpia la contraseña y se actualiza la lista conservando los filtros. La sesión del administrador no cambia. Los errores conservan el formulario para corregirlo; al cancelar con cambios se confirma el descarte.

El botón del lápiz abre **Editar usuario**, con las pestañas **Datos** y **Rol**. Datos actualiza nombre, apellido, usuario y teléfono con `PUT /api/usuarios/{id}`; envía `nombre`, `apellido`, `usuario`, `celular` y el `correo` actual, que permanece de solo lectura junto con el rol. Rol ofrece Administrador, Cliente y Empleado y envía únicamente `{ rol }` a `PATCH /api/usuarios/{id}/rol`. Cada pestaña guarda de forma independiente, conserva el borrador pendiente de la otra y recarga la tabla tras guardar. Si se editan los datos propios, también se actualiza el nombre de la cabecera. Se bloquean envíos duplicados y el cierre mientras se guarda; los errores conservan los cambios pendientes. El administrador no puede quitarse su propio rol, y se muestran los conflictos del backend por datos duplicados o por retirar al último administrador activo. Al cerrar con cambios sin guardar se confirma su descarte.

Servicios utiliza la API real `/api/admin/servicios` y requiere `ADMIN`, también para consultar. Permite listar, buscar por nombre, filtrar activos o inactivos, consultar el detalle, crear, editar y cambiar el estado. Nombre es obligatorio (máximo 100 caracteres) y descripción es opcional (máximo 255); el backend asigna el ID y crea el servicio activo. Crear y editar envían solo nombre y descripción; activar o desactivar usa `PATCH /api/admin/servicios/{id}/estado` con `{ estado }`. El formulario conserva los datos ante errores y confirma el descarte de cambios pendientes al cerrar o navegar.

La búsqueda y el estado de Servicios se filtran en el servidor. La API entrega un arreglo sin paginación: el orden por nombre y las páginas de seis filas se resuelven localmente. Los filtros, el orden y la página se conservan en la URL. Después de guardar se vuelve a consultar el listado y se ajusta la página si es necesario. El interceptor reutiliza el JWT y la renovación de sesión existentes.

Destinos utiliza `/api/admin/destinos` y requiere `ADMIN` para listar, consultar, crear, editar y activar o desactivar. Su formulario comparte creación y edición: nombre (máximo 100), ubicación (máximo 150), subtítulo (máximo 100) y descripción son obligatorios; URL de imagen es opcional (máximo 500). No se aceptan campos obligatorios con solo espacios. El backend crea el destino activo y comprueba la unicidad de nombre y ubicación, también entre inactivos. La imagen se registra como texto, sin subida de archivos; dejarla vacía la elimina y se muestra una alternativa cuando falta o no carga.

Destinos conserva el patrón de Servicios: filtros por nombre y estado en servidor, orden y páginas locales de seis filas, parámetros en la URL y recarga después de guardar. Crear y editar envían únicamente los cinco campos del formulario; el estado se cambia por separado con `PATCH /api/admin/destinos/{id}/estado` y `{ estado }`. El modal consulta el detalle actualizado antes de editar, conserva los datos ante errores y confirma el descarte de cambios pendientes. No se muestran tarjetas de cantidades ni un conteo de paquetes basado en mocks.

Proveedores utiliza `/api/admin/proveedores` y requiere `ADMIN` para todas sus operaciones. Lista y busca por nombre, filtra por estado y pagina en el servidor con diez registros por página; conserva los filtros y la página en la URL. Respeta el orden por nombre e ID de la API y utiliza sus totales, sin calcular indicadores globales sobre una página. El listado muestra nombre, encargado, correo opcional, teléfono y estado. El detalle agrega RUC y servicios asociados.

Un único modal permite crear, consultar y editar proveedores. Crear y editar separan Datos del proveedor y Servicios en pestañas con navegación por teclado. Siguiente valida los datos y Anterior permite revisarlos sin perder la selección; cambiar de pestaña no guarda. Solo el botón final envía una solicitud con los datos y todos los servicios seleccionados. Los errores de campos abren la pestaña correspondiente y cancelar confirma el descarte del formulario completo. Valida RUC de once dígitos, nombre y encargado obligatorios de hasta 150 caracteres, teléfono obligatorio de hasta 20 y correo opcional de hasta 150. Crear y editar envían esos campos y `serviciosIds`; el estado se cambia por separado con `PATCH /api/admin/proveedores/{id}/estado`. Para editar se cargan el detalle y el catálogo real mediante `ServiciosRepository`: se ofrecen servicios activos y se conservan las asociaciones inactivas existentes. El `PUT` reemplaza la selección completa; retirar un servicio inactivo y guardar impide volver a agregarlo mientras continúe inactivo. Los conflictos conservan el borrador y recargan el catálogo sin descartar selecciones automáticamente. Se bloquean envíos duplicados y se confirma el descarte de cambios pendientes al cerrar o navegar.

Paquetes conserva su tabla de prueba. Los paquetes destacados del inicio, el buscador, los filtros del catálogo de paquetes y las opciones del editor de Paquetes siguen usando `CatalogoMockStore`. Esos destinos ficticios no se mezclan con los IDs numéricos del backend. Los cambios administrativos de Destinos se reflejan al abrir o reconsultar el catálogo público real, sin alterar los paquetes mock ni sus comprobaciones. Conectar los paquetes con los destinos reales queda pendiente de su contrato API.

Los servicios y proveedores ficticios permanecen aislados en el mock histórico y sus pruebas; la pantalla de Proveedores ya no utiliza esa fuente. La asociación real se gestiona desde Proveedores mediante IDs de Servicios, sin añadir proveedor, tipo ni tarifa al contrato de Servicios. El operador solo puede consultar Paquetes; no puede acceder a Usuarios, Servicios, Destinos ni Proveedores ni modificar registros.

Los registros de prueba se mantienen en memoria al navegar y se restablecen al recargar. Los cambios de Usuarios, Servicios, Destinos y Proveedores administrativos se guardan en el backend. El JWT de acceso se conserva solo en memoria y el backend gestiona la cookie de renovación HttpOnly. Al recargar se intenta recuperar la sesión mediante `/api/auth/refresh`. No se guardan contraseñas ni JWT en localStorage o sessionStorage.

Para desarrollo, `npm start` usa `proxy.conf.json` para enviar `/api/**` a `http://localhost:8085`, conservando el mismo origen para cookies y CSRF. Reinicia el servidor Angular si ya estaba iniciado antes de añadir el proxy. El backend debe permitir cookies en el entorno local HTTP (`AUTH_COOKIE_SECURE=false` según su documentación). En producción se necesita HTTPS y un proxy equivalente para `/api`.

La renovación se coordina con Web Locks entre pestañas del mismo origen; usar un navegador actualizado en HTTPS o localhost. Los mocks de autenticación se mantienen únicamente para pruebas automatizadas.

## Dependencias de desarrollo

La auditoría inicial de npm informa 16 avisos moderados en la cadena de dependencias de Angular CLI (`glob` y `minimatch` y sus dependientes). Afectan herramientas de desarrollo; el informe no marca dependencias de producción. La corrección automática propuesta cambia de versión mayor de Angular CLI, por lo que no se aplica `npm audit fix --force`. Revisar esta cadena al actualizar las herramientas.

## Documentación

- [Arquitectura](docs/arquitectura-frontend.md)
- [Diseño visual](docs/diseno-frontend.md)
- [Referencia de diseño original](docs/sistema-diseno-referencia.md)
- [Flujos previstos](docs/flujos-usuario.md)
- [Login y estructura administrativa propuestos](docs/panel-administrativo.md)
- [Autenticación real con el backend](docs/autenticacion-frontend.md)
- [Fuentes de fotografías](docs/recursos-visuales.md)

## Integración futura

Implementar `PaquetesRepository` con HttpClient y cambiar su proveedor en `app.config.ts`. Mantener los modelos de interfaz y adaptar las respuestas del backend en el repositorio HTTP. Reserva y pagos tendrán contratos independientes, como se detalla en los flujos.
