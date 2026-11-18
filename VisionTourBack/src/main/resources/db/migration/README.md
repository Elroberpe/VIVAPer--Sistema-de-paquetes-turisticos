# 5. Base de datos: tablas y migraciones

[Índice](../../../../../README.md) · [Anterior: arquitectura](../../../../../ARQUITECTURA_VIVAAIR.md)

Una migración es un archivo SQL que describe un cambio en la base de datos. Flyway ejecuta las migraciones pendientes al iniciar la aplicación y registra cuáles ya aplicó.

Hibernate se ejecuta después para comprobar que las tablas coincidan con las entidades Java. La configuración es `spring.jpa.hibernate.ddl-auto=validate`.

## Qué crea cada archivo

| Migración | Qué hace |
|---|---|
| [V1__crear_roles_usuarios.sql](V1__crear_roles_usuarios.sql) | Crea `roles` y `usuarios`, con sus claves y restricciones. |
| [V2__insertar_roles_iniciales.sql](V2__insertar_roles_iniciales.sql) | Inserta `ADMIN`, `EMPLEADO` y `CLIENTE`. No crea usuarios ni contraseñas. |
| [V3__crear_refresh_tokens.sql](V3__crear_refresh_tokens.sql) | Crea el almacenamiento de sesiones de renovación. |
| [V4__crear_verificacion_email.sql](V4__crear_verificacion_email.sql) | Crea la tabla histórica de verificación de correo, actualmente sin uso en la aplicación. |

## Cómo se relacionan las tablas

```text
roles
  └── usuarios                         Cada usuario tiene un rol
        ├── refresh_tokens             Un usuario puede tener varias sesiones
        └── email_verification_tokens  Tabla conservada, sin uso actual
```

`roles.nombre`, `usuarios.usuario` y `usuarios.email` son únicos: no pueden repetirse. Las claves foráneas aseguran que el rol y el usuario referenciados existan. No hay borrado en cascada definido en estas migraciones.

La tabla `usuarios` guarda nombre, apellido, nombre de usuario, celular, correo, hash de contraseña, estado, rol y fecha de creación. El registro actual crea cuentas `ACTIVO`. Los estados definidos en Java son `PENDIENTE`, `ACTIVO` y `BLOQUEADO`; solo `ACTIVO` permite autenticarse.

Una fila de `refresh_tokens` representa una sesión de login. Guarda el hash del refresh, el usuario, la fecha de vencimiento, el indicador de revocación y `familia_id`. La renovación reemplaza el hash en la misma fila y no extiende el vencimiento. `familia_id` recibe un identificador porque la columna es obligatoria, pero no tiene reglas de familias implementadas.

La tabla de verificación de correo se conserva por historial. No hay un flujo actual de verificación ni activación automática de cuentas antiguas `PENDIENTE`.

V1 incluye `usuario VARCHAR(30) NOT NULL` y `celular VARCHAR(16) NOT NULL`. El celular se guarda como texto para conservar el signo `+`. El nombre de usuario tiene una restricción única; el celular puede repetirse.

Esta revisión modifica V1 para una base que se recreará desde cero. Si tu base local ya ejecutó la versión anterior, recrea la base antes de arrancar con esta versión. En un entorno compartido se debe conservar la V1 aplicada y crear una migración posterior.

## Cómo añadir un cambio futuro

La numeración es global para todo el backend. La siguiente migración disponible es `V5__descripcion.sql`.

1. Revisa las tablas existentes y las entidades afectadas.
2. Crea una migración nueva con el SQL del cambio.
3. Ajusta el mapeo JPA para mantenerlo sincronizado con el esquema.
4. Ejecuta la aplicación o las pruebas contra una base adecuada para comprobar la migración y la validación de Hibernate.

No modifiques migraciones que ya se ejecutaron en entornos compartidos. Las restricciones `UNIQUE`, los índices y las claves foráneas se definen en estas migraciones, evitando `@UniqueConstraint` y `@Index` en las entidades.

Flyway es el único responsable del esquema. No utilices `ddl-auto=create`, `create-drop` ni `update`, ni hagas cambios directos en la base de producción.

## Base local y pruebas

La base de datos debe existir antes de conectar: Flyway crea sus tablas, no el servidor ni la base MySQL. Las credenciales locales se configuran como explica el [README](../../../../../README.md#preparar-el-proyecto).

Las pruebas habituales usan H2 en modo de compatibilidad MySQL y ejecutan las mismas migraciones. También existen pruebas opcionales con MySQL habilitadas mediante `VIVAAIR_MYSQL_TESTS=true`. Utiliza una base exclusiva para ellas, porque crean y eliminan datos de prueba.
