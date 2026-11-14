# Tipo de evento "Alquiler" — Diseño

Fecha: 13/11/2026 · Pedido de Degano (Juan) · Estado: borrador para aprobar

## Por qué

Degano alquila equipos a terceros. Hoy esos alquileres se cargan como un evento común, con pestañas que no aplican (Show, Música, Timing, Archivos). Juan quiere poder elegir **Evento** o **Alquiler** al crear, y que el alquiler sea un evento igual a los de hoy pero sin esas pestañas, distinguible en el calendario.

## Objetivos

- Al tocar "Crear evento", elegir primero **Evento** o **Alquiler**.
- El alquiler es un evento completo: **impacta en el stock igual que hoy** (reservas por fecha en `scheduledUses`, control de solapamiento, historial, tercerizados, vuelta a depósito), lleva staff (entra en Cobros STAFF como cualquier evento) y presupuesto/pagos (solo admin, como hoy).
- El alquiler **no tiene** Show, Música, Timing ni Archivos: ni al crearlo, ni en su página, ni en el drawer del calendario, ni en el PDF.
- Color propio en el calendario, que no se repita con ninguno de los que ya se usan.

## No objetivos (por ahora)

- **Cambiar el tipo de un evento ya creado** (evento ↔ alquiler). Queda fijo al crearlo. Juan: "más adelante agregamos la lógica de poder cambiarlo".
- Filtro o toggle separado de alquileres en el calendario.
- Reportes o listados separados de alquileres.
- Migrar datos: los eventos existentes quedan como "Evento" sin tocarlos.

## Anti-objetivos (sería un fracaso aunque "funcione")

- Que un alquiler **no reserve equipos** o que no respete la regla de solapamiento: es justamente lo que se alquila.
- Que un evento existente cambie su comportamiento o su color.
- Que se pueda guardar un alquiler con datos de Show/Música/Timing/Archivos.
- Que un evento pierda datos o que el borrador de Nuevo evento se rompa.

## Modelo de datos

- Campo nuevo en `events`: **`eventKind: 'evento' | 'alquiler'`** (opcional en el tipo `EventModel`, `src/context/types.ts`).
- **Sin campo = `'evento'`** (todos los eventos actuales). Helper puro `eventKindOf(ev)` → `'evento' | 'alquiler'`. NO se usa `type` para esto: `type` es el "tipo de evento" libre (Casamiento, 15 años…).
- En un alquiler, el campo **"Tipo de evento" (`type`) viene precargado con "Alquiler"** (decisión del usuario). Sigue siendo editable y obligatorio como hoy. Con eso, el nombre de carpeta, la etiqueta en Cobros (`eventLabel` → "Alquiler · Cliente") y `scheduledUses[].eventType` salen solos.

## Creación (`/new-event`)

1. **Pantalla de elección** antes del formulario, cuando no hay borrador: dos tarjetas grandes con el estilo de la app (Mantine, tema oscuro):
   - **Evento**: "Con show, música, timing y archivos".
   - **Alquiler**: "Equipos, staff y presupuesto". Ícono de camión.
   En celular (390px) van una debajo de la otra.
2. Al elegir, arranca el formulario en Cliente con `eventKind` puesto (y `type: 'Alquiler'` si es alquiler y `type` está vacío).
3. Arriba del formulario, un cartel con el tipo elegido. **Mientras se crea** se puede cambiar el tipo con "Cambiar" (vuelve a la pantalla de elección conservando lo cargado). *Decisión de Claude*: el "fijo" de Juan aplica una vez creado; antes de guardar, equivocarse al elegir no tiene que obligar a empezar de cero.
4. **Pestañas del alquiler**: Cliente → Evento → Más info → Equipamiento → Staff → Presupuesto.
5. **Navegación**: hoy cada formulario llama `onNextTab(EVENT_TABS.X)` fijo (EventForm → SHOW, MoreInfoForm ← TIMING, StaffForm → FILES/PAYMENT…). En lugar de tocar cada formulario, la página traduce la pestaña destino con una función pura `resolveTab(target, from, kind)`: si el destino no existe para ese tipo, salta a la siguiente/anterior que sí existe en la misma dirección. Testeada.
6. **Borrador** (`useEventDraft`): guarda el evento entero, así que `eventKind` se guarda y restaura solo. Un borrador restaurado **no** muestra la pantalla de elección (ya tiene tipo; uno viejo sin tipo = evento). "Empezar de cero" vuelve a la pantalla de elección.
7. **Al guardar un alquiler**: hoy un evento recién creado salta a la pestaña Archivos. El alquiler no tiene Archivos: se notifica "Alquiler guardado" y se va a la página del alquiler (`/event/[id]`). *Decisión de Claude.*
8. Antes de mandar a `postEvent`, si es alquiler se sacan del cuerpo `bands`, `music`/playlist, `timing` y `files` (defensa en el front; ver servidor).
9. **Cambiar de Evento a Alquiler mientras se crea** (*decisión de Claude*): lo de Show/Música/Timing queda en el formulario/borrador (si vuelve a Evento, sigue ahí) y se saca recién al guardar. Si ya hay datos en esas secciones, antes de cambiar se avisa "Lo cargado en Show, Música, Timing y Archivos no se va a guardar en un alquiler". Si hay **archivos ya subidos** (carpeta propia del formulario), el aviso lo dice y al confirmar se borran de S3 con el mismo borrado de hoy (`fileInFolder`), para no dejar archivos huérfanos.
10. **Lugar y Localidad siguen obligatorios** en un alquiler y se siguen creando fichas en `/lugares` como hoy (decisión del usuario): Juan quiere saber dónde van a estar sus equipos. `scheduledUses[].location` = el lugar, igual que en un evento.
11. **Pestaña Evento en un alquiler** (*decisión de Claude*): se ocultan los campos de ceremonia (`churchDate`, `civil`), propios de bodas. El resto igual.

## Servidor

- **`postEvent`**: normaliza `eventKind` (solo `'alquiler'` o `'evento'`; otro valor → `'evento'`). Si es alquiler, **ignora** show, música, timing y archivos aunque vengan. El resto (equipos, `scheduledUses`, historial, staff, presupuesto) igual que hoy, sin cambios.
- **`updateEvent`**: **nunca cambia `eventKind`** (se borra del `$set`: el tipo queda fijo). Si el evento guardado es alquiler, ignora show/música/timing/archivos. Respeta cuerpos parciales como hoy.
- **`getEvents`**: agregar `eventKind: 1` a la projection (si no, no llega al calendario ni al listado).
- `getEvent` (detalle completo) ya devuelve todo.

## Donde se muestra

- **Página del evento** (`/event/[id]`): si es alquiler, no se muestran las pestañas Show, Música, Timing, Archivos, ni sus secciones en la vista de acordeones (`allAccordionsContent`). Un cartel "Alquiler" en el encabezado.
- **Drawer del calendario** (`DrawerContent`): sin "Show en vivo" ni "Archivos" si es alquiler.
- **PDF completo** (`PrintableFullEventSection`): sin páginas de Show, Música y Timing si es alquiler. En `PDFActions`, no ofrecer esas secciones sueltas (Show, Música, Timing, Archivos).
- **Calendario** (`eventStyleGetter` en `calendar/page.tsx`, que alimenta grilla, lista por día y hoja del día): color propio + ícono de camión al lado del nombre.
- **Leyenda**: en `CalendarSidebar`, junto al toggle "Eventos", un renglón "Alquileres" con su color (solo referencia; el toggle de eventos sigue prendiendo/apagando ambos).
- **Listados**: badge "Alquiler" en `NextEvents` (inicio) y en la columna de tipo de `/events`.
- Tema claro de `/calendar`: el color y el badge con estilos explícitos.

## Color

> **Actualizado 14/11/2026:** el gris acero se parecía al gris de "Reuniones" (`#495057`, el calendario más usado). Se cambió a **cobre** (elegido por el usuario). Los colores de abajo ya son los nuevos.

Los colores en uso: 16 de los calendarios extras (rojo, bordó, frambuesa, rosa, uva, violeta, índigo, azul, celeste, cian, verde agua, verde, lima, amarillo, naranja, marrón), los 3 verdes de eventos Degano y el azul `#4a9eed` por defecto. El tono libre es el **gris acero azulado**. *Decisión de Claude* (el usuario la delegó). Misma lógica de estado que los verdes:

| Estado | Fondo | Borde |
|---|---|---|
| Futuro | `#a0522d` | `#7f4024` |
| Hoy / en curso | `#c0703f` | `#a0522d` |
| Pasado | `#5e3420` | `#46261a` |

Más el ícono de camión, para que se distinga aunque el color no se note (celular, tema claro).

## Permisos

Sin cambios: crear/editar alquiler = quien hoy crea/edita eventos (admin, manager); borrar = admin; presupuesto/pagos = solo admin; ofuscación de teléfonos igual.

## Integración (checklist CLAUDE.md)

| Punto | Qué pasa |
|---|---|
| Crear evento | pantalla de elección + pestañas por tipo |
| Editar evento | pestañas/acordeones ocultos; `eventKind` no se puede cambiar |
| Drawer del calendario | sin Show ni Archivos |
| Borrador Nuevo evento | guarda/restaura `eventKind` solo; borrador viejo = evento |
| PDFs | sin Show/Música/Timing |
| Cobros STAFF | igual que un evento ("Alquiler · Cliente") |
| Equipamiento | igual que un evento (`scheduledUses`, historial, solapamiento) |
| Permisos | sin cambios |
| Projections | `getEvents` + `eventKind` |
| Datos viejos | sin migración: sin campo = evento |
| Mobile 390px | tarjetas apiladas; badge en listas |
| Tema claro `/calendar` | color + badge con estilos explícitos |
| Performance | 0 requests nuevas; la elección es local |

## Tests

Lógica pura en `src/utils/eventKind.ts` (+ `.test.ts`):
- `eventKindOf` (sin campo / valor inválido → evento).
- `tabsFor(kind)` y `resolveTab(target, from, kind)`: todos los saltos reales de los formularios (EventForm → SHOW ⇒ MORE_INFO; MoreInfoForm ← TIMING ⇒ EVENT; StaffForm → FILES ⇒ PAYMENT) y que en "evento" no cambie nada.
- `stripRentalFields(body)` que usan `postEvent`/`updateEvent`/front: saca show/música/timing/archivos. Campos exactos (de `EventModel`): Show = `bands`; Música = `music`, `playlist`, `welcomeSongs`, `walkIn`, `vals`, `openingPartySong`, `openingPartySongs`, `closingSongs`, `customMoments`, `ceremoniaCivil`, `ceremoniaExtra`, `ambienceMusic`; Timing = `timing`; Archivos = `files`. **`folderId` NO se saca**: `postEvent` lo usa para no duplicar en un reintento.
- `rentalEventColors(status)`.

## Lo que se deja al que implementa

- Textos exactos de las tarjetas y el cartel (español, tono de la app).
- Qué ícono de Tabler usar (camión o similar).
- Cómo se ve el cartel "Alquiler" en el encabezado de la página del evento.
