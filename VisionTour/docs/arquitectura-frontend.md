# VivaPeru: arquitectura del frontend

Estado: arquitectura definida y primera entrega de exploración implementada. Tecnologías: Angular, Bootstrap, CSS y SweetAlert2. Ver [alcance y verificación de la entrega](entrega-exploracion.md).

## Objetivo y alcance

Construir una web responsive para explorar y reservar paquetes turísticos peruanos. La primera etapa tendrá navegación, filtros, formularios y reservas simuladas con datos de prueba. La siguiente conectará las mismas pantallas a APIs.

La etapa inicial no incluye autenticación real, cobros ni confirmación de disponibilidad real. Las reservas y los pagos se identificarán como demostraciones. Los recorridos y sus estados se definen en [flujos-usuario.md](flujos-usuario.md).

## Tecnologías

- Angular con TypeScript y componentes standalone.
- Angular Router para navegación y carga diferida de las funcionalidades.
- Bootstrap para la grilla, utilidades y estilos base de formularios y componentes.
- CSS propio para identidad visual, adaptación responsive y estilos particulares.
- SweetAlert2 para confirmaciones, avisos y resultados de acciones, centralizado en un servicio.
- Reactive Forms para el formulario de reserva y sus validaciones.
- Signals para estado de interfaz; RxJS y HttpClient para los flujos de datos y las futuras APIs.

Las versiones concretas se fijarán al inicializar el proyecto, comprobando compatibilidad con Node y Angular.

## Sistema de diseño adoptado

La interfaz utilizará el sistema **VivaPeru** proporcionado por el usuario: Plus Jakarta Sans, azul océano, acentos terracota, superficies claras, fotografía protagonista y tarjetas con radios suaves. Su aplicación y las diferencias resueltas de la referencia se documentan en [diseno-frontend.md](diseno-frontend.md). La referencia original se conserva en [sistema-diseno-referencia.md](sistema-diseno-referencia.md).

Los tokens están preparados en `src/styles/tokens.css`. Bootstrap se adaptará a ellos mediante CSS propio, y SweetAlert2 compartirá la misma identidad visual.

## Área administrativa prevista

El login del personal y la estructura vigente del panel se definen en [panel-administrativo.md](panel-administrativo.md). Se han separado los layouts público, de autenticación y administrativo. Por indicación del usuario, el menú administrativo contiene únicamente Usuarios, Paquetes, Destinos, Servicios y Proveedores, y abre en Usuarios.

La cabecera y el pie están en PublicLayout; `app.html` contiene el outlet raíz. Las rutas administrativas se cargan de forma diferida. Usuarios tiene una página y un repositorio HTTP propios para listar, consultar detalles y cambiar el estado con persistencia en el backend; la paginación y los filtros se resuelven en el servidor. Servicios también tiene una página específica dentro de `features/admin`, con el contrato `ServiciosRepository` y su implementación `ServiciosApiRepository`. Destinos tiene su página administrativa y un modal propios; sus modelos y acceso HTTP se ubican en la funcionalidad existente `features/destinos`. Proveedores tiene una página y un modal propios dentro de `features/admin`, con `ProveedoresRepository` y `ProveedoresApiRepository`. Paquetes conserva la gestión genérica con repositorio mock y sus cambios se restablecen al recargar. El login utiliza backend de VivaPeru, JWT en memoria y renovación mediante cookie HttpOnly; la integración se describe en [autenticacion-frontend.md](autenticacion-frontend.md). El acceso del viajero como invitado se mantiene.

Servicios consulta `/api/admin/servicios` y requiere ADMIN. Su modelo conserva `idServicio` numérico, `descripcion` nullable y `estado` booleano. La API filtra por nombre y estado y devuelve un arreglo completo; el orden y la paginación de seis filas son locales. El formulario comparte creación y edición, y consulta el detalle actualizado al editar o visualizar. Página y formulario reutilizan `gestion.css`, `AlertasService` y la autenticación existente. El estado se modifica con una acción independiente y cada guardado recarga la lista con los filtros vigentes. No se incorporan proveedor, tipo ni tarifa, ni se sincronizan los servicios reales con el mock de Proveedores.

Proveedores sigue el flujo `ProveedoresAdmin` / `ProveedorEditorModal` → `ProveedoresRepository` → `ProveedoresApiRepository` y requiere ADMIN. El listado de `/api/admin/proveedores` entrega una página con resumen y totales; la búsqueda por nombre, el estado (`activo` o `inactivo`), la paginación de diez filas y el orden fijo por nombre e ID se resuelven en el servidor. No se ordena ni pagina otra vez en el cliente. Para crear y editar se envían RUC, nombre, encargado, email opcional, teléfono y serviciosIds. El estado se cambia por separado mediante PATCH. El modal consulta el detalle antes de editar y reutiliza `ServiciosRepository` para el catálogo: mantiene servicios inactivos ya asociados y permite nuevas asociaciones solo con activos. PUT envía siempre la selección completa; ante conflictos se conserva el borrador y se recarga el catálogo. Reutiliza estilos, sesión, alertas y confirmación de cambios pendientes, sin crear un CRUD genérico ni dependencias nuevas.

Destinos sigue el mismo flujo: `DestinosAdmin` / `DestinoEditorModal` → `DestinosRepository` → `DestinosApiRepository`. La administración consume `/api/admin/destinos` y requiere ADMIN. Utiliza nombre, ubicación, subtítulo, descripción, imagen opcional e ID y estado devueltos por el servidor. Filtra nombre y estado en servidor, y ordena y pagina localmente de seis en seis. Reutiliza los estilos administrativos, la sesión y las alertas. `DestinoImagen` comparte la representación de imágenes y su alternativa visual entre administración y visitantes. No se incorporan tarjetas de cantidades ni relaciones con paquetes que la API no devuelve.

El inicio y la página pública de Destinos usan `DestinosRepository.listarPublicos()`; el detalle `/destinos/:idDestino` usa `detallePublico(id)`. Ambos métodos consultan `/api/public/destinos` y no requieren sesión. El interceptor elimina `Authorization` para esa ruta y sus subrutas antes del manejo de renovación, de modo que un error público no invalida ni renueva la sesión. Las pantallas mantienen sus estados de carga, vacío, error y reintento con Signals y RxJS. Se vuelve a consultar al entrar o reintentar, sin caché global ni paginación pública. Un detalle inexistente o inactivo se representa como no disponible.

Los buscadores y las opciones de Paquetes siguen usando `PaquetesRepository` y `CatalogoMockStore`. Sus identificadores de texto permanecen separados de los IDs numéricos reales. Las tarjetas reales del inicio y Destinos enlazan al detalle del destino; desde allí se puede ver el catálogo general de experiencias, sin aplicar un filtro incompatible. No se crean equivalencias por nombre ni se cambia el contrato de los paquetes mock.

## Organización

Se organiza por funcionalidades. Cada funcionalidad conserva sus páginas, componentes específicos, modelos y acceso a datos. `core` contiene servicios de aplicación; `shared` contiene piezas visuales genéricas utilizadas por varias funcionalidades.

```text
VivaPeru/
├── docs/
│   └── arquitectura-frontend.md
├── public/
│   └── images/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config/
│   │   │   └── services/
│   │   │       └── alertas.service.ts
│   │   ├── layout/
│   │   │   ├── public-layout/
│   │   │   ├── header/
│   │   │   └── footer/
│   │   ├── shared/
│   │   │   ├── ui/
│   │   │   │   ├── loading/
│   │   │   │   ├── empty-state/
│   │   │   │   └── error-state/
│   │   │   ├── pipes/
│   │   │   └── utils/
│   │   ├── features/
│   │   │   ├── inicio/
│   │   │   │   ├── pages/
│   │   │   │   └── components/
│   │   │   ├── paquetes/
│   │   │   │   ├── pages/
│   │   │   │   ├── components/
│   │   │   │   ├── models/
│   │   │   │   └── data-access/
│   │   │   │       ├── paquetes.repository.ts
│   │   │   │       ├── paquetes-mock.repository.ts
│   │   │   │       ├── paquetes-api.repository.ts
│   │   │   │       └── mocks/
│   │   │   ├── destinos/
│   │   │   ├── reservas/
│   │   │   │   ├── pages/
│   │   │   │   ├── components/
│   │   │   │   ├── models/
│   │   │   │   └── data-access/
│   │   │   └── pagos/
│   │   │       ├── pages/
│   │   │       ├── components/
│   │   │       ├── models/
│   │   │       └── data-access/
│   │   ├── app.ts
│   │   ├── app.html
│   │   ├── app.css
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── environments/
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── base.css
│   │   ├── bootstrap-theme.css
│   │   └── sweetalert-theme.css
│   ├── styles.css
│   └── main.ts
└── package.json
```

El árbol es la estructura prevista; las carpetas y los archivos se crearán cuando se necesiten. Las implementaciones API se añadirán al conectar el backend. `destinos` seguirá el mismo patrón por funcionalidad cuando requiera datos y componentes propios.

## Pantallas y rutas iniciales

| Ruta | Responsabilidad |
| --- | --- |
| `/` | Presentación, buscador, destinos y paquetes destacados. |
| `/paquetes` | Catálogo con filtros por destino, precio y duración. |
| `/paquetes/:slug` | Galería, descripción, itinerario, incluidos y selección de salida. |
| `/destinos` | Listado público de destinos activos con enlace a su detalle. |
| `/destinos/:idDestino` | Detalle público de un destino activo; permite regresar al listado o ver todas las experiencias. |
| `/reservar/:paqueteId` | Formulario de tres pasos: viaje, viajeros y revisión. |
| `/reservas/:id` | Resumen y siguientes acciones según el estado de la reserva. |
| `/reservas/:id/pago` | Selección de método e intento de pago simulado. |
| `/reservas/:id/resultado` | Resultado consultado de reserva y pago, incluidos estados pendientes y recuperación. |
| Ruta desconocida | Pantalla 404 con navegación al inicio. |

Los filtros del catálogo se reflejarán en los parámetros de consulta para conservarlos al navegar o compartir un enlace. El resultado tendrá un estado de reserva inexistente cuando el ID no esté disponible. Los recorridos, validaciones y transiciones se detallan en [flujos-usuario.md](flujos-usuario.md).

## Acceso a datos: prueba y API

```text
Página / componente
        ↓
Contrato de repositorio de la funcionalidad
        ↓
Implementación mock ahora / implementación HTTP después
```

Los componentes recibirán los repositorios mediante inyección de dependencias. Un token seleccionará una implementación en la configuración de Angular, según el entorno. Ambos proveedores expondrán los mismos métodos y tipos basados en Observables.

Ejemplos de operaciones: `listar(filtros)`, `obtenerPorSlug(slug)`, `consultarSalidas(paqueteId)`, `cotizar(solicitud)`, `crearReserva(solicitud, claveOperacion)`, `obtenerReserva(id)` y `crearIntento(reservaId, metodo, claveOperacion)`. Los pagos tendrán su propio contrato e implementación mock.

Los componentes no importarán los archivos de datos de prueba ni llamarán directamente a HttpClient. El repositorio HTTP adaptará la respuesta del backend al modelo utilizado por la interfaz cuando sea necesario.

Los mocks permitirán comprobar carga, éxito, resultados vacíos y errores de forma controlada. Las reservas de demostración podrán guardarse en sessionStorage para conservar el resultado al recargar la misma pestaña. Esa persistencia se limitará a datos ficticios y se gestionará dentro de la implementación mock.

## Modelos principales

- **Destino:** ID, slug, nombre, región, descripción e imagen.
- **Paquete:** ID, slug, destino, título, descripción, duración, galería, itinerario, servicios incluidos y precio referencial desde.
- **Salida:** ID, paquete, fecha, cupos y precio por viajero en PEN.
- **SolicitudReserva:** salida, cantidad de viajeros y datos de contacto ficticios.
- **Reserva:** ID, código de demostración, resumen del paquete y salida, viajeros, contacto, total aceptado, moneda, vigencia y estado simulado.
- **Cotización:** referencia de precio, desglose de importes y moneda, revalidados al crear una reserva.
- **IntentoPago:** ID, reserva, método, importe, moneda y estado simulado, independiente del estado de la reserva.

Los importes se representarán en céntimos y se mostrarán como soles. Las fechas de salida usarán `YYYY-MM-DD`. El total se calculará con la salida seleccionada; el precio «desde» será informativo. Con la API, el servidor deberá validar precio, cupos y estado definitivo de la reserva.

## Reglas de presentación y estado

- Cada componente mantiene juntos su TypeScript, HTML y CSS.
- Bootstrap se carga antes del CSS propio; no se modifica su código fuente.
- Colores, tipografía, espaciado y radios compartidos se definen mediante variables CSS en `tokens.css`.
- Se prioriza móvil, con navegación por teclado, etiquetas de formulario y foco visible.
- Los errores de campos se muestran junto al campo. SweetAlert2 confirma descartes y cancelaciones; los estados de pago y de reserva se mantienen visibles en sus páginas.
- El estado efímero queda en el componente; los filtros compartibles quedan en la URL y el borrador de reserva en un servicio de la funcionalidad si abarca varios pasos.
- Se evita incorporar un gestor global de estado hasta que exista una necesidad concreta.
- No se almacenan secretos en el frontend ni en las variables de entorno incluidas en su compilación.

## Orden de implementación

1. Inicializar Angular, Bootstrap, CSS y SweetAlert2; configurar rutas y layout.
2. Integrar el sistema VivaPeru y sus tokens; definir datos de prueba y contratos de repositorio.
3. Construir inicio, catálogo, destinos y detalle del paquete.
4. Construir formulario de reserva, resumen, pago simulado y resultado con sus estados de recuperación.
5. Verificar navegación, responsive, validaciones y escenarios de aceptación definidos en los flujos.
6. Conectar los repositorios HTTP cuando estén definidos los contratos de las APIs.

Antes de publicar la web comercial, revisar los requisitos de posicionamiento y previsualización en buscadores para decidir si se necesita prerenderizado o SSR.

## Referencias

- Angular, organización por funcionalidades: https://angular.dev/style-guide
- Angular, inyección de dependencias: https://angular.dev/essentials/dependency-injection
- Angular, cliente HTTP: https://angular.dev/guide/http/setup
- Bootstrap: https://getbootstrap.com/docs/5.3/getting-started/introduction/
- SweetAlert2: https://sweetalert2.github.io/
