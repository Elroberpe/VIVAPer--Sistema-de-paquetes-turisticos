# 3. Perfil: consultar y cambiar tus datos

[Índice](../README.md) · [Anterior: seguridad](SEGURIDAD.md)

Estas rutas actúan sobre el usuario que inició sesión. `me` significa «yo»: el backend obtiene tu ID del JWT validado y no pide que envíes un ID en el cuerpo.

Necesitas un access token válido y una cuenta activa. Los roles `CLIENTE`, `EMPLEADO` y `ADMIN` pueden gestionar su propio perfil.

En todas las solicitudes envía:

```http
Authorization: Bearer <accessToken>
```

Para PATCH y PUT añade `Content-Type: application/json`. Estas rutas no necesitan cookie de refresh ni encabezado CSRF.

## Consultar tus datos

```http
GET /api/usuarios/me
```

Respuesta `200 OK`, con datos de ejemplo:

```json
{
  "id": 1,
  "nombre": "Ana",
  "apellido": "Pérez",
  "usuario": "ana.perez",
  "celular": "+51999888777",
  "email": "ana@example.com",
  "rol": "CLIENTE"
}
```

La respuesta es `UsuarioResponse`. No expone la contraseña, su hash ni el estado interno de la cuenta.

## Editar tus datos

```http
PATCH /api/usuarios/me
```

Envía únicamente lo que quieras cambiar. Por ejemplo, para editar el usuario y el celular:

```json
{
  "usuario": "ana.perez",
  "celular": "+51999888777"
}
```

Los campos que omitas conservan su valor. Debes enviar al menos uno de estos datos:

| Campo | Regla |
|---|---|
| `nombre` | Entre 1 y 100 caracteres. |
| `apellido` | Entre 1 y 100 caracteres. |
| `usuario` | Entre 3 y 30 caracteres: letras de la a a la z, números, punto, guion o guion bajo. Debe estar disponible. |
| `celular` | Entre 9 y 15 dígitos; puede comenzar con `+`. Se envía como texto. |
| `email` | Correo válido, máximo 150 caracteres. Debe estar disponible y requiere `passwordActual`. |

Se eliminan espacios exteriores y se guardan `usuario` y `email` en minúsculas. Los datos enviados deben ser texto y no pueden ser `null`, vacíos ni solo espacios. No se aceptan campos adicionales como `id`, `rol`, `estado` o `password`.

Puedes conservar tu propio usuario o correo: no se consideran duplicados. Si algún dato falla, no se guarda ninguno de los cambios de esa solicitud.

Devuelve `200 OK` con los siete campos de la consulta, ya actualizados.

## Cambiar el correo

Usa el mismo endpoint y acompaña el correo con tu contraseña actual:

```json
{
  "email": "ana.nuevo@example.com",
  "passwordActual": "EjemploAna123!"
}
```

Siempre que envíes `email`, debes enviar `passwordActual`, incluso si conservas el mismo correo. La contraseña se comprueba antes de actualizar y sus espacios se conservan. También puedes incluir nombre, apellido, usuario y celular en esta solicitud.

El siguiente inicio de sesión se realiza con el correo actualizado y la misma contraseña. Las sesiones existentes siguen siendo válidas; al consultar el perfil o renovar la sesión recibirás el correo nuevo. El nombre de usuario es un dato del perfil: el login utiliza el correo.

El cambio es inmediato y no envía un correo de verificación. La comprobación de contraseña comparte el límite de intentos del login y del cambio de contraseña.

## Cambiar la contraseña

```http
PUT /api/usuarios/me/password
```

```json
{
  "passwordActual": "EjemploAna123!",
  "passwordNueva": "OtraClaveAna456!"
}
```

El backend realiza estas comprobaciones:

1. Ambos campos son obligatorios y no pueden estar vacíos ni contener solo espacios. No se admiten campos extra.
2. La nueva contraseña tiene al menos 8 caracteres y no supera 72 bytes UTF-8.
3. La contraseña actual coincide con la almacenada.
4. La nueva contraseña es diferente de la actual.

Los espacios de las contraseñas se conservan. Si todo es correcto, guarda el nuevo hash BCrypt y devuelve `204 No Content`, sin JSON. En el siguiente login debes usar la contraseña nueva.

**Cambiar la contraseña no cierra las sesiones existentes.** Los JWT y refresh emitidos antes del cambio conservan su validez según sus reglas habituales.

El cambio de contraseña comparte el límite de intentos del login. Las modificaciones de perfil y contraseña son transaccionales y bloquean la fila del usuario mientras se actualiza, para coordinar cambios simultáneos.

## Errores que puede mostrar el frontend

| HTTP | Código | Significado |
|---|---|---|
| 400 | `ERROR_VALIDACION` | Falta un dato o no cumple sus restricciones. |
| 400 | `JSON_INVALIDO` | JSON incompatible, campo extra o `null` explícito en PATCH. |
| 400 | `PASSWORD_ACTUAL_INCORRECTA` | La contraseña actual no coincide. |
| 400 | `PASSWORD_REUTILIZADA` | La nueva contraseña es igual a la actual. |
| 401 | `NO_AUTENTICADO` | JWT ausente, vencido o inválido; también cuenta no activa. |
| 403 | `ACCESO_DENEGADO` | Origen CORS rechazado o permisos insuficientes. |
| 409 | `CONFLICTO_DATOS` | El correo o el nombre de usuario ya pertenece a otra cuenta. |
| 429 | `ERROR_HTTP_429` | Demasiados intentos de login, cambio de correo o contraseña. |
| 500 | `ERROR_INTERNO` | Error inesperado del servidor. |

Un `400` por contraseña actual incorrecta sirve para mostrar el mensaje del formulario. No debe activar la renovación del JWT. El formato común del error está en [Seguridad](SEGURIDAD.md#cómo-leer-los-errores).

## Dónde está implementado

Dentro de `src/main/java/com/visiontour/`:

| Archivo | Responsabilidad |
|---|---|
| `usuario/controller/UsuarioController.java` | Recibir las solicitudes del perfil y administración; restringir los métodos administrativos a ADMIN y obtener la identidad del JWT. |
| `auth/service/AuthServiceImpl.java` | Consultar el perfil mediante `perfil`. |
| `usuario/service/UsuarioService.java` | Interfaz de las operaciones de usuarios. |
| `usuario/service/UsuarioServiceImpl.java` | Implementar la actualización de datos y el cambio de contraseña. |
| `usuario/dto/ActualizarPerfilRequest.java` | Validar los campos editables del perfil. |
| `usuario/dto/CambiarPasswordRequest.java` | Validar el cambio de contraseña. |
| `auth/dto/UsuarioResponse.java` | Definir los datos públicos de la respuesta. |

Las pruebas existentes se encuentran en `PerfilIntegrationContract`, `PerfilIntegrationTests`, `PerfilMySqlIntegrationTests` y `UsuarioServiceTests`. Consulta [cómo ejecutarlas](../README.md#compilar-y-ejecutar-las-pruebas).

Continúa con [4. Arquitectura](../ARQUITECTURA_VIVAAIR.md).
