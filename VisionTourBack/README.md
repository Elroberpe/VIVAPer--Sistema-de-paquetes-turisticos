# VIVAAIR — Backend de VisionTour

Este backend recibe las solicitudes del frontend, comprueba quién es el usuario y guarda los datos en MySQL. El código Java utiliza el paquete `com.visiontour`.

La documentación está ordenada para aprender desde el inicio. Empieza por autenticación:

| Orden | Guía | Qué aprenderás |
|---|---|---|
| 1 | [Autenticación](docs/AUTENTICACION.md) | Registro, login, JWT, cookies, renovación y logout, paso a paso. |
| 2 | [Seguridad](docs/SEGURIDAD.md) | Cómo se comprueban los tokens, los permisos, CSRF y CORS. |
| 3 | [Perfil](docs/PERFIL.md) | Consultar tus datos, editarlos y cambiar tu contraseña. |
| 4 | [Arquitectura](ARQUITECTURA_VIVAAIR.md) | Qué hace cada carpeta y cómo seguir una petición en el código. |
| 5 | [Base de datos](src/main/resources/db/migration/README.md) | Qué tablas existen y cómo las administra Flyway. |
| 6 | [Administración de usuarios](docs/ADMINISTRACION_USUARIOS.md) | Creación, listado, búsqueda, detalle, edición de datos, roles y activación de cuentas por ADMIN. |

Estas guías describen la implementación actual. Los módulos de destinos, paquetes, reservas y pagos todavía no tienen código en este repositorio.

## Preparar el proyecto

Necesitas Java 21 y MySQL. El proyecto utiliza Spring Boot 4.0.9 e incluye Maven Wrapper, por lo que puedes usar `mvnw.cmd` sin instalar Maven por separado.

1. Crea en tu MySQL local una base de datos llamada `vivaPeru_db`.
2. Crea `application-local.properties` en la raíz, junto a `pom.xml`.
3. Completa ese archivo con tus datos locales:

```properties
DB_URL=jdbc:mysql://localhost:3306/vivaPeru_db
DB_USERNAME=tu_usuario_local
DB_PASSWORD=tu_password_local
AUTH_COOKIE_SECURE=false
CORS_ALLOWED_ORIGINS=http://localhost:4200
```

`AUTH_COOKIE_SECURE=false` permite probar la cookie de renovación con HTTP local. Para HTTPS utiliza `true`. Cambia el origen de CORS si tu frontend usa otra dirección. Si no configuras orígenes, las solicitudes del navegador desde otro origen serán rechazadas.

El archivo local está excluido en `.gitignore`. No subas credenciales al repositorio.

## Configurar la firma de los tokens

En PowerShell, genera un secreto aleatorio para esta sesión de desarrollo:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
```

Ejecuta el backend desde esa misma terminal. Conserva el mismo secreto entre reinicios si necesitas que los JWT anteriores sigan siendo válidos hasta su vencimiento.

La contraseña de MySQL y el secreto JWT no se incluyen en el repositorio. Define `DB_PASSWORD` y `JWT_SECRET` mediante variables de entorno o en `application-local.properties`, excluido de Git. Sin un secreto JWT válido, el backend rechazará el inicio. Consulta [la explicación de seguridad](docs/SEGURIDAD.md#el-secreto-jwt).

## Iniciar el backend

Desde la raíz del proyecto:

```powershell
.\mvnw.cmd spring-boot:run
```

Por defecto escucha en `http://localhost:8085`. Puedes cambiar el puerto con `SERVER_PORT`.

Al iniciar, Flyway aplica las migraciones pendientes y Hibernate comprueba que las tablas coincidan con las entidades. Hibernate está configurado con `ddl-auto=validate`.

Puedes comprobar que la ruta de prueba está protegida:

```powershell
curl.exe -i http://localhost:8085/api/prueba
```

Sin token debe devolver `401`. Para obtener un token y usar esa ruta, sigue [el ejercicio de autenticación](docs/AUTENTICACION.md#práctica-en-powershell).

## Compilar y ejecutar las pruebas

```powershell
.\mvnw.cmd verify
```

Las pruebas habituales utilizan H2, una base de datos de pruebas en memoria, y generan un secreto JWT temporal. Las pruebas de integración con MySQL solo se habilitan si defines `VIVAAIR_MYSQL_TESTS=true`. Configura `DB_URL`, `DB_USERNAME` y `DB_PASSWORD` para una base **exclusiva de pruebas**, porque esas pruebas crean y eliminan datos.

Después de compilar puedes ejecutar el paquete:

```powershell
java -jar target/visiontour-backend-0.0.1-SNAPSHOT.jar
```

En Linux o macOS, utiliza `./mvnw` en lugar de `.\mvnw.cmd` y adapta las variables de entorno a tu terminal.
