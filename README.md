# VivaPeru — Sistema de paquetes turísticos

Proyecto académico con frontend Angular y backend Java con Spring Boot y MySQL.

## Estructura

- [`VisionTour/`](VisionTour/): frontend Angular con TypeScript y Bootstrap. Consulta su [guía de ejecución](VisionTour/README.md) y [arquitectura](VisionTour/docs/arquitectura-frontend.md).
- [`VisionTourBack/`](VisionTourBack/): API REST con Spring Security, JPA y migraciones Flyway. Consulta su [guía de configuración y ejecución](VisionTourBack/README.md) y [arquitectura](VisionTourBack/ARQUITECTURA_VIVAAIR.md).

## Desarrollo local

Necesitas Node.js compatible con el frontend, Java 21 y MySQL. Sigue primero la configuración del backend para definir la conexión a MySQL y el secreto JWT fuera del código.

Desde `VisionTourBack/`:

```powershell
.\mvnw.cmd spring-boot:run
```

Desde `VisionTour/`, en otra terminal:

```powershell
npm.cmd ci
npm.cmd start
```

El frontend escucha en `http://127.0.0.1:4200` y utiliza un proxy hacia la API en el puerto `8085`.

## Verificación

Backend, desde `VisionTourBack/`:

```powershell
.\mvnw.cmd verify
```

Frontend, desde `VisionTour/`:

```powershell
npm.cmd test
npm.cmd run build
```

Las pruebas de MySQL requieren una base exclusiva de pruebas y habilitación explícita; consulta la guía del backend.

Los archivos locales con credenciales, las dependencias instaladas y los resultados de compilación están excluidos de Git.
