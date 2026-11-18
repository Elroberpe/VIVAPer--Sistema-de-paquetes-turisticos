# 2. Seguridad: cómo se protege cada solicitud

[Índice](../README.md) · [Anterior: autenticación](AUTENTICACION.md)

La **autenticación** responde «¿quién eres?». La **autorización** responde «¿puedes hacer esto?». Spring Security comprueba ambas antes de permitir el acceso al controlador.

## Qué rutas puedes usar

| Ruta | ¿Necesita JWT? | ¿Necesita CSRF? |
|---|---|---|
| `GET /api/auth/csrf` | No | No |
| `POST /api/auth/registro` | No | Sí |
| `POST /api/auth/login` | No | Sí |
| `POST /api/auth/refresh` | No; utiliza la cookie de refresh | Sí |
| `POST /api/auth/logout` | No; utiliza la cookie de refresh | Sí |
| `GET /api/usuarios/me` | Sí | No |
| `PATCH /api/usuarios/me` | Sí | No |
| `PUT /api/usuarios/me/password` | Sí | No |
| `GET /api/usuarios` | Sí, rol ADMIN | No |
| `POST /api/usuarios` | Sí, rol ADMIN | No |
| `GET /api/usuarios/{id}` | Sí, rol ADMIN | No |
| `PUT /api/usuarios/{id}` | Sí, rol ADMIN | No |
| `PATCH /api/usuarios/{id}/estado` | Sí, rol ADMIN | No |
| `PATCH /api/usuarios/{id}/rol` | Sí, rol ADMIN | No |
| `GET /api/prueba` | Sí | No |

La regla general de `SecurityConfig` permite las demás solicitudes solo a usuarios autenticados con alguno de los roles `ADMIN`, `EMPLEADO` o `CLIENTE`. Eso no crea endpoints nuevos: una ruta necesita además un controlador que la implemente.

Las rutas de perfil y prueba admiten los tres roles. La administración de usuarios está restringida a `ADMIN` en las reglas HTTP y mediante `@PreAuthorize` sobre cada método administrativo de `UsuarioController`. El servicio conserva las reglas de negocio, como impedir la autodesactivación, quitarse el propio rol ADMIN o retirar al último administrador activo. Consulta los [ejemplos de administración](ADMINISTRACION_USUARIOS.md). El registro público siempre crea clientes; solo un ADMIN puede crear cuentas con otros roles o cambiar roles mediante los endpoints administrativos.

## Cómo se comprueba un JWT

Un JWT es un token firmado. Su contenido puede leerse; la firma permite comprobar que no fue alterado. No debe contener contraseñas ni secretos.

En este proyecto incluye:

| Dato | Significado |
|---|---|
| `sub` | ID del usuario. |
| `rol` | Rol que tenía al emitir el token. |
| `iss` | Emisor esperado, configurado con `JWT_ISSUER`; por defecto `vivaPeru`. |
| `aud` | API destinataria, configurada con `JWT_AUDIENCE`; por defecto `vivaPeru-api`. |
| `iat` | Instante de emisión. |
| `exp` | Instante de vencimiento. |

`JwtConfig` exige firma HS256, encabezado de tipo `at+jwt`, fechas válidas, duración máxima de 15 minutos, ID con formato válido y un rol reconocido. También comprueba el emisor y la audiencia.

Después, `DatabaseJwtAuthenticationConverter` consulta MySQL. El usuario debe existir, estar `ACTIVO` y conservar el mismo rol del JWT. Bloquear o eliminar al usuario, o cambiar su rol, hace que el JWT anterior sea rechazado.

El backend usa `STATELESS`: no conserva una sesión HTTP de login en memoria. Sí consulta usuarios y conserva las sesiones de renovación en la base de datos.

## El secreto JWT

HS256 usa una clave secreta compartida para firmar y validar. `JWT_SECRET` debe contener Base64 estándar que, al decodificarse, tenga al menos 32 bytes aleatorios.

El [README](../README.md#configurar-la-firma-de-los-tokens) incluye el comando para generarla sin mostrarla en la terminal. Si despliegas varias instancias, deben utilizar el mismo secreto para aceptar los mismos JWT.

`application.properties` no incluye una contraseña de MySQL ni un secreto JWT predeterminados. Configura `DB_PASSWORD` y `JWT_SECRET` mediante variables de entorno o en `application-local.properties`, excluido de Git. `JwtConfig` rechaza claves vacías, Base64 inválido o claves demasiado cortas, de modo que el backend no inicia sin un secreto válido. Si despliegas el proyecto, genera un secreto propio para ese entorno.

Cambiar el secreto hace que los JWT firmados con la clave anterior dejen de validarse. Los refresh tokens utilizan otro mecanismo y no quedan revocados por ese cambio.

## Contraseñas y sesiones de renovación

Las contraseñas se guardan como hashes BCrypt. Durante el login, Spring Security compara la contraseña recibida con ese hash; no necesita recuperar la contraseña original.

El refresh es un valor aleatorio de 32 bytes, codificado en Base64 URL sin relleno. En `refresh_tokens` solo se guarda su hash SHA-256. Al renovar se reemplaza ese hash en la misma fila, bajo bloqueo de escritura, y se conserva el vencimiento original de 7 días.

El sistema no mantiene historial de refresh anteriores ni revoca familias al detectar reutilización. Un refresh reemplazado se rechaza; eso no revoca el actual. La columna `familia_id` existe por compatibilidad con la migración, sin reglas de familias implementadas. Tampoco hay limpieza automática de filas vencidas o revocadas.

## Por qué se utiliza CSRF

El navegador puede enviar cookies automáticamente. CSRF protege frente a solicitudes que otro sitio intente provocar usando esas cookies.

El backend entrega una cookie `XSRF-TOKEN` y exige su valor en `X-XSRF-TOKEN` para cada POST de autenticación. La protección está configurada para `POST /api/auth/**`; no depende de que el endpoint sea público o privado.

`vivaair_refresh` es `HttpOnly`; `XSRF-TOKEN` puede leerse desde JavaScript para construir el encabezado. Las operaciones de perfil utilizan Bearer y no exigen CSRF en la configuración actual.

## Qué hace CORS

Un origen es la combinación de protocolo, host y puerto. `http://localhost:4200` y `http://localhost:8085` son orígenes distintos.

`CORS_ALLOWED_ORIGINS` define qué orígenes pueden utilizar la API desde el navegador. Admite varios separados por comas y exige valores explícitos; no admite `*`. Por defecto la lista está vacía.

```properties
CORS_ALLOWED_ORIGINS=http://localhost:4200,http://localhost:5173
```

Se permiten credenciales y los encabezados `Authorization`, `Content-Type`, `Accept` y `X-XSRF-TOKEN`. Un origen rechazado recibe `403`. CORS no sustituye la autenticación ni los permisos.

Las cookies usan `SameSite=Lax`. Para el desarrollo local utiliza `localhost` en ambos lados, sin mezclarlo con `127.0.0.1`. Si frontend y API están en sitios distintos, permitir el origen en CORS no basta para que se envíe la cookie; ese despliegue requiere revisar la estrategia de cookies y CSRF.

## Límite de intentos

`LoginAttemptLimiter` limita login, cambio de correo y cambio de contraseña con contadores compartidos por correo e IP:

- Por correo: 5 intentos por defecto.
- Por IP: al menos 20; si el límite configurado por correo supera 20, se utiliza ese valor también para IP.
- Ventana: 15 minutos por defecto, desde el primer intento de cada contador.

Se cuentan también los intentos correctos que llegan al limitador. Superar el límite devuelve `429`. Puedes configurarlo con `AUTH_LOGIN_MAX_ATTEMPTS` y `AUTH_LOGIN_WINDOW`.

Los contadores están en memoria de cada instancia y se pierden al reiniciar. La IP utilizada es la dirección remota de la solicitud; no se toma de un campo enviado en el JSON.

## Cómo leer los errores

Los errores de seguridad y de la aplicación utilizan `ApiErrorResponse`:

```json
{
  "status": 401,
  "codigo": "NO_AUTENTICADO",
  "mensaje": "Es necesario autenticarse para acceder al recurso.",
  "timestamp": "2026-11-17T10:30:00",
  "errores": {}
}
```

La fecha es ilustrativa. `errores` puede contener mensajes por campo cuando falla la validación; no incluye los valores rechazados.

| HTTP | Código habitual | Qué revisar |
|---|---|---|
| 400 | `ERROR_VALIDACION` | Campos obligatorios y límites de longitud. |
| 400 | `JSON_INVALIDO` | Formato JSON y tipos; en perfil, también campos no permitidos. |
| 401 | `NO_AUTENTICADO` | Credenciales, JWT, refresh o estado del usuario. |
| 403 | `ACCESO_DENEGADO` | CSRF, origen CORS o permisos. |
| 409 | `CONFLICTO_DATOS` | Correo ya registrado o conflicto de integridad. |
| 429 | `ERROR_HTTP_429` | Límite de intentos. |
| 500 | `ERROR_INTERNO` | Error del servidor; consultar los logs del backend. |

`SecurityErrorHandler` responde los errores de seguridad y `GlobalExceptionHandler` centraliza los de la aplicación. Las respuestas no incluyen stack traces ni detalles técnicos internos.

Continúa con [3. Perfil](PERFIL.md).
