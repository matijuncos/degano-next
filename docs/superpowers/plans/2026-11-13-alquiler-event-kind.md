# Tipo de evento "Alquiler" — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al crear un evento se elige Evento o Alquiler; el alquiler es un evento completo (stock, staff, presupuesto) sin Show, Música, Timing ni Archivos, con color propio en el calendario.

**Architecture:** Un campo `eventKind` en `events` (sin campo = evento). Toda la lógica de "qué tiene cada tipo" vive en un módulo puro y testeado (`src/utils/eventKind.ts`) que usan el front (pestañas, navegación, ocultar secciones, colores) y el servidor (`postEvent`/`updateEvent`). Los formularios existentes no se tocan para la navegación: la página de Nuevo evento traduce el destino con `resolveTab`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Mantine v8, Tabler Icons, MongoDB, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-13-alquiler-event-kind-design.md`

## Global Constraints

- Código en inglés; comentarios, textos de UI y mensajes en español (CLAUDE.md).
- **Sin commits**: el usuario commitea. Donde el ciclo dice "commit", se deja el cambio listo y se sigue.
- La base local es **PRODUCCIÓN**: no escribir en la base para probar. Navegador solo para mirar.
- `eventKind: 'evento' | 'alquiler'`; sin campo o valor inválido = `'evento'`. No usar `type` para el tipo.
- En alquiler, `type` se precarga con `'Alquiler'` (editable, sigue obligatorio). Lugar y Localidad siguen obligatorios y crean ficha en `/lugares` como hoy.
- El tipo **no cambia** una vez creado (`updateEvent` lo ignora).
- Pestañas del alquiler: CLIENT → EVENT → MORE_INFO → EQUIPMENT → STAFF → PAYMENT.
- Campos de alquiler a descartar: `bands`, `music`, `playlist`, `welcomeSongs`, `walkIn`, `vals`, `openingPartySong`, `openingPartySongs`, `closingSongs`, `customMoments`, `ceremoniaCivil`, `ceremoniaExtra`, `ambienceMusic`, `timing`, `files`. **`folderId` nunca se descarta.**
- Colores alquiler (fondo/borde): futuro `#4f6478`/`#3d4f61`, hoy `#6a87a3`/`#4f6478`, pasado `#2f3a45`/`#343a40`. Ícono de camión (`IconTruck`).
- 0 requests nuevas. Equipamiento (`scheduledUses`, historial, solapamiento) sin cambios.
- Al terminar: `npx tsc --noEmit`, diagnósticos del editor sin errores en cada archivo tocado, `npm test`.

## Review Focus

1. **Evento viejo sin `eventKind`** → se comporta como evento en todos lados (pestañas, color, PDF, servidor). Test: `eventKindOf({})`, `eventKindOf({ eventKind: 'otro' })` (Task 1).
2. **Body parcial de `updateEvent` que trae `eventKind: 'alquiler'` sobre un evento** → no cambia el tipo; y un PUT de un alquiler con `bands`/`timing` → se descartan. Test: `sanitizeKindUpdate` (Task 1).
3. **Borrador restaurado en una pestaña que el alquiler no tiene** (ej. guardado en SHOW antes de cambiar) → abre en una pestaña válida. Test: `restoreTab(SHOW, 'alquiler')` (Task 1).
4. **Borrador de antes de esta feature** (sin `eventKind`) → no muestra la pantalla de elección, sigue como evento. Test: `needsKindChoice` (Task 1).
5. **Evento cuyo "Tipo de evento" escrito es "Alquiler" pero `eventKind` es evento** → color y pestañas de evento (manda `eventKind`, nunca el texto). Test: `eventKindOf({ type: 'Alquiler' })` → `'evento'` (Task 1).

---

### Task 1: Lógica pura del tipo de evento

**Files:**
- Create: `src/utils/eventKind.ts`
- Test: `src/utils/eventKind.test.ts`

**Interfaces:**
- Produces:
  - `type EventKind = 'evento' | 'alquiler'`
  - `eventKindOf(ev: { eventKind?: unknown } | null | undefined): EventKind`
  - `isRental(ev): boolean` (= `eventKindOf(ev) === 'alquiler'`)
  - `RENTAL_HIDDEN_FIELDS: readonly string[]` (lista de Global Constraints)
  - `tabsFor(kind: EventKind): number[]` — valores de `EVENT_TABS` en orden (evento: los 10 como hoy, FILES antes de PAYMENT)
  - `resolveTab(target: number, from: number, kind: EventKind): number` — si `target` existe para el tipo, lo devuelve; si no, avanza (si `target > from`) o retrocede (si `target < from`) en el orden de `EVENT_TABS` hasta una pestaña que exista
  - `restoreTab(saved: number, kind: EventKind): number` — pestaña válida para un borrador (si no existe → CLIENT)
  - `needsKindChoice(draft: { event?: { eventKind?: unknown } } | null): boolean` — true solo sin borrador
  - `stripRentalFields<T extends object>(body: T): T` — copia sin `RENTAL_HIDDEN_FIELDS`
  - `hasRentalHiddenData(ev): { any: boolean; files: { url: string }[] }` — si hay algo cargado en esas secciones (arrays no vacíos, objetos con contenido, strings no vacíos) y los archivos
  - `sanitizeKindUpdate<T extends object>(body: T, storedKind: EventKind): T` — saca `eventKind` siempre; si `storedKind === 'alquiler'`, además `stripRentalFields`
  - `rentalEventColors(status: 'past' | 'current' | 'future'): { backgroundColor: string; borderColor: string }`

- [ ] **Step 1: Tests** (`describe('eventKind')`), entre otros:
  - `eventKindOf(undefined|{}|{eventKind:'otro'}|{type:'Alquiler'})` → `'evento'`; `{eventKind:'alquiler'}` → `'alquiler'`.
  - `tabsFor('alquiler')` → `[CLIENT, EVENT, MORE_INFO, EQUIPMENT, STAFF, PAYMENT]`.
  - `resolveTab(SHOW, EVENT, 'alquiler')` → `MORE_INFO`; `resolveTab(TIMING, MORE_INFO, 'alquiler')` → `EVENT`; `resolveTab(FILES, STAFF, 'alquiler')` → `PAYMENT`; `resolveTab(STAFF, PAYMENT, 'alquiler')` → `STAFF`; para `'evento'` devuelve siempre `target`.
  - `restoreTab(SHOW, 'alquiler')` → `CLIENT`; `restoreTab(EQUIPMENT, 'alquiler')` → `EQUIPMENT`.
  - `needsKindChoice(null)` → true; `needsKindChoice({ event: {} })` → false.
  - `stripRentalFields({ bands:[1], timing:[1], files:[1], folderId:'evt-x', lugar:'X' })` → `{ folderId:'evt-x', lugar:'X' }`.
  - `sanitizeKindUpdate({ eventKind:'alquiler', bands:[1] }, 'evento')` → `{ bands:[1] }`; con `'alquiler'` → `{}`.
  - `hasRentalHiddenData({ bands: [], playlist: [] }).any` → false; con `timing:[{...}]` → true; `files` devuelve los archivos.
  - `rentalEventColors('future')` → `{ backgroundColor:'#4f6478', borderColor:'#3d4f61' }` (y los otros dos).
- [ ] **Step 2:** `npx vitest run src/utils/eventKind.test.ts` → FAIL (módulo no existe).
- [ ] **Step 3:** Implementar en `src/utils/eventKind.ts` (importa `EVENT_TABS` de `@/context/config`).
- [ ] **Step 4:** Mismo comando → PASS.

### Task 2: Tipo + servidor

**Files:**
- Modify: `src/context/types.ts` (EventModel, después de `remitoNumber?`): `eventKind?: 'evento' | 'alquiler'`
- Modify: `src/app/api/postEvent/route.ts` (junto a los normalizadores, ~l.26-36)
- Modify: `src/app/api/updateEvent/route.ts` (antes del `$set`, ~l.128)
- Modify: `src/app/api/getEvents/route.ts` (projection l.19-31): `eventKind: 1`

**Interfaces:**
- Consumes: `eventKindOf`, `stripRentalFields`, `sanitizeKindUpdate` (Task 1).

- [ ] **Step 1: postEvent:** `restBody.eventKind = eventKindOf(restBody)`; si es `'alquiler'`, `restBody = stripRentalFields(restBody)` y no tomar `bands` del body (hoy se desestructura aparte: en alquiler, `bands` no se guarda). Todo lo demás igual.
- [ ] **Step 2: updateEvent:** leer `eventKind` del evento guardado (agregarlo a la lectura previa que ya hace la ruta; si no existe una, `findOne` con projection `{ eventKind: 1 }` en el mismo `Promise.all` que las demás lecturas) y aplicar `updateData = sanitizeKindUpdate(updateData, eventKindOf(stored))` antes de armar el `$set`. Respetar cuerpos parciales (no agregar campos que no vinieron).
- [ ] **Step 3:** `npx tsc --noEmit` → sin errores; `npx vitest run` → PASS.

### Task 3: Nuevo evento — elección, pestañas y guardado

**Files:**
- Create: `src/components/EventKindChooser/EventKindChooser.tsx`
- Modify: `src/app/new-event/page.tsx`
- Modify: `src/components/EventForm/EventForm.tsx` (ocultar `churchDate` ~l.667 y `civil` ~l.677 si es alquiler)

**Interfaces:**
- Consumes: Task 1 (`eventKindOf`, `tabsFor`, `resolveTab`, `restoreTab`, `needsKindChoice`, `stripRentalFields`, `hasRentalHiddenData`).
- Produces: `<EventKindChooser onChoose={(kind: EventKind) => void} />` (dos tarjetas: Evento "Con show, música, timing y archivos" / Alquiler "Equipos, staff y presupuesto" con `IconTruck`; apiladas en mobile 390px).

- [ ] **Step 1: Chooser:** estado `choosingKind` = `needsKindChoice(saved)` al cargar el borrador; "Empezar de cero" lo vuelve a `true`. Mientras `choosingKind`, se muestra solo el chooser (sin pestañas). Al elegir: `eventKind` en el evento y, si es alquiler y `type` está vacío, `type: 'Alquiler'`; arranca en CLIENT; se guarda en el borrador (`onFormDataChange`).
- [ ] **Step 2: Pestañas:** las `Tabs.Tab` se filtran con `tabsFor(kind)` (FILES sigue además condicionada a `canShowFilesTab()`). `onNextTab`/`onBackTab` pasan el destino por `resolveTab(target, formState, kind)`. Al restaurar borrador: `restoreTab(saved.tab, kind)`. `goToFiles` de StaffForm = `canShowFilesTab() && kind === 'evento'`.
- [ ] **Step 3: Cartel + Cambiar:** arriba del formulario, badge con el tipo y botón "Cambiar" (vuelve al chooser conservando lo cargado). Si se pasa a alquiler y `hasRentalHiddenData(event).any`, confirmar con `useConfirm`: "Lo cargado en Show, Música, Timing y Archivos no se va a guardar en un alquiler" (+ "Los archivos subidos se borran" si hay). Al confirmar, borrar cada archivo con el mismo POST `/api/deleteFromS3` `{ url, bucket: 'events' }` que usa FilesHandler en modo local, solo si `fileInFolder(url, event.folderId)`, y sacar `files` del formulario.
- [ ] **Step 4: Guardar:** si es alquiler, `saveEvent` manda `stripRentalFields(evento)`; después de crear: notificar "Alquiler guardado" y `router.push('/event/' + id)` en lugar de ir a FILES. Evento: igual que hoy.
- [ ] **Step 5: EventForm:** prop `isRental?: boolean`; si true, no renderiza los campos de iglesia/civil.
- [ ] **Step 6:** `npx tsc --noEmit` → sin errores; diagnósticos del editor de los 3 archivos sin errores.

### Task 4: Página del evento, drawer y PDF

**Files:**
- Modify: `src/app/event/[id]/page.tsx` (Tabs l.2505-2520; `allAccordionsContent` Show l.2635, Música l.2642, Archivos l.2688; encabezado)
- Modify: `src/components/DrawerContent/DrawerContent.tsx` ("Show en vivo" l.863, "Archivos" l.937)
- Modify: `src/components/PrintableSections/PrintableFullEventSection.tsx` (`hasBands`/`hasMusic`/`hasTiming` l.69-81)

**Interfaces:**
- Consumes: `isRental` (Task 1).

- [ ] **Step 1:** Página: con `isRental(selectedEvent)` no se renderizan las tabs bands/music/timing/files ni sus acordeones; si `activeTab` es una de ellas, usar `'main'`. Badge "Alquiler" (con `IconTruck`) en el encabezado. (`PDFActions` va dentro de cada pestaña: al no haber pestaña, no hay PDF suelto de esas secciones.)
- [ ] **Step 2:** Drawer: sin "Show en vivo" ni "Archivos" si es alquiler.
- [ ] **Step 3:** PDF completo: `hasBands`, `hasMusic`, `hasTiming` en `false` si es alquiler.
- [ ] **Step 4:** `npx tsc --noEmit` + diagnósticos sin errores.

### Task 5: Calendario y listados

**Files:**
- Modify: `src/app/calendar/page.tsx` (`eventStyleGetter` l.491-518; título de eventos Degano l.397)
- Modify: `src/components/CalendarSidebar/CalendarSidebar.tsx` (junto al toggle "Eventos", ~l.280-316)
- Modify: `src/components/NextEvents/NextEvents.tsx` (l.73)
- Modify: `src/app/events/page.tsx` (columna `type`, l.273)

**Interfaces:**
- Consumes: `isRental`, `rentalEventColors` (Task 1).

- [ ] **Step 1:** `eventStyleGetter`: si es alquiler, colores de `rentalEventColors(getEventStatus(event))` (cubre grilla, lista por día y hoja del día). Título: prefijo `🚚 ` en alquileres.
- [ ] **Step 2:** Sidebar: renglón "Alquileres" con un punto del color futuro, debajo de "Eventos" (solo referencia), con estilos explícitos para el tema claro.
- [ ] **Step 3:** Badge "Alquiler" (gris acero, `IconTruck`) en NextEvents y en la columna tipo de `/events`.
- [ ] **Step 4:** `npx tsc --noEmit` + diagnósticos sin errores.

### Task 6: Verificación y documentación

- [ ] **Step 1:** `npx tsc --noEmit` → vacío; `npm test` → todo PASS; diagnósticos del editor de todos los archivos tocados sin errores.
- [ ] **Step 2:** Si `:3000` está libre (chequear fuera del sandbox), `npx next build` → OK. Si el usuario tiene su server, NO buildear: avisarle.
- [ ] **Step 3:** Navegador (solo mirar, sin guardar): chooser en desktop y 390px; pestañas del alquiler y navegación Siguiente/Atrás; "Cambiar" con aviso; calendario con un alquiler existente si lo hubiera (no crear ninguno en prod).
- [ ] **Step 4:** CLAUDE.md: nueva regla "Tipo de evento: Alquiler" (campo, pestañas, fijo una vez creado, servidor, colores, `eventKind.ts`); actualizar la línea del formulario de 10 tabs. Memoria: actualizar `project_estimate_music_rental_availability.md` (tarea 2 implementada).
- [ ] **Step 5:** Informar requests (0 nuevas), qué se ve mientras carga, qué se probó y qué no.
