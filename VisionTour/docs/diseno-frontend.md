# Sistema visual del frontend

La interfaz y el sistema visual se unifican bajo la marca **VivaPeru**, conservando la paleta, la tipografía y los componentes existentes.

- Referencia íntegra: [sistema-diseno-referencia.md](sistema-diseno-referencia.md).
- Tokens CSS preparados: [tokens.css](../src/styles/tokens.css).
- Arquitectura: [arquitectura-frontend.md](arquitectura-frontend.md).

## Dirección visual

Interfaz editorial de viajes, con fotografía protagonista, espacios generosos, azul océano, acentos terracota y superficies claras. Los contenidos de ejemplo se adaptarán al turismo peruano y los precios se mostrarán en soles.

| Rol | Valor |
| --- | --- |
| Marca, títulos y navegación | `#0A2540` |
| Acción de reserva y destacados | `#FF6B35` |
| Indicadores positivos y sostenibilidad | `#10B981` |
| Fondo general | `#F8FAFC` |
| Tarjetas | `#FFFFFF` |
| Superficies secundarias | `#F1F5F9` |
| Texto secundario | `#627D98` |
| Fuente | Plus Jakarta Sans, pesos 400, 500, 600, 700 y 800 |

La fuente deberá cargarse al inicializar la aplicación; declarar su familia en los tokens no descarga sus archivos.

## Resolución de diferencias de la referencia

El encabezado de tokens y las descripciones posteriores difieren en algunos colores y nombres de radios. Se conserva la paleta original bajo `--vp-*`; los roles `--color-*` usan los valores de las descripciones de marca y componentes. Por ejemplo, la acción usa `#FF6B35` y el fondo usa `#F8FAFC`.

Los radios se asignan según sus medidas explícitas: controles de `0.75rem`, tarjetas de `1rem`, bloques hero de `1.5rem` y etiquetas tipo píldora. Los componentes consumirán roles como `--radius-card` en lugar de interpretar nombres divergentes como `rounded-xl`.

## Integración con Angular y Bootstrap

Orden previsto de estilos globales:

1. Bootstrap.
2. `styles/tokens.css`.
3. `styles/base.css`: tipografía, fondo y estilos generales.
4. `styles/bootstrap-theme.css`: adaptación de botones, campos, tarjetas y variables de Bootstrap.
5. `styles/sweetalert-theme.css`: apariencia de alertas y confirmaciones.

Cada componente Angular tendrá además su CSS local. Los colores y medidas comunes se tomarán de los tokens.

La grilla de Bootstrap mantiene su estructura de 12 columnas. La composición visual de la referencia se expresa con ella: una tarjeta por fila en móvil, dos en tablet y tres en escritorio. Los márgenes y gutters usarán los tokens propios, y el ancho máximo de contenido será de 1280px. El rango tablet comienza en 768px y escritorio en 1200px.

## Componentes previstos

- Cabecera y subnavegación fija con fondo translúcido, blur de 12px y alternativa opaca.
- Hero con fotografía peruana y buscador dividido en destino, fecha y viajeros.
- Tarjeta de paquete con imagen 16:10 o 4:3, destino, duración, valoración de prueba, incluidos y precio «Desde S/ … por persona».
- Filtros con chips de categoría y estado seleccionado azul océano.
- Formulario con controles de 48px, etiquetas visibles y errores junto a cada campo.
- Resumen de reserva fijo en escritorio, adaptado al flujo vertical de móvil sin cubrir contenido.
- Indicador de pasos de reserva: viaje, viajeros y revisión; pantalla posterior de pago con método, importe y estado visible.
- Resultado persistente para reserva confirmada, pago pendiente, rechazo o verificación en curso, según [flujos-usuario.md](flujos-usuario.md).
- SweetAlert2 con tipografía, radios y colores del sistema, configurado mediante el servicio de alertas.

Los favoritos y las valoraciones, si aparecen, tendrán comportamiento y datos de demostración explícitos. Las insignias de sostenibilidad o verificación solo se usarán en ejemplos identificados como ficticios.

## Comprobaciones al implementar

Los pares de color se revisarán en su tamaño y peso de texto reales, especialmente texto blanco sobre terracota y texto secundario pequeño. Si necesitan ajuste, se documentará la variante accesible manteniendo la paleta de referencia. Los colores no serán el único indicador de estado.

El foco será visible. Los iconos interactivos tendrán nombre accesible. Los importes usarán cifras tabulares. Los movimientos de hover y pulsación respetarán la preferencia de movimiento reducido.

Los tokens están integrados en la aplicación Angular. El color terracota original `#FF6B35` se mantiene en los acentos visuales; para los botones con texto blanco se utiliza la variante más oscura `#BE4018`, definida como `--color-action-readable`. La fuente Plus Jakarta Sans se sirve localmente desde su paquete de fuentes, sin solicitudes a Google Fonts.

La primera entrega incluye inicio, destinos, catálogo y detalle con consulta de salidas. El formulario de reserva y la pantalla de pago definidos en los flujos se implementarán en la siguiente etapa.
