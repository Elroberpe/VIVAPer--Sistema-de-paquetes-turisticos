# 4. Arquitectura: cómo se organiza el backend

[Índice](README.md) · [Anterior: perfil](docs/PERFIL.md)

El backend es una sola aplicación Spring Boot organizada por funcionalidades y capas. Su clase de inicio es `VisionTourApplication` y su paquete base real es `com.visiontour`.

## Sigue una solicitud

Cuando consultas tu perfil, el recorrido es:

```text
Frontend
   | GET /api/usuarios/me + JWT
   v
Spring Security                  Valida el token y el usuario
   v
UsuarioController.me             Recibe la solicitud y obtiene el ID
   v
AuthServiceImpl.perfil           Busca un usuario activo
   v
UsuarioRepository                Consulta MySQL
   v
UsuarioResponse                  Selecciona los datos que pueden salir
   v
Frontend                         Recibe el JSON del perfil
```

La seguridad consulta también el usuario antes de llegar al controlador. El frontend se comunica con el backend mediante HTTP y JSON; el acceso a MySQL se realiza desde el backend.

## Qué hace cada capa

| Elemento | Explicación sencilla | Ejemplo real |
|---|---|---|
| Controller | Es la entrada HTTP: recibe datos y devuelve la respuesta. | `AuthController` |
| Service | Decide qué debe ocurrir según las reglas de negocio. | `AuthServiceImpl` |
| Repository | Busca y guarda registros usando Spring Data JPA. | `UsuarioRepository` |
| Entity | Representa los datos persistidos y sus relaciones. | `Usuario`, `Rol`, `RefreshToken` |
| DTO | Define los campos que entran o salen de la API. | `RegistroRequest`, `UsuarioResponse` |
| Conversión o mapper | Convierte una entidad en los datos de respuesta. | `UsuarioResponse.from(usuario)` |
| Security y config | Validan identidad, permisos y configuración. | `SecurityConfig`, `JwtConfig` |
| Exception | Convierte fallos en respuestas de error consistentes. | `GlobalExceptionHandler` |

Por ejemplo, el controlador no decide el rol de una cuenta nueva: esa regla está en `AuthServiceImpl.registrar`. Tampoco consulta directamente el repositorio ni devuelve la entidad `Usuario`.

## Carpetas que existen actualmente

```text
src/main/java/com/visiontour/
├── VisionTourApplication.java
├── auth/
│   ├── AuthProperties.java
│   ├── controller/       Endpoints y cookies de autenticación
│   ├── dto/              Solicitudes y respuestas
│   ├── service/          Registro, login y límite de intentos
│   └── validation/       Límite de bytes de las contraseñas BCrypt
├── config/               Configuración de Spring Security y JWT
├── security/
│   ├── CustomUserDetailsService.java
│   ├── SecurityErrorHandler.java
│   ├── jwt/              Emisión y conversión del JWT validado
│   └── refresh/          Entidad, repositorio y servicio de renovación
├── usuario/
│   ├── controller/       Perfil propio y administración de usuarios
│   ├── dto/              Perfil, contraseña y respuestas administrativas
│   ├── entity/           Usuario y Rol
│   ├── enums/            Roles y estados de usuario
│   ├── exception/        Errores de usuarios y contraseña
│   ├── repository/       Persistencia de usuarios y roles
│   └── service/          Interfaz UsuarioService y su implementación
├── common/exception/     Formato y manejo general de errores
└── Prueba/               Endpoint protegido /api/prueba

src/main/resources/
├── application.properties
└── db/migration/         Migraciones SQL de Flyway

src/test/                 Pruebas y configuración de pruebas
```

`Prueba` aparece con mayúscula porque así está nombrado en el código actual. Los módulos de destinos, proveedores, paquetes, salidas, reservas y pagos todavía no están implementados aquí.

## Cómo se guarda un usuario

`Usuario` tiene una relación con `Rol` mediante `rol_id`. JPA mapea esa relación y permite trabajar con objetos Java. `UsuarioRepository` realiza las operaciones de persistencia.

Los servicios utilizan `@Transactional` cuando una operación debe ejecutarse como una unidad. Por ejemplo, si durante el registro falla el guardado y se lanza una excepción de ejecución, se deshacen los cambios de esa transacción.

Flyway crea y modifica las tablas mediante SQL versionado. Hibernate solo valida el esquema con `ddl-auto=validate`; no debe crearlo ni actualizarlo automáticamente.

## Cómo orientarte al leer el código

1. Localiza la ruta HTTP en el controlador.
2. Sigue la llamada al servicio para entender la regla de negocio.
3. Revisa el DTO para conocer los campos admitidos y sus validaciones.
4. Revisa el repositorio y la entidad para entender los datos consultados.
5. Si la solicitud se rechaza antes del controlador, revisa seguridad, CSRF y CORS.
6. Busca las pruebas de esa funcionalidad en `src/test/java/com/visiontour`.

Las reglas de desarrollo del proyecto están en [AGENTS.md](AGENTS.md). Continúa con [5. Base de datos](src/main/resources/db/migration/README.md).
