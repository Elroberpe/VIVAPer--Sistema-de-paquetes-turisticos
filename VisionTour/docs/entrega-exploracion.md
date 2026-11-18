# Primera entrega: exploración

## Implementado

Aplicación Angular 21 standalone con rutas de carga diferida, Bootstrap 5, CSS propio, fuente Plus Jakarta Sans, Bootstrap Icons y SweetAlert2. La fuente y las fotografías se sirven localmente. Los servicios de datos y de favoritos se inyectan; los componentes no importan los mocks.

Se incluyen inicio, destinos, catálogo, detalle y página 404. El catálogo conserva filtros en la URL, admite favoritos de sesión en memoria y calcula los precios visibles según las salidas que cumplen fecha y cupos. El detalle permite elegir una salida y cantidad y muestra un resumen de consulta con el total.

## Verificación

- Compilación de producción de Angular con comprobación estricta de plantillas y tipos.
- Pruebas del repositorio: filtros combinados, salidas agotadas, precio según fecha, cupos del grupo, cantidades y fechas inválidas, orden sin mutaciones y slug inexistente.
- Revisión en navegador: búsqueda de Ica para dos viajeros, conservación de criterios, consulta de salida, resumen de S/ 778 para dos personas, guardado de favoritos y filtro de favoritos.
- Revisión móvil a 390px: menú desplegable, navegación a destinos, catálogo, filtro de destino sincronizado, resultados vacíos y ausencia de desbordamiento horizontal en el inicio.
- Paquete desconocido y ruta 404 comprobados en navegador; consola sin errores al terminar la revisión.
- Resultado final: compilación de producción correcta y siete pruebas aprobadas.

Capturas: [inicio en escritorio](previews/inicio-escritorio.jpg) e [inicio en móvil](previews/inicio-movil.jpg).

## Próxima entrega

Implementar el formulario de reserva y el pago simulado definidos en [flujos-usuario.md](flujos-usuario.md). El resumen de consulta actual no crea reservas, no bloquea cupos y no cobra.

La configuración del hosting y la publicación comercial se realizarán cuando se soliciten. Las rutas de aplicación necesitarán fallback a `index.html`.
