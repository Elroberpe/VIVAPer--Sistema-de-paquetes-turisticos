# Administración de usuarios

[Índice](../README.md)

Estas operaciones requieren una cuenta activa con rol `ADMIN`. Utiliza el access token recibido al iniciar sesión y envíalo en el encabezado `Authorization: Bearer <accessToken>`.

Los roles `CLIENTE` y `EMPLEADO` pueden seguir usando su perfil personal en `/api/usuarios/me`, pero no pueden administrar otras cuentas.

## Crear un usuario

```http
POST /api/usuarios
Authorization: Bearer <accessToken de ADMIN>
Content-Type: application/json
```

```json
{
  "nombre": "Carlos",
  "apellido": "Pérez",
  "usuario": "carlos.perez",
  "correo": "carlos@example.com",
  "celular": "+51987654321",
  "password": "Clave-inicial-2026",
  "rol": "EMPLEADO"
}
```

Se utiliza el record `CrearUsuarioAdminRequest`. Todos sus campos son obligatorios:

| Campo | Regla |
|---|---|
| `nombre` y `apellido` | Máximo 100 caracteres cada uno. |
| `usuario` | Único, de 3 a 30 caracteres: letras de la a a la z, números, punto, guion o guion bajo. |
| `correo` | Único, email válido, máximo 150 caracteres. |
| `celular` | Entre 9 y 15 dígitos, con `+` inicial opcional. |
| `password` | Al menos 8 caracteres y como máximo 72 bytes UTF-8, igual que en el registro público. |
| `rol` | Uno de los nombres exactos `ADMIN`, `EMPLEADO` o `CLIENTE`. |

Se eliminan los espacios exteriores de los datos personales y se guardan usuario y correo en minúsculas. La contraseña conserva sus espacios y se almacena únicamente como hash BCrypt.

El servidor crea la cuenta como `ACTIVO` y asigna la fecha de registro. No admite campos adicionales, como estado, ID o hash de contraseña. Los nombres de entrada son `correo` y `celular`.

Devuelve `201 Created` con `UsuarioDetalleResponse`, incluyendo el ID y la fecha de registro, sin contraseñas, hashes ni tokens. La creación no inicia sesión por el usuario nuevo ni cambia la sesión del administrador. La cuenta creada puede hacer login con su correo y contraseña inicial.

Un correo o usuario duplicado devuelve `409`. Los datos inválidos o roles desconocidos devuelven `400`. Sin autenticación válida devuelve `401`; CLIENTE y EMPLEADO reciben `403`.

La lógica de creación está centralizada en `UsuarioServiceImpl.crearUsuario`. El registro público sigue usando `/api/auth/registro`, su DTO y su respuesta actuales; `AuthServiceImpl.registrar` llama a esa misma lógica, indicando siempre `CLIENTE` desde el servidor. El rol del registro público nunca se toma del JSON enviado por el cliente.

`CrearUsuarioAdminRequest` contiene los campos, sus validaciones, la normalización de textos y la protección de la contraseña al convertirlo en texto. La conversión del nombre de rol se centraliza en `RolNombre`, por lo que los records de creación y cambio de rol no necesitan fábricas JSON propias.

## Listar y buscar

```http
GET /api/usuarios?page=0&size=10&buscar=carlos&activo=true
Authorization: Bearer <accessToken>
```

Todos los parámetros son opcionales:

| Parámetro | Regla |
|---|---|
| `page` | Página desde cero. Predeterminado: `0`. |
| `size` | Entre `1` y `100`. Predeterminado: `10`. |
| `buscar` | Hasta 100 caracteres. Busca una parte del nombre, apellido o correo sin distinguir mayúsculas. |
| `activo` | `true` muestra activos; `false` muestra bloqueados y pendientes. Omitido, muestra todos. |

La búsqueda elimina espacios exteriores. Vacía o con solo espacios equivale a no buscar. `%`, `_` y `!` se buscan como texto literal. Los filtros se pueden combinar y los resultados se ordenan por ID ascendente.

Respuesta `200 OK` de ejemplo:

```json
{
  "content": [
    {
      "id": 1,
      "nombre": "Carlos",
      "apellido": "Pérez",
      "usuario": "carlos.perez",
      "celular": "987654321",
      "correo": "carlos@example.com",
      "rol": "CLIENTE",
      "activo": true
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 1,
  "totalPages": 1
}
```

La paginación se ejecuta en la base de datos. Si no hay coincidencias, devuelve `content: []`, `totalElements: 0` y `totalPages: 0`. Una página fuera del rango también devuelve una lista vacía, conservando los totales de la búsqueda.

## Consultar un usuario

```http
GET /api/usuarios/1
Authorization: Bearer <accessToken>
```

Respuesta `200 OK` de ejemplo:

```json
{
  "id": 1,
  "usuario": "carlos.perez",
  "nombre": "Carlos",
  "apellido": "Pérez",
  "correo": "carlos@example.com",
  "celular": "987654321",
  "rol": "CLIENTE",
  "activo": true,
  "fechaRegistro": "2026-11-17T10:30:00"
}
```

Se conservan los nombres de los DTO existentes: `correo` corresponde a `email` en la entidad y `celular` al número de contacto. `fechaRegistro` corresponde a `fechaCreacion`. Solo se devuelven datos del DTO, sin contraseñas ni hashes.

Si el ID no existe, devuelve `404`. Los ID deben ser enteros positivos.

## Activar o desactivar

```http
PATCH /api/usuarios/1/estado
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "activo": false
}
```

`activo` es obligatorio y no puede ser `null`. No se aceptan campos adicionales. La respuesta es `200 OK` con el mismo DTO del detalle, actualizado.

- `true` establece el estado `ACTIVO`.
- `false` desactiva mediante el estado `BLOQUEADO`.
- Si ya tiene la condición solicitada, la operación es válida y conserva el estado. Por ejemplo, un `PENDIENTE` que recibe `false` sigue pendiente.
- El administrador no puede desactivar su propia cuenta: recibe `403`.
- La identidad del administrador se obtiene del JWT validado. Un ID enviado por parámetro no cambia quién está ejecutando la operación.

El cambio se realiza en una transacción y bloquea la fila para coordinar cambios simultáneos. No elimina usuarios ni modifica el rol, el correo o la contraseña. También se protege al último administrador activo: una operación que lo retire devuelve `409`.

Una cuenta desactivada no puede hacer login, utilizar sus JWT anteriores ni renovar su sesión. Se reutilizan las comprobaciones de seguridad que ya consultan el estado de la cuenta en la base de datos. Esta versión no añade una revocación permanente de sesiones: al reactivar la cuenta vuelven a aplicar las reglas habituales de vigencia de los tokens existentes.

## Actualizar datos personales como ADMIN

```http
PUT /api/usuarios/2
Authorization: Bearer <accessToken de ADMIN>
Content-Type: application/json
```

```json
{
  "nombre": "Carlos",
  "apellido": "Pérez",
  "usuario": "carlos.perez",
  "correo": "carlos.nuevo@example.com",
  "celular": "+51987654321"
}
```

Se utiliza el record `ActualizarUsuarioAdminRequest`:

| Campo | Regla |
|---|---|
| `nombre` | Obligatorio, máximo 100 caracteres. |
| `apellido` | Obligatorio, máximo 100 caracteres. |
| `usuario` | Obligatorio, único, entre 3 y 30 caracteres: letras de la a a la z, números, punto, guion o guion bajo. |
| `correo` | Obligatorio, único, email válido, máximo 150 caracteres. |
| `celular` | Opcional, entre 9 y 15 dígitos, con `+` inicial opcional. |

Se eliminan espacios exteriores y se guardan usuario y correo en minúsculas. El celular admite hasta 16 caracteres contando el `+`. Si `celular` se omite o llega como `null`, se conserva el celular actual, porque la columna no admite nulos. Un celular vacío o de formato inválido devuelve `400`.

El usuario puede conservar su propio correo y nombre de usuario. Si alguno pertenece a otra cuenta, se devuelve `409` y no se guarda ningún cambio. La restricción única de la base de datos también protege frente a duplicados simultáneos.

No se aceptan campos adicionales, incluidos rol, estado, contraseña, ID, `email` o `telefono`: este request utiliza los nombres `correo` y `celular`. No cambia el rol, la contraseña, el estado ni la fecha de registro.

La respuesta es `200 OK` con `UsuarioDetalleResponse`, que mantiene los nombres `correo` y `celular` del detalle existente. Un usuario inexistente devuelve `404`.

Esta operación requiere el permiso ADMIN, sin pedir la contraseña del usuario editado. Cuando cambia el correo, el próximo login utiliza el nuevo. Los JWT y refresh existentes mantienen su funcionamiento porque identifican a la cuenta por su ID.

## Cambiar el rol

```http
PATCH /api/usuarios/2/rol
Authorization: Bearer <accessToken de ADMIN>
Content-Type: application/json
```

```json
{
  "rol": "EMPLEADO"
}
```

Se utiliza el record `CambiarRolUsuarioRequest`. `rol` es obligatorio y solo acepta los nombres exactos `ADMIN`, `EMPLEADO` y `CLIENTE`, definidos por el enum `RolNombre`. Los roles desconocidos, valores numéricos y campos adicionales devuelven `400`.

- Solo cambia el rol y devuelve el detalle actualizado con `200`.
- Repetir el rol actual es válido.
- Un administrador que intente quitarse su propio rol ADMIN recibe `403`. Mantener su propio rol ADMIN es válido.
- No se puede retirar al último administrador activo: devuelve `409`.
- Cambios simultáneos de rol o estado toman un bloqueo común sobre la fila del rol ADMIN antes de modificar usuarios. Esto evita que dos solicitudes dejen el sistema sin administradores activos.

La seguridad existente comprueba el rol guardado en cada solicitud. Después de un cambio, el JWT que contenga el rol anterior será rechazado con `401`. El login o la renovación de sesión permiten obtener un JWT con el rol actualizado. No se modifica el módulo de autenticación.

La actualización de datos y el cambio de rol son operaciones independientes. Aunque el frontend las muestre en un mismo modal, debe enviar cada solicitud y gestionar su resultado por separado: no forman una única transacción.

## Probar desde PowerShell

Inicia el backend y consigue un access token de una cuenta `ADMIN` mediante el [login existente](AUTENTICACION.md#paso-3-iniciar-sesión). Las migraciones crean los roles, pero no una cuenta administradora. El registro público sigue creando clientes.

```powershell
$base = 'http://localhost:8085'
$cabeceras = @{ Authorization = 'Bearer <accessToken de ADMIN>' }

# Crear una cuenta activa. Sustituye los datos por valores disponibles.
$nuevoUsuario = @{
    nombre = 'Carlos'; apellido = 'Perez'; usuario = 'carlos.perez'
    correo = 'carlos@example.com'; celular = '+51987654321'
    password = 'Clave-inicial-2026'; rol = 'EMPLEADO'
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$base/api/usuarios" `
    -Headers $cabeceras -ContentType 'application/json; charset=utf-8' `
    -Body ([Text.Encoding]::UTF8.GetBytes($nuevoUsuario))

# Listar usuarios activos cuya información contenga Carlos.
Invoke-RestMethod -Uri "$base/api/usuarios?page=0&size=10&buscar=Carlos&activo=true" `
    -Headers $cabeceras

# Sustituye este ID por el de una cuenta distinta de la administradora.
$usuarioId = 2
Invoke-RestMethod -Uri "$base/api/usuarios/$usuarioId" -Headers $cabeceras

# Desactivar. Para activar, cambia false por true.
Invoke-RestMethod -Method Patch -Uri "$base/api/usuarios/$usuarioId/estado" `
    -Headers $cabeceras -ContentType 'application/json' -Body '{"activo":false}'

# Actualizar datos personales. La contraseña y el rol se gestionan por separado.
$datos = @{
    nombre = 'Carlos'; apellido = 'Perez'; usuario = 'carlos.perez'
    correo = 'carlos.nuevo@example.com'; celular = '+51987654321'
} | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri "$base/api/usuarios/$usuarioId" `
    -Headers $cabeceras -ContentType 'application/json; charset=utf-8' `
    -Body ([Text.Encoding]::UTF8.GetBytes($datos))

# Cambiar únicamente el rol.
Invoke-RestMethod -Method Patch -Uri "$base/api/usuarios/$usuarioId/rol" `
    -Headers $cabeceras -ContentType 'application/json' -Body '{"rol":"EMPLEADO"}'
```

Estos endpoints usan el encabezado Bearer y no necesitan cookie de refresh ni token CSRF.

## Errores

Se reutilizan `ApiErrorResponse`, `GlobalExceptionHandler` y `SecurityErrorHandler`:

```json
{
  "status": 404,
  "codigo": "RECURSO_NO_ENCONTRADO",
  "mensaje": "El recurso solicitado no existe.",
  "timestamp": "2026-11-17T10:30:00",
  "errores": {}
}
```

| HTTP | Motivo |
|---|---|
| `400` | Parámetros, ID, JSON o datos inválidos. |
| `401` | Sin autenticación válida o cuenta desactivada. |
| `403` | Rol distinto de `ADMIN`, autodesactivación o retirada del propio rol ADMIN. |
| `404` | Usuario inexistente. |
| `409` | Correo o usuario duplicado, o retirada del último administrador activo. |
| `500` | Error inesperado, sin detalles internos en la respuesta. |

## Archivos del módulo

Rutas relativas a `src/main/java/com/visiontour/`:

| Archivo | Cambio |
|---|---|
| `usuario/controller/UsuarioController.java` | Controlador único de usuarios: perfil personal y seis operaciones administrativas con `@PreAuthorize` en cada método administrativo. |
| `usuario/service/UsuarioService.java` | Convertido en interfaz; conserva las operaciones del perfil y declara las administrativas. |
| `usuario/service/UsuarioServiceImpl.java` | Nueva implementación: conserva el comportamiento del perfil y añade la administración. |
| `usuario/repository/UsuarioRepository.java` | Búsqueda paginada, comprobaciones de duplicados y conteo de administradores activos; reutiliza las consultas de detalle y bloqueo. |
| `usuario/repository/RolRepository.java` | Consulta de roles y bloqueo común para coordinar cambios administrativos. |
| `usuario/dto/UsuarioResumenResponse.java` | Añadida conversión desde la entidad. |
| `usuario/dto/UsuarioDetalleResponse.java` | Añadida conversión desde la entidad. |
| `usuario/dto/UsuariosPaginaResponse.java` | Nuevo record con el contenido y los totales de la página. |
| `usuario/dto/CambiarEstadoUsuarioRequest.java` | Mensaje de validación y rechazo de campos adicionales. |
| `usuario/dto/ActualizarUsuarioAdminRequest.java` | Nuevo record para los datos personales, incluido el nombre de usuario. |
| `usuario/dto/CrearUsuarioAdminRequest.java` | Nuevo record para crear cuentas, validando contraseña y rol, sin exponer la contraseña en `toString`. |
| `usuario/dto/CambiarRolUsuarioRequest.java` | Nuevo record para un rol del enum existente, sin campos adicionales. |
| `usuario/enums/RolNombre.java` | Centraliza la lectura del nombre del rol desde JSON y rechaza posiciones numéricas. |
| `usuario/exception/UsuarioNoEncontradoException.java` | Nueva excepción asociada a `404`. |
| `usuario/exception/RolNoValidoException.java` | Nueva excepción `400` si el rol no existe en la base. |
| `usuario/exception/UltimoAdministradorActivoException.java` | Nueva excepción `409` para proteger al último administrador activo. |
| `common/exception/GlobalExceptionHandler.java` | Conserva el formato de errores y devuelve los mensajes seguros de las nuevas excepciones. |
| `config/SecurityConfig.java` | Restricción administrativa a `ADMIN`, conservando el acceso al perfil personal. |
| `auth/service/AuthServiceImpl.java` | Delega la creación pública a `UsuarioService`, asignando siempre CLIENTE. Conserva el contrato del registro, login y sesiones. |

No requiere nuevas dependencias ni cambios de entidad o migraciones. El registro público conserva su contrato y delega la persistencia para evitar duplicar la creación. Login, tokens y perfil personal conservan su funcionamiento.

Las pruebas unitarias se añaden a `UsuarioServiceTests`, que ahora instancia `UsuarioServiceImpl`. Las de integración están en `AdministracionUsuarioIntegrationContract`, con las clases de ejecución `AdministracionUsuarioIntegrationTests` y `AdministracionUsuarioMySqlIntegrationTests`, siguiendo el patrón existente del proyecto.

Se comprueban también creación, edición de datos, duplicados de usuario y correo, separación entre operaciones, validación de roles, protección del administrador, cambios concurrentes y funcionamiento de JWT y sesiones después de modificar el correo o el rol. Las pruebas existentes del registro público verifican que siga creando solo clientes activos y mantenga sus validaciones.

Ejecuta `./mvnw.cmd verify` en Windows. La suite habitual utiliza H2 y las migraciones de Flyway. MySQL requiere `VIVAAIR_MYSQL_TESTS=true` y una base exclusiva de pruebas configurada mediante las variables del proyecto.
