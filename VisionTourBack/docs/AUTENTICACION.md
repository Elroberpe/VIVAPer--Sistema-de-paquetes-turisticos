# 1. Autenticación: cómo sabe el backend quién eres

[Índice de documentación](../README.md)

Autenticarse significa demostrar tu identidad. En este proyecto lo haces con tu correo y tu contraseña. Si son correctos y tu cuenta está activa, el backend te entrega un token para las siguientes solicitudes.

Ejemplo: Ana inicia sesión una vez. Después consulta su perfil enviando el token, sin volver a enviar su contraseña.

Un **token** es un comprobante digital que el servidor puede verificar. Un **hash** es una huella calculada a partir de un dato: permite hacer comprobaciones sin guardar ese dato original. BCrypt se utiliza para las contraseñas y SHA-256 para los refresh tokens.

## Las cuatro piezas que debes conocer

| Pieza | Para qué sirve | Dónde se utiliza |
|---|---|---|
| Contraseña | Demostrar tu identidad al iniciar sesión. | En el cuerpo del login. En MySQL se guarda su hash BCrypt. |
| Access token o JWT | Identificarte al consultar una ruta protegida. | El frontend lo envía en `Authorization: Bearer <token>`. Dura 15 minutos. |
| Refresh token | Conseguir otro JWT sin escribir de nuevo la contraseña. | Viaja en la cookie `vivaair_refresh`. La sesión dura 7 días desde el login. |
| Token CSRF | Proteger las operaciones de autenticación que utilizan cookies. | Cookie `XSRF-TOKEN` y encabezado `X-XSRF-TOKEN`. |

Un **encabezado** es información que acompaña una solicitud HTTP. Una **cookie** es un dato que el navegador conserva y envía automáticamente cuando corresponde.

El refresh token y el token CSRF son diferentes. La cookie del refresh es `HttpOnly`: JavaScript no puede leerla. La de CSRF sí puede leerse para copiar su valor al encabezado.

## El recorrido completo

```text
Obtener CSRF → Registrarse → Iniciar sesión
                                  |
                     JWT + cookie de renovación
                                  |
                        Usar rutas protegidas
                                  |
                      ¿Venció el JWT? → Renovar
                                  |
                            Cerrar sesión
```

El registro crea la cuenta, pero no inicia sesión automáticamente. Actualmente no hay verificación por correo ni envío de correos SMTP: un cliente recién registrado puede iniciar sesión de inmediato.

En los ejemplos, la dirección base es `http://localhost:8085`. Los datos de Ana son ficticios.

## Paso 1. Obtener el token CSRF

```http
GET /api/auth/csrf
```

Devuelve `204 No Content`, sin JSON, y establece la cookie `XSRF-TOKEN`.

Antes de cada `POST /api/auth/**`, envía las cookies y copia el valor actual de `XSRF-TOKEN` al encabezado:

```http
X-XSRF-TOKEN: <valor actual de la cookie XSRF-TOKEN>
```

Esto se exige en **registro, login, refresh y logout**, aunque sus rutas no pidan JWT. Si falta CSRF o no coincide, recibirás `403`.

Login, refresh y logout cambian la cookie CSRF. Lee su valor actualizado antes del siguiente POST.

## Paso 2. Registrar una cuenta

```http
POST /api/auth/registro
Content-Type: application/json
X-XSRF-TOKEN: <csrf actual>
```

```json
{
  "nombre": "Ana",
  "apellido": "Pérez",
  "usuario": "ana.perez",
  "celular": "+51999888777",
  "email": "ana@example.com",
  "password": "EjemploAna123!"
}
```

El backend valida los datos, normaliza el correo y el nombre de usuario a minúsculas y elimina sus espacios exteriores. Comprueba que ninguno esté registrado, convierte la contraseña a un hash BCrypt y guarda al usuario con rol `CLIENTE` y estado `ACTIVO`. El rol y el estado los decide el servidor.

Nombre y apellido son obligatorios y admiten hasta 100 caracteres. El correo es obligatorio, debe tener formato de email y admite hasta 150 caracteres. La contraseña es obligatoria, tiene un mínimo de 8 caracteres y un máximo de 72 bytes UTF-8. Las letras con tilde pueden ocupar más de un byte. Los espacios de la contraseña se conservan.

El nombre de usuario y el celular también son obligatorios. `usuario` admite entre 3 y 30 caracteres: letras de la a a la z, números, punto, guion o guion bajo. `celular` se envía como texto con entre 9 y 15 dígitos y un `+` inicial opcional; se eliminan sus espacios exteriores. El celular puede repetirse entre cuentas.

Respuesta `201 Created`:

```json
{
  "mensaje": "Cliente registrado correctamente."
}
```

Si el correo o el nombre de usuario ya existe, devuelve `409` con un mensaje que identifica el dato ocupado. Si los datos no son válidos, devuelve `400`.

La creación se comparte con la [administración de usuarios](ADMINISTRACION_USUARIOS.md#crear-un-usuario): `AuthServiceImpl.registrar` delega en `UsuarioService.crearUsuario`, indicando siempre `CLIENTE` desde el servidor. El registro público conserva este JSON, su respuesta y sus validaciones. Enviar un rol en el registro público no permite crear una cuenta administradora.

## Paso 3. Iniciar sesión

```http
POST /api/auth/login
Content-Type: application/json
X-XSRF-TOKEN: <csrf actual>
```

```json
{
  "email": "ana@example.com",
  "password": "EjemploAna123!"
}
```

El backend busca el correo, compara la contraseña con el hash BCrypt y comprueba que la cuenta esté activa.

Si sigues este proceso en el código, verás este orden:

1. `AuthController.login` recibe y valida el JSON.
2. `AuthServiceImpl.login` normaliza el correo y comprueba el límite de intentos.
3. `AuthenticationManager` coordina la comprobación de credenciales con Spring Security.
4. `CustomUserDetailsService` carga el usuario y su rol desde MySQL; BCrypt comprueba la contraseña.
5. `RefreshTokenService.emitir` crea la sesión de renovación y guarda el hash del refresh.
6. `AccessTokenService.generar` crea el JWT firmado.
7. El controlador devuelve el JSON y `SessionCookie` escribe las cookies.

Respuesta `200 OK` con esta estructura; el token mostrado es un marcador de ejemplo:

```json
{
  "accessToken": "<jwt emitido por el backend>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "usuario": {
    "id": 1,
    "nombre": "Ana",
    "apellido": "Pérez",
    "usuario": "ana.perez",
    "celular": "+51999888777",
    "email": "ana@example.com",
    "rol": "CLIENTE"
  }
}
```

`expiresIn` se mide en segundos: `900` equivale a 15 minutos. El ID real dependerá del usuario creado.

Además del JSON, la respuesta establece `vivaair_refresh`, una cookie `HttpOnly`, `SameSite=Lax` y con ruta `/api/auth`. Su atributo `Secure` se configura con `AUTH_COOKIE_SECURE` y es `true` por defecto. El refresh token no aparece en el JSON.

Credenciales incorrectas o una cuenta no activa devuelven `401`. Hay un límite de intentos explicado en [Seguridad](SEGURIDAD.md#límite-de-intentos).

## Paso 4. Usar una ruta protegida

Envía el JWT recibido en el login:

```http
GET /api/usuarios/me
Authorization: Bearer <accessToken>
```

El backend valida el JWT y consulta que el usuario siga activo y tenga el mismo rol que figura en el token. Si todo coincide, devuelve el perfil.

La cookie de refresh, por sí sola, no permite consultar el perfil. Esta ruta necesita el encabezado `Authorization` y no exige CSRF.

## Paso 5. Renovar cuando vence el JWT

```http
POST /api/auth/refresh
X-XSRF-TOKEN: <csrf actual>
```

No tiene cuerpo JSON. Envía las cookies, incluida `vivaair_refresh`, y omite `Authorization` para evitar que un JWT vencido bloquee la solicitud.

El backend comprueba que el refresh exista, no esté revocado, no haya vencido y pertenezca a un usuario activo. Devuelve `200` con la misma estructura del login, un JWT nuevo y cookies actualizadas.

Cada renovación reemplaza el refresh anterior. El anterior deja de servir y se conserva la misma fecha de vencimiento de la sesión.

**Ejemplo:** si inicias sesión el lunes a las 10:00, la sesión vence el lunes siguiente a las 10:00. Renovarla el martes no añade otros 7 días. Cada JWT nuevo tiene su propio plazo de 15 minutos.

Si el refresh no es válido, devuelve `401` y elimina la cookie de renovación. El usuario debe volver a iniciar sesión.

## Paso 6. Cerrar sesión

```http
POST /api/auth/logout
X-XSRF-TOKEN: <csrf actual>
```

No tiene cuerpo JSON. Envía las cookies y omite `Authorization`.

El backend revoca el refresh de esa sesión y elimina su cookie. Devuelve `204 No Content`. Con CSRF válido también devuelve `204` si ya no hay un refresh válido.

El frontend debe borrar su JWT y los datos de la sesión. **El logout no invalida inmediatamente un JWT ya emitido:** ese token puede seguir funcionando hasta su vencimiento si la cuenta y el rol siguen siendo válidos. Tampoco se cierran las otras sesiones del usuario.

## Práctica en PowerShell

Primero [configura e inicia el backend](../README.md#preparar-el-proyecto). Ejecuta este ejemplo en otra terminal. Usa un correo nuevo si la cuenta ya existe. La contraseña es solo para esta cuenta local de prueba.

```powershell
$base = 'http://localhost:8085'
$sesion = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Guarda las cookies que devuelve el backend.
Invoke-WebRequest -UseBasicParsing -Uri "$base/api/auth/csrf" `
    -WebSession $sesion | Out-Null

# Lee el CSRF actual en cada POST, porque puede haber cambiado.
function Enviar-Auth {
    param([string]$Ruta, [hashtable]$Datos)

    $csrf = ($sesion.Cookies.GetCookies([uri]"$base/") |
        Where-Object { $_.Name -eq 'XSRF-TOKEN' }).Value
    $opciones = @{
        Uri = "$base/api/auth/$Ruta"
        Method = 'Post'
        WebSession = $sesion
        Headers = @{ 'X-XSRF-TOKEN' = $csrf }
    }
    if ($null -ne $Datos) {
        $opciones.ContentType = 'application/json; charset=utf-8'
        $opciones.Body = [Text.Encoding]::UTF8.GetBytes(($Datos | ConvertTo-Json))
    }
    Invoke-RestMethod @opciones
}

Enviar-Auth -Ruta 'registro' -Datos @{
    nombre = 'Ana'; apellido = 'Perez'
    usuario = 'ana.perez'; celular = '+51999888777'
    email = 'ana@example.com'; password = 'EjemploAna123!'
}

$login = Enviar-Auth -Ruta 'login' -Datos @{
    email = 'ana@example.com'; password = 'EjemploAna123!'
}

# Usa el access token sin imprimirlo en la terminal.
$cabeceras = @{ Authorization = "Bearer $($login.accessToken)" }
Invoke-RestMethod -Uri "$base/api/usuarios/me" -Headers $cabeceras
Invoke-RestMethod -Uri "$base/api/prueba" -Headers $cabeceras

# Puedes renovar antes de que el JWT venza para probar el flujo.
$login = Enviar-Auth -Ruta 'refresh'
$cabeceras = @{ Authorization = "Bearer $($login.accessToken)" }
Invoke-RestMethod -Uri "$base/api/usuarios/me" -Headers $cabeceras

Enviar-Auth -Ruta 'logout'
$login = $null
$cabeceras = $null
```

Este ejercicio utiliza el almacén de cookies de PowerShell. En el navegador también debes configurar las solicitudes para enviar cookies.

## Qué debe hacer el frontend

1. Obtener CSRF antes del primer POST de autenticación.
2. Enviar cookies con `withCredentials: true` en Angular o `credentials: 'include'` en `fetch` cuando acceda a la API desde otro origen.
3. Copiar el CSRF actual al encabezado de cada POST de autenticación. Con URL de API absoluta a otro origen, comprobar que el cliente lo añada explícitamente; habilitar credenciales no añade ese encabezado por sí solo.
4. Conservar el JWT preferentemente en memoria y enviarlo como Bearer a las rutas protegidas.
5. Ante un `401` de una ruta protegida, intentar una única renovación y repetir la solicitud con el JWT nuevo. Si la renovación falla, volver al login.
6. Compartir una sola renovación en curso entre solicitudes simultáneas. Esperarla antes del logout y evitar ciclos de renovación sobre login o refresh.
7. Al recargar la página, intentar recuperar la sesión con CSRF y refresh si el JWT se conservaba solo en memoria.

Para desarrollo usa el mismo nombre de host en frontend y backend, por ejemplo `localhost` en ambos. `SameSite=Lax` limita las cookies entre sitios distintos; habilitar CORS no cambia esa regla. Los detalles están en [Seguridad](SEGURIDAD.md).

## Dónde leer el código

Todas estas rutas parten de `src/main/java/com/visiontour/`:

| Archivo | Qué buscar |
|---|---|
| `auth/controller/AuthController.java` | Los cinco endpoints de autenticación. |
| `auth/service/AuthServiceImpl.java` | Registro, login y coordinación de la sesión. |
| `security/CustomUserDetailsService.java` | Carga del usuario para comprobar sus credenciales. |
| `security/jwt/AccessTokenService.java` | Creación del JWT de 15 minutos. |
| `security/refresh/RefreshTokenService.java` | Emisión, renovación y revocación del refresh. |
| `auth/controller/SessionCookie.java` | Escritura y eliminación de cookies. |

Continúa con [2. Seguridad](SEGURIDAD.md).
