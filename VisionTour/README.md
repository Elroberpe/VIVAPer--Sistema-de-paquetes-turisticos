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

Paquetes, Destinos, Servicios y Proveedores conservan las tablas de prueba con búsqueda, filtros, orden, paginación, formularios y validaciones. Paquetes y destinos comparten datos de prueba con el catálogo público; Servicios se vincula con Proveedores. El operador no puede gestionar usuarios ni modificar registros.

Los registros de prueba se mantienen en memoria al navegar y se restablecen al recargar. Los cambios de estado de usuarios se guardan en el backend. El JWT de acceso se conserva solo en memoria y el backend gestiona la cookie de renovación HttpOnly. Al recargar se intenta recuperar la sesión mediante `/api/auth/refresh`. No se guardan contraseñas ni JWT en localStorage o sessionStorage.

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
