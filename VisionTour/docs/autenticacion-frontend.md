# Integración de autenticación con backend de VivaPeru

Esta integración reemplaza el login de demostración y respeta el contrato revisado en `../VisionTourBack/docs/AUTENTICACION.md` (ruta actual del repositorio backend). La administración real de usuarios sigue `../VisionTourBack/docs/ADMINISTRACION_USUARIOS.md`. No modifica el backend.

## Contrato implementado

- GET `/api/auth/csrf` antes de cada POST de autenticación.
- POST `/api/auth/login` con `{ email, password }`.
- POST `/api/auth/registro` con `{ nombre, apellido, usuario, celular, email, password }`. El backend asigna `CLIENTE`; el frontend no envía un rol. Al recibir 201 se muestra el acceso para iniciar sesión, sin autenticación automática.
- POST `/api/auth/refresh` para restaurar la sesión o renovar un JWT rechazado.
- POST `/api/auth/logout` para revocar la cookie de la sesión.
- Respuesta de login y refresh: `accessToken`, `tokenType`, `expiresIn` y `usuario`.
- Roles: `ADMIN` → Administrador, `EMPLEADO` → Operador, `CLIENTE` → sin acceso al panel.

El modal de cuenta se comparte entre personal y clientes. Consulta `GET /api/usuarios/me` y permite actualizar `nombre`, `apellido`, `usuario` y `celular` con PATCH; muestra el correo de solo lectura en Mi perfil. La pestaña Correo usa el mismo PATCH con `{ email, passwordActual }`. La respuesta actualiza el perfil visible y la sesión en memoria. Usuario admite de 3 a 30 letras, números, puntos, guiones o guiones bajos; teléfono admite de 9 a 15 dígitos con `+` opcional. Se envían usuario y correo en minúsculas y no se recortan las contraseñas.

El access token vive solo en memoria. El navegador administra el refresh HttpOnly; JavaScript no lo lee. Angular agrega `X-XSRF-TOKEN` desde la cookie actual `XSRF-TOKEN`. Las rutas de autenticación nunca reciben Authorization.

El interceptor agrega Bearer únicamente a peticiones relativas `/api/` fuera de `/api/auth/`. Ante 401 comparte la renovación entre peticiones concurrentes y reintenta cada petición original una vez. Si no puede recuperar la sesión o el reintento vuelve a recibir 401, limpia la sesión y dirige al login. Un 403 no renueva ni cierra la sesión.

Login, renovación y logout se serializan con un Web Lock del mismo origen para no consumir simultáneamente la cookie rotativa desde varias pestañas. Logout espera las operaciones anteriores y solo confirma la salida cuando responde el backend. No se añaden dependencias.

## Desarrollo local

1. Ejecutar el backend en su puerto configurado; el predeterminado es 8085.
2. Para HTTP local, configurar en el backend `AUTH_COOKIE_SECURE=false`, como indica su documentación. No se cambia esta configuración desde el frontend.
3. Ejecutar `npm start`. El proxy conserva Host y enruta `/api/**` hacia `http://localhost:8085`; no se necesita poner el host de la API en el código del login.
4. Abrir `/admin/login` e ingresar con una cuenta administrativa existente.

En producción se necesita HTTPS y un reverse proxy del mismo origen que dirija `/api` al backend. El proxy de Angular es únicamente de desarrollo.

## Alcance

La autenticación y la administración de Usuarios son reales. La página `/admin/usuarios` requiere rol ADMIN y usa un repositorio HTTP para listar con paginación, consultar el detalle y activar o desactivar cuentas. El listado acepta `page` desde cero, `size=10`, `buscar` de hasta 100 caracteres y `activo` opcional. El filtro inactivo incluye cuentas bloqueadas y pendientes, conforme al DTO booleano del backend. El cambio de estado envía exclusivamente `{ activo: boolean }`, requiere confirmación y bloquea la autodesactivación también en la interfaz. Los errores se muestran sin sustituir los datos por mocks.

La creación administrativa usa `POST /api/usuarios` con `{ nombre, apellido, usuario, celular, correo, password, rol }` y el Bearer existente. Es independiente de `/api/auth/registro`: permite elegir ADMIN, CLIENTE o EMPLEADO sin iniciar sesión como el nuevo usuario. El modal Nuevo usuario reutiliza las validaciones y los estilos actuales; el repositorio normaliza los datos personales y conserva los espacios de la contraseña. Una respuesta 201 limpia el formulario, cierra el modal y recarga el listado sin cambiar la sesión administradora.

El editor administrativo añade `PUT /api/usuarios/{id}` para los datos y `PATCH /api/usuarios/{id}/rol` para el rol. El PUT envía exclusivamente `nombre`, `apellido`, `usuario`, `correo` y `celular`; el correo se conserva de solo lectura en la interfaz y se incluye porque es obligatorio. El PATCH envía únicamente `rol` con `ADMIN`, `CLIENTE` o `EMPLEADO`. Ambas respuestas son `UsuarioDetalleResponse`: sincronizan el modal y provocan una nueva consulta del listado. Los datos y el rol se guardan por separado, conservando los borradores de la otra pestaña. La UI impide retirar el propio rol ADMIN; el backend sigue siendo la autoridad para esa regla y para proteger al último administrador activo. Se muestran los mensajes de negocio del HTTP 409 y no se renueva la sesión ante errores de validación o conflicto.

Paquetes, Destinos, Servicios y Proveedores siguen usando datos de prueba. Los fixtures y la contraseña ficticia de las pruebas no se usan en el proveedor de autenticación de la aplicación. Los mocks de usuarios y autenticación se conservan para las pruebas del prototipo.

El registro público está disponible en `/registrarse` y el acceso de clientes en `/iniciar-sesion`. Incluyen validación de campos, confirmación de contraseña y mensajes de error. El encabezado muestra el nombre y permite cerrar sesión. Los clientes ingresan al sitio público; el personal conserva su acceso administrativo. No se incorpora recuperación de contraseña. Las reglas de acceso del servidor siguen siendo la autoridad para los recursos reales.
